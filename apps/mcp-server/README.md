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
