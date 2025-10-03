import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from './index';

describe('MCP Server', () => {
  afterAll(() => {
    server.close();
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
          tools: [],
        },
      });
    });
  });
});
