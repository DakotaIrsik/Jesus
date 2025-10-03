import { describe, it, expect } from 'vitest';
import {
  getCorrelationContext,
  setCorrelationContext,
  runWithCorrelationContext,
  generateCorrelationId,
} from './correlation.js';

describe('Correlation', () => {
  describe('generateCorrelationId', () => {
    it('should generate a valid UUID', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('runWithCorrelationContext', () => {
    it('should set correlation context for function execution', () => {
      const result = runWithCorrelationContext(
        { correlationId: 'test-123' },
        () => {
          const context = getCorrelationContext();
          return context?.correlationId;
        },
      );
      expect(result).toBe('test-123');
    });

    it('should generate correlationId if not provided', () => {
      const result = runWithCorrelationContext({}, () => {
        const context = getCorrelationContext();
        return context?.correlationId;
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should include optional context fields', () => {
      const result = runWithCorrelationContext(
        {
          correlationId: 'test-123',
          requestId: 'req-456',
          userId: 'user-789',
        },
        () => {
          const context = getCorrelationContext();
          return context;
        },
      );
      expect(result?.correlationId).toBe('test-123');
      expect(result?.requestId).toBe('req-456');
      expect(result?.userId).toBe('user-789');
    });

    it('should isolate contexts between calls', () => {
      const result1 = runWithCorrelationContext(
        { correlationId: 'test-1' },
        () => {
          return getCorrelationContext()?.correlationId;
        },
      );

      const result2 = runWithCorrelationContext(
        { correlationId: 'test-2' },
        () => {
          return getCorrelationContext()?.correlationId;
        },
      );

      expect(result1).toBe('test-1');
      expect(result2).toBe('test-2');
    });

    it('should handle nested contexts', () => {
      const result = runWithCorrelationContext(
        { correlationId: 'outer' },
        () => {
          const outer = getCorrelationContext()?.correlationId;
          const inner = runWithCorrelationContext(
            { correlationId: 'inner' },
            () => {
              return getCorrelationContext()?.correlationId;
            },
          );
          const afterInner = getCorrelationContext()?.correlationId;
          return { outer, inner, afterInner };
        },
      );

      expect(result.outer).toBe('outer');
      expect(result.inner).toBe('inner');
      expect(result.afterInner).toBe('outer');
    });

    it('should return function result', () => {
      const result = runWithCorrelationContext({ correlationId: 'test' }, () => {
        return 42;
      });
      expect(result).toBe(42);
    });

    it('should handle async functions', async () => {
      const result = await runWithCorrelationContext(
        { correlationId: 'async-test' },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return getCorrelationContext()?.correlationId;
        },
      );
      expect(result).toBe('async-test');
    });
  });

  describe('getCorrelationContext', () => {
    it('should return undefined when no context is set', () => {
      const context = getCorrelationContext();
      expect(context).toBeUndefined();
    });

    it('should return current context when set', () => {
      runWithCorrelationContext({ correlationId: 'test-context' }, () => {
        const context = getCorrelationContext();
        expect(context?.correlationId).toBe('test-context');
      });
    });
  });

  describe('setCorrelationContext', () => {
    it('should update existing context', () => {
      runWithCorrelationContext({ correlationId: 'initial' }, () => {
        setCorrelationContext({ correlationId: 'initial', userId: 'user-123' });
        const context = getCorrelationContext();
        expect(context?.correlationId).toBe('initial');
        expect(context?.userId).toBe('user-123');
      });
    });

    it('should merge with existing context', () => {
      runWithCorrelationContext(
        { correlationId: 'test', requestId: 'req-1' },
        () => {
          setCorrelationContext({ correlationId: 'test', userId: 'user-1' });
          const context = getCorrelationContext();
          expect(context?.correlationId).toBe('test');
          expect(context?.requestId).toBe('req-1');
          expect(context?.userId).toBe('user-1');
        },
      );
    });

    it('should not affect context outside runWithCorrelationContext', () => {
      runWithCorrelationContext({ correlationId: 'test' }, () => {
        setCorrelationContext({ correlationId: 'test', userId: 'user-1' });
      });
      const context = getCorrelationContext();
      expect(context).toBeUndefined();
    });
  });
});
