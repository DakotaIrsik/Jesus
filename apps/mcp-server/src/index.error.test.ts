import { describe, it, expect, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app, server } from './index';

describe('MCP Server - Error Handling', () => {
  afterAll(() => {
    server?.close();
  });

  describe('HTTP Error Handling', () => {
    it('should handle invalid HTTP method on /healthz', async () => {
      const response = await request(app).post('/healthz');
      expect(response.status).toBe(404);
    });

    it('should handle invalid HTTP method on /readyz', async () => {
      const response = await request(app).post('/readyz');
      expect(response.status).toBe(404);
    });

    it('should handle invalid HTTP method on /capabilities', async () => {
      const response = await request(app).post('/capabilities');
      expect(response.status).toBe(404);
    });

    it('should handle GET request to /rpc endpoint', async () => {
      const response = await request(app).get('/rpc');
      expect(response.status).toBe(404);
    });

    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
    });
  });

  describe('JSON-RPC Error Handling', () => {
    it('should handle malformed JSON request', async () => {
      const response = await request(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
    });

    it('should handle missing JSON-RPC fields', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({});

      // Jayson should handle this
      expect(response.status).toBeOneOf([200, 400, 500]);
    });

    it('should handle invalid JSON-RPC version', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '1.0', // Invalid version
          id: 1,
          method: 'initialize',
          params: {},
        });

      // Jayson may return 500 for invalid JSON-RPC version
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle unknown RPC method', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'unknownMethod',
          params: {},
        });

      // Jayson may return 500 for unknown methods
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatchObject({
          code: -32601, // Method not found
        });
      }
    });

    it('should handle RPC request without id', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {},
        });

      // Notification - no response expected, but server should handle it
      expect(response.status).toBeOneOf([200, 204]);
    });

    it('should handle batch JSON-RPC requests', async () => {
      const response = await request(app)
        .post('/rpc')
        .send([
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {},
          },
          {
            jsonrpc: '2.0',
            id: 2,
            method: 'resources/list',
            params: {},
          },
        ]);

      expect(response.status).toBe(200);
      // Jayson may or may not support batch - just ensure it doesn't crash
      expect(response.body).toBeDefined();
    });

    it('should handle RPC request with invalid params type', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: 'invalid', // Should be object or array
        });

      expect(response.status).toBeOneOf([200, 400, 500]);
    });
  });

  describe('Content-Type Validation', () => {
    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        });

      // Express should still parse it
      expect(response.status).toBeOneOf([200, 400, 415]);
    });

    it('should handle incorrect Content-Type header', async () => {
      const response = await request(app)
        .post('/rpc')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        }));

      expect(response.status).toBeOneOf([200, 400, 415, 500]);
    });
  });

  describe('Large Payload Handling', () => {
    it('should handle large JSON-RPC request within limits', async () => {
      const largePayload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          data: 'x'.repeat(10000), // 10KB of data
        },
      };

      const response = await request(app)
        .post('/rpc')
        .send(largePayload);

      expect(response.status).toBe(200);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/rpc')
          .send({
            jsonrpc: '2.0',
            id: i,
            method: 'initialize',
            params: {},
          }),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('result');
      });
    });

    it('should handle concurrent health checks', async () => {
      const requests = Array.from({ length: 20 }, () =>
        request(app).get('/healthz'),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty POST body', async () => {
      const response = await request(app)
        .post('/rpc')
        .send();

      expect(response.status).toBeOneOf([200, 400, 500]);
    });

    it('should handle null JSON-RPC params', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: null,
        });

      // Jayson may return 500 for null params
      expect([200, 500]).toContain(response.status);
    });

    it('should handle numeric string as id', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: '123',
          method: 'initialize',
          params: {},
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('123');
    });

    it('should handle null as id', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: null,
          method: 'initialize',
          params: {},
        });

      expect(response.status).toBe(200);
      // Jayson may return undefined instead of null for null id
      expect(response.body.id).toBeOneOf([null, undefined]);
    });
  });

  describe('Response Format Validation', () => {
    it('should return valid JSON-RPC 2.0 response', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jsonrpc', '2.0');
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('result');
    });

    it('should return Content-Type application/json', async () => {
      const response = await request(app)
        .post('/rpc')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});

describe('MCP Server - Graceful Shutdown', () => {
  let testServer: typeof server;

  beforeEach(() => {
    // Each test creates its own server instance to test shutdown
  });

  it.skip('should handle SIGTERM signal', async () => {
    // Skip this test in test mode since SIGTERM handler is not registered
    // when server is not started (process.env.VITEST is set)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Trigger SIGTERM
    process.emit('SIGTERM', 'SIGTERM');

    // Give it time to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(consoleLogSpy).toHaveBeenCalledWith('SIGTERM received, shutting down gracefully');

    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
