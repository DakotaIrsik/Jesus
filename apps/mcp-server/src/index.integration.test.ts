import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import type { Server } from 'http';

describe('MCP Server Integration Tests', () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0); // Random port
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Health and Readiness Endpoints', () => {
    it('should return healthy status on /healthz', async () => {
      const response = await request(app).get('/healthz');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return ready status on /readyz', async () => {
      const response = await request(app).get('/readyz');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should have timestamps in ISO format', async () => {
      const response = await request(app).get('/healthz');
      const timestamp = response.body.timestamp;

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(timestamp)).not.toThrow();
    });
  });

  describe('Capabilities Endpoint', () => {
    it('should return MCP capabilities', async () => {
      const response = await request(app).get('/capabilities');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('protocol', 'mcp');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });

    it('should declare supported capabilities', async () => {
      const response = await request(app).get('/capabilities');

      expect(response.body.capabilities).toEqual({
        resources: true,
        prompts: true,
        tools: true,
        sampling: false,
      });
    });

    it('should include server information', async () => {
      const response = await request(app).get('/capabilities');

      expect(response.body.server).toHaveProperty('name', '@jesus/mcp-server');
      expect(response.body.server).toHaveProperty('version', '0.1.0');
    });
  });

  describe('JSON-RPC Endpoint', () => {
    it('should handle initialize method', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {},
          id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('protocol', 'mcp');
      expect(response.body.result).toHaveProperty('version', '1.0.0');
      expect(response.body.result).toHaveProperty('capabilities');
      expect(response.body.result).toHaveProperty('serverInfo');
    });

    it('should list resources', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'resources/list',
          params: {},
          id: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.result).toHaveProperty('resources');
      expect(Array.isArray(response.body.result.resources)).toBe(true);
    });

    it('should list prompts', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'prompts/list',
          params: {},
          id: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.result).toHaveProperty('prompts');
      expect(Array.isArray(response.body.result.prompts)).toBe(true);
    });

    it('should list all available tools', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 4,
        });

      expect(response.status).toBe(200);
      expect(response.body.result).toHaveProperty('tools');
      expect(Array.isArray(response.body.result.tools)).toBe(true);

      const toolNames = response.body.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('filesystem.read');
      expect(toolNames).toContain('filesystem.write');
      expect(toolNames).toContain('filesystem.patch');
      expect(toolNames).toContain('filesystem.search');
      expect(toolNames).toContain('github.issue.create');
      expect(toolNames).toContain('github.issue.update');
      expect(toolNames).toContain('github.issue.comment');
      expect(toolNames).toContain('github.issue.list');
      expect(toolNames).toContain('github.pr.create');
      expect(toolNames).toContain('github.labels.manage');
    });

    it('should provide tool schemas with required fields', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 5,
        });

      const tools = response.body.result.tools;
      tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      });
    });

    it('should handle unknown tool calls', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'unknown.tool',
            arguments: {},
          },
          id: 6,
        });

      // Jayson RPC server returns success with error in result for unknown tools
      // or 500 with error message depending on implementation
      const hasError = response.status === 500 || response.body.error || response.body.result?.error;
      expect(hasError).toBeTruthy();

      if (response.body.error) {
        expect(response.body.error).toMatch(/Unknown tool/i);
      }
    });

    it('should handle malformed JSON-RPC requests', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          // Missing method
          params: {},
          id: 7,
        });

      expect(response.status).toBe(500);
    });
  });

  describe('Filesystem Tool Integration', () => {
    it('should have filesystem.read in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 10,
        });

      const readTool = response.body.result.tools.find((t: any) => t.name === 'filesystem.read');
      expect(readTool).toBeDefined();
      expect(readTool.description).toContain('security');
      expect(readTool.inputSchema.required).toContain('path');
    });

    it('should have filesystem.write in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 11,
        });

      const writeTool = response.body.result.tools.find((t: any) => t.name === 'filesystem.write');
      expect(writeTool).toBeDefined();
      expect(writeTool.inputSchema.required).toContain('path');
      expect(writeTool.inputSchema.required).toContain('content');
    });

    it('should have filesystem.patch in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 12,
        });

      const patchTool = response.body.result.tools.find((t: any) => t.name === 'filesystem.patch');
      expect(patchTool).toBeDefined();
      expect(patchTool.description).toContain('diff');
      expect(patchTool.inputSchema.properties).toHaveProperty('dryRun');
    });

    it('should have filesystem.search in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 13,
        });

      const searchTool = response.body.result.tools.find(
        (t: any) => t.name === 'filesystem.search'
      );
      expect(searchTool).toBeDefined();
      expect(searchTool.description).toContain('ripgrep');
      expect(searchTool.inputSchema.required).toContain('pattern');
    });
  });

  describe('GitHub Tool Integration', () => {
    it('should have github.issue.create in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 20,
        });

      const createTool = response.body.result.tools.find(
        (t: any) => t.name === 'github.issue.create'
      );
      expect(createTool).toBeDefined();
      expect(createTool.description).toContain('audit');
      expect(createTool.inputSchema.required).toContain('title');
      expect(createTool.inputSchema.properties).toHaveProperty('dryRun');
    });

    it('should have github.issue.update in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 21,
        });

      const updateTool = response.body.result.tools.find(
        (t: any) => t.name === 'github.issue.update'
      );
      expect(updateTool).toBeDefined();
      expect(updateTool.inputSchema.required).toContain('issueNumber');
    });

    it('should have github.issue.comment in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 22,
        });

      const commentTool = response.body.result.tools.find(
        (t: any) => t.name === 'github.issue.comment'
      );
      expect(commentTool).toBeDefined();
      expect(commentTool.inputSchema.required).toContain('issueNumber');
      expect(commentTool.inputSchema.required).toContain('body');
    });

    it('should have github.pr.create in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 23,
        });

      const prTool = response.body.result.tools.find((t: any) => t.name === 'github.pr.create');
      expect(prTool).toBeDefined();
      expect(prTool.inputSchema.required).toContain('title');
      expect(prTool.inputSchema.required).toContain('head');
      expect(prTool.inputSchema.properties.draft).toBeDefined();
    });

    it('should have github.labels.manage in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 24,
        });

      const labelTool = response.body.result.tools.find(
        (t: any) => t.name === 'github.labels.manage'
      );
      expect(labelTool).toBeDefined();
      expect(labelTool.inputSchema.required).toContain('issueNumber');
      expect(labelTool.inputSchema.required).toContain('labels');
      expect(labelTool.inputSchema.required).toContain('action');
      expect(labelTool.inputSchema.properties.action.enum).toContain('add');
      expect(labelTool.inputSchema.properties.action.enum).toContain('remove');
      expect(labelTool.inputSchema.properties.action.enum).toContain('set');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      expect(response.status).toBe(404);
    });

    it('should handle invalid JSON in RPC request', async () => {
      const response = await request(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
    });

    it('should handle missing request body', async () => {
      const response = await request(app).post('/rpc').send();

      expect(response.status).toBe(500);
    });
  });

  describe('Content-Type Handling', () => {
    it('should accept application/json for RPC endpoint', async () => {
      const response = await request(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {},
          id: 100,
        });

      expect(response.status).toBe(200);
    });

    it('should return JSON responses', async () => {
      const response = await request(app).get('/healthz');

      expect(response.type).toContain('application/json');
    });
  });

  describe('CORS and Security Headers', () => {
    it('should handle OPTIONS requests for health endpoint', async () => {
      const response = await request(app).options('/healthz');

      // Default express behavior - should not fail
      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Test Runner Tool Integration', () => {
    it('should have testrunner.run in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 30,
        });

      const runTool = response.body.result.tools.find((t: any) => t.name === 'testrunner.run');
      expect(runTool).toBeDefined();
      expect(runTool.description).toContain('Run tests');
      expect(runTool.inputSchema.required).toContain('framework');
      expect(runTool.inputSchema.properties.framework.enum).toContain('jest');
      expect(runTool.inputSchema.properties.framework.enum).toContain('vitest');
      expect(runTool.inputSchema.properties.framework.enum).toContain('pytest');
    });

    it('should have testrunner.coverage in tools list', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 31,
        });

      const coverageTool = response.body.result.tools.find(
        (t: any) => t.name === 'testrunner.coverage'
      );
      expect(coverageTool).toBeDefined();
      expect(coverageTool.description).toContain('coverage');
      expect(coverageTool.inputSchema.properties.format.enum).toContain('json');
      expect(coverageTool.inputSchema.properties.format.enum).toContain('lcov');
      expect(coverageTool.inputSchema.properties.format.enum).toContain('html');
    });

    it('should reject unsupported test framework', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'testrunner.run',
            arguments: {
              framework: 'unsupported',
              args: [],
            },
          },
          id: 32,
        });

      // Should return error for unsupported framework
      const hasError = response.body.error || response.body.result?.success === false;
      expect(hasError).toBeTruthy();
    });

    it('should validate test arguments for security', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'testrunner.run',
            arguments: {
              framework: 'vitest',
              args: ['--exec', 'rm -rf /'],
            },
          },
          id: 33,
        });

      // Should reject dangerous commands
      const hasError = response.body.error || response.body.result?.success === false;
      expect(hasError).toBeTruthy();
      if (response.body.error) {
        expect(response.body.error).toMatch(/not allowed|dangerous/i);
      } else if (response.body.result?.error) {
        expect(response.body.result.error).toMatch(/not allowed|dangerous/i);
      }
    });

    it('should handle coverage request when no coverage exists', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'testrunner.coverage',
            arguments: {
              format: 'json',
            },
          },
          id: 34,
        });

      // Should handle missing coverage gracefully
      expect(response.status).toBe(200);
      // Either succeeds if coverage exists or fails with helpful message
      if (!response.body.result?.success) {
        expect(response.body.result?.error || response.body.error).toMatch(
          /coverage|not found/i
        );
      }
    });
  });
});
