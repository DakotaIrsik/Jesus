import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FilesystemGuard } from './guards.js';
import { FilesystemOperations } from './operations.js';
import type { FilesystemConfig } from './types.js';

describe('FilesystemOperations', () => {
  let tempDir: string;
  let guard: FilesystemGuard;
  let operations: FilesystemOperations;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-ops-test-'));

    // Configure guard to allow temp directory
    const config: FilesystemConfig = {
      allowedPaths: [tempDir],
      deniedPaths: [],
      maxFileSize: 10 * 1024 * 1024,
      streamThreshold: 1024 * 1024,
    };

    guard = new FilesystemGuard(config);
    operations = new FilesystemOperations(guard);
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content, 'utf8');

      const result = await operations.readFile({
        path: filePath,
        encoding: 'utf8',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).content).toBe(content);
    });

    it('should deny reading from disallowed paths', async () => {
      const disallowedPath = '/some/other/path.txt';

      const result = await operations.readFile({
        path: disallowedPath,
        encoding: 'utf8',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    it('should handle non-existent files', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      const result = await operations.readFile({
        path: filePath,
        encoding: 'utf8',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read file');
    });

    it('should reject files exceeding size limit', async () => {
      const filePath = path.join(tempDir, 'large.txt');
      await fs.writeFile(filePath, 'x'.repeat(100), 'utf8');

      // Create guard with small size limit
      const smallConfig: FilesystemConfig = {
        allowedPaths: [tempDir],
        deniedPaths: [],
        maxFileSize: 50,
        streamThreshold: 25,
      };
      const smallGuard = new FilesystemGuard(smallConfig);
      const smallOps = new FilesystemOperations(smallGuard);

      const result = await smallOps.readFile({
        path: filePath,
        encoding: 'utf8',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Test content';

      const result = await operations.writeFile({
        path: filePath,
        content,
        encoding: 'utf8',
        createDirs: false,
      });

      expect(result.success).toBe(true);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should create directories when createDirs is true', async () => {
      const filePath = path.join(tempDir, 'subdir', 'nested', 'test.txt');
      const content = 'Test content';

      const result = await operations.writeFile({
        path: filePath,
        content,
        encoding: 'utf8',
        createDirs: true,
      });

      expect(result.success).toBe(true);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should deny writing to disallowed paths', async () => {
      const disallowedPath = '/some/other/path.txt';

      const result = await operations.writeFile({
        path: disallowedPath,
        content: 'content',
        encoding: 'utf8',
        createDirs: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    it('should fail when createDirs is false and directory does not exist', async () => {
      const filePath = path.join(tempDir, 'nonexistent', 'test.txt');

      const result = await operations.writeFile({
        path: filePath,
        content: 'content',
        encoding: 'utf8',
        createDirs: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write file');
    });
  });

  describe('applyPatch', () => {
    it('should apply simple patch successfully', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const original = `line 1
line 2
line 3`;
      await fs.writeFile(filePath, original, 'utf8');

      const patch = `--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3`;

      const result = await operations.applyPatch({
        path: filePath,
        patch,
        dryRun: false,
      });

      expect(result.success).toBe(true);

      const patched = await fs.readFile(filePath, 'utf8');
      expect(patched).toContain('line 2 modified');
      expect(patched).not.toContain('line 2\n');
    });

    it('should support dry run mode', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const original = `line 1
line 2
line 3`;
      await fs.writeFile(filePath, original, 'utf8');

      const patch = `--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3`;

      const result = await operations.applyPatch({
        path: filePath,
        patch,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).dryRun).toBe(true);

      // Original file should be unchanged
      const unchanged = await fs.readFile(filePath, 'utf8');
      expect(unchanged).toBe(original);
    });

    it('should deny patching disallowed paths', async () => {
      const disallowedPath = '/some/other/path.txt';
      const patch = `--- a/test.txt
+++ b/test.txt
@@ -1,1 +1,1 @@
-old
+new`;

      const result = await operations.applyPatch({
        path: disallowedPath,
        patch,
        dryRun: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    it('should reject invalid patch format', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content', 'utf8');

      const invalidPatch = `invalid patch format`;

      const result = await operations.applyPatch({
        path: filePath,
        patch: invalidPatch,
        dryRun: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid patch format');
    });

    it('should handle additions and deletions', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const original = `line 1
line 2
line 3
line 4`;
      await fs.writeFile(filePath, original, 'utf8');

      const patch = `--- a/test.txt
+++ b/test.txt
@@ -1,4 +1,5 @@
 line 1
+new line
 line 2
-line 3
 line 4`;

      const result = await operations.applyPatch({
        path: filePath,
        patch,
        dryRun: false,
      });

      expect(result.success).toBe(true);

      const patched = await fs.readFile(filePath, 'utf8');
      expect(patched).toContain('new line');
      expect(patched).not.toContain('line 3');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create test files for searching
      await fs.writeFile(
        path.join(tempDir, 'file1.txt'),
        'Hello World\nFoo Bar\nHello Again',
        'utf8'
      );
      await fs.writeFile(
        path.join(tempDir, 'file2.txt'),
        'Another file\nWith some content',
        'utf8'
      );
      await fs.writeFile(
        path.join(tempDir, 'file3.js'),
        'function hello() {\n  console.log("Hello");\n}',
        'utf8'
      );
    });

    it('should search for pattern in directory', async () => {
      const result = await operations.search({
        pattern: 'Hello',
        path: tempDir,
        maxResults: 100,
        caseSensitive: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
    });

    it('should respect case sensitivity', async () => {
      const sensitiveResult = await operations.search({
        pattern: 'hello',
        path: tempDir,
        maxResults: 100,
        caseSensitive: true,
      });

      const insensitiveResult = await operations.search({
        pattern: 'hello',
        path: tempDir,
        maxResults: 100,
        caseSensitive: false,
      });

      const sensitiveData = sensitiveResult.data as any;
      const insensitiveData = insensitiveResult.data as any;

      expect(insensitiveData.results.length).toBeGreaterThanOrEqual(
        sensitiveData.results.length
      );
    });

    it('should respect maxResults limit', async () => {
      const result = await operations.search({
        pattern: 'e',
        path: tempDir,
        maxResults: 2,
        caseSensitive: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by file pattern', async () => {
      const result = await operations.search({
        pattern: 'hello',
        path: tempDir,
        filePattern: '*.js',
        maxResults: 100,
        caseSensitive: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as any;

      if (data.results.length > 0) {
        for (const res of data.results) {
          expect(res.file).toMatch(/\.js$/);
        }
      }
    });

    it('should deny searching disallowed paths', async () => {
      const disallowedPath = '/some/other/path';

      const result = await operations.search({
        pattern: 'test',
        path: disallowedPath,
        maxResults: 100,
        caseSensitive: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    it('should use current directory when path not specified', async () => {
      // Change cwd to temp dir for this test
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const result = await operations.search({
          pattern: 'Hello',
          maxResults: 100,
          caseSensitive: true,
        });

        expect(result.success).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should include match context', async () => {
      const result = await operations.search({
        pattern: 'Hello',
        path: tempDir,
        maxResults: 100,
        caseSensitive: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as any;

      if (data.results.length > 0) {
        const firstResult = data.results[0];
        expect(firstResult.context).toBeDefined();
        expect(firstResult.line).toBeGreaterThan(0);
        expect(firstResult.column).toBeGreaterThanOrEqual(0);
        expect(firstResult.match).toBe('Hello');
      }
    });
  });
});
