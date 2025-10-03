# Apps

Application services and deployable components.

## Available Applications

### MCP Server (`mcp-server/`)

Model Context Protocol server providing JSON-RPC 2.0 endpoints for AI agent orchestration.

**Features:**
- HTTP server with health checks (`/healthz`, `/readyz`)
- JSON-RPC 2.0 protocol implementation
- MCP protocol methods (initialize, resources/list, prompts/list, tools/list)
- Capabilities discovery endpoint
- Docker support

> **Note**: Tool implementations (filesystem, GitHub, test runner) are planned for future releases.

See [mcp-server/README.md](mcp-server/README.md) for full documentation.
