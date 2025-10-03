import { describe, it, expect } from 'vitest';
import { RedactionService, DEFAULT_REDACTION_RULES } from './redaction.js';

describe('RedactionService', () => {
  describe('redactString', () => {
    it('should redact email addresses', () => {
      const service = new RedactionService();
      const input = 'Contact us at support@example.com for help';
      const result = service.redactString(input);
      expect(result).toBe('Contact us at [REDACTED_EMAIL] for help');
    });

    it('should redact SSN', () => {
      const service = new RedactionService();
      const input = 'SSN: 123-45-6789';
      const result = service.redactString(input);
      expect(result).toBe('SSN: [REDACTED_SSN]');
    });

    it('should redact credit card numbers', () => {
      const service = new RedactionService();
      const input = 'Card: 4532-1234-5678-9010';
      const result = service.redactString(input);
      expect(result).toBe('Card: [REDACTED_CC]');
    });

    it('should redact phone numbers', () => {
      const service = new RedactionService();
      const input = 'Call (555) 123-4567';
      const result = service.redactString(input);
      expect(result).not.toContain('(555) 123-4567');
      expect(result).toContain('[REDACTED_PHONE]');
    });

    it('should redact IP addresses', () => {
      const service = new RedactionService();
      const input = 'Server: 192.168.1.100';
      const result = service.redactString(input);
      expect(result).toBe('Server: [REDACTED_IP]');
    });

    it('should redact API keys', () => {
      const service = new RedactionService();
      const input = 'api_key=sk_test_1234567890abcdefghij';
      const result = service.redactString(input);
      expect(result).toBe('api_key=[REDACTED_API_KEY]');
    });

    it('should redact Bearer tokens', () => {
      const service = new RedactionService();
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = service.redactString(input);
      expect(result).toBe('Authorization: Bearer [REDACTED_TOKEN]');
    });

    it('should redact passwords', () => {
      const service = new RedactionService();
      const input = 'password=SuperSecret123!';
      const result = service.redactString(input);
      expect(result).toBe('password=[REDACTED_PASSWORD]');
    });

    it('should redact multiple PII types in one string', () => {
      const service = new RedactionService();
      const input =
        'User john@example.com with SSN 123-45-6789 called from (555) 123-4567';
      const result = service.redactString(input);
      expect(result).not.toContain('john@example.com');
      expect(result).not.toContain('123-45-6789');
      expect(result).not.toContain('(555) 123-4567');
    });
  });

  describe('redactObject', () => {
    it('should redact strings in objects', () => {
      const service = new RedactionService();
      const input = {
        message: 'Email: test@example.com',
        nested: {
          data: 'SSN: 123-45-6789',
        },
      };
      const result = service.redactObject(input);
      expect(result).toEqual({
        message: 'Email: [REDACTED_EMAIL]',
        nested: {
          data: 'SSN: [REDACTED_SSN]',
        },
      });
    });

    it('should redact sensitive field names', () => {
      const service = new RedactionService();
      const input = {
        username: 'john',
        password: 'secret123',
        apiKey: 'key123',
        data: 'normal',
      };
      const result = service.redactObject(input);
      expect(result).toEqual({
        username: 'john',
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
        data: 'normal',
      });
    });

    it('should handle arrays', () => {
      const service = new RedactionService();
      const input = ['test@example.com', 'normal text', '123-45-6789'];
      const result = service.redactObject(input);
      expect(result).toEqual([
        '[REDACTED_EMAIL]',
        'normal text',
        '[REDACTED_SSN]',
      ]);
    });

    it('should handle null and undefined', () => {
      const service = new RedactionService();
      expect(service.redactObject(null)).toBeNull();
      expect(service.redactObject(undefined)).toBeUndefined();
    });

    it('should handle deeply nested objects', () => {
      const service = new RedactionService();
      const input = {
        level1: {
          level2: {
            level3: {
              email: 'test@example.com',
            },
          },
        },
      };
      const result = service.redactObject(input) as typeof input;
      // Email field is sensitive so gets redacted to [REDACTED]
      // But the value also contains an email address which gets pattern-matched
      expect(result.level1.level2.level3.email).not.toContain('test@example.com');
    });
  });

  describe('addRule', () => {
    it('should allow adding custom rules', () => {
      const service = new RedactionService();
      service.addRule({
        name: 'custom',
        pattern: /CUSTOM-\d{4}/g,
        replacement: '[REDACTED_CUSTOM]',
      });
      const result = service.redactString('ID: CUSTOM-1234');
      expect(result).toBe('ID: [REDACTED_CUSTOM]');
    });
  });

  describe('DEFAULT_REDACTION_RULES', () => {
    it('should export default rules', () => {
      expect(DEFAULT_REDACTION_RULES).toBeDefined();
      expect(DEFAULT_REDACTION_RULES.length).toBeGreaterThan(0);
      expect(DEFAULT_REDACTION_RULES[0]).toHaveProperty('name');
      expect(DEFAULT_REDACTION_RULES[0]).toHaveProperty('pattern');
      expect(DEFAULT_REDACTION_RULES[0]).toHaveProperty('replacement');
    });
  });
});
