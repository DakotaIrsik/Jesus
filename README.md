# Jesus

AI agent orchestration platform with polyglot workspace support.

## Overview

Jesus is a monorepo-based AI agent orchestration platform supporting both TypeScript and Python workspaces with strict coding standards, comprehensive testing, and security scanning.

## Features

- **Polyglot Monorepo**: TypeScript (pnpm) and Python (uv) workspace support
- **MCP Server**: Model Context Protocol server with JSON-RPC 2.0 implementation
- **Strict Standards**: ESLint, Prettier, Ruff, Black, and TypeScript/mypy strict mode
- **Pre-commit Hooks**: Automated linting, formatting, and type checking
- **Security**: Automated secret scanning, dependency auditing, and vulnerability scanning

## Directory Structure

```
.
├── apps/
│   └── mcp-server/      # Model Context Protocol server
├── packages/            # Shared TypeScript packages
├── tools/               # Development tools and scripts
├── infra/               # Infrastructure configuration
├── docs/                # Documentation
└── examples/            # Example implementations
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Python >= 3.11 (for Python workspaces)

### Installation

```bash
# Install dependencies
pnpm install

# Setup pre-commit hooks
pnpm prepare
```

### Development

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

### Security Scanning

```bash
# Run all security checks
pnpm security:npm    # Node.js dependency audit
pnpm security:pip    # Python dependency audit
pnpm security:osv    # OSV Scanner for vulnerabilities
```

## Applications

### MCP Server

The Model Context Protocol server provides JSON-RPC 2.0 endpoints for AI agent communication. Located in `apps/mcp-server/`. See [apps/mcp-server/README.md](apps/mcp-server/README.md) for details.

```bash
# Run MCP server in development
cd apps/mcp-server
pnpm dev

# Build and run in production
pnpm build
pnpm start

# Run with Docker
docker build -t jesus/mcp-server:latest -f apps/mcp-server/Dockerfile .
docker run -p 3000:3000 jesus/mcp-server:latest
```

## Coding Standards

This project enforces strict coding standards:

### TypeScript
- **ESLint**: Type-checked rules with strict configuration
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode enabled

### Python
- **Ruff**: Fast Python linter (E, W, F, I, B, C4, UP rules)
- **Black**: Code formatter
- **mypy**: Strict type checking

### Commit Messages
- **Conventional Commits**: Enforced via commitlint
- **Semantic Release**: Automated versioning and releases

## Pre-commit Hooks

Pre-commit hooks run automatically on `git commit`:

- Lint and format TypeScript/JavaScript files
- Lint and format Python files
- Type check all code
- Validate YAML, JSON, TOML files
- Scan for secrets (detect-secrets)
- Check trailing whitespace and EOF

## Security

Automated security scanning via GitHub Actions:

- **npm audit**: Node.js dependency vulnerability scanning
- **pip-audit**: Python dependency vulnerability scanning
- **OSV Scanner**: Multi-ecosystem vulnerability detection
- **Secret scanning**: Detect exposed credentials with detect-secrets

## License

MIT