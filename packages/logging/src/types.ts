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
 * Correlation ID context
 */
export interface CorrelationContext {
  correlationId: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
}

/**
 * Log entry metadata
 */
export interface LogMetadata {
  [key: string]: unknown;
  correlationId?: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  timestamp?: string;
  service?: string;
  environment?: string;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level?: LogLevel | string;
  service?: string;
  environment?: string;
  pretty?: boolean;
  redactPaths?: string[];
  redactPatterns?: RegExp[];
  destination?: NodeJS.WritableStream;
}

/**
 * PII redaction rule
 */
export interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}
