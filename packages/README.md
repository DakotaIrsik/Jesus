# Packages

Shared libraries and utilities for the Jesus AI agent orchestration platform.

## Available Packages

### @jesus/logging

Centralized JSON logging with PII redaction and correlation IDs.

**Features:**
- Structured JSON logging with Pino
- Automatic PII redaction (emails, phone numbers, credit cards, API keys)
- Request correlation tracking across distributed services
- Express/Fastify middleware
- TypeScript support

See [logging/README.md](logging/README.md) for full documentation.

### @jesus/types

Shared TypeScript types and interfaces for the platform.

**Includes:**
- Provider types (AI model providers, health status)
- Model types (capabilities, configuration, usage metrics)
- Task types (definitions, status, priorities, execution context)
- Routing types (policies, decisions, canary configurations)
- Agent types (configuration, tools, state, checkpoints)
- Monitoring types (metrics, alerts, health checks, tracing)

See [types/README.md](types/README.md) for full documentation.

## Usage

Install packages from the monorepo:

```bash
# Install as workspace dependency
pnpm add @jesus/logging --filter @jesus/mcp-server
pnpm add @jesus/types --filter @jesus/mcp-server
```

## Development

```bash
# Build all packages
pnpm -r build

# Test all packages
pnpm -r test

# Lint all packages
pnpm -r lint
```