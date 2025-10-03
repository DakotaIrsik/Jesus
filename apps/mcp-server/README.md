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
- **MCP Methods**:
  - `initialize`: Server initialization and capability negotiation
  - `resources/list`: List available resources
  - `prompts/list`: List available prompts
  - `tools/list`: List available tools
  - `tools/call`: Execute filesystem tools

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
- `ALLOWED_PATHS` - Comma-separated list of allowed file paths (default: empty, allows all)
- `DENIED_PATHS` - Comma-separated list of denied paths (default: `/etc,/usr/bin,/System`)
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 10485760 = 10MB)
- `STREAM_THRESHOLD` - File size threshold for streaming in bytes (default: 1048576 = 1MB)

## MCP Protocol

This server implements the Model Context Protocol specification. See [modelcontextprotocol.io](https://modelcontextprotocol.io) for details.
