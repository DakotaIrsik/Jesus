import { describe, it, expect, beforeEach } from 'vitest';
import { Writable } from 'node:stream';
import { Logger } from './logger.js';
import { CorrelationManager } from './correlation.js';
import { LogLevel } from './types.js';

class TestStream extends Writable {
  public logs: string[] = [];
  public errors: Error[] = [];

  _write(
    chunk: Buffer | string,
    _encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    try {
      this.logs.push(chunk.toString());
      callback();
    } catch (error) {
      this.errors.push(error as Error);
      callback(error as Error);
    }
  }

  getLastLog(): Record<string, unknown> {
    const lastLog = this.logs[this.logs.length - 1];
    return lastLog ? JSON.parse(lastLog) : {};
  }

  getAllLogs(): Record<string, unknown>[] {
    return this.logs.map((log) => JSON.parse(log));
  }

  clear(): void {
    this.logs = [];
    this.errors = [];
  }
}

describe('Logger - Error Scenarios', () => {
  let testStream: TestStream;

  beforeEach(() => {
    testStream = new TestStream();
  });

  describe('Error Object Handling', () => {
    it('should handle Error with stack trace', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Test error');
      logger.error('Operation failed', error);

      const log = testStream.getLastLog();
      expect(log.err).toBeDefined();
      const err = log.err as any;
      expect(err.message).toBe('Test error');
      expect(err.name).toBe('Error');
      expect(err.stack).toBeDefined();
      expect(err.stack).toContain('Test error');
    });

    it('should handle TypeError', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new TypeError('Invalid type');
      logger.error('Type error occurred', error);

      const log = testStream.getLastLog();
      const err = log.err as any;
      expect(err.name).toBe('TypeError');
      expect(err.message).toBe('Invalid type');
    });

    it('should handle custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new CustomError('Custom error message', 'ERR_CUSTOM');
      logger.error('Custom error', error);

      const log = testStream.getLastLog();
      const err = log.err as any;
      expect(err.name).toBe('CustomError');
      expect(err.message).toBe('Custom error message');
    });

    it('should handle Error without message', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error();
      logger.error('Empty error', error);

      const log = testStream.getLastLog();
      expect(log.err).toBeDefined();
    });

    it('should handle Error with very long message', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const longMessage = 'Error: ' + 'x'.repeat(10000);
      const error = new Error(longMessage);
      logger.error('Long error', error);

      const log = testStream.getLastLog();
      const err = log.err as any;
      expect(err.message.length).toBeGreaterThan(9000);
    });

    it('should handle Error with special characters', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Error with "quotes" and \'apostrophes\' and newlines\n\t');
      logger.error('Special char error', error);

      const log = testStream.getLastLog();
      const err = log.err as any;
      expect(err.message).toContain('quotes');
      expect(err.message).toContain('apostrophes');
    });
  });

  describe('Fatal Error Scenarios', () => {
    it('should log fatal errors with Error object', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Fatal error');
      logger.fatal('System failure', error);

      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.err).toBeDefined();
    });

    it('should log fatal errors without Error object', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.fatal('Critical system failure');

      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.msg).toBe('Critical system failure');
    });

    it('should log fatal with metadata and error', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Database connection lost');
      logger.fatal('Database failure', error, { database: 'postgres', retries: 3 });

      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.database).toBe('postgres');
      expect(log.retries).toBe(3);
      const err = log.err as any;
      expect(err.message).toBe('Database connection lost');
    });
  });

  describe('Logging with Missing Context', () => {
    it('should handle logging when correlation context is undefined', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('No context message');

      const log = testStream.getLastLog();
      expect(log.msg).toBe('No context message');
      expect(log.correlationId).toBeUndefined();
      expect(log.requestId).toBeUndefined();
    });

    it('should handle partial correlation context', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      CorrelationManager.run({ correlationId: 'only-corr-id' }, () => {
        logger.info('Partial context');
        const log = testStream.getLastLog();
        expect(log.correlationId).toBe('only-corr-id');
        expect(log.requestId).toBeUndefined();
        expect(log.sessionId).toBeUndefined();
      });
    });
  });

  describe('Malformed Metadata', () => {
    it('should handle null metadata', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Message', null as any);

      const log = testStream.getLastLog();
      expect(log.msg).toBe('Message');
    });

    it('should handle undefined metadata', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Message', undefined);

      const log = testStream.getLastLog();
      expect(log.msg).toBe('Message');
    });

    it('should handle metadata with undefined values', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Message', {
        field1: 'value',
        field2: undefined,
        field3: null,
      });

      const log = testStream.getLastLog();
      expect(log.field1).toBe('value');
      expect(log.field2).toBeUndefined();
      expect(log.field3).toBeNull();
    });

    it('should handle metadata with circular references', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const circular: any = { name: 'test' };
      circular.self = circular;

      // Pino handles circular refs - should not throw
      expect(() => {
        logger.info('Circular ref', circular);
      }).not.toThrow();
    });

    it('should handle metadata with very deep nesting', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      let deep: any = { value: 'bottom' };
      for (let i = 0; i < 100; i++) {
        deep = { nested: deep };
      }

      expect(() => {
        logger.info('Deep nesting', { data: deep });
      }).not.toThrow();
    });
  });

  describe('Redaction Failures', () => {
    it('should continue logging even if redaction throws', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      // Pass a value that might cause issues
      const problematic = {
        toString: () => {
          throw new Error('toString failed');
        },
      };

      // Should handle gracefully
      expect(() => {
        logger.info('Message', { data: problematic });
      }).not.toThrow();
    });

    it('should handle redaction of very large objects', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const large: any = {};
      for (let i = 0; i < 10000; i++) {
        large[`field${i}`] = `value${i}`;
      }

      expect(() => {
        logger.info('Large object', large);
      }).not.toThrow();
    });
  });

  describe('Child Logger Error Scenarios', () => {
    it('should handle child logger with invalid bindings', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const child = logger.child(null as any);
      expect(child).toBeInstanceOf(Logger);
    });

    it('should propagate errors from child logger', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const child = logger.child({ component: 'auth' });
      const error = new Error('Auth error');
      child.error('Authentication failed', error);

      const log = testStream.getLastLog();
      expect(log.component).toBe('auth');
      const err = log.err as any;
      expect(err.message).toBe('Auth error');
    });

    it('should handle child logger with circular binding references', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const circular: any = { name: 'component' };
      circular.self = circular;

      const child = logger.child(circular);
      expect(() => {
        child.info('Test message');
      }).not.toThrow();
    });
  });

  describe('Stream Errors', () => {
    it('should handle stream write without throwing synchronously', () => {
      // Test that writing to a stream doesn't throw synchronously
      // This verifies the logger uses async I/O properly
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      // Should not throw in sync code
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();

      const log = testStream.getLastLog();
      expect(log.msg).toBe('Test message');
    });
  });

  describe('Log Level Filtering', () => {
    it('should not log below configured level', () => {
      const logger = new Logger({
        level: LogLevel.WARN,
        pretty: false,
        destination: testStream,
      });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const logs = testStream.getAllLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].level).toBe('warn');
      expect(logs[1].level).toBe('error');
    });

    it('should log trace when level is TRACE', () => {
      const logger = new Logger({
        level: LogLevel.TRACE,
        pretty: false,
        destination: testStream,
      });

      logger.trace('Trace message');

      const log = testStream.getLastLog();
      expect(log.level).toBe('trace');
    });

    it('should only log fatal when level is FATAL', () => {
      const logger = new Logger({
        level: LogLevel.FATAL,
        pretty: false,
        destination: testStream,
      });

      logger.error('Error message');
      logger.fatal('Fatal message');

      const logs = testStream.getAllLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('fatal');
    });
  });

  describe('Error Method Overloads', () => {
    it('should handle error(message)', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.error('Simple error message');

      const log = testStream.getLastLog();
      expect(log.msg).toBe('Simple error message');
      expect(log.err).toBeUndefined();
    });

    it('should handle error(message, metadata)', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.error('Error with meta', { code: 500 });

      const log = testStream.getLastLog();
      expect(log.msg).toBe('Error with meta');
      expect(log.code).toBe(500);
      expect(log.err).toBeUndefined();
    });

    it('should handle error(message, error)', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Test error');
      logger.error('Error occurred', error);

      const log = testStream.getLastLog();
      expect(log.msg).toBe('Error occurred');
      expect(log.err).toBeDefined();
    });

    it('should handle error(message, error, metadata)', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('Test error');
      logger.error('Error with all params', error, { context: 'test' });

      const log = testStream.getLastLog();
      expect(log.msg).toBe('Error with all params');
      expect(log.err).toBeDefined();
      expect(log.context).toBe('test');
    });
  });

  describe('Fatal Method Overloads', () => {
    it('should handle fatal(message)', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.fatal('Fatal message');

      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.msg).toBe('Fatal message');
      expect(log.err).toBeUndefined();
    });

    it('should handle fatal(message, metadata)', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.fatal('Fatal with meta', { critical: true });

      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.critical).toBe(true);
    });

    it('should handle fatal(message, error)', () => {
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

    it('should handle fatal(message, error, metadata)', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const error = new Error('System crash');
      logger.fatal('System crashed', error, { component: 'core' });

      const log = testStream.getLastLog();
      expect(log.level).toBe('fatal');
      expect(log.err).toBeDefined();
      expect(log.component).toBe('core');
    });
  });

  describe('Edge Cases in Message Content', () => {
    it('should handle empty string message', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('');

      const log = testStream.getLastLog();
      expect(log.msg).toBe('');
    });

    it('should handle very long messages', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const longMessage = 'x'.repeat(100000);
      logger.info(longMessage);

      const log = testStream.getLastLog();
      expect(log.msg.length).toBe(100000);
    });

    it('should handle messages with newlines and tabs', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Message\nwith\nnewlines\tand\ttabs');

      const log = testStream.getLastLog();
      expect(log.msg).toContain('\n');
      expect(log.msg).toContain('\t');
    });

    it('should handle Unicode messages', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      logger.info('Message with emoji 🚀 and unicode 你好');

      const log = testStream.getLastLog();
      expect(log.msg).toContain('🚀');
      expect(log.msg).toContain('你好');
    });

    it('should handle messages with null bytes', () => {
      const logger = new Logger({
        pretty: false,
        destination: testStream,
      });

      const messageWithNull = 'Before\x00After';
      logger.info(messageWithNull);

      const log = testStream.getLastLog();
      expect(log.msg).toBeDefined();
    });
  });
});
