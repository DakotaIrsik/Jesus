/**
 * Centralized logging library with PII redaction and correlation IDs
 * @packageDocumentation
 */

export { Logger, createLogger } from './logger.js';
export { CorrelationManager } from './correlation.js';
export {
  RedactionService,
  DEFAULT_REDACTION_RULES,
} from './redaction.js';
export type {
  LogLevel,
  LoggerConfig,
  LogMetadata,
  CorrelationContext,
  RedactionRule,
} from './types.js';
export { LogLevel as LogLevelEnum } from './types.js';
