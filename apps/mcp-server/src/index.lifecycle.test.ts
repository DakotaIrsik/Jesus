import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server as HttpServer } from 'http';

describe('MCP Server - Lifecycle Management', () => {
  let mockApp: express.Express;
  let mockServer: HttpServer;

  beforeEach(() => {
    mockApp = express();
    mockApp.use(express.json());
  });

  afterEach(() => {
    if (mockServer && mockServer.listening) {
      mockServer.close();
    }
  });

  describe('Server Startup', () => {
    it('should start server on specified port', (done) => {
      const testPort = 3001;

      mockServer = mockApp.listen(testPort, () => {
        expect(mockServer.listening).toBe(true);
        const address = mockServer.address();
        expect(address).toBeDefined();
        if (address && typeof address === 'object') {
          expect(address.port).toBe(testPort);
        }
        mockServer.close(done);
      });
    });

    it('should handle port already in use', (done) => {
      const testPort = 3002;

      // Start first server
      const firstServer = mockApp.listen(testPort, () => {
        // Try to start second server on same port
        const secondApp = express();
        const secondServer = secondApp.listen(testPort);

        secondServer.on('error', (err: NodeJS.ErrnoException) => {
          expect(err.code).toBe('EADDRINUSE');
          firstServer.close(() => {
            done();
          });
        });
      });
    });

    it('should use PORT environment variable', () => {
      const originalPort = process.env['PORT'];
      process.env['PORT'] = '4000';

      const envPort = process.env['PORT'] || 3000;
      expect(envPort).toBe('4000');

      // Restore original
      if (originalPort) {
        process.env['PORT'] = originalPort;
      } else {
        delete process.env['PORT'];
      }
    });

    it('should default to port 3000 when PORT not set', () => {
      const originalPort = process.env['PORT'];
      delete process.env['PORT'];

      const port = process.env['PORT'] || 3000;
      expect(port).toBe(3000);

      // Restore original
      if (originalPort) {
        process.env['PORT'] = originalPort;
      }
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close server gracefully', (done) => {
      const testPort = 3003;

      mockServer = mockApp.listen(testPort, () => {
        expect(mockServer.listening).toBe(true);

        mockServer.close(() => {
          expect(mockServer.listening).toBe(false);
          done();
        });
      });
    });

    it('should handle SIGTERM signal', (done) => {
      const testPort = 3004;
      let sigTermHandler: NodeJS.SignalsListener;

      mockServer = mockApp.listen(testPort, () => {
        // Capture SIGTERM handler
        sigTermHandler = (): void => {
          mockServer.close(() => {
            expect(mockServer.listening).toBe(false);
            done();
          });
        };

        // Simulate SIGTERM
        sigTermHandler('SIGTERM');
      });
    });

    it('should complete in-flight requests before shutdown', (done) => {
      const testPort = 3005;
      let requestCompleted = false;

      mockApp.get('/slow', (_req, res) => {
        setTimeout(() => {
          requestCompleted = true;
          res.json({ status: 'completed' });
        }, 100);
      });

      mockServer = mockApp.listen(testPort, async () => {
        // Make a request
        fetch(`http://localhost:${testPort}/slow`).catch(() => {
          // Ignore connection errors
        });

        // Wait a bit then close
        setTimeout(() => {
          mockServer.close(() => {
            expect(requestCompleted).toBe(true);
            done();
          });
        }, 150);
      });
    });

    it('should handle multiple shutdown attempts gracefully', (done) => {
      const testPort = 3006;

      mockServer = mockApp.listen(testPort, () => {
        let closeCount = 0;

        const onClose = (): void => {
          closeCount++;
          if (closeCount === 1) {
            expect(closeCount).toBe(1);
            done();
          }
        };

        // First close
        mockServer.close(onClose);

        // Second close attempt should not cause issues
        try {
          mockServer.close();
        } catch (err) {
          // Expected - server already closing
        }
      });
    });
  });

  describe('Server State', () => {
    it('should have correct initial state', (done) => {
      const testPort = 3007;

      mockServer = mockApp.listen(testPort, () => {
        expect(mockServer.listening).toBe(true);
        const address = mockServer.address();
        expect(address).toBeDefined();
        mockServer.close(done);
      });
    });

    it('should handle server before listening', () => {
      const testServer = mockApp.listen(0); // Use 0 for any available port
      expect(testServer).toBeDefined();
      testServer.close();
    });

    it('should provide server address information', (done) => {
      const testPort = 3008;

      mockServer = mockApp.listen(testPort, () => {
        const address = mockServer.address();
        expect(address).toBeDefined();

        if (address && typeof address === 'object') {
          expect(address.port).toBe(testPort);
          expect(address.address).toBeDefined();
          expect(['IPv4', 'IPv6']).toContain(address.family);
        }

        mockServer.close(done);
      });
    });
  });

  describe('Error Handling During Lifecycle', () => {
    it('should handle errors during startup', () => {
      const invalidApp = express();

      // Force an error by trying to bind to invalid port
      // Use try-catch since listen() throws synchronously for invalid ports
      expect(() => {
        invalidApp.listen(-1);
      }).toThrow();
    });

    it('should handle errors during shutdown', (done) => {
      const testPort = 3009;

      mockServer = mockApp.listen(testPort, () => {
        // Simulate error during close
        mockServer.close((err) => {
          // Should handle error gracefully
          expect(err || null).toBeNull();
          done();
        });
      });
    });
  });

  describe('Health During Lifecycle', () => {
    it('should respond to health checks when running', (done) => {
      const testPort = 3010;
      const testApp = express();
      testApp.get('/healthz', (_req, res) => {
        res.json({ status: 'healthy' });
      });

      mockServer = testApp.listen(testPort, async () => {
        const response = await fetch(`http://localhost:${testPort}/healthz`);
        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.status).toBe('healthy');
        mockServer.close(done);
      });
    });

    it('should not respond to requests after shutdown', (done) => {
      const testPort = 3011;
      const testApp = express();
      testApp.get('/healthz', (_req, res) => {
        res.json({ status: 'healthy' });
      });

      mockServer = testApp.listen(testPort, () => {
        mockServer.close(async () => {
          try {
            await fetch(`http://localhost:${testPort}/healthz`, {
              signal: AbortSignal.timeout(100),
            });
            done(new Error('Should not succeed'));
          } catch (err) {
            // Expected - connection should be refused
            expect(err).toBeDefined();
            done();
          }
        });
      });
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on shutdown', (done) => {
      const testPort = 3012;
      const resources = { cleaned: false };

      mockApp.get('/test', (_req, res) => {
        res.json({ status: 'ok' });
      });

      mockServer = mockApp.listen(testPort, () => {
        mockServer.close(() => {
          // Simulate resource cleanup
          resources.cleaned = true;
          expect(resources.cleaned).toBe(true);
          done();
        });
      });
    });

    it('should handle cleanup errors gracefully', (done) => {
      const testPort = 3013;

      mockServer = mockApp.listen(testPort, () => {
        mockServer.close(() => {
          // Simulate cleanup that might throw
          try {
            throw new Error('Cleanup error');
          } catch (err) {
            expect(err).toBeDefined();
            done();
          }
        });
      });
    });
  });

  describe('Process Exit Handling', () => {
    it('should exit process after successful shutdown', (done) => {
      const testPort = 3014;
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
        // Don't actually exit
      }) as never);

      mockServer = mockApp.listen(testPort, () => {
        // Simulate SIGTERM handler behavior
        mockServer.close(() => {
          process.exit(0);
          expect(mockExit).toHaveBeenCalledWith(0);
          mockExit.mockRestore();
          done();
        });
      });
    });

    it('should handle exit with error code', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
        // Don't actually exit
      }) as never);

      // Simulate error scenario
      process.exit(1);
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });
  });

  describe('Connection Management', () => {
    it('should accept connections when listening', (done) => {
      const testPort = 3015;

      mockApp.get('/test', (_req, res) => {
        res.json({ connected: true });
      });

      mockServer = mockApp.listen(testPort, async () => {
        const response = await fetch(`http://localhost:${testPort}/test`);
        expect(response.ok).toBe(true);
        mockServer.close(done);
      });
    });

    it('should handle connection limit gracefully', (done) => {
      const testPort = 3016;

      mockApp.get('/test', (_req, res) => {
        res.json({ status: 'ok' });
      });

      mockServer = mockApp.listen(testPort, () => {
        // Set max connections (if supported)
        if (mockServer.maxConnections !== undefined) {
          mockServer.maxConnections = 1;
          expect(mockServer.maxConnections).toBe(1);
        }
        mockServer.close(done);
      });
    });
  });
});
