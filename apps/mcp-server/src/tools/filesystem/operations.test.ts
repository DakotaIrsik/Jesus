import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FilesystemOperations } from './operations.js';
import { FilesystemGuard } from './guards.js';
import type { FilesystemConfig, ReadFileRequest, WriteFileRequest, SearchRequest } from './types.js';

describe('FilesystemOperations', () => {
  let operations: FilesystemOperations;
  let guard: FilesystemGuard;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'test-temp-filesystem');
    await fs.promises.mkdir(testDir, { recursive: true });

    const config: FilesystemConfig = {
      allowedPaths: [testDir],
      deniedPaths: [],
      maxFileSize: 1024 * 1024, // 1MB
      streamThreshold: 512 * 1024, // 512KB
    };

    guard = new FilesystemGuard(config);
    operations = new FilesystemOperations(guard);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('readFile', () => {
    it('should read a file successfully', async () => {
      const testFile = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.promises.writeFile(testFile, content, 'utf8');

      const request: ReadFileRequest = {
        path: testFile,
        encoding: 'utf8',
      };

      const result = await operations.readFile(request);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(content);
      expect(result.data?.path).toBe(testFile);
    });

    it('should read binary file and return base64', async () => {
      const testFile = path.join(testDir, 'test.bin');
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      await fs.promises.writeFile(testFile, buffer);

      const request: ReadFileRequest = {
        path: testFile,
        encoding: 'binary',
      };

      const result = await operations.readFile(request);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(buffer.toString('base64'));
    });

    it('should fail for non-existent file', async () => {
      const request: ReadFileRequest = {
        path: path.join(testDir, 'non-existent.txt'),
      };

      const result = await operations.readFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not accessible');
    });

    it('should fail for path traversal attempt', async () => {
      const request: ReadFileRequest = {
        path: path.join(testDir, '..', 'outside.txt'),
      };

      const result = await operations.readFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });

    it('should fail for file exceeding size limit', async () => {
      const testFile = path.join(testDir, 'large.txt');
      // Create a file larger than the 1MB limit
      const largeContent = 'x'.repeat(2 * 1024 * 1024);
      await fs.promises.writeFile(testFile, largeContent);

      const request: ReadFileRequest = {
        path: testFile,
      };

      const result = await operations.readFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('writeFile', () => {
    it('should write a file successfully', async () => {
      const testFile = path.join(testDir, 'write-test.txt');
      const content = 'Test content';

      const request: WriteFileRequest = {
        path: testFile,
        content,
      };

      const result = await operations.writeFile(request);

      expect(result.success).toBe(true);
      expect(result.data?.path).toBe(testFile);

      // Verify file was written
      const written = await fs.promises.readFile(testFile, 'utf8');
      expect(written).toBe(content);
    });

    it('should write binary file from base64', async () => {
      const testFile = path.join(testDir, 'write-binary.bin');
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const base64Content = buffer.toString('base64');

      const request: WriteFileRequest = {
        path: testFile,
        content: base64Content,
        encoding: 'binary',
      };

      const result = await operations.writeFile(request);

      expect(result.success).toBe(true);

      // Verify file was written correctly
      const written = await fs.promises.readFile(testFile);
      expect(written).toEqual(buffer);
    });

    it('should create parent directories when requested', async () => {
      const testFile = path.join(testDir, 'nested', 'dirs', 'file.txt');
      const content = 'Nested content';

      const request: WriteFileRequest = {
        path: testFile,
        content,
        createDirs: true,
      };

      const result = await operations.writeFile(request);

      expect(result.success).toBe(true);

      // Verify file was written
      const written = await fs.promises.readFile(testFile, 'utf8');
      expect(written).toBe(content);
    });

    it('should fail when parent directory does not exist and createDirs is false', async () => {
      const testFile = path.join(testDir, 'non-existent-dir', 'file.txt');
      const content = 'Content';

      const request: WriteFileRequest = {
        path: testFile,
        content,
        createDirs: false,
      };

      const result = await operations.writeFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write file');
    });

    it('should fail for content exceeding size limit', async () => {
      const testFile = path.join(testDir, 'large-write.txt');
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB

      const request: WriteFileRequest = {
        path: testFile,
        content: largeContent,
      };

      const result = await operations.writeFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should fail for path traversal attempt', async () => {
      const request: WriteFileRequest = {
        path: path.join(testDir, '..', 'outside.txt'),
        content: 'Malicious content',
      };

      const result = await operations.writeFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });
  });

  describe('applyPatch', () => {
    it('should return dry run result when dryRun is true', async () => {
      const testFile = path.join(testDir, 'patch-test.txt');
      const patch = 'diff content';

      const result = await operations.applyPatch({
        path: testFile,
        patch,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.dryRun).toBe(true);
      expect(result.data?.message).toContain('Dry run');
    });

    it('should return not implemented error for actual patch', async () => {
      const testFile = path.join(testDir, 'patch-test.txt');
      const patch = 'diff content';

      const result = await operations.applyPatch({
        path: testFile,
        patch,
        dryRun: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not yet implemented');
    });

    it('should fail for invalid path', async () => {
      const result = await operations.applyPatch({
        path: path.join(testDir, '..', 'invalid.txt'),
        patch: 'diff',
        dryRun: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create test files with content
      await fs.promises.writeFile(
        path.join(testDir, 'file1.txt'),
        'Hello World\nThis is a test\nFoo bar'
      );
      await fs.promises.writeFile(
        path.join(testDir, 'file2.txt'),
        'Another file\nWith some content\nHello again'
      );
      await fs.promises.mkdir(path.join(testDir, 'subdir'), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, 'subdir', 'file3.txt'),
        'Nested file\nHello from subdir'
      );
    });

    it('should search for pattern in files', async () => {
      const request: SearchRequest = {
        path: testDir,
        pattern: 'Hello',
        caseSensitive: true,
      };

      const result = await operations.search(request);

      expect(result.success).toBe(true);
      expect(result.data?.results).toBeDefined();
      expect(result.data?.count).toBeGreaterThan(0);

      // Should find "Hello" in multiple files
      const matches = result.data?.results || [];
      const files = matches.map((m) => path.basename(m.file));
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('file3.txt');
    });

    it('should perform case-insensitive search', async () => {
      const request: SearchRequest = {
        path: testDir,
        pattern: 'hello',
        caseSensitive: false,
      };

      const result = await operations.search(request);

      expect(result.success).toBe(true);
      expect(result.data?.count).toBeGreaterThan(0);
    });

    it('should filter by file pattern', async () => {
      const request: SearchRequest = {
        path: testDir,
        pattern: 'Hello',
        filePattern: 'file1\\.txt',
      };

      const result = await operations.search(request);

      expect(result.success).toBe(true);
      const matches = result.data?.results || [];
      expect(matches.length).toBeGreaterThan(0);

      // All matches should be from file1.txt only
      matches.forEach((match) => {
        expect(path.basename(match.file)).toBe('file1.txt');
      });
    });

    it('should respect maxResults limit', async () => {
      const request: SearchRequest = {
        path: testDir,
        pattern: '.*', // Match everything
        maxResults: 2,
      };

      const result = await operations.search(request);

      expect(result.success).toBe(true);
      expect(result.data?.results.length).toBeLessThanOrEqual(2);
      expect(result.data?.truncated).toBe(true);
    });

    it('should skip node_modules and .git directories', async () => {
      // Create node_modules directory with a file
      await fs.promises.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, 'node_modules', 'package.txt'),
        'Should not be found'
      );

      const request: SearchRequest = {
        path: testDir,
        pattern: 'Should not be found',
      };

      const result = await operations.search(request);

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(0);
    });

    it('should use current directory when path is not provided', async () => {
      const request: SearchRequest = {
        pattern: 'test-pattern-that-wont-match',
      };

      const result = await operations.search(request);

      // Should succeed but may not find matches
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle regex patterns correctly', async () => {
      const request: SearchRequest = {
        path: testDir,
        pattern: 'Hello.*again',
        caseSensitive: true,
      };

      const result = await operations.search(request);

      expect(result.success).toBe(true);
      const matches = result.data?.results || [];
      expect(matches.some((m) => m.match.includes('Hello again'))).toBe(true);
    });

    it('should fail for invalid path', async () => {
      const request: SearchRequest = {
        path: path.join(testDir, '..', 'invalid'),
        pattern: 'test',
      };

      const result = await operations.search(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });
  });
});
