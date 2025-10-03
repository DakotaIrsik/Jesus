# MCP Server

Model Context Protocol (MCP) server for the Jesus AI agent orchestration platform.

## Features

- **JSON-RPC 2.0**: Standard MCP protocol implementation
- **Health Checks**: `/healthz` and `/readyz` endpoints for Kubernetes
- **Capabilities**: Exposes server capabilities via `/capabilities` endpoint
- **MCP Methods**:
  - `initialize`: Server initialization and capability negotiation
  - `resources/list`: List available resources
  - `prompts/list`: List available prompts
  - `tools/list`: List available tools

## Implemented Tools

### Filesystem Tools
- **read_file**: Read file contents with size limits and encoding support
- **write_file**: Write files with safety checks and backup options
- **apply_patch**: Apply unified diff patches to files
- **search_files**: Search for patterns in files with glob support

### GitHub Tools (via gh CLI)
- **create_issue**: Create GitHub issues
- **update_issue**: Update issue title, body, state
- **create_comment**: Add comments to issues/PRs
- **list_issues**: List and filter repository issues
- **create_pull_request**: Create PRs from branches
- **manage_labels**: Add/remove labels from issues/PRs
- Includes audit logging and dry-run mode for safety

### Test Runner Tools
- **run_tests**: Execute tests with multiple frameworks (vitest, jest, pytest, go test)
- **get_coverage**: Generate test coverage reports
- Supports timeout controls, retries, and working directory configuration

> **Note**: Tool implementations are available in `src/tools/` but not yet wired to RPC endpoints. Integration is planned for a future release.

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

- `PORT` - Server port (default: 3000)

## MCP Protocol

This server implements the Model Context Protocol specification. See [modelcontextprotocol.io](https://modelcontextprotocol.io) for details.
