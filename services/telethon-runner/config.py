from __future__ import annotations

import os
from dataclasses import dataclass


def _read_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _read_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _read_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


@dataclass(slots=True)
class Settings:
    api_id: int
    api_hash: str
    bot_token: str
    session_string: str | None
    session_name: str
    enabled: bool
    bind_host: str
    bind_port: int
    meetmatt_api_base_url: str
    meetmatt_internal_secret: str
    default_role: str
    default_channel: str
    default_user_id: str | None
    runner_name: str
    identity_refresh_seconds: int
    outbound_poll_seconds: float
    outbound_batch_size: int
    heartbeat_seconds: int


def load_settings() -> Settings:
    return Settings(
        api_id=_read_int("TELETHON_API_ID", 0),
        api_hash=os.getenv("TELETHON_API_HASH", "").strip(),
        bot_token=os.getenv("TELETHON_BOT_TOKEN", "").strip(),
        session_string=(os.getenv("TELETHON_SESSION_STRING") or "").strip() or None,
        session_name=os.getenv("TELETHON_SESSION_NAME", "meetmatt_telethon").strip(),
        enabled=_read_bool("TELETHON_ENABLED", True),
        bind_host=os.getenv("TELETHON_BIND_HOST", "127.0.0.1").strip(),
        bind_port=_read_int("TELETHON_BIND_PORT", 8787),
        meetmatt_api_base_url=os.getenv("MEETMATT_API_BASE_URL", "http://127.0.0.1:3000").strip().rstrip("/"),
        meetmatt_internal_secret=os.getenv("MEETMATT_INTERNAL_SECRET", "").strip(),
        default_role=os.getenv("TELETHON_DEFAULT_RELATIONSHIP_ROLE", "support").strip() or "support",
        default_channel=os.getenv("TELETHON_DEFAULT_CHANNEL", "telegram").strip() or "telegram",
        default_user_id=(os.getenv("TELETHON_DEFAULT_USER_ID") or "").strip() or None,
        runner_name=os.getenv("TELETHON_RUNNER_NAME", "telethon-runner").strip() or "telethon-runner",
        identity_refresh_seconds=max(10, _read_int("TELETHON_IDENTITY_REFRESH_SECONDS", 30)),
        outbound_poll_seconds=max(1.0, _read_float("TELETHON_OUTBOUND_POLL_SECONDS", 3.0)),
        outbound_batch_size=max(1, min(_read_int("TELETHON_OUTBOUND_BATCH_SIZE", 20), 100)),
        heartbeat_seconds=max(10, _read_int("TELETHON_HEARTBEAT_SECONDS", 30)),
    )
