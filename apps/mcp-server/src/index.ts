import express, { type Request, type Response, type Express } from 'express';
import { Server } from 'jayson';
// Tool implementations are available but not yet wired to RPC endpoints
// import { createFilesystemTool } from './tools/filesystem/index.js';
// import { createGitHubTool } from './tools/github/index.js';
// import { createTestRunnerTool } from './tools/testrunner/index.js';

const app: Express = express();
const PORT = process.env['PORT'] || 3000;

app.use(express.json());

// Health check endpoint
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Readiness check endpoint
app.get('/readyz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Capabilities endpoint
app.get('/capabilities', (_req: Request, res: Response) => {
  res.status(200).json({
    protocol: 'mcp',
    version: '1.0.0',
    capabilities: {
      resources: true,
      prompts: true,
      tools: true,
      sampling: false,
    },
    server: {
      name: '@jesus/mcp-server',
      version: '0.1.0',
    },
  });
});

// JSON-RPC server initialization
const rpcServer = new Server({
  initialize: (_args: unknown, callback: (error: Error | null, result?: unknown) => void) => {
    callback(null, {
      protocol: 'mcp',
      version: '1.0.0',
      capabilities: {
        resources: {},
        prompts: {},
        tools: {},
      },
      serverInfo: {
        name: '@jesus/mcp-server',
        version: '0.1.0',
      },
    });
  },

  'resources/list': (_args: unknown, callback: (error: Error | null, result?: unknown) => void) => {
    callback(null, { resources: [] });
  },

  'prompts/list': (_args: unknown, callback: (error: Error | null, result?: unknown) => void) => {
    callback(null, { prompts: [] });
  },

  'tools/list': (_args: unknown, callback: (error: Error | null, result?: unknown) => void) => {
    callback(null, { tools: [] });
  },
});

// JSON-RPC endpoint
app.post('/rpc', (req: Request, res: Response) => {
  rpcServer.call(req.body, (error: Error | null, response: unknown) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(response);
  });
});

// Only start server if not in test mode
let server: ReturnType<typeof app.listen> | undefined;

if (process.env['NODE_ENV'] !== 'test' && !process.env['VITEST']) {
  server = app.listen(PORT, () => {
    console.log(`MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/healthz`);
    console.log(`Readiness check: http://localhost:${PORT}/readyz`);
    console.log(`Capabilities: http://localhost:${PORT}/capabilities`);
    console.log(`JSON-RPC endpoint: http://localhost:${PORT}/rpc`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server?.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

export { app, server };
