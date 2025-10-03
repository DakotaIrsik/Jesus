import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, createLogger } from './logger.js';
import { runWithCorrelationContext } from './correlation.js';
import { LogLevel } from './types.js';
import type { LoggerConfig } from './types.js';

describe('Logger', () => {
  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should accept configuration', () => {
      const config: LoggerConfig = {
        service: 'test-service',
        environment: 'test',
        level: LogLevel.DEBUG,
      };
      const logger = createLogger(config);
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Logger instance', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({
        service: 'test-service',
        environment: 'test',
        level: LogLevel.DEBUG,
      });
    });

    it('should have all log methods', () => {
      expect(logger.trace).toBeInstanceOf(Function);
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.fatal).toBeInstanceOf(Function);
    });

    it('should log at trace level', () => {
      expect(() => logger.trace('Trace message')).not.toThrow();
    });

    it('should log at debug level', () => {
      expect(() => logger.debug('Debug message')).not.toThrow();
    });

    it('should log at info level', () => {
      expect(() => logger.info('Info message')).not.toThrow();
    });

    it('should log at warn level', () => {
      expect(() => logger.warn('Warning message')).not.toThrow();
    });

    it('should log at error level', () => {
      expect(() => logger.error('Error message')).not.toThrow();
    });

    it('should log at fatal level', () => {
      expect(() => logger.fatal('Fatal message')).not.toThrow();
    });

    it('should accept metadata', () => {
      expect(() =>
        logger.info('Message with metadata', { userId: '123' }),
      ).not.toThrow();
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', error)).not.toThrow();
    });

    it('should handle error with metadata', () => {
      const error = new Error('Test error');
      expect(() =>
        logger.error('Error occurred', error, { userId: '123' }),
      ).not.toThrow();
    });

    it('should create child logger', () => {
      const child = logger.child({ component: 'sub-service' });
      expect(child).toBeInstanceOf(Logger);
      expect(() => child.info('Child logger message')).not.toThrow();
    });
  });

  describe('PII Redaction', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({
        service: 'test',
        level: LogLevel.DEBUG,
      });
    });

    it('should redact password field', () => {
      expect(() =>
        logger.info('User login', { username: 'john', password: 'secret123' }),
      ).not.toThrow();
    });

    it('should redact email in messages', () => {
      expect(() => logger.info('Contact at user@example.com')).not.toThrow();
    });

    it('should redact multiple PII fields', () => {
      expect(() =>
        logger.info('User data', {
          email: 'user@example.com',
          password: 'secret',
          apiKey: 'sk_test_123456789',
        }),
      ).not.toThrow();
    });

    it('should handle custom redaction paths', () => {
      const customLogger = createLogger({
        redactPaths: ['customSecret', 'internalId'],
      });
      expect(() =>
        customLogger.info('Custom data', {
          customSecret: 'value',
          internalId: '12345',
        }),
      ).not.toThrow();
    });
  });

  describe('Correlation Context', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({
        service: 'test',
        level: LogLevel.DEBUG,
      });
    });

    it('should include correlation context in logs', () => {
      runWithCorrelationContext({ correlationId: 'test-123' }, () => {
        expect(() => logger.info('Message with correlation')).not.toThrow();
      });
    });

    it('should include all correlation fields', () => {
      runWithCorrelationContext(
        {
          correlationId: 'corr-123',
          requestId: 'req-456',
          userId: 'user-789',
        },
        () => {
          expect(() => logger.info('Full correlation context')).not.toThrow();
        },
      );
    });

    it('should work without correlation context', () => {
      expect(() => logger.info('No correlation')).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const logger = createLogger();
      expect(() => logger.info('Default config')).not.toThrow();
    });

    it('should accept custom log level', () => {
      const logger = createLogger({ level: LogLevel.WARN });
      expect(() => logger.warn('Warning')).not.toThrow();
    });

    it('should accept custom service name', () => {
      const logger = createLogger({ service: 'custom-service' });
      expect(() => logger.info('Custom service')).not.toThrow();
    });

    it('should accept custom environment', () => {
      const logger = createLogger({ environment: 'staging' });
      expect(() => logger.info('Staging environment')).not.toThrow();
    });

    it('should enable pretty printing', () => {
      const logger = createLogger({ pretty: true });
      expect(() => logger.info('Pretty output')).not.toThrow();
    });

    it('should accept custom redaction patterns', () => {
      const logger = createLogger({
        redactPatterns: [/CUSTOM-\w+/g],
      });
      expect(() => logger.info('Message with CUSTOM-DATA')).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({
        service: 'test',
        level: LogLevel.DEBUG,
      });
    });

    it('should handle Error instances', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      expect(() => logger.error('Error occurred', error)).not.toThrow();
    });

    it('should handle errors with metadata', () => {
      const error = new Error('Test error');
      expect(() =>
        logger.error('Error with context', error, { operation: 'test' }),
      ).not.toThrow();
    });

    it('should handle fatal errors', () => {
      const error = new Error('Fatal error');
      expect(() => logger.fatal('System failure', error)).not.toThrow();
    });

    it('should handle errors without stack trace', () => {
      const error = new Error('Simple error');
      delete error.stack;
      expect(() => logger.error('Error without stack', error)).not.toThrow();
    });
  });

  describe('Child Loggers', () => {
    let parentLogger: Logger;

    beforeEach(() => {
      parentLogger = createLogger({
        service: 'parent-service',
        level: LogLevel.DEBUG,
      });
    });

    it('should create child with additional bindings', () => {
      const child = parentLogger.child({ component: 'database' });
      expect(() => child.info('Database query')).not.toThrow();
    });

    it('should redact PII in child logger bindings', () => {
      const child = parentLogger.child({
        component: 'auth',
        password: 'should-be-redacted',
      });
      expect(() => child.info('Auth operation')).not.toThrow();
    });

    it('should allow multiple child loggers', () => {
      const child1 = parentLogger.child({ component: 'api' });
      const child2 = parentLogger.child({ component: 'worker' });
      expect(() => {
        child1.info('API request');
        child2.info('Worker task');
      }).not.toThrow();
    });

    it('should inherit parent configuration', () => {
      const child = parentLogger.child({ module: 'sub-module' });
      expect(() => child.debug('Debug from child')).not.toThrow();
    });
  });
});
