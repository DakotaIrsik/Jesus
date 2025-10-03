# @jesus/logging

Centralized JSON logging library with PII redaction and correlation ID support for the Jesus agentic AI platform.

## Features

- 📝 **Structured JSON logging** - Built on Pino for high-performance structured logging
- 🔒 **PII redaction** - Automatic redaction of sensitive data (emails, SSNs, credit cards, API keys, etc.)
- 🔗 **Correlation IDs** - Request tracking across distributed services
- 🎯 **Type-safe** - Full TypeScript support
- 🧪 **Well-tested** - Comprehensive test coverage

## Installation

```bash
npm install @jesus/logging
```

## Quick Start

```typescript
import { createLogger, CorrelationManager } from '@jesus/logging';

// Create a logger
const logger = createLogger({
  service: 'my-service',
  environment: 'production',
  level: 'info',
});

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Failed to process request', new Error('Connection timeout'));

// With correlation context
CorrelationManager.run({ correlationId: 'abc-123' }, () => {
  logger.info('Processing request');
  // Logs will include correlationId: 'abc-123'
});
```

## PII Redaction

The logger automatically redacts sensitive information:

```typescript
logger.info('User email: john@example.com');
// Output: User email: [REDACTED_EMAIL]

logger.info('Credit card: 4532-1234-5678-9010');
// Output: Credit card: [REDACTED_CC]

logger.info('Login attempt', {
  username: 'john',
  password: 'secret123', // Automatically redacted
  apiKey: 'sk_live_abc123', // Automatically redacted
});
```

### Built-in Redaction Rules

- Email addresses
- SSN (Social Security Numbers)
- Credit card numbers
- Phone numbers
- IP addresses
- API keys
- Bearer tokens
- Passwords

### Custom Redaction Rules

```typescript
const logger = createLogger();
const redactionService = logger.getRedactionService();

redactionService.addRule({
  name: 'custom-id',
  pattern: /CUST-\d{6}/g,
  replacement: '[REDACTED_CUSTOMER_ID]',
});
```

## Correlation IDs

Track requests across services using correlation IDs:

```typescript
import { CorrelationManager } from '@jesus/logging';

// Generate and use correlation context
const correlationId = CorrelationManager.generateId();
CorrelationManager.run({ correlationId }, () => {
  // All logs in this context will include the correlation ID
  logger.info('Processing started');
  processRequest();
  logger.info('Processing completed');
});

// Express/Fastify middleware
app.use(CorrelationManager.middleware());
```

## Child Loggers

Create specialized loggers with additional context:

```typescript
const logger = createLogger({ service: 'api' });
const authLogger = logger.child({ module: 'auth' });

authLogger.info('User authenticated'); // Includes module: 'auth'
```

## Configuration

```typescript
interface LoggerConfig {
  level?: LogLevel; // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  service?: string; // Service name
  environment?: string; // Environment (dev, staging, prod)
  pretty?: boolean; // Pretty print for development
  redactPaths?: string[]; // Additional paths to redact
  redactPatterns?: RegExp[]; // Additional redaction patterns
  destination?: NodeJS.WritableStream; // Custom destination
}
```

## API Reference

### Logger

- `logger.trace(message, metadata?)` - Log at trace level
- `logger.debug(message, metadata?)` - Log at debug level
- `logger.info(message, metadata?)` - Log at info level
- `logger.warn(message, metadata?)` - Log at warn level
- `logger.error(message, error?, metadata?)` - Log at error level
- `logger.fatal(message, error?, metadata?)` - Log at fatal level
- `logger.child(bindings)` - Create child logger
- `logger.getPino()` - Get underlying Pino instance
- `logger.getRedactionService()` - Get redaction service

### CorrelationManager

- `CorrelationManager.generateId()` - Generate new correlation ID
- `CorrelationManager.run(context, fn)` - Run function with context
- `CorrelationManager.getContext()` - Get current context
- `CorrelationManager.getCorrelationId()` - Get current correlation ID
- `CorrelationManager.setContext(context)` - Update current context
- `CorrelationManager.middleware()` - Create middleware for web frameworks

### RedactionService

- `redactionService.redactString(input)` - Redact PII from string
- `redactionService.redactObject(obj)` - Redact PII from object
- `redactionService.addRule(rule)` - Add custom redaction rule
- `redactionService.getRules()` - Get all redaction rules

## Testing

```bash
npm test
npm run test:watch
```

## Building

```bash
npm run build
```

## License

MIT
