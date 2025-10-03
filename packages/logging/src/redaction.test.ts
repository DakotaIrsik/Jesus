import { describe, it, expect } from 'vitest';
import {
  redactString,
  redactObject,
  deepRedact,
  DEFAULT_REDACTION_RULES,
} from './redaction.js';

describe('Redaction', () => {
  describe('redactString', () => {
    it('should redact email addresses', () => {
      const input = 'Contact us at support@example.com for help';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_EMAIL]');
      expect(result).not.toContain('support@example.com');
    });

    it('should redact phone numbers', () => {
      const input = 'Call me at 555-123-4567';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_PHONE]');
      expect(result).not.toContain('555-123-4567');
    });

    it('should redact SSN', () => {
      const input = 'SSN: 123-45-6789';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_SSN]');
      expect(result).not.toContain('123-45-6789');
    });

    it('should redact credit card numbers', () => {
      const input = 'Card: 4532-1234-5678-9010';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_CC]');
      expect(result).not.toContain('4532-1234-5678-9010');
    });

    it('should redact API keys', () => {
      const input = 'api_key=sk_test_abcdefghijklmnopqrstuvwxyz';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_API_KEY]');
      expect(result).not.toContain('sk_test_abcdefghijklmnopqrstuvwxyz');
    });

    it('should redact bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_TOKEN]');
    });

    it('should redact passwords', () => {
      const input = 'password=mySecretPassword123';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_PASSWORD]');
      expect(result).not.toContain('mySecretPassword123');
    });

    it('should redact AWS access keys', () => {
      const input = 'AWS Key: AKIAIOSFODNN7EXAMPLE';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_AWS_KEY]');
      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should redact JWTs', () => {
      const input =
        'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_JWT]');
    });

    it('should handle multiple redactions in same string', () => {
      const input = 'Email: test@example.com, Phone: 555-123-4567';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toContain('[REDACTED_EMAIL]');
      expect(result).toContain('[REDACTED_PHONE]');
      expect(result).not.toContain('test@example.com');
      expect(result).not.toContain('555-123-4567');
    });

    it('should not modify strings without sensitive data', () => {
      const input = 'This is a normal string';
      const result = redactString(input, DEFAULT_REDACTION_RULES);
      expect(result).toBe(input);
    });
  });

  describe('redactObject', () => {
    it('should redact specified paths', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      };
      const result = redactObject(obj, ['password']);
      expect(result).toEqual({
        username: 'john',
        password: '[REDACTED]',
        email: 'john@example.com',
      });
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'john',
          credentials: {
            password: 'secret123',
          },
        },
      };
      const result = redactObject(obj, ['password']);
      expect(result).toEqual({
        user: {
          name: 'john',
          credentials: {
            password: '[REDACTED]',
          },
        },
      });
    });

    it('should handle arrays', () => {
      const obj = {
        users: [
          { name: 'john', password: 'secret1' },
          { name: 'jane', password: 'secret2' },
        ],
      };
      const result = redactObject(obj, ['password']);
      expect(result).toEqual({
        users: [
          { name: 'john', password: '[REDACTED]' },
          { name: 'jane', password: '[REDACTED]' },
        ],
      });
    });

    it('should handle null and undefined', () => {
      expect(redactObject(null, ['password'])).toBeNull();
      expect(redactObject(undefined, ['password'])).toBeUndefined();
    });

    it('should handle non-object primitives', () => {
      expect(redactObject('string', ['password'])).toBe('string');
      expect(redactObject(123, ['password'])).toBe(123);
      expect(redactObject(true, ['password'])).toBe(true);
    });
  });

  describe('deepRedact', () => {
    it('should apply both path and pattern redaction', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        contact: 'Email me at john@example.com',
      };
      const result = deepRedact(obj, ['password']);
      expect((result as any).password).toBe('[REDACTED]');
      expect((result as any).contact).toContain('[REDACTED_EMAIL]');
      expect((result as any).username).toBe('john');
    });

    it('should handle deeply nested structures', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              email: 'test@example.com',
              password: 'secret',
            },
          },
        },
      };
      const result = deepRedact(obj, ['password']) as any;
      expect(result.level1.level2.level3.password).toBe('[REDACTED]');
      expect(result.level1.level2.level3.email).toContain('[REDACTED_EMAIL]');
    });

    it('should handle mixed arrays and objects', () => {
      const obj = {
        users: [
          {
            name: 'john',
            email: 'john@example.com',
            password: 'secret1',
          },
          {
            name: 'jane',
            email: 'jane@example.com',
            password: 'secret2',
          },
        ],
      };
      const result = deepRedact(obj, ['password']) as any;
      expect(result.users[0].password).toBe('[REDACTED]');
      expect(result.users[0].email).toContain('[REDACTED_EMAIL]');
      expect(result.users[1].password).toBe('[REDACTED]');
      expect(result.users[1].email).toContain('[REDACTED_EMAIL]');
    });

    it('should use custom redaction rules', () => {
      const customRules = [
        {
          name: 'custom',
          pattern: /SECRET-\w+/g,
          replacement: '[CUSTOM_REDACTED]',
        },
      ];
      const obj = { data: 'This is SECRET-DATA' };
      const result = deepRedact(obj, [], customRules) as any;
      expect(result.data).toContain('[CUSTOM_REDACTED]');
      expect(result.data).not.toContain('SECRET-DATA');
    });
  });

  describe('DEFAULT_REDACTION_RULES', () => {
    it('should have all expected rules', () => {
      const ruleNames = DEFAULT_REDACTION_RULES.map((rule) => rule.name);
      expect(ruleNames).toContain('email');
      expect(ruleNames).toContain('phone');
      expect(ruleNames).toContain('ssn');
      expect(ruleNames).toContain('credit_card');
      expect(ruleNames).toContain('api_key');
      expect(ruleNames).toContain('bearer_token');
      expect(ruleNames).toContain('password');
      expect(ruleNames).toContain('aws_access_key');
      expect(ruleNames).toContain('jwt');
    });

    it('should have valid regex patterns', () => {
      DEFAULT_REDACTION_RULES.forEach((rule) => {
        expect(rule.pattern).toBeInstanceOf(RegExp);
        expect(rule.pattern.global).toBe(true);
      });
    });

    it('should have non-empty replacements', () => {
      DEFAULT_REDACTION_RULES.forEach((rule) => {
        expect(rule.replacement).toBeDefined();
        expect(typeof rule.replacement).toBe('string');
      });
    });
  });
});
