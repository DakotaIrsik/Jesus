import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Writable } from 'node:stream';
import { Logger, createLogger } from './logger.js';
import { CorrelationManager } from './correlation.js';
import { LogLevel } from './types.js';

class TestStream extends Writable {
  public logs: string[] = [];

  _write(
    chunk: Buffer | string,
    _encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    this.logs.push(chunk.toString());
    callback();
  }

  getLastLog(): Record<string, unknown> {
    const lastLog = this.logs[this.logs.length - 1];
    return lastLog ? JSON.parse(lastLog) : {};
  }

  getAllLogs(): Array<Record<string, unknown>> {
    return this.logs.map((log) => JSON.parse(log));
  }

  clear(): void {
    this.logs = [];
  }
}

describe('Logger', () => {
  let testStream: TestStream;

  beforeEach(() => {
    testStream = new TestStream();
  });

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom config', () => {
      const logger = createLogger({
        level: LogLevel.DEBUG,
        service: 'test-service',
        environment: 'test',
        pretty: false,
        destination: testStream,
      });
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('log levels', () => {
    it('should log at info level', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Test message');
      const log = testStream.getLastLog();
      expect(log.level).toBe('info');
      expect(log.msg).toBe('Test message');
    });

    it('should log at debug level', () => {
      const logger = new Logger({
        level: LogLevel.DEBUG,
        pretty: false,
        destination: testStream,
      });

      logger.debug('Debug message');
      const log = testStream.getLastLog();
      expect(log.level).toBe('debug');
      expect(log.msg).toBe('Debug message');
    });

    it('should log at warn level', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.warn('Warning message');
      const log = testStream.getLastLog();
      expect(log.level).toBe('warn');
      expect(log.msg).toBe('Warning message');
    });

    it('should log at error level', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.error('Error message');
      const log = testStream.getLastLog();
      expect(log.level).toBe('error');
      expect(log.msg).toBe('Error message');
    });

    it('should log at trace level', () => {
      const logger = new Logger({
        level: LogLevel.TRACE,
        pretty: false,
        destination: testStream,
      });

      logger.trace('Trace message');
      const log = testStream.getLastLog();
      expect(log.level).toBe('trace');
      expect(log.msg).toBe('Trace message');
    });

    it('should log at fatal level', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.fatal('Fatal message');
      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.msg).toBe('Fatal message');
    });
  });

  describe('metadata', () => {
    it('should include metadata in logs', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Test message', { requestCount: 123, action: 'test' });
      const log = testStream.getLastLog();
      expect(log.msg).toBe('Test message');
      // Metadata is included in the log
      expect(log.requestCount).toBe(123);
      expect(log.action).toBe('test');
    });

    it('should include service and environment', () => {
      const logger = new Logger({
        service: 'my-service',
        environment: 'production',
        pretty: false,
        destination: testStream,
      });

      logger.info('Test message');
      const log = testStream.getLastLog();
      expect(log.service).toBe('my-service');
      expect(log.environment).toBe('production');
    });
  });

  describe('correlation context', () => {
    it('should include correlation ID from context', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      CorrelationManager.run({ correlationId: 'test-correlation-id' }, () => {
        logger.info('Test message');
        const log = testStream.getLastLog();
        expect(log.correlationId).toBe('test-correlation-id');
      });
    });

    it('should include request ID from context', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      CorrelationManager.run(
        {
          correlationId: 'corr-id',
          requestId: 'req-id',
        },
        () => {
          logger.info('Test message');
          const log = testStream.getLastLog();
          expect(log.requestId).toBe('req-id');
        }
      );
    });
  });

  describe('PII redaction', () => {
    it('should redact email addresses in messages', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('User email is test@example.com');
      const log = testStream.getLastLog();
      expect(log.msg).not.toContain('test@example.com');
      expect(log.msg).toContain('[REDACTED_EMAIL]');
    });

    it('should redact SSN in messages', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('SSN: 123-45-6789');
      const log = testStream.getLastLog();
      expect(log.msg).not.toContain('123-45-6789');
      expect(log.msg).toContain('[REDACTED_SSN]');
    });

    it('should redact sensitive fields in metadata', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('User login', {
        username: 'john',
        password: 'secret123',
      });
      const log = testStream.getLastLog();
      expect(log.password).toBeUndefined();
    });

    it('should redact PII in nested metadata', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Test', {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      });
      const log = testStream.getLastLog();
      const user = log.user as { email: string };
      expect(user.email).not.toContain('john@example.com');
    });
  });

  describe('error logging', () => {
    it('should log error with Error object', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Test error');
      logger.error('An error occurred', error);
      const log = testStream.getLastLog();
      expect(log.err).toBeDefined();
      const err = log.err as { message: string; name: string };
      expect(err.message).toBe('Test error');
      expect(err.name).toBe('Error');
    });

    it('should log error with metadata and Error object', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Test error');
      logger.error('An error occurred', error, { context: 'test' });
      const log = testStream.getLastLog();
      expect(log.err).toBeDefined();
      expect(log.context).toBe('test');
    });

    it('should log fatal with Error object', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Fatal error');
      logger.fatal('Fatal error occurred', error);
      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.err).toBeDefined();
    });
  });

  describe('child logger', () => {
    it('should create child logger with bindings', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const childLogger = logger.child({ module: 'auth' });
      childLogger.info('Child log');
      const log = testStream.getLastLog();
      expect(log.module).toBe('auth');
    });

    it('should inherit parent configuration', () => {
      const logger = new Logger({
        service: 'parent-service',
        pretty: false,
        destination: testStream,
      });

      const childLogger = logger.child({ module: 'child' });
      childLogger.info('Test');
      const log = testStream.getLastLog();
      expect(log.service).toBe('parent-service');
      expect(log.module).toBe('child');
    });
  });

  describe('getPino', () => {
    it('should return underlying pino instance', () => {
      const logger = new Logger();
      const pino = logger.getPino();
      expect(pino).toBeDefined();
      expect(typeof pino.info).toBe('function');
    });
  });

  describe('getRedactionService', () => {
    it('should return redaction service', () => {
      const logger = new Logger();
      const redactionService = logger.getRedactionService();
      expect(redactionService).toBeDefined();
      expect(typeof redactionService.redactString).toBe('function');
    });
  });
});
