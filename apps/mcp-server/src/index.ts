import express, { type Request, type Response, type Express } from 'express';
import { Server } from 'jayson';
import { createFilesystemTool } from './tools/filesystem/index.js';
import { createGitHubTool } from './tools/github/index.js';

const app: Express = express();
const PORT = process.env['PORT'] || 3000;

// Create filesystem tool with configuration from environment
const filesystemTool = createFilesystemTool({
  allowedPaths: process.env['ALLOWED_PATHS']?.split(',') || [],
  deniedPaths: process.env['DENIED_PATHS']?.split(',') || ['/etc', '/usr/bin', '/System'],
  maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760', 10), // 10MB default
  streamThreshold: parseInt(process.env['STREAM_THRESHOLD'] || '1048576', 10), // 1MB default
});

// Create GitHub tool with configuration from environment
const githubTool = createGitHubTool({
  dryRunMode: process.env['GITHUB_DRY_RUN'] === 'true',
  auditLog: process.env['GITHUB_AUDIT_LOG'] !== 'false', // Enabled by default
  maxRequestsPerMinute: parseInt(process.env['GITHUB_RATE_LIMIT'] || '60', 10),
  allowedOperations: process.env['GITHUB_ALLOWED_OPS']?.split(',') as any || [],
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
        {
          name: 'github.issue.create',
          description: 'Create a new GitHub issue with audit trail and dry-run support',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Issue title' },
              body: { type: 'string', description: 'Issue body (optional)' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Labels (optional)' },
              assignees: { type: 'array', items: { type: 'string' }, description: 'Assignees (optional)' },
              milestone: { type: 'number', description: 'Milestone number (optional)' },
              dryRun: { type: 'boolean', default: false, description: 'Preview without executing' },
            },
            required: ['title'],
          },
        },
        {
          name: 'github.issue.update',
          description: 'Update an existing GitHub issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueNumber: { type: 'number', description: 'Issue number' },
              title: { type: 'string', description: 'New title (optional)' },
              body: { type: 'string', description: 'New body (optional)' },
              state: { type: 'string', enum: ['open', 'closed'], description: 'Issue state (optional)' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Labels (optional)' },
              assignees: { type: 'array', items: { type: 'string' }, description: 'Assignees (optional)' },
              milestone: { type: ['number', 'null'], description: 'Milestone (optional, null to remove)' },
              dryRun: { type: 'boolean', default: false, description: 'Preview without executing' },
            },
            required: ['issueNumber'],
          },
        },
        {
          name: 'github.issue.comment',
          description: 'Add a comment to a GitHub issue or PR',
          inputSchema: {
            type: 'object',
            properties: {
              issueNumber: { type: 'number', description: 'Issue or PR number' },
              body: { type: 'string', description: 'Comment body' },
              dryRun: { type: 'boolean', default: false, description: 'Preview without executing' },
            },
            required: ['issueNumber', 'body'],
          },
        },
        {
          name: 'github.issue.list',
          description: 'List GitHub issues with filters',
          inputSchema: {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Filter by labels' },
              assignee: { type: 'string', description: 'Filter by assignee' },
              milestone: { type: ['number', 'string'], description: 'Filter by milestone' },
              sort: { type: 'string', enum: ['created', 'updated', 'comments'], default: 'created' },
              direction: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
              per_page: { type: 'number', default: 30, minimum: 1, maximum: 100 },
              page: { type: 'number', default: 1, minimum: 1 },
            },
          },
        },
        {
          name: 'github.pr.create',
          description: 'Create a new GitHub pull request',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'PR title' },
              body: { type: 'string', description: 'PR body (optional)' },
              head: { type: 'string', description: 'Head branch name' },
              base: { type: 'string', default: 'main', description: 'Base branch name' },
              draft: { type: 'boolean', default: false, description: 'Create as draft' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Labels (optional)' },
              assignees: { type: 'array', items: { type: 'string' }, description: 'Assignees (optional)' },
              milestone: { type: 'number', description: 'Milestone number (optional)' },
              dryRun: { type: 'boolean', default: false, description: 'Preview without executing' },
            },
            required: ['title', 'head'],
          },
        },
        {
          name: 'github.labels.manage',
          description: 'Add, remove, or set labels on an issue or PR',
          inputSchema: {
            type: 'object',
            properties: {
              issueNumber: { type: 'number', description: 'Issue or PR number' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Labels to manage' },
              action: { type: 'string', enum: ['add', 'remove', 'set'], description: 'Action to perform' },
              dryRun: { type: 'boolean', default: false, description: 'Preview without executing' },
            },
            required: ['issueNumber', 'labels', 'action'],
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
        case 'github.issue.create': {
          const result = await githubTool.operations.createIssue(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'github.issue.update': {
          const result = await githubTool.operations.updateIssue(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'github.issue.comment': {
          const result = await githubTool.operations.createComment(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'github.issue.list': {
          const result = await githubTool.operations.listIssues(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'github.pr.create': {
          const result = await githubTool.operations.createPullRequest(toolArgs as any);
          callback(result.success ? null : new Error(result.error), result);
          break;
        }
        case 'github.labels.manage': {
          const result = await githubTool.operations.manageLabels(toolArgs as any);
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
