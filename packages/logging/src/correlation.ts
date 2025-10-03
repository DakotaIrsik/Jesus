import { AsyncLocalStorage } from 'node:async_hooks';
import type { CorrelationContext } from './types.js';

/**
 * Correlation ID manager using AsyncLocalStorage
 */
export class CorrelationManager {
  private static storage = new AsyncLocalStorage<CorrelationContext>();

  /**
   * Generate a new correlation ID
   */
  static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Run a function with correlation context
   */
  static run<T>(context: CorrelationContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Get current correlation context
   */
  static getContext(): CorrelationContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Get current correlation ID
   */
  static getCorrelationId(): string | undefined {
    return this.getContext()?.correlationId;
  }

  /**
   * Set correlation context for current async context
   */
  static setContext(context: Partial<CorrelationContext>): void {
    const current = this.getContext();
    if (current) {
      Object.assign(current, context);
    }
  }

  /**
   * Create middleware for Express/Fastify
   */
  static middleware() {
    return (
      req: { headers: Record<string, string | string[] | undefined> },
      _res: unknown,
      next: () => void
    ) => {
      const correlationId =
        (typeof req.headers['x-correlation-id'] === 'string'
          ? req.headers['x-correlation-id']
          : undefined) || this.generateId();

      const requestId =
        (typeof req.headers['x-request-id'] === 'string'
          ? req.headers['x-request-id']
          : undefined) || this.generateId();

      const context: CorrelationContext = {
        correlationId,
        requestId,
      };

      this.run(context, next);
    };
  }
}
