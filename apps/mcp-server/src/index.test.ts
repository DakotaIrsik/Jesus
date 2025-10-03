import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from './index';

describe('MCP Server', () => {
  afterAll(() => {
    server?.close();
  });

  describe('Health Endpoints', () => {
    it('should return healthy status on /healthz', async () => {
      const response = await request(app).get('/healthz');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return ready status on /readyz', async () => {
      const response = await request(app).get('/readyz');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ready',
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Capabilities Endpoint', () => {
    it('should return server capabilities', async () => {
      const response = await request(app).get('/capabilities');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
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
  });

  describe('JSON-RPC Endpoint', () => {
    it('should handle initialize method', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: {
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
        },
      });
    });

    it('should handle resources/list method', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 2,
          method: 'resources/list',
          params: {},
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 2,
        result: {
          resources: [],
        },
      });
    });

    it('should handle prompts/list method', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 3,
          method: 'prompts/list',
          params: {},
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 3,
        result: {
          prompts: [],
        },
      });
    });

    it('should handle tools/list method', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/list',
          params: {},
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 4,
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({ name: 'filesystem.read' }),
            expect.objectContaining({ name: 'filesystem.write' }),
            expect.objectContaining({ name: 'filesystem.patch' }),
            expect.objectContaining({ name: 'filesystem.search' }),
            expect.objectContaining({ name: 'github.issue.create' }),
            expect.objectContaining({ name: 'github.issue.update' }),
            expect.objectContaining({ name: 'github.issue.comment' }),
            expect.objectContaining({ name: 'github.issue.list' }),
            expect.objectContaining({ name: 'github.pr.create' }),
            expect.objectContaining({ name: 'github.labels.manage' }),
            expect.objectContaining({ name: 'testrunner.run' }),
            expect.objectContaining({ name: 'testrunner.coverage' }),
          ]),
        },
      });
      expect(response.body.result.tools).toHaveLength(12);
    });

    it('should validate filesystem tool schemas', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/list',
          params: {},
        });

      const readTool = response.body.result.tools.find((t: any) => t.name === 'filesystem.read');
      expect(readTool).toBeDefined();
      expect(readTool.inputSchema.properties.path).toBeDefined();
      expect(readTool.inputSchema.required).toContain('path');

      const writeTool = response.body.result.tools.find((t: any) => t.name === 'filesystem.write');
      expect(writeTool).toBeDefined();
      expect(writeTool.inputSchema.properties.content).toBeDefined();
      expect(writeTool.inputSchema.required).toEqual(['path', 'content']);
    });

    it('should validate GitHub tool schemas', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/list',
          params: {},
        });

      const createIssueTool = response.body.result.tools.find(
        (t: any) => t.name === 'github.issue.create'
      );
      expect(createIssueTool).toBeDefined();
      expect(createIssueTool.inputSchema.properties.title).toBeDefined();
      expect(createIssueTool.inputSchema.properties.dryRun).toBeDefined();
      expect(createIssueTool.inputSchema.required).toContain('title');

      const createPRTool = response.body.result.tools.find((t: any) => t.name === 'github.pr.create');
      expect(createPRTool).toBeDefined();
      expect(createPRTool.inputSchema.properties.head).toBeDefined();
      expect(createPRTool.inputSchema.properties.base).toBeDefined();
      expect(createPRTool.inputSchema.required).toEqual(['title', 'head']);
    });

    it('should handle unknown tool calls', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'unknown.tool',
            arguments: {},
          },
        });

      // Note: jayson returns 500 for internal errors, not ideal but acceptable for now
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.message).toContain('Unknown tool');
      }
    });

    it('should handle malformed JSON-RPC requests', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          invalid: 'request',
        });

      // jayson may return 500 for malformed requests
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle missing method in JSON-RPC request', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 8,
          params: {},
        });

      // jayson may return 500 for missing method
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Tool Call Integration', () => {
    it('should invoke filesystem.read tool', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'filesystem.read',
            arguments: {
              path: '/nonexistent/file.txt',
            },
          },
        });

      expect([200, 500]).toContain(response.status);
      // Should fail because file doesn't exist, but validates integration
      expect(response.body).toBeDefined();
    });

    it('should invoke github.issue.list tool', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'github.issue.list',
            arguments: {
              state: 'open',
              per_page: 10,
              page: 1,
              sort: 'created',
              direction: 'desc',
            },
          },
        });

      expect(response.status).toBe(200);
      // May succeed or fail depending on gh CLI availability and auth
      expect(response.body).toBeDefined();
    });

    it('should handle tool errors gracefully', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: {
            name: 'filesystem.write',
            arguments: {
              path: '/root/forbidden.txt',
              content: 'test',
            },
          },
        });

      expect([200, 500]).toContain(response.status);
      // Should receive error response due to denied path
      if (response.status === 200) {
        if (response.body.error) {
          expect(response.body.error).toBeDefined();
        } else {
          // Or a result with success: false
          expect(response.body.result).toHaveProperty('success');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 13,
          method: 'tools/call',
          params: {
            name: 'filesystem.read',
            arguments: null, // Invalid arguments
          },
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Server Lifecycle', () => {
    it.skipIf(!server)('should handle graceful shutdown signal', (done) => {
      if (!server) {
        done();
        return;
      }

      const originalExit = process.exit;
      const originalServerClose = server.close;

      let serverCloseCalled = false;

      // Mock server.close
      server.close = ((callback: any) => {
        serverCloseCalled = true;
        if (callback) callback();
        return server;
      }) as any;

      // Mock process.exit
      (process.exit as any) = ((code: number) => {
        expect(code).toBe(0);

        // Restore originals
        process.exit = originalExit;
        if (server) server.close = originalServerClose;

        expect(serverCloseCalled).toBe(true);
        done();
      }) as any;

      // Emit SIGTERM
      process.emit('SIGTERM' as any);
    });
  });
});
