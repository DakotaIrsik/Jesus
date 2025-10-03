# @jesus/logging

Centralized JSON logging library with PII redaction and request correlation IDs.

## Features

- **Structured JSON Logging**: Built on Pino for high-performance structured logging
- **PII Redaction**: Automatic redaction of sensitive data (emails, phone numbers, credit cards, API keys, etc.)
- **Correlation IDs**: Track requests across distributed services with correlation context
- **Express/Fastify Middleware**: Built-in middleware for web frameworks
- **TypeScript Support**: Full TypeScript types and interfaces
- **Configurable**: Flexible configuration for different environments

## Installation

```bash
npm install @jesus/logging
```

## Quick Start

```typescript
import { createLogger, runWithCorrelationContext } from '@jesus/logging';

// Create a logger instance
const logger = createLogger({
  service: 'my-service',
  environment: 'production',
  level: 'info',
});

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', new Error('Connection timeout'));

// With correlation context
runWithCorrelationContext({ correlationId: 'abc-123' }, () => {
  logger.info('Processing request'); // Includes correlationId automatically
});
```

## Correlation Middleware

### Express

```typescript
import express from 'express';
import { correlationMiddleware, createLogger } from '@jesus/logging';

const app = express();
const logger = createLogger({ service: 'api' });

app.use(correlationMiddleware());

app.get('/users', (req, res) => {
  logger.info('Fetching users'); // Includes correlation context automatically
  res.json({ users: [] });
});
```

### Fastify

```typescript
import fastify from 'fastify';
import { correlationPlugin, createLogger } from '@jesus/logging';

const app = fastify();
const logger = createLogger({ service: 'api' });

app.register(correlationPlugin);

app.get('/users', async (request, reply) => {
  logger.info('Fetching users'); // Includes correlation context automatically
  return { users: [] };
});
```

## PII Redaction

The library automatically redacts sensitive information:

```typescript
logger.info('User data', {
  email: 'user@example.com', // Redacted
  phone: '555-123-4567', // Redacted
  password: 'secret123', // Redacted
  username: 'john_doe', // Not redacted
});
```

### Custom Redaction Rules

```typescript
const logger = createLogger({
  redactPaths: ['customSecret', 'privateData'],
  redactPatterns: [/internal-\w+/gi],
});
```

## Configuration

```typescript
interface LoggerConfig {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service?: string;
  environment?: string;
  pretty?: boolean;
  redactPaths?: string[];
  redactPatterns?: RegExp[];
  destination?: NodeJS.WritableStream;
}
```

## API Reference

### Logger Methods

- `logger.trace(message, metadata?)`: Log at trace level
- `logger.debug(message, metadata?)`: Log at debug level
- `logger.info(message, metadata?)`: Log at info level
- `logger.warn(message, metadata?)`: Log at warn level
- `logger.error(message, error?, metadata?)`: Log at error level
- `logger.fatal(message, error?, metadata?)`: Log at fatal level
- `logger.child(bindings)`: Create child logger with additional context
- `logger.flush()`: Flush pending logs

### Correlation Functions

- `getCorrelationContext()`: Get current correlation context
- `setCorrelationContext(context)`: Update current correlation context
- `runWithCorrelationContext(context, fn)`: Run function with correlation context
- `generateCorrelationId()`: Generate new correlation ID

### Redaction Functions

- `redactString(input, rules)`: Redact patterns in string
- `redactObject(obj, paths)`: Redact paths in object
- `deepRedact(obj, paths, rules)`: Deep redaction with both paths and patterns

## License

MIT
