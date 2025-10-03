# MCP Server

Model Context Protocol (MCP) server for the Jesus AI agent orchestration platform.

## Features

- **JSON-RPC 2.0**: Standard MCP protocol implementation
- **Health Checks**: `/healthz` and `/readyz` endpoints for Kubernetes
- **Capabilities**: Exposes server capabilities via `/capabilities` endpoint
- **Filesystem Tools**: Secure file operations with path protection and size limits
  - `filesystem.read`: Read file contents
  - `filesystem.write`: Write files with directory creation
  - `filesystem.patch`: Apply unified diff patches with rollback
  - `filesystem.search`: Search code with regex (ripgrep-like)
- **GitHub Tools**: Issue and PR management with audit trail
  - `github.issue.create`: Create issues with dry-run support
  - `github.issue.update`: Update issue properties
  - `github.issue.comment`: Add comments to issues/PRs
  - `github.issue.list`: List issues with filters
  - `github.pr.create`: Create pull requests
  - `github.labels.manage`: Add/remove/set labels
- **Test Runner Tools**: Multi-framework test execution
  - `testrunner.run`: Run tests with coverage (Jest, Vitest, Pytest, XUnit, Mocha, AVA)
  - `testrunner.coverage`: Get coverage reports (JSON, LCOV, HTML, text)
- **MCP Methods**:
  - `initialize`: Server initialization and capability negotiation
  - `resources/list`: List available resources
  - `prompts/list`: List available prompts
  - `tools/list`: List available tools
  - `tools/call`: Execute tools (filesystem, GitHub, test runner)

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Docker

```bash
# Build image
docker build -t jesus/mcp-server:latest -f apps/mcp-server/Dockerfile .

# Run container
docker run -p 3000:3000 jesus/mcp-server:latest
```

## Endpoints

- `GET /healthz` - Health check (returns 200 if server is healthy)
- `GET /readyz` - Readiness check (returns 200 if server is ready)
- `GET /capabilities` - Server capabilities
- `POST /rpc` - JSON-RPC 2.0 endpoint for MCP protocol

## Environment Variables

### Filesystem Tool
- `ALLOWED_PATHS` - Comma-separated list of allowed file paths (default: empty, allows all)
- `DENIED_PATHS` - Comma-separated list of denied paths (default: `/etc,/usr/bin,/System`)
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 10485760 = 10MB)
- `STREAM_THRESHOLD` - File size threshold for streaming in bytes (default: 1048576 = 1MB)

### GitHub Tool
- `GITHUB_DRY_RUN` - Enable dry-run mode for all GitHub operations (default: false)
- `GITHUB_AUDIT_LOG` - Enable audit logging (default: true)
- `GITHUB_RATE_LIMIT` - Max requests per minute (default: 60)
- `GITHUB_ALLOWED_OPS` - Comma-separated list of allowed operations (default: all)

### Test Runner Tool
- `TEST_TIMEOUT` - Default test timeout in milliseconds (default: 300000 = 5 minutes)
- `TEST_COVERAGE` - Enable coverage collection (default: true)
- `TEST_MAX_RETRIES` - Max retries for flaky tests (default: 2)
- `TEST_FRAMEWORKS` - Comma-separated allowed frameworks (default: jest,vitest,pytest,xunit)

### Server
- `PORT` - Server port (default: 3000)

## MCP Protocol

This server implements the Model Context Protocol specification. See [modelcontextprotocol.io](https://modelcontextprotocol.io) for details.
