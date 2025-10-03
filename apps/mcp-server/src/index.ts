import express, { type Request, type Response, type Express } from 'express';
import { Server } from 'jayson';
import { createFilesystemTool } from './tools/filesystem/index.js';

const app: Express = express();
const PORT = process.env['PORT'] || 3000;

// Create filesystem tool with configuration from environment
const filesystemTool = createFilesystemTool({
  allowedPaths: process.env['ALLOWED_PATHS']?.split(',') || [],
  deniedPaths: process.env['DENIED_PATHS']?.split(',') || ['/etc', '/usr/bin', '/System'],
  maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760', 10), // 10MB default
  streamThreshold: parseInt(process.env['STREAM_THRESHOLD'] || '1048576', 10), // 1MB default
});

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
    callback(null, {
      tools: [
        {
          name: 'filesystem.read',
          description: 'Read file contents with security guardrails',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to file' },
              encoding: { type: 'string', enum: ['utf8', 'binary'], default: 'utf8' },
            },
            required: ['path'],
          },
        },
        {
          name: 'filesystem.write',
          description: 'Write file contents with path protection and size limits',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to file' },
              content: { type: 'string', description: 'File content' },
              encoding: { type: 'string', enum: ['utf8', 'binary'], default: 'utf8' },
              createDirs: { type: 'boolean', default: false, description: 'Create parent directories' },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'filesystem.patch',
          description: 'Apply unified diff patch with rollback support',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to file' },
              patch: { type: 'string', description: 'Unified diff patch' },
              dryRun: { type: 'boolean', default: false, description: 'Preview without applying' },
            },
            required: ['path', 'patch'],
          },
        },
        {
          name: 'filesystem.search',
          description: 'Search for code patterns with ripgrep-like functionality',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Search pattern (regex)' },
              path: { type: 'string', description: 'Search path (optional)' },
              filePattern: { type: 'string', description: 'File pattern filter (optional)' },
              maxResults: { type: 'number', default: 100, description: 'Max results' },
              caseSensitive: { type: 'boolean', default: true, description: 'Case sensitive' },
            },
            required: ['pattern'],
          },
        },
      ],
    });
  },

  // Filesystem tool implementations
  'tools/call': async (
    args: { name: string; arguments: Record<string, unknown> },
    callback: (error: Error | null, result?: unknown) => void
  ) => {
    try {
      const { name, arguments: toolArgs } = args;

      switch (name) {
        case 'filesystem.read': {
          const result = await filesystemTool.operations.readFile(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'filesystem.write': {
          const result = await filesystemTool.operations.writeFile(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'filesystem.patch': {
          const result = await filesystemTool.operations.applyPatch(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'filesystem.search': {
          const result = await filesystemTool.operations.search(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        default:
          callback(new Error(`Unknown tool: ${name}`));
      }
    } catch (error) {
      callback(error as Error);
    }
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

const server = app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/healthz`);
  console.log(`Readiness check: http://localhost:${PORT}/readyz`);
  console.log(`Capabilities: http://localhost:${PORT}/capabilities`);
  console.log(`JSON-RPC endpoint: http://localhost:${PORT}/rpc`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server };
