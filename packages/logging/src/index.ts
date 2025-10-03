/**
 * @packageDocumentation
 * Centralized logging library with PII redaction and correlation support
 */

export { Logger, createLogger } from './logger.js';
export {
  getCorrelationContext,
  setCorrelationContext,
  runWithCorrelationContext,
  generateCorrelationId,
  correlationMiddleware,
  correlationPlugin,
} from './correlation.js';
export {
  redactString,
  redactObject,
  deepRedact,
  DEFAULT_REDACTION_RULES,
} from './redaction.js';
export type {
  LogLevel,
  CorrelationContext,
  LogMetadata,
  LoggerConfig,
  RedactionRule,
  LogEntry,
} from './types.js';
export { LogLevel as LogLevelEnum } from './types.js';
