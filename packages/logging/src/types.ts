/**
 * Log level enumeration
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Correlation context for tracking requests across services
 */
export interface CorrelationContext {
  /** Unique identifier for correlating logs across services */
  correlationId: string;
  /** Request ID for HTTP requests */
  requestId?: string;
  /** Session ID for user sessions */
  sessionId?: string;
  /** User ID for authenticated requests */
  userId?: string;
}

/**
 * Metadata that can be attached to log entries
 */
export interface LogMetadata {
  [key: string]: unknown;
}

/**
 * Redaction rule for PII protection
 */
export interface RedactionRule {
  /** Name of the redaction rule */
  name: string;
  /** Regular expression pattern to match */
  pattern: RegExp;
  /** Replacement string for matched content */
  replacement: string;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel | string;
  /** Service name for logging context */
  service?: string;
  /** Environment name (e.g., production, staging, development) */
  environment?: string;
  /** Enable pretty-printed output for development */
  pretty?: boolean;
  /** Paths to redact in JSON objects (e.g., ['password', 'secret']) */
  redactPaths?: string[];
  /** Patterns to redact in log messages */
  redactPatterns?: RegExp[];
  /** Destination stream for log output */
  destination?: NodeJS.WritableStream;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel | string;
  /** Log message */
  message: string;
  /** Service name */
  service?: string;
  /** Environment */
  environment?: string;
  /** Correlation context */
  correlationId?: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}
