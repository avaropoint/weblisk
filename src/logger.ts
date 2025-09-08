/**
 * Production-grade logging system for Weblisk
 */

export interface LogLevel {
  name: string;
  value: number;
  color: string;
}

export const LOG_LEVELS: Record<string, LogLevel> = {
  DEBUG: { name: "DEBUG", value: 0, color: "\x1b[36m" }, // Cyan
  INFO: { name: "INFO", value: 1, color: "\x1b[32m" }, // Green
  WARN: { name: "WARN", value: 2, color: "\x1b[33m" }, // Yellow
  ERROR: { name: "ERROR", value: 3, color: "\x1b[31m" }, // Red
} as const;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  component?: string;
  sessionId?: string;
  connectionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableContext: boolean;
  format: "json" | "text";
}

export class WebliskLogger {
  private config: LoggerConfig;
  private static instance: WebliskLogger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LOG_LEVELS.INFO,
      enableColors: true,
      enableTimestamp: true,
      enableContext: true,
      format: "text",
      ...config,
    };
  }

  static getInstance(config?: Partial<LoggerConfig>): WebliskLogger {
    if (!WebliskLogger.instance) {
      WebliskLogger.instance = new WebliskLogger(config);
    }
    return WebliskLogger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level.value >= this.config.level.value;
  }

  private formatMessage(entry: LogEntry): string {
    if (this.config.format === "json") {
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level.name,
        message: entry.message,
        context: entry.context,
        error: entry.error
          ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
          }
          : undefined,
        component: entry.component,
        sessionId: entry.sessionId,
        connectionId: entry.connectionId,
      });
    }

    const reset = "\x1b[0m";
    const timestamp = this.config.enableTimestamp ? `${entry.timestamp} ` : "";

    const color = this.config.enableColors ? entry.level.color : "";
    const levelText = `[${entry.level.name}]`;

    let message = `${timestamp}${color}${levelText}${reset} ${entry.message}`;

    if (entry.component) {
      message += ` (component: ${entry.component})`;
    }

    if (entry.sessionId) {
      message += ` (session: ${entry.sessionId.slice(-8)})`;
    }

    if (entry.connectionId) {
      message += ` (connection: ${entry.connectionId.slice(-8)})`;
    }

    if (
      this.config.enableContext && entry.context &&
      Object.keys(entry.context).length > 0
    ) {
      message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return message;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    const formattedMessage = this.formatMessage(entry);

    if (level.value >= LOG_LEVELS.ERROR.value) {
      console.error(formattedMessage);
    } else if (level.value >= LOG_LEVELS.WARN.value) {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LOG_LEVELS.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LOG_LEVELS.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LOG_LEVELS.WARN, message, context);
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void {
    this.log(LOG_LEVELS.ERROR, message, context, error);
  }

  // Specialized logging methods for framework events
  logConnection(
    type: "connected" | "disconnected",
    connectionId: string,
    sessionId?: string,
  ): void {
    this.info(`Client ${type}`, {
      connectionId: connectionId.slice(-8),
      sessionId: sessionId?.slice(-8) || "unknown",
    });
  }

  logComponent(
    action: "registered" | "initialized",
    componentName: string,
    context?: Record<string, unknown>,
  ): void {
    this.info(`Component ${action}: ${componentName}`, context);
  }

  logEvent(
    eventName: string,
    componentName: string,
    sessionId?: string,
    context?: Record<string, unknown>,
  ): void {
    this.debug(`Event ${eventName} triggered on ${componentName}`, {
      sessionId: sessionId?.slice(-8) || "unknown",
      ...context,
    });
  }

  logError(
    message: string,
    error: Error,
    context?: Record<string, unknown>,
  ): void {
    this.error(message, error, context);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setFormat(format: "json" | "text"): void {
    this.config.format = format;
  }
}

// Export singleton instance
export const logger: WebliskLogger = WebliskLogger.getInstance();
