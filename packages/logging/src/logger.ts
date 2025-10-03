import pino from 'pino';
import type { LoggerConfig, LogMetadata } from './types.js';
import { deepRedact, DEFAULT_REDACTION_RULES } from './redaction.js';
import { getCorrelationContext } from './correlation.js';

/**
 * Logger class with PII redaction and correlation support
 */
export class Logger {
  private pinoLogger: pino.Logger;
  private config: Required<LoggerConfig>;
  private redactionRules: any[];

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level || 'info',
      service: config.service || 'unknown',
      environment: config.environment || process.env['NODE_ENV'] || 'development',
      pretty: config.pretty ?? process.env['NODE_ENV'] === 'development',
      redactPaths: config.redactPaths || [
        'password',
        'secret',
        'token',
        'apiKey',
        'api_key',
        'authorization',
        'auth',
        'credentials',
        'pwd',
        'passwd',
      ],
      redactPatterns: config.redactPatterns || [],
      destination: config.destination || process.stdout,
    };

    // Combine default and custom redaction patterns
    this.redactionRules = [
      ...DEFAULT_REDACTION_RULES,
      ...this.config.redactPatterns.map((pattern, index) => ({
        name: `custom_${index}`,
        pattern,
        replacement: '[REDACTED]',
      })),
    ];

    // Create pino logger
    this.pinoLogger = pino(
      {
        level: this.config.level as string,
        base: {
          service: this.config.service,
          environment: this.config.environment,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => ({ level: label }),
        },
        redact: {
          paths: this.config.redactPaths,
          censor: '[REDACTED]',
        },
      },
      this.config.pretty
        ? pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          })
        : this.config.destination,
    );
  }

  /**
   * Add correlation context to metadata
   */
  private enrichMetadata(metadata?: LogMetadata): LogMetadata {
    const correlationContext = getCorrelationContext();
    const enriched: LogMetadata = {
      ...(correlationContext || {}),
      ...(metadata || {}),
    };
    return enriched;
  }

  /**
   * Redact sensitive data from metadata
   */
  private redactMetadata(metadata: LogMetadata): LogMetadata {
    return deepRedact(
      metadata,
      this.config.redactPaths,
      this.redactionRules,
    ) as LogMetadata;
  }

  /**
   * Log a message at trace level
   */
  trace(message: string, metadata?: LogMetadata): void {
    const enriched = this.enrichMetadata(metadata);
    const redacted = this.redactMetadata(enriched);
    this.pinoLogger.trace(redacted, message);
  }

  /**
   * Log a message at debug level
   */
  debug(message: string, metadata?: LogMetadata): void {
    const enriched = this.enrichMetadata(metadata);
    const redacted = this.redactMetadata(enriched);
    this.pinoLogger.debug(redacted, message);
  }

  /**
   * Log a message at info level
   */
  info(message: string, metadata?: LogMetadata): void {
    const enriched = this.enrichMetadata(metadata);
    const redacted = this.redactMetadata(enriched);
    this.pinoLogger.info(redacted, message);
  }

  /**
   * Log a message at warn level
   */
  warn(message: string, metadata?: LogMetadata): void {
    const enriched = this.enrichMetadata(metadata);
    const redacted = this.redactMetadata(enriched);
    this.pinoLogger.warn(redacted, message);
  }

  /**
   * Log a message at error level
   */
  error(message: string, metadata?: LogMetadata): void;
  error(message: string, error: Error, metadata?: LogMetadata): void;
  error(
    message: string,
    errorOrMetadata?: Error | LogMetadata,
    metadata?: LogMetadata,
  ): void {
    let finalMetadata: LogMetadata = {};
    let error: Error | undefined;

    if (errorOrMetadata instanceof Error) {
      error = errorOrMetadata;
      finalMetadata = metadata || {};
    } else {
      finalMetadata = errorOrMetadata || {};
    }

    const enriched = this.enrichMetadata(finalMetadata);
    const redacted = this.redactMetadata(enriched);

    if (error) {
      this.pinoLogger.error(
        {
          ...redacted,
          err: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message,
      );
    } else {
      this.pinoLogger.error(redacted, message);
    }
  }

  /**
   * Log a message at fatal level
   */
  fatal(message: string, metadata?: LogMetadata): void;
  fatal(message: string, error: Error, metadata?: LogMetadata): void;
  fatal(
    message: string,
    errorOrMetadata?: Error | LogMetadata,
    metadata?: LogMetadata,
  ): void {
    let finalMetadata: LogMetadata = {};
    let error: Error | undefined;

    if (errorOrMetadata instanceof Error) {
      error = errorOrMetadata;
      finalMetadata = metadata || {};
    } else {
      finalMetadata = errorOrMetadata || {};
    }

    const enriched = this.enrichMetadata(finalMetadata);
    const redacted = this.redactMetadata(enriched);

    if (error) {
      this.pinoLogger.fatal(
        {
          ...redacted,
          err: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message,
      );
    } else {
      this.pinoLogger.fatal(redacted, message);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(bindings: LogMetadata): Logger {
    const childLogger = new Logger(this.config);
    const safeBindings = bindings || {};
    childLogger.pinoLogger = this.pinoLogger.child(
      this.redactMetadata(safeBindings),
    );
    return childLogger;
  }

  /**
   * Flush any pending logs (useful before process exit)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.pinoLogger.flush(() => resolve());
    });
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}
