import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';
import { CorrelationManager } from './correlation.js';
import { RedactionService } from './redaction.js';
import type { LoggerConfig, LogMetadata } from './types.js';

/**
 * Centralized logger with PII redaction and correlation ID support
 */
export class Logger {
  private pino: PinoLogger;
  private redactionService: RedactionService;
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level || ('info' as const),
      service: config.service || 'unknown',
      environment: config.environment || process.env['NODE_ENV'] || 'development',
      pretty: config.pretty ?? process.env['NODE_ENV'] !== 'production',
      redactPaths: config.redactPaths || [],
      redactPatterns: config.redactPatterns || [],
      destination: config.destination || process.stdout,
    };

    this.redactionService = new RedactionService();

    // Configure pino with redaction
    this.pino = pino(
      {
        level: this.config.level,
        base: {
          service: this.config.service,
          environment: this.config.environment,
        },
        redact: {
          paths: [
            'password',
            'passwd',
            'pwd',
            'secret',
            'token',
            'apiKey',
            'api_key',
            'accessToken',
            'access_token',
            'refreshToken',
            'refresh_token',
            'privateKey',
            'private_key',
            ...this.config.redactPaths,
          ],
          remove: true,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => {
            return { level: label };
          },
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
        : this.config.destination
    );
  }

  /**
   * Prepare log metadata with correlation context
   */
  private prepareMetadata(meta?: LogMetadata): LogMetadata {
    const context = CorrelationManager.getContext();
    const enriched: LogMetadata = {
      ...meta,
      correlationId: context?.correlationId,
      requestId: context?.requestId,
      sessionId: context?.sessionId,
      userId: context?.userId,
    };

    // Remove undefined values
    Object.keys(enriched).forEach((key) => {
      if (enriched[key] === undefined) {
        delete enriched[key];
      }
    });

    return enriched;
  }

  /**
   * Redact PII from message and metadata
   */
  private redact(message: string, meta?: LogMetadata): [string, LogMetadata] {
    const redactedMessage = this.redactionService.redactString(message);
    const redactedMeta = meta
      ? (this.redactionService.redactObject(meta) as LogMetadata)
      : {};
    return [redactedMessage, redactedMeta];
  }

  /**
   * Log at trace level
   */
  trace(message: string, meta?: LogMetadata): void {
    const [redactedMsg, redactedMeta] = this.redact(message, meta);
    this.pino.trace(this.prepareMetadata(redactedMeta), redactedMsg);
  }

  /**
   * Log at debug level
   */
  debug(message: string, meta?: LogMetadata): void {
    const [redactedMsg, redactedMeta] = this.redact(message, meta);
    this.pino.debug(this.prepareMetadata(redactedMeta), redactedMsg);
  }

  /**
   * Log at info level
   */
  info(message: string, meta?: LogMetadata): void {
    const [redactedMsg, redactedMeta] = this.redact(message, meta);
    this.pino.info(this.prepareMetadata(redactedMeta), redactedMsg);
  }

  /**
   * Log at warn level
   */
  warn(message: string, meta?: LogMetadata): void {
    const [redactedMsg, redactedMeta] = this.redact(message, meta);
    this.pino.warn(this.prepareMetadata(redactedMeta), redactedMsg);
  }

  /**
   * Log at error level
   */
  error(message: string, meta?: LogMetadata): void;
  error(message: string, error: Error, meta?: LogMetadata): void;
  error(
    message: string,
    errorOrMeta?: Error | LogMetadata,
    meta?: LogMetadata
  ): void {
    let finalMeta: LogMetadata = {};
    let error: Error | undefined;

    if (errorOrMeta instanceof Error) {
      error = errorOrMeta;
      finalMeta = meta || {};
    } else {
      finalMeta = errorOrMeta || {};
    }

    const [redactedMsg, redactedMeta] = this.redact(message, finalMeta);

    if (error) {
      this.pino.error(
        {
          ...this.prepareMetadata(redactedMeta),
          err: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        },
        redactedMsg
      );
    } else {
      this.pino.error(this.prepareMetadata(redactedMeta), redactedMsg);
    }
  }

  /**
   * Log at fatal level
   */
  fatal(message: string, meta?: LogMetadata): void;
  fatal(message: string, error: Error, meta?: LogMetadata): void;
  fatal(
    message: string,
    errorOrMeta?: Error | LogMetadata,
    meta?: LogMetadata
  ): void {
    let finalMeta: LogMetadata = {};
    let error: Error | undefined;

    if (errorOrMeta instanceof Error) {
      error = errorOrMeta;
      finalMeta = meta || {};
    } else {
      finalMeta = errorOrMeta || {};
    }

    const [redactedMsg, redactedMeta] = this.redact(message, finalMeta);

    if (error) {
      this.pino.fatal(
        {
          ...this.prepareMetadata(redactedMeta),
          err: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        },
        redactedMsg
      );
    } else {
      this.pino.fatal(this.prepareMetadata(redactedMeta), redactedMsg);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(bindings: LogMetadata): Logger {
    const childLogger = new Logger(this.config);
    childLogger.pino = this.pino.child(bindings);
    return childLogger;
  }

  /**
   * Get the underlying pino instance
   */
  getPino(): PinoLogger {
    return this.pino;
  }

  /**
   * Get the redaction service
   */
  getRedactionService(): RedactionService {
    return this.redactionService;
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}
