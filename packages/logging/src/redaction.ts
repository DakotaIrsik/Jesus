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
    name: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
  },
  {
    name: 'credit_card',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_CC]',
  },
  {
    name: 'api_key',
    pattern: /\b(?:api[-_]?key|apikey)[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    replacement: 'api_key=[REDACTED_API_KEY]',
  },
  {
    name: 'bearer_token',
    pattern: /\b(bearer|token)\s+([a-zA-Z0-9_.]{20,})\b/gi,
    replacement: 'Bearer [REDACTED_TOKEN]',
  },
  {
    name: 'password',
    pattern: /\b(?:password|passwd|pwd)[:=]\s*['"]?([^'"\s]{8,})['"]?/gi,
    replacement: 'password=[REDACTED_PASSWORD]',
  },
  {
    name: 'aws_access_key',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    replacement: '[REDACTED_AWS_KEY]',
  },
  {
    name: 'jwt',
    pattern: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
    replacement: '[REDACTED_JWT]',
  },
  {
    name: 'ip_address',
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: '[REDACTED_IP]',
  },
];

/**
 * Redacts sensitive information from a string using the provided rules
 */
export function redactString(input: string, rules: RedactionRule[]): string {
  let result = input;
  for (const rule of rules) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

/**
 * Redacts sensitive fields from an object using path-based redaction
 */
export function redactObject(
  obj: unknown,
  paths: string[] = [],
  visitedObjects = new WeakSet(),
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (visitedObjects.has(obj as object)) {
    return '[Circular]';
  }
  visitedObjects.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, paths, visitedObjects));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (paths.includes(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value, paths, visitedObjects);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Deep clone and redact an object
 */
export function deepRedact(
  obj: unknown,
  paths: string[] = [],
  rules: RedactionRule[] = DEFAULT_REDACTION_RULES,
): unknown {
  // First apply path-based redaction
  let result = redactObject(obj, paths);

  // Then apply pattern-based redaction to string values
  const redactStringsInObject = (data: unknown): unknown => {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return redactString(data, rules);
    }

    if (Array.isArray(data)) {
      return data.map(redactStringsInObject);
    }

    if (typeof data === 'object') {
      const redacted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        redacted[key] = redactStringsInObject(value);
      }
      return redacted;
    }

    return data;
  };

  result = redactStringsInObject(result);
  return result;
}

/**
 * Sensitive field name patterns to check for redaction
 */
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /secret/i,
  /api[-_]?key/i,
  /apikey/i,
  /access[-_]?token/i,
  /accesstoken/i,
  /refresh[-_]?token/i,
  /refreshtoken/i,
  /private[-_]?key/i,
  /privatekey/i,
  /token/i,
  /auth/i,
  /bearer/i,
  /cvv/i,
  /ssn/i,
];

/**
 * RedactionService class for managing redaction rules and performing redactions
 */
export class RedactionService {
  private rules: RedactionRule[];

  constructor(rules: RedactionRule[] = DEFAULT_REDACTION_RULES) {
    this.rules = [...rules];
  }

  /**
   * Redact a string using the current rules
   */
  redactString(input: string): string {
    return redactString(input, this.rules);
  }

  /**
   * Check if a field name is sensitive based on common patterns
   */
  private isSensitiveField(fieldName: string): boolean {
    return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
  }

  /**
   * Redact an object, applying both field-name-based and pattern-based redaction
   */
  redactObject(obj: unknown, visitedObjects = new WeakSet()): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle circular references
    if (visitedObjects.has(obj as object)) {
      return '[Circular]';
    }
    visitedObjects.add(obj as object);

    // Handle Date objects
    if (obj instanceof Date) {
      return obj;
    }

    // Handle RegExp objects
    if (obj instanceof RegExp) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => {
        if (typeof item === 'string') {
          return this.redactString(item);
        }
        return this.redactObject(item, visitedObjects);
      });
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      // Redact if field name matches sensitive patterns
      if (this.isSensitiveField(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        // Apply pattern-based redaction to string values
        result[key] = this.redactString(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactObject(value, visitedObjects);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Add a custom redaction rule
   */
  addRule(rule: RedactionRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all current rules
   */
  getRules(): RedactionRule[] {
    return [...this.rules];
  }
}
