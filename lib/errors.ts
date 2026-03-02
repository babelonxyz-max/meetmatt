/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number = 60) {
    super("Rate limit exceeded", 429, "RATE_LIMIT");
    this.retryAfter = retryAfter;
  }
  retryAfter: number;
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

/**
 * Format error for API response
 */
export function formatError(error: Error | AppError) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...(error instanceof ValidationError && error.details && { details: error.details }),
      ...(error instanceof RateLimitError && { retryAfter: error.retryAfter }),
    };
  }

  // Unknown error - don't expose details in production
  return {
    error: process.env.NODE_ENV === "production" 
      ? "Internal server error" 
      : error.message,
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}

/**
 * Get HTTP status code from error
 */
export function getStatusCode(error: Error | AppError): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}
