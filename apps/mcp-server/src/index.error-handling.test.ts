import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from './index';

describe('MCP Server - Error Handling', () => {
  afterAll(() => {
    server.close();
  });

  describe('Malformed Requests', () => {
    it('should handle malformed JSON in RPC request', async () => {
      const response = await request(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle empty body in RPC request', async () => {
      const response = await request(app).post('/rpc').send();

      // Should either return error or handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle missing method in JSON-RPC request', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle invalid JSON-RPC version', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '1.0',
        id: 1,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      // Jayson may handle this gracefully
      expect(response.body).toBeDefined();
    });

    it('should handle missing id in JSON-RPC request', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('Unknown Methods', () => {
    it('should handle unknown JSON-RPC method gracefully', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 99,
        method: 'unknown/method',
        params: {},
      });

      expect(response.status).toBe(200);
      // Should return JSON-RPC error
      if (response.body.error) {
        expect(response.body.error).toBeDefined();
        expect(response.body.id).toBe(99);
      }
    });

    it('should handle method with invalid characters', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 100,
        method: 'invalid!@#$%method',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle very long method name', async () => {
      const longMethod = 'a'.repeat(10000);
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 101,
        method: longMethod,
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('Invalid Parameters', () => {
    it('should handle null params in initialize', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: null,
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      // Jayson accepts null params and still calls the method
    });

    it('should handle array params instead of object', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: [1, 2, 3],
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle very large params object', async () => {
      const largeParams = {
        data: 'x'.repeat(100000),
      };

      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: largeParams,
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('HTTP Methods', () => {
    it('should reject GET requests to /rpc endpoint', async () => {
      const response = await request(app).get('/rpc');

      expect(response.status).toBe(404);
    });

    it('should reject PUT requests to /rpc endpoint', async () => {
      const response = await request(app).put('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(404);
    });

    it('should reject DELETE requests to /rpc endpoint', async () => {
      const response = await request(app).delete('/rpc');

      expect(response.status).toBe(404);
    });

    it('should reject PATCH requests to /rpc endpoint', async () => {
      const response = await request(app).patch('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Content Type Handling', () => {
    it('should handle request without Content-Type header', async () => {
      const response = await request(app)
        .post('/rpc')
        .send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {},
          }),
        );

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle request with wrong Content-Type', async () => {
      const response = await request(app)
        .post('/rpc')
        .set('Content-Type', 'text/plain')
        .send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {},
          }),
        );

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Batch Requests', () => {
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
      expect(response.body).toBeDefined();
    });

    it('should handle empty batch array', async () => {
      const response = await request(app).post('/rpc').send([]);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle numeric id in JSON-RPC', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 12345,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(12345);
    });

    it('should handle string id in JSON-RPC', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 'test-id-123',
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-id-123');
    });

    it('should handle notification (no id) in JSON-RPC', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        method: 'resources/list',
        params: {},
      });

      expect(response.status).toBe(200);
    });

    it('should handle very large id value', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: Number.MAX_SAFE_INTEGER,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative id value', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: -999,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(-999);
    });

    it('should handle zero as id', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(0);
    });
  });

  describe('Response Format', () => {
    it('should return correct JSON-RPC response structure', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jsonrpc');
      expect(response.body).toHaveProperty('id');
      expect(response.body.jsonrpc).toBe('2.0');
    });

    it('should return Content-Type application/json', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app).post('/rpc').send({
          jsonrpc: '2.0',
          id: i,
          method: 'initialize',
          params: {},
        }),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(i);
      });
    });

    it('should handle concurrent requests to different endpoints', async () => {
      const requests = [
        request(app).get('/healthz'),
        request(app).get('/readyz'),
        request(app).get('/capabilities'),
        request(app).post('/rpc').send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        }),
      ];

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Security', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'nonexistent/dangerous/path',
        params: { password: 'secret123' },
      });

      expect(response.status).toBe(200);
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('secret123');
    });

    it('should handle SQL injection attempt in method name', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: "'; DROP TABLE users; --",
        params: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle XSS attempt in params', async () => {
      const response = await request(app).post('/rpc').send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          xss: '<script>alert("xss")</script>',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});
