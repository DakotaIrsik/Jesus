import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { CorrelationContext } from './types.js';

/**
 * AsyncLocalStorage instance for correlation context
 */
const asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Get the current correlation context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Set the correlation context for the current async operation
 */
export function setCorrelationContext(context: CorrelationContext): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    Object.assign(store, context);
  }
}

/**
 * Run a function with a new correlation context
 */
export function runWithCorrelationContext<T>(
  context: Partial<CorrelationContext>,
  fn: () => T,
): T {
  const fullContext: CorrelationContext = {
    correlationId: context.correlationId || randomUUID(),
    ...context,
  };
  return asyncLocalStorage.run(fullContext, fn);
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Express middleware to add correlation ID to requests
 */
export function correlationMiddleware() {
  return (req: any, res: any, next: any) => {
    let correlationId =
      req.headers['x-correlation-id'] ||
      req.headers['x-request-id'];

    // Handle array header values - generate new ID if header is an array
    if (Array.isArray(correlationId)) {
      correlationId = generateCorrelationId();
    } else if (!correlationId) {
      correlationId = generateCorrelationId();
    }

    const context: CorrelationContext = {
      correlationId: correlationId as string,
      requestId: req.id || (req.headers['x-request-id'] as string),
      sessionId: req.sessionID || (req.headers['x-session-id'] as string),
      userId: req.user?.id || (req.headers['x-user-id'] as string),
    };

    // Set response header for correlation
    res.setHeader('x-correlation-id', correlationId);

    // Run the request handler with correlation context
    asyncLocalStorage.run(context, () => {
      next();
    });
  };
}

/**
 * Fastify plugin for correlation context
 */
export function correlationPlugin(fastify: any, _opts: any, done: any) {
  fastify.decorateRequest('correlationContext', null);

  fastify.addHook('onRequest', async (request: any, reply: any) => {
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      generateCorrelationId();

    const context: CorrelationContext = {
      correlationId: correlationId as string,
      requestId: request.id || (request.headers['x-request-id'] as string),
      sessionId: request.headers['x-session-id'] as string,
      userId: (request.user as any)?.id || (request.headers['x-user-id'] as string),
    };

    request.correlationContext = context;
    reply.header('x-correlation-id', correlationId);

    return asyncLocalStorage.run(context, async () => {
      return;
    });
  });

  done();
}

/**
 * CorrelationManager provides a class-based API for managing correlation contexts
 */
export class CorrelationManager {
  /**
   * Generate a new correlation ID
   */
  static generateId(): string {
    return generateCorrelationId();
  }

  /**
   * Get the current correlation context
   */
  static getContext(): CorrelationContext | undefined {
    return getCorrelationContext();
  }

  /**
   * Get the current correlation ID
   */
  static getCorrelationId(): string | undefined {
    return getCorrelationContext()?.correlationId;
  }

  /**
   * Run a function with a correlation context
   */
  static run<T>(context: Partial<CorrelationContext>, fn: () => T): T {
    return runWithCorrelationContext(context, fn);
  }

  /**
   * Set correlation context properties
   */
  static set(context: CorrelationContext): void {
    setCorrelationContext(context);
  }

  /**
   * Set correlation context properties (alias for set)
   */
  static setContext(context: Partial<CorrelationContext>): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, context);
    }
  }

  /**
   * Get Express middleware for correlation context
   */
  static middleware() {
    return correlationMiddleware();
  }
}
