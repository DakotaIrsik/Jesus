import { describe, it, expect } from 'vitest';
import { LogLevel } from './types.js';
import type { CorrelationContext, LogMetadata, LoggerConfig, RedactionRule } from './types.js';

describe('Types', () => {
  describe('LogLevel', () => {
    it('should have all expected log levels', () => {
      expect(LogLevel.TRACE).toBe('trace');
      expect(LogLevel.DEBUG).toBe('debug');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.ERROR).toBe('error');
      expect(LogLevel.FATAL).toBe('fatal');
    });

    it('should have exactly 6 log levels', () => {
      const levels = Object.values(LogLevel);
      expect(levels).toHaveLength(6);
    });

    it('should contain only lowercase string values', () => {
      const levels = Object.values(LogLevel);
      levels.forEach((level) => {
        expect(typeof level).toBe('string');
        expect(level).toBe(level.toLowerCase());
      });
    });
  });

  describe('CorrelationContext', () => {
    it('should accept valid correlation context', () => {
      const context: CorrelationContext = {
        correlationId: 'test-correlation-id',
        requestId: 'test-request-id',
        sessionId: 'test-session-id',
        userId: 'test-user-id',
      };

      expect(context.correlationId).toBe('test-correlation-id');
      expect(context.requestId).toBe('test-request-id');
      expect(context.sessionId).toBe('test-session-id');
      expect(context.userId).toBe('test-user-id');
    });

    it('should accept minimal correlation context', () => {
      const context: CorrelationContext = {
        correlationId: 'minimal-id',
      };

      expect(context.correlationId).toBe('minimal-id');
      expect(context.requestId).toBeUndefined();
      expect(context.sessionId).toBeUndefined();
      expect(context.userId).toBeUndefined();
    });

    it('should accept context with only optional fields populated', () => {
      const context: CorrelationContext = {
        correlationId: 'id',
        requestId: 'req-123',
      };

      expect(context.correlationId).toBe('id');
      expect(context.requestId).toBe('req-123');
    });
  });

  describe('LogMetadata', () => {
    it('should accept arbitrary metadata fields', () => {
      const metadata: LogMetadata = {
        customField1: 'value1',
        customField2: 123,
        customField3: true,
        customField4: { nested: 'object' },
        customField5: ['array', 'values'],
      };

      expect(metadata.customField1).toBe('value1');
      expect(metadata.customField2).toBe(123);
      expect(metadata.customField3).toBe(true);
      expect(metadata.customField4).toEqual({ nested: 'object' });
      expect(metadata.customField5).toEqual(['array', 'values']);
    });

    it('should accept all correlation context fields', () => {
      const metadata: LogMetadata = {
        correlationId: 'corr-id',
        requestId: 'req-id',
        sessionId: 'session-id',
        userId: 'user-id',
      };

      expect(metadata.correlationId).toBe('corr-id');
      expect(metadata.requestId).toBe('req-id');
      expect(metadata.sessionId).toBe('session-id');
      expect(metadata.userId).toBe('user-id');
    });

    it('should accept standard log fields', () => {
      const metadata: LogMetadata = {
        timestamp: '2024-01-01T00:00:00Z',
        service: 'test-service',
        environment: 'production',
      };

      expect(metadata.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(metadata.service).toBe('test-service');
      expect(metadata.environment).toBe('production');
    });

    it('should handle mixed standard and custom fields', () => {
      const metadata: LogMetadata = {
        correlationId: 'id-123',
        customMetric: 42,
        tags: ['tag1', 'tag2'],
      };

      expect(metadata.correlationId).toBe('id-123');
      expect(metadata.customMetric).toBe(42);
      expect(metadata.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('LoggerConfig', () => {
    it('should accept full configuration', () => {
      const config: LoggerConfig = {
        level: LogLevel.DEBUG,
        service: 'my-service',
        environment: 'staging',
        pretty: true,
        redactPaths: ['password', 'secret'],
        redactPatterns: [/api[-_]?key/gi],
        destination: process.stdout,
      };

      expect(config.level).toBe(LogLevel.DEBUG);
      expect(config.service).toBe('my-service');
      expect(config.environment).toBe('staging');
      expect(config.pretty).toBe(true);
      expect(config.redactPaths).toEqual(['password', 'secret']);
      expect(config.redactPatterns).toHaveLength(1);
      expect(config.destination).toBe(process.stdout);
    });

    it('should accept minimal configuration', () => {
      const config: LoggerConfig = {};

      expect(config.level).toBeUndefined();
      expect(config.service).toBeUndefined();
      expect(config.environment).toBeUndefined();
      expect(config.pretty).toBeUndefined();
      expect(config.redactPaths).toBeUndefined();
      expect(config.redactPatterns).toBeUndefined();
      expect(config.destination).toBeUndefined();
    });

    it('should accept string log level', () => {
      const config: LoggerConfig = {
        level: 'info',
      };

      expect(config.level).toBe('info');
    });

    it('should accept LogLevel enum value', () => {
      const config: LoggerConfig = {
        level: LogLevel.WARN,
      };

      expect(config.level).toBe(LogLevel.WARN);
    });

    it('should accept empty redaction arrays', () => {
      const config: LoggerConfig = {
        redactPaths: [],
        redactPatterns: [],
      };

      expect(config.redactPaths).toEqual([]);
      expect(config.redactPatterns).toEqual([]);
    });

    it('should accept multiple redaction patterns', () => {
      const config: LoggerConfig = {
        redactPatterns: [
          /password/gi,
          /api[-_]?key/gi,
          /bearer\s+\w+/gi,
        ],
      };

      expect(config.redactPatterns).toHaveLength(3);
    });
  });

  describe('RedactionRule', () => {
    it('should accept valid redaction rule', () => {
      const rule: RedactionRule = {
        name: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[REDACTED_EMAIL]',
      };

      expect(rule.name).toBe('email');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.replacement).toBe('[REDACTED_EMAIL]');
    });

    it('should accept rule with simple pattern', () => {
      const rule: RedactionRule = {
        name: 'simple',
        pattern: /test/g,
        replacement: '[REDACTED]',
      };

      expect(rule.name).toBe('simple');
      expect(rule.pattern.source).toBe('test');
      expect(rule.replacement).toBe('[REDACTED]');
    });

    it('should accept rule with complex pattern', () => {
      const rule: RedactionRule = {
        name: 'complex',
        pattern: /(?:password|pwd|passwd)\s*[:=]\s*['"]?([^'"}\s]{8,})['"]?/gi,
        replacement: 'password=[REDACTED]',
      };

      expect(rule.name).toBe('complex');
      expect(rule.pattern.source).toContain('password');
      expect(rule.pattern.flags).toContain('g');
      expect(rule.pattern.flags).toContain('i');
    });

    it('should accept rule with empty replacement', () => {
      const rule: RedactionRule = {
        name: 'remove',
        pattern: /sensitive/g,
        replacement: '',
      };

      expect(rule.replacement).toBe('');
    });

    it('should accept rule with unicode in replacement', () => {
      const rule: RedactionRule = {
        name: 'unicode',
        pattern: /secret/g,
        replacement: '🔒 [REDACTED]',
      };

      expect(rule.replacement).toBe('🔒 [REDACTED]');
    });
  });
});
