import { describe, it, expect, beforeEach } from 'vitest';
import { CorrelationManager } from './correlation.js';

describe('CorrelationManager', () => {
  beforeEach(() => {
    // Clear any existing context
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = CorrelationManager.generateId();
      const id2 = CorrelationManager.generateId();
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with timestamp and random component', () => {
      const id = CorrelationManager.generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('run and getContext', () => {
    it('should store and retrieve correlation context', () => {
      const context = {
        correlationId: 'test-correlation-id',
        requestId: 'test-request-id',
      };

      CorrelationManager.run(context, () => {
        const retrieved = CorrelationManager.getContext();
        expect(retrieved).toEqual(context);
      });
    });

    it('should return undefined outside of context', () => {
      const context = CorrelationManager.getContext();
      expect(context).toBeUndefined();
    });

    it('should isolate contexts in nested runs', () => {
      const context1 = { correlationId: 'id1' };
      const context2 = { correlationId: 'id2' };

      CorrelationManager.run(context1, () => {
        expect(CorrelationManager.getCorrelationId()).toBe('id1');

        CorrelationManager.run(context2, () => {
          expect(CorrelationManager.getCorrelationId()).toBe('id2');
        });

        expect(CorrelationManager.getCorrelationId()).toBe('id1');
      });
    });
  });

  describe('getCorrelationId', () => {
    it('should return correlation ID from context', () => {
      const context = { correlationId: 'test-id' };

      CorrelationManager.run(context, () => {
        expect(CorrelationManager.getCorrelationId()).toBe('test-id');
      });
    });

    it('should return undefined without context', () => {
      expect(CorrelationManager.getCorrelationId()).toBeUndefined();
    });
  });

  describe('setContext', () => {
    it('should update existing context', () => {
      const context = { correlationId: 'id1' };

      CorrelationManager.run(context, () => {
        CorrelationManager.setContext({ requestId: 'req1' });
        const updated = CorrelationManager.getContext();
        expect(updated).toEqual({
          correlationId: 'id1',
          requestId: 'req1',
        });
      });
    });

    it('should not throw when called without context', () => {
      expect(() => {
        CorrelationManager.setContext({ requestId: 'req1' });
      }).not.toThrow();
    });
  });

  describe('middleware', () => {
    it('should create middleware function', () => {
      const middleware = CorrelationManager.middleware();
      expect(typeof middleware).toBe('function');
    });

    it('should extract correlation ID from headers', () => {
      const middleware = CorrelationManager.middleware();
      const req = {
        headers: {
          'x-correlation-id': 'existing-correlation-id',
          'x-request-id': 'existing-request-id',
        },
      };

      let contextInside;
      const next = () => {
        contextInside = CorrelationManager.getContext();
      };

      middleware(req, {}, next);

      expect(contextInside).toEqual({
        correlationId: 'existing-correlation-id',
        requestId: 'existing-request-id',
      });
    });

    it('should generate correlation ID if not in headers', () => {
      const middleware = CorrelationManager.middleware();
      const req = { headers: {} };

      let contextInside;
      const next = () => {
        contextInside = CorrelationManager.getContext();
      };

      middleware(req, {}, next);

      expect(contextInside?.correlationId).toBeDefined();
      expect(contextInside?.requestId).toBeDefined();
    });

    it('should handle array header values', () => {
      const middleware = CorrelationManager.middleware();
      const req = {
        headers: {
          'x-correlation-id': ['first', 'second'],
        },
      };

      let contextInside;
      const next = () => {
        contextInside = CorrelationManager.getContext();
      };

      middleware(req, {}, next);

      expect(contextInside?.correlationId).toBeDefined();
      expect(contextInside?.requestId).toBeDefined();
    });
  });
});
