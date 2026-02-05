// Logger utility

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (process.env.NODE_ENV === "development") {
      const styles: Record<LogLevel, string> = {
        debug: "color: #6b7280",
        info: "color: #3b82f6",
        warn: "color: #f59e0b",
        error: "color: #ef4444",
      };

      console.log(
        `%c[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
        styles[level],
        context || ""
      );
    }

    // Send errors to analytics in production
    if (level === "error" && process.env.NODE_ENV === "production") {
      this.sendToAnalytics(entry);
    }
  }

  private sendToAnalytics(entry: LogEntry): void {
    // Implement analytics integration here
    // Example: Sentry, LogRocket, etc.
    if (typeof window !== "undefined" && (window as unknown as { gtag?: unknown }).gtag) {
      (window as unknown as { gtag: (type: string, name: string, params: Record<string, unknown>) => void }).gtag("event", "exception", {
        description: entry.message,
        fatal: entry.level === "error",
      });
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
