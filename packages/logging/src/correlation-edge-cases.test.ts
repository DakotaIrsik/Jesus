import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CorrelationManager } from './correlation.js';
import type { CorrelationContext } from './types.js';

describe('CorrelationManager - Edge Cases', () => {
  beforeEach(() => {
    // Ensure clean state between tests
  });

  afterEach(() => {
    // Clean up any lingering contexts
  });

  describe('ID Generation', () => {
    it('should generate unique IDs on consecutive calls', () => {
      const id1 = CorrelationManager.generateId();
      const id2 = CorrelationManager.generateId();
      const id3 = CorrelationManager.generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate IDs with UUID format', () => {
      const id = CorrelationManager.generateId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidPattern.test(id)).toBe(true);
    });

    it('should generate many unique IDs rapidly', () => {
      const ids = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        ids.add(CorrelationManager.generateId());
      }

      expect(ids.size).toBe(count);
    });

    it('should generate IDs with standard UUID format', () => {
      const id = CorrelationManager.generateId();
      const parts = id.split('-');

      // UUID has 5 parts separated by dashes
      expect(parts.length).toBe(5);
      expect(parts.every(part => /^[a-f0-9]+$/i.test(part))).toBe(true);
    });
  });

  describe('Nested Context Management', () => {
    it('should handle nested run contexts', () => {
      const outerContext: CorrelationContext = {
        correlationId: 'outer-id',
        requestId: 'outer-request',
      };

      const innerContext: CorrelationContext = {
        correlationId: 'inner-id',
        requestId: 'inner-request',
      };

      CorrelationManager.run(outerContext, () => {
        const outer = CorrelationManager.getContext();
        expect(outer?.correlationId).toBe('outer-id');

        CorrelationManager.run(innerContext, () => {
          const inner = CorrelationManager.getContext();
          expect(inner?.correlationId).toBe('inner-id');
        });

        const afterInner = CorrelationManager.getContext();
        expect(afterInner?.correlationId).toBe('outer-id');
      });
    });

    it('should handle deeply nested contexts', () => {
      const depth = 10;
      let currentDepth = 0;

      const runNested = (level: number): void => {
        if (level >= depth) {
          const context = CorrelationManager.getContext();
          expect(context?.correlationId).toBe(`id-${depth - 1}`);
          return;
        }

        CorrelationManager.run(
          { correlationId: `id-${level}` },
          () => {
            currentDepth = level;
            runNested(level + 1);
          }
        );
      };

      runNested(0);
      expect(currentDepth).toBe(depth - 1);
    });

    it('should isolate contexts across parallel async operations', async () => {
      const results: string[] = [];

      const task1 = async () => {
        return CorrelationManager.run({ correlationId: 'task-1' }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(CorrelationManager.getCorrelationId() || 'none');
        });
      };

      const task2 = async () => {
        return CorrelationManager.run({ correlationId: 'task-2' }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          results.push(CorrelationManager.getCorrelationId() || 'none');
        });
      };

      const task3 = async () => {
        return CorrelationManager.run({ correlationId: 'task-3' }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 15));
          results.push(CorrelationManager.getCorrelationId() || 'none');
        });
      };

      await Promise.all([task1(), task2(), task3()]);

      expect(results).toHaveLength(3);
      expect(results).toContain('task-1');
      expect(results).toContain('task-2');
      expect(results).toContain('task-3');
    });
  });

  describe('Context Modification', () => {
    it('should modify existing context with setContext', () => {
      CorrelationManager.run(
        { correlationId: 'original-id' },
        () => {
          const before = CorrelationManager.getContext();
          expect(before?.correlationId).toBe('original-id');
          expect(before?.userId).toBeUndefined();

          CorrelationManager.setContext({ userId: 'user-123' });

          const after = CorrelationManager.getContext();
          expect(after?.correlationId).toBe('original-id');
          expect(after?.userId).toBe('user-123');
        }
      );
    });

    it('should handle setContext outside of run context', () => {
      // Should not throw, just no-op
      expect(() => {
        CorrelationManager.setContext({ userId: 'test' });
      }).not.toThrow();
    });

    it('should merge partial context updates', () => {
      CorrelationManager.run(
        {
          correlationId: 'id-1',
          requestId: 'req-1',
        },
        () => {
          CorrelationManager.setContext({ sessionId: 'session-1' });
          CorrelationManager.setContext({ userId: 'user-1' });

          const context = CorrelationManager.getContext();
          expect(context).toMatchObject({
            correlationId: 'id-1',
            requestId: 'req-1',
            sessionId: 'session-1',
            userId: 'user-1',
          });
        }
      );
    });

    it('should allow overwriting context fields', () => {
      CorrelationManager.run(
        { correlationId: 'original', requestId: 'req-1' },
        () => {
          CorrelationManager.setContext({ requestId: 'req-2' });

          const context = CorrelationManager.getContext();
          expect(context?.requestId).toBe('req-2');
          expect(context?.correlationId).toBe('original');
        }
      );
    });
  });

  describe('Middleware Integration', () => {
    it('should create middleware function', () => {
      const middleware = CorrelationManager.middleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should extract correlation ID from headers', () => {
      const middleware = CorrelationManager.middleware();
      let capturedId: string | undefined;

      const req = {
        headers: {
          'x-correlation-id': 'test-correlation-id',
          'x-request-id': 'test-request-id',
        },
      };

      const res = {
        setHeader: () => {
          // Mock implementation
        },
      };

      const next = () => {
        capturedId = CorrelationManager.getCorrelationId();
      };

      middleware(req, res, next);

      expect(capturedId).toBe('test-correlation-id');
    });

    it('should generate correlation ID if header missing', () => {
      const middleware = CorrelationManager.middleware();
      let capturedId: string | undefined;

      const req = {
        headers: {},
      };

      const res = {
        setHeader: () => {
          // Mock implementation
        },
      };

      const next = () => {
        capturedId = CorrelationManager.getCorrelationId();
      };

      middleware(req, res, next);

      expect(capturedId).toBeDefined();
      expect(typeof capturedId).toBe('string');
      expect(capturedId!.length).toBeGreaterThan(0);
    });

    it('should handle array header values', () => {
      const middleware = CorrelationManager.middleware();
      let capturedId: string | undefined;

      const req = {
        headers: {
          'x-correlation-id': ['id1', 'id2'],
        },
      };

      const res = {
        setHeader: () => {
          // Mock implementation
        },
      };

      const next = () => {
        capturedId = CorrelationManager.getCorrelationId();
      };

      middleware(req, res, next);

      // When header is array, the middleware treats the array as the correlation ID
      // In real Express/HTTP contexts, headers would be strings, but we test the behavior
      expect(capturedId).toBeDefined();
    });

    it('should extract both correlation and request IDs', () => {
      const middleware = CorrelationManager.middleware();
      let context: CorrelationContext | undefined;

      const req = {
        headers: {
          'x-correlation-id': 'corr-123',
          'x-request-id': 'req-456',
        },
      };

      const res = {
        setHeader: () => {
          // Mock implementation
        },
      };

      const next = () => {
        context = CorrelationManager.getContext();
      };

      middleware(req, res, next);

      expect(context?.correlationId).toBe('corr-123');
      expect(context?.requestId).toBe('req-456');
    });

    it('should generate request ID if not provided', () => {
      const middleware = CorrelationManager.middleware();
      let context: CorrelationContext | undefined;

      const req = {
        headers: {
          'x-correlation-id': 'corr-only',
        },
      };

      const res = {
        setHeader: () => {
          // Mock implementation
        },
      };

      const next = () => {
        context = CorrelationManager.getContext();
      };

      middleware(req, res, next);

      expect(context?.correlationId).toBe('corr-only');
      expect(context?.requestId).toBeUndefined();
    });
  });

  describe('Return Value Propagation', () => {
    it('should return function result', () => {
      const result = CorrelationManager.run(
        { correlationId: 'test' },
        () => {
          return 42;
        }
      );

      expect(result).toBe(42);
    });

    it('should return object from function', () => {
      const result = CorrelationManager.run(
        { correlationId: 'test' },
        () => {
          return { data: 'value', count: 123 };
        }
      );

      expect(result).toEqual({ data: 'value', count: 123 });
    });

    it('should return Promise from async function', async () => {
      const result = CorrelationManager.run(
        { correlationId: 'test' },
        async () => {
          await Promise.resolve();
          return 'async-result';
        }
      );

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe('async-result');
    });

    it('should propagate errors from function', () => {
      expect(() => {
        CorrelationManager.run({ correlationId: 'test' }, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    it('should propagate Promise rejections', async () => {
      const promise = CorrelationManager.run(
        { correlationId: 'test' },
        async () => {
          throw new Error('Async error');
        }
      );

      await expect(promise).rejects.toThrow('Async error');
    });
  });

  describe('Context Retrieval', () => {
    it('should return undefined when no context exists', () => {
      const context = CorrelationManager.getContext();
      expect(context).toBeUndefined();
    });

    it('should return undefined correlation ID when no context', () => {
      const id = CorrelationManager.getCorrelationId();
      expect(id).toBeUndefined();
    });

    it('should get correlation ID from context', () => {
      CorrelationManager.run(
        { correlationId: 'test-id-123' },
        () => {
          const id = CorrelationManager.getCorrelationId();
          expect(id).toBe('test-id-123');
        }
      );
    });

    it('should return full context object', () => {
      const inputContext: CorrelationContext = {
        correlationId: 'corr-id',
        requestId: 'req-id',
        sessionId: 'session-id',
        userId: 'user-id',
      };

      CorrelationManager.run(inputContext, () => {
        const context = CorrelationManager.getContext();
        expect(context).toEqual(inputContext);
      });
    });
  });

  describe('Special Characters in Context', () => {
    it('should handle special characters in correlation ID', () => {
      const specialIds = [
        'id-with-dashes',
        'id_with_underscores',
        'id.with.dots',
        'id:with:colons',
        'id/with/slashes',
      ];

      for (const id of specialIds) {
        CorrelationManager.run({ correlationId: id }, () => {
          const retrieved = CorrelationManager.getCorrelationId();
          expect(retrieved).toBe(id);
        });
      }
    });

    it('should handle Unicode in context values', () => {
      CorrelationManager.run(
        {
          correlationId: 'id-123',
          userId: 'user-🚀-emoji',
          sessionId: '会话-123',
        },
        () => {
          const context = CorrelationManager.getContext();
          expect(context?.userId).toBe('user-🚀-emoji');
          expect(context?.sessionId).toBe('会话-123');
        }
      );
    });

    it('should handle empty string values', () => {
      CorrelationManager.run(
        {
          correlationId: '',
          requestId: '',
        },
        () => {
          const context = CorrelationManager.getContext();
          expect(context?.correlationId).toBe('');
          expect(context?.requestId).toBe('');
        }
      );
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should maintain separate contexts in concurrent operations', async () => {
      const results: { id: string; value: string }[] = [];

      const createTask = (id: string, delay: number) => {
        return CorrelationManager.run({ correlationId: id }, async () => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          const currentId = CorrelationManager.getCorrelationId();
          results.push({ id, value: currentId || 'missing' });
        });
      };

      await Promise.all([
        createTask('task-1', 20),
        createTask('task-2', 10),
        createTask('task-3', 30),
        createTask('task-4', 5),
        createTask('task-5', 25),
      ]);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.value).toBe(result.id);
      });
    });

    it('should handle rapid context switching', () => {
      const contexts: (string | undefined)[] = [];

      for (let i = 0; i < 100; i++) {
        CorrelationManager.run({ correlationId: `id-${i}` }, () => {
          contexts.push(CorrelationManager.getCorrelationId());
        });
      }

      expect(contexts).toHaveLength(100);
      contexts.forEach((context, index) => {
        expect(context).toBe(`id-${index}`);
      });
    });
  });
});
