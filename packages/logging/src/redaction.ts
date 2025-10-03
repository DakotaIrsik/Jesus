import type { RedactionRule } from './types.js';

/**
 * Default PII redaction rules
 */
export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
  },
  {
    name: 'creditCard',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_CC]',
  },
  {
    name: 'phoneNumber',
    pattern: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  {
    name: 'ipAddress',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[REDACTED_IP]',
  },
  {
    name: 'apiKey',
    pattern: /\b[Aa][Pp][Ii][-_]?[Kk][Ee][Yy]\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/g,
    replacement: 'api_key=[REDACTED_API_KEY]',
  },
  {
    name: 'bearerToken',
    pattern: /\b[Bb]earer\s+([a-zA-Z0-9_-]{20,})/g,
    replacement: 'Bearer [REDACTED_TOKEN]',
  },
  {
    name: 'password',
    pattern:
      /\b[Pp]ass(word|wd)?\s*[:=]\s*['"]?([^'"}\s]{8,})['"]?/g,
    replacement: 'password=[REDACTED_PASSWORD]',
  },
];

/**
 * Redaction service for PII data
 */
export class RedactionService {
  private rules: RedactionRule[];

  constructor(customRules: RedactionRule[] = []) {
    this.rules = [...DEFAULT_REDACTION_RULES, ...customRules];
  }

  /**
   * Redact PII from a string
   */
  redactString(input: string): string {
    let result = input;
    for (const rule of this.rules) {
      result = result.replace(rule.pattern, rule.replacement);
    }
    return result;
  }

  /**
   * Redact PII from an object recursively
   */
  redactObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redactString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Redact known sensitive field names
        if (this.isSensitiveField(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = this.redactObject(value);
        }
      }
      return result;
    }

    return obj;
  }

  /**
   * Check if a field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'passwd',
      'pwd',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'privateKey',
      'private_key',
      'ssn',
      'creditCard',
      'credit_card',
      'cvv',
    ];

    const lowerFieldName = fieldName.toLowerCase();
    return sensitiveFields.some((field) =>
      lowerFieldName.includes(field.toLowerCase())
    );
  }

  /**
   * Add custom redaction rules
   */
  addRule(rule: RedactionRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all redaction rules
   */
  getRules(): readonly RedactionRule[] {
    return this.rules;
  }
}
