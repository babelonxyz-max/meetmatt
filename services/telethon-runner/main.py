from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass, field
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from telethon import TelegramClient, events
from telethon.sessions import StringSession

from config import Settings, load_settings

logger = logging.getLogger("telethon_runner")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


class SendMessageRequest(BaseModel):
    chat_id: int | str
    text: str = Field(min_length=1)
    telegram_identity_id: str | None = None


@dataclass(slots=True)
class RemoteIdentity:
    identity_id: str
    display_name: str
    kind: str
    status: str
    bot_token: str | None
    session_string: str | None
    external_telegram_user_id: str | None
    external_telegram_username: str | None
    external_phone: str | None
    metadata: dict[str, Any] | None = None


@dataclass(slots=True)
class ManagedClient:
    identity_id: str
    label: str
    client: TelegramClient
    source: str
    remote_identity: RemoteIdentity | None = None
    me: Any | None = None
    last_error: str | None = None
    started_at: float = field(default_factory=lambda: asyncio.get_running_loop().time())


class MeetMattBridge:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = httpx.AsyncClient(
            base_url=settings.meetmatt_api_base_url,
            timeout=20.0,
            headers={
                "x-telethon-secret": settings.meetmatt_internal_secret,
                "Content-Type": "application/json",
            },
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def submit_inbound_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = await self.client.post("/api/internal/telethon/inbound", json=payload)
        response.raise_for_status()
        return response.json()

    async def fetch_health(self) -> dict[str, Any]:
        response = await self.client.get("/api/internal/telethon/health")
        response.raise_for_status()
        return response.json()

    async def fetch_identities(self) -> list[dict[str, Any]]:
        response = await self.client.get(
            "/api/internal/telethon/identities",
            params={
                "includeInactive": "true",
                "includeSecrets": "true",
            },
        )
        response.raise_for_status()
        return response.json().get("identities", [])

    async def claim_outbound_messages(self, limit: int) -> list[dict[str, Any]]:
        response = await self.client.get(
            "/api/internal/telethon/outbound",
            params={
                "limit": str(limit),
                "claimedBy": self.settings.runner_name,
            },
        )
        response.raise_for_status()
        return response.json().get("messages", [])

    async def acknowledge_outbound_message(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = await self.client.post("/api/internal/telethon/outbound/ack", json=payload)
        response.raise_for_status()
        return response.json()

    async def send_heartbeat(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = await self.client.post("/api/internal/telethon/heartbeat", json=payload)
        response.raise_for_status()
        return response.json()


class TelethonRunner:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.bridge = MeetMattBridge(settings)
        self.managed_clients: dict[str, ManagedClient] = {}
        self._tasks: list[asyncio.Task[Any]] = []
        self._lock = asyncio.Lock()

    async def startup(self) -> None:
        if not self.settings.enabled:
            logger.warning("Telethon runner disabled")
            return

        await self.refresh_identities()
        self._tasks = [
            asyncio.create_task(self._identity_refresh_loop(), name="telethon-identity-refresh"),
            asyncio.create_task(self._outbound_loop(), name="telethon-outbound-loop"),
            asyncio.create_task(self._heartbeat_loop(), name="telethon-heartbeat-loop"),
        ]

    async def shutdown(self) -> None:
        for task in self._tasks:
            task.cancel()

        for task in self._tasks:
            with suppress(asyncio.CancelledError):
                await task

        async with self._lock:
            managed_clients = list(self.managed_clients.values())
            self.managed_clients.clear()

        for managed in managed_clients:
            await self._disconnect_client(managed)

        await self.bridge.close()

    async def _identity_refresh_loop(self) -> None:
        while True:
            try:
                await self.refresh_identities()
            except Exception:
                logger.exception("Failed to refresh Telethon identities")
            await asyncio.sleep(self.settings.identity_refresh_seconds)

    async def _outbound_loop(self) -> None:
        while True:
            try:
                messages = await self.bridge.claim_outbound_messages(
                    self.settings.outbound_batch_size,
                )
                for message in messages:
                    await self._process_outbound_message(message)
            except Exception:
                logger.exception("Outbound loop failure")
            await asyncio.sleep(self.settings.outbound_poll_seconds)

    async def _heartbeat_loop(self) -> None:
        while True:
            try:
                for managed in list(self.managed_clients.values()):
                    await self._send_client_heartbeat(managed)
            except Exception:
                logger.exception("Heartbeat loop failure")
            await asyncio.sleep(self.settings.heartbeat_seconds)

    async def refresh_identities(self) -> None:
        desired: dict[str, RemoteIdentity] = {}

        for identity in await self._fetch_remote_identities():
            desired[identity.identity_id] = identity

        env_identity = self._build_env_identity()
        if env_identity is not None:
            desired[env_identity.identity_id] = env_identity

        async with self._lock:
            current_ids = set(self.managed_clients.keys())
            desired_ids = set(desired.keys())

            for identity_id in current_ids - desired_ids:
                managed = self.managed_clients.pop(identity_id)
                await self._disconnect_client(managed)

            for identity_id, remote in desired.items():
                existing = self.managed_clients.get(identity_id)
                if existing is not None:
                    existing.remote_identity = remote
                    continue

                managed = await self._start_client(remote)
                if managed is not None:
                    self.managed_clients[identity_id] = managed

    async def _fetch_remote_identities(self) -> list[RemoteIdentity]:
        raw_identities = await self.bridge.fetch_identities()
        identities: list[RemoteIdentity] = []

        for raw in raw_identities:
            status = str(raw.get("status") or "").strip().lower()
            if status not in {"active", "pending"}:
                continue

            bot_token = (
                str(raw.get("botToken") or raw.get("botTokenEncrypted") or "").strip()
                or None
            )
            session_string = (
                str(raw.get("session") or raw.get("sessionEncrypted") or "").strip()
                or None
            )
            if not bot_token and not session_string:
                continue

            identities.append(
                RemoteIdentity(
                    identity_id=str(raw["id"]),
                    display_name=str(raw.get("displayName") or raw.get("id")),
                    kind=str(raw.get("kind") or "user_agent"),
                    status=status,
                    bot_token=bot_token,
                    session_string=session_string,
                    external_telegram_user_id=str(raw.get("externalTelegramUserId") or "").strip() or None,
                    external_telegram_username=str(raw.get("externalTelegramUsername") or "").strip() or None,
                    external_phone=str(raw.get("externalPhone") or "").strip() or None,
                    metadata=raw.get("metadata") if isinstance(raw.get("metadata"), dict) else None,
                ),
            )

        return identities

    def _build_env_identity(self) -> RemoteIdentity | None:
        if not self.settings.api_id or not self.settings.api_hash:
            return None
        if not self.settings.bot_token and not self.settings.session_string:
            return None

        return RemoteIdentity(
            identity_id="env-default",
            display_name="Env Default",
            kind="bot" if self.settings.bot_token else "user_agent",
            status="active",
            bot_token=self.settings.bot_token or None,
            session_string=self.settings.session_string,
            external_telegram_user_id=None,
            external_telegram_username=None,
            external_phone=None,
            metadata={"source": "env"},
        )

    async def _start_client(self, remote: RemoteIdentity) -> ManagedClient | None:
        if not self.settings.api_id or not self.settings.api_hash:
            logger.warning("Skipping Telethon identity %s because API credentials are missing", remote.identity_id)
            return None

        session = StringSession(remote.session_string or "")
        client = TelegramClient(session, self.settings.api_id, self.settings.api_hash)
        managed = ManagedClient(
            identity_id=remote.identity_id,
            label=remote.display_name,
            client=client,
            source="env" if remote.identity_id == "env-default" else "remote",
            remote_identity=remote,
        )

        try:
            if remote.bot_token:
                await client.start(bot_token=remote.bot_token)
            else:
                await client.connect()
                if not await client.is_user_authorized():
                    raise RuntimeError("Telethon session is not authorized")

            managed.me = await client.get_me()
            managed.last_error = None
            client.add_event_handler(
                self._build_message_handler(managed),
                events.NewMessage(incoming=True),
            )
            logger.info("Telethon identity started", extra={"identity_id": remote.identity_id, "label": remote.display_name})
            return managed
        except Exception as error:
            managed.last_error = str(error)
            logger.exception("Failed to start Telethon identity %s", remote.identity_id)
            await self._disconnect_client(managed)
            return None

    async def _disconnect_client(self, managed: ManagedClient) -> None:
        with suppress(Exception):
            await managed.client.disconnect()

    def _build_message_handler(self, managed: ManagedClient):
        async def handler(event: events.NewMessage.Event) -> None:
            await self._handle_inbound_message(managed, event)

        return handler

    async def _handle_inbound_message(
        self,
        managed: ManagedClient,
        event: events.NewMessage.Event,
    ) -> None:
        payload: dict[str, Any] = {
            "externalThreadId": str(event.chat_id),
            "externalUserId": str(event.sender_id) if event.sender_id is not None else None,
            "messageId": str(event.id),
            "receivedAt": event.date.isoformat() if event.date else None,
            "text": event.raw_text,
            "channel": self.settings.default_channel,
            "title": event.raw_text[:80],
        }

        if managed.source == "remote":
            payload["telegramIdentityId"] = managed.identity_id
        elif self.settings.default_user_id:
            payload["userId"] = self.settings.default_user_id
            payload["role"] = self.settings.default_role

        try:
            result = await self.bridge.submit_inbound_event(payload)
            logger.info(
                "Inbound event queued",
                extra={
                    "identity_id": managed.identity_id,
                    "task_id": result.get("taskId"),
                    "thread_id": result.get("threadId"),
                },
            )
        except Exception:
            logger.exception(
                "Failed to forward inbound message",
                extra={"identity_id": managed.identity_id, "chat_id": event.chat_id},
            )

    async def _process_outbound_message(self, message: dict[str, Any]) -> None:
        identity_id = str(message.get("telegramIdentityId") or "")
        managed = self.managed_clients.get(identity_id)
        if managed is None:
            await self.bridge.acknowledge_outbound_message(
                {
                    "messageId": message.get("id"),
                    "status": "failed",
                    "errorCode": "missing_identity",
                    "errorMessage": f"No active Telethon identity for {identity_id}",
                },
            )
            return

        try:
            await self._send_outbound_message(managed, message)
        except Exception as error:
            logger.exception("Failed to send outbound message")
            await self.bridge.acknowledge_outbound_message(
                {
                    "messageId": message.get("id"),
                    "status": "failed",
                    "errorCode": "send_failed",
                    "errorMessage": str(error),
                },
            )

    async def _send_outbound_message(
        self,
        managed: ManagedClient,
        message: dict[str, Any],
    ) -> None:
        payload = message.get("payload") if isinstance(message.get("payload"), dict) else {}
        message_type = str(message.get("type") or "send_message")
        external_chat_id = message.get("externalChatId")
        if external_chat_id is None:
            raise RuntimeError("Outbound message missing externalChatId")

        response_message_id: str | None = None

        if message_type == "send_message":
            text = str(payload.get("text") or "").strip()
            if not text:
                raise RuntimeError("Outbound send_message is missing text")
            sent = await managed.client.send_message(external_chat_id, text)
            response_message_id = str(sent.id)
        elif message_type == "edit_message":
            text = str(payload.get("text") or "").strip()
            target_message_id = payload.get("message_id")
            if not text or target_message_id is None:
                raise RuntimeError("Outbound edit_message requires text and message_id")
            await managed.client.edit_message(external_chat_id, int(target_message_id), text)
            response_message_id = str(target_message_id)
        elif message_type == "typing":
            async with managed.client.action(external_chat_id, "typing"):
                await asyncio.sleep(1)
        elif message_type == "mark_read":
            await managed.client.send_read_acknowledge(external_chat_id)
        else:
            raise RuntimeError(f"Unsupported outbound message type: {message_type}")

        await self.bridge.acknowledge_outbound_message(
            {
                "messageId": message.get("id"),
                "status": "sent",
                "responseExternalMessageId": response_message_id,
            },
        )

    async def _send_client_heartbeat(self, managed: ManagedClient) -> None:
        me = managed.me
        if managed.client.is_connected():
            try:
                me = await managed.client.get_me()
                managed.me = me
            except Exception as error:
                managed.last_error = str(error)

        if managed.source != "remote":
            return

        await self.bridge.send_heartbeat(
            {
                "telegramIdentityId": managed.identity_id,
                "connected": managed.client.is_connected(),
                "runner": self.settings.runner_name,
                "authorized": me is not None,
                "externalTelegramUserId": str(getattr(me, "id", "")) or None,
                "externalTelegramUsername": getattr(me, "username", None),
                "externalPhone": getattr(me, "phone", None),
                "metadata": {
                    "runner": self.settings.runner_name,
                    "source": managed.source,
                    "label": managed.label,
                    "lastError": managed.last_error,
                },
            },
        )

    async def send_message(
        self,
        chat_id: int | str,
        text: str,
        telegram_identity_id: str | None,
    ) -> dict[str, Any]:
        managed = await self._resolve_client(telegram_identity_id)
        message = await managed.client.send_message(chat_id, text)
        return {
            "ok": True,
            "message_id": message.id,
            "chat_id": chat_id,
            "telegram_identity_id": managed.identity_id,
        }

    async def _resolve_client(self, telegram_identity_id: str | None) -> ManagedClient:
        if telegram_identity_id:
            managed = self.managed_clients.get(telegram_identity_id)
            if managed is None:
                raise HTTPException(status_code=404, detail="Telethon identity not found")
            return managed

        if len(self.managed_clients) == 1:
            return next(iter(self.managed_clients.values()))

        raise HTTPException(
            status_code=400,
            detail="telegram_identity_id is required when multiple Telethon identities are active",
        )

    async def health(self) -> dict[str, Any]:
        upstream = None
        try:
            upstream = await self.bridge.fetch_health()
        except Exception as error:  # pragma: no cover - diagnostic only
            upstream = {"status": "error", "detail": str(error)}

        return {
            "status": "ok",
            "runner": self.settings.runner_name,
            "managed_identities": [
                {
                    "identity_id": managed.identity_id,
                    "label": managed.label,
                    "source": managed.source,
                    "connected": managed.client.is_connected(),
                    "last_error": managed.last_error,
                }
                for managed in self.managed_clients.values()
            ],
            "upstream": upstream,
        }


settings = load_settings()
runner = TelethonRunner(settings)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await runner.startup()
    try:
        yield
    finally:
        await runner.shutdown()


app = FastAPI(title="MeetMatt Telethon Runner", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return await runner.health()


@app.post("/send")
async def send_message(payload: SendMessageRequest) -> dict[str, Any]:
    return await runner.send_message(
        payload.chat_id,
        payload.text,
        payload.telegram_identity_id,
    )
