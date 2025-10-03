# Jesus

AI agent orchestration platform with Model Context Protocol (MCP) support.

## Overview

Jesus is a polyglot monorepo for building and orchestrating AI agents. It provides MCP-compliant server infrastructure for agent communication.

## Project Structure

```
├── apps/              # Application services
│   └── mcp-server/   # MCP protocol server with HTTP + JSON-RPC
├── packages/         # Shared libraries
│   ├── logging/      # Centralized JSON logging with PII redaction
│   └── types/        # Shared TypeScript types and interfaces
├── infra/            # Infrastructure and deployment configs
├── tools/            # Build and development tools
├── docs/             # Project documentation
└── examples/         # Usage examples
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker (optional, for containerized deployment)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## MCP Server

The MCP server (`apps/mcp-server`) provides a Model Context Protocol implementation with:

- **JSON-RPC 2.0** endpoints for agent communication
- **MCP protocol methods**: initialize, resources/list, prompts/list, tools/list
- **Health checks** for Kubernetes deployments (`/healthz`, `/readyz`)
- **Capabilities discovery** via `/capabilities` endpoint

> **Note**: Tool implementations (filesystem, GitHub, test runner) are planned for future releases.

See [apps/mcp-server/README.md](apps/mcp-server/README.md) for details.

### Quick Start

```bash
cd apps/mcp-server

# Development mode
pnpm dev

# Production build
pnpm build
pnpm start

# Docker
docker build -t jesus/mcp-server:latest -f apps/mcp-server/Dockerfile .
docker run -p 3000:3000 jesus/mcp-server:latest
```

## Development

### Code Quality

The project includes pre-commit hooks for:
- ESLint (code linting)
- Prettier (formatting)
- TypeScript type checking
- Commitlint (conventional commits)
- Secret scanning (detect-secrets)

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

### CI/CD

GitHub Actions workflows provide:
- Automated testing on push/PR
- Multi-language support (Node.js, Python, Go)
- Security scanning (npm audit, pip-audit, osv-scanner)
- Docker image building

## Architecture

The platform is designed for:
- **Modularity**: Polyglot packages with clear boundaries
- **Safety**: Comprehensive validation and audit logging
- **Observability**: Health checks, structured logging
- **Standards**: MCP protocol compliance, conventional commits

## License

MIT
