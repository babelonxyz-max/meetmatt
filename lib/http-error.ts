export interface StatusError {
  status: number;
  message: string;
}

/**
 * Normalize thrown values from route handlers.
 * Many handlers throw plain objects like { status, message }.
 */
export function getStatusError(error: unknown): StatusError | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeStatus = (error as { status?: unknown }).status;
  if (typeof maybeStatus !== "number") {
    return null;
  }

  const maybeMessage = (error as { message?: unknown }).message;
  return {
    status: maybeStatus,
    message: typeof maybeMessage === "string" && maybeMessage.length > 0
      ? maybeMessage
      : "Request failed",
  };
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
