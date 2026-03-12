export interface TelegramBotProfile {
  id: string;
  username: string | null;
  firstName: string | null;
  canJoinGroups: boolean;
  canReadAllGroupMessages: boolean;
  supportsInlineQueries: boolean;
  telegramLink: string | null;
}

const TELEGRAM_BOT_TOKEN_PATTERN = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;

export function sanitizeTelegramBotToken(value: string): string {
  return value.trim();
}

export function buildTelegramLink(username?: string | null): string | null {
  const normalized = typeof username === "string" ? username.trim().replace(/^@+/, "") : "";
  return normalized ? `https://t.me/${normalized}` : null;
}

export function isProbablyTelegramBotToken(value: string): boolean {
  return TELEGRAM_BOT_TOKEN_PATTERN.test(sanitizeTelegramBotToken(value));
}

export async function fetchTelegramBotProfile(
  rawToken: string,
): Promise<TelegramBotProfile> {
  const token = sanitizeTelegramBotToken(rawToken);

  if (!isProbablyTelegramBotToken(token)) {
    throw {
      status: 400,
      message: "Enter a valid BotFather token",
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw {
      status: 400,
      message: "Telegram could not verify that bot token",
    };
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    result?: {
      id?: number | string;
      is_bot?: boolean;
      username?: string;
      first_name?: string;
      can_join_groups?: boolean;
      can_read_all_group_messages?: boolean;
      supports_inline_queries?: boolean;
    };
  };

  if (!payload.ok || !payload.result?.is_bot || !payload.result.id) {
    throw {
      status: 400,
      message: "Telegram could not verify that bot token",
    };
  }

  const username =
    typeof payload.result.username === "string" &&
    payload.result.username.trim().length > 0
      ? payload.result.username.trim().replace(/^@+/, "")
      : null;

  return {
    id: String(payload.result.id),
    username,
    firstName:
      typeof payload.result.first_name === "string" &&
      payload.result.first_name.trim().length > 0
        ? payload.result.first_name.trim()
        : null,
    canJoinGroups: payload.result.can_join_groups === true,
    canReadAllGroupMessages:
      payload.result.can_read_all_group_messages === true,
    supportsInlineQueries: payload.result.supports_inline_queries === true,
    telegramLink: buildTelegramLink(username),
  };
}
