import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FilesystemGuard } from './guards.js';
import type { FilesystemConfig } from './types.js';

describe('FilesystemGuard', () => {
  let tempDir: string;
  let guard: FilesystemGuard;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-guard-test-'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('isPathAllowed', () => {
    it('should allow all paths when allowlist is empty and denylist is empty', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024 * 1024,
        streamThreshold: 512 * 1024,
      };
      guard = new FilesystemGuard(config);

      expect(guard.isPathAllowed('/any/path')).toBe(true);
      expect(guard.isPathAllowed('/another/path')).toBe(true);
    });

    it('should allow only paths in allowlist', () => {
      const config: FilesystemConfig = {
        allowedPaths: [tempDir],
        deniedPaths: [],
        maxFileSize: 1024 * 1024,
        streamThreshold: 512 * 1024,
      };
      guard = new FilesystemGuard(config);

      const allowedPath = path.join(tempDir, 'file.txt');
      const deniedPath = '/some/other/path';

      expect(guard.isPathAllowed(allowedPath)).toBe(true);
      expect(guard.isPathAllowed(deniedPath)).toBe(false);
    });

    it('should deny paths in denylist even if in allowlist', () => {
      const deniedSubdir = path.join(tempDir, 'denied');
      const config: FilesystemConfig = {
        allowedPaths: [tempDir],
        deniedPaths: [deniedSubdir],
        maxFileSize: 1024 * 1024,
        streamThreshold: 512 * 1024,
      };
      guard = new FilesystemGuard(config);

      const allowedPath = path.join(tempDir, 'file.txt');
      const deniedPath = path.join(deniedSubdir, 'file.txt');

      expect(guard.isPathAllowed(allowedPath)).toBe(true);
      expect(guard.isPathAllowed(deniedPath)).toBe(false);
    });

    it('should handle nested paths correctly', () => {
      const config: FilesystemConfig = {
        allowedPaths: [tempDir],
        deniedPaths: [],
        maxFileSize: 1024 * 1024,
        streamThreshold: 512 * 1024,
      };
      guard = new FilesystemGuard(config);

      const nestedPath = path.join(tempDir, 'subdir', 'nested', 'file.txt');
      expect(guard.isPathAllowed(nestedPath)).toBe(true);
    });
  });

  describe('checkFileSize', () => {
    it('should return true for files within size limit', async () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const filePath = path.join(tempDir, 'small.txt');
      await fs.writeFile(filePath, 'small content', 'utf8');

      expect(await guard.checkFileSize(filePath)).toBe(true);
    });

    it('should return false for files exceeding size limit', async () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 100,
        streamThreshold: 50,
      };
      guard = new FilesystemGuard(config);

      const filePath = path.join(tempDir, 'large.txt');
      await fs.writeFile(filePath, 'x'.repeat(200), 'utf8');

      expect(await guard.checkFileSize(filePath)).toBe(false);
    });

    it('should return true for non-existent files', async () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const filePath = path.join(tempDir, 'nonexistent.txt');
      expect(await guard.checkFileSize(filePath)).toBe(true);
    });
  });

  describe('shouldStream', () => {
    it('should return true for files exceeding stream threshold', async () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 10240,
        streamThreshold: 100,
      };
      guard = new FilesystemGuard(config);

      const filePath = path.join(tempDir, 'large.txt');
      await fs.writeFile(filePath, 'x'.repeat(200), 'utf8');

      expect(await guard.shouldStream(filePath)).toBe(true);
    });

    it('should return false for files below stream threshold', async () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 10240,
        streamThreshold: 1000,
      };
      guard = new FilesystemGuard(config);

      const filePath = path.join(tempDir, 'small.txt');
      await fs.writeFile(filePath, 'small', 'utf8');

      expect(await guard.shouldStream(filePath)).toBe(false);
    });

    it('should return false for non-existent files', async () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 10240,
        streamThreshold: 1000,
      };
      guard = new FilesystemGuard(config);

      const filePath = path.join(tempDir, 'nonexistent.txt');
      expect(await guard.shouldStream(filePath)).toBe(false);
    });
  });

  describe('validatePatchFormat', () => {
    it('should validate correct unified diff format', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const validPatch = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3`;

      const result = guard.validatePatchFormat(validPatch);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty patches', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const result = guard.validatePatchFormat('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Patch is empty');
    });

    it('should reject patches without hunk headers', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const invalidPatch = `--- a/file.txt
+++ b/file.txt
-line 1
+line 2`;

      const result = guard.validatePatchFormat(invalidPatch);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must contain at least one hunk header');
    });

    it('should reject patches with invalid hunk headers', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const invalidPatch = `--- a/file.txt
+++ b/file.txt
@@ invalid hunk @@
-line 1
+line 2`;

      const result = guard.validatePatchFormat(invalidPatch);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid hunk header');
    });

    it('should reject patches with invalid diff lines', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const invalidPatch = `--- a/file.txt
+++ b/file.txt
@@ -1,2 +1,2 @@
invalid line without prefix
-line 2`;

      const result = guard.validatePatchFormat(invalidPatch);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid diff line');
    });

    it('should accept patches with context lines', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const validPatch = `--- a/file.txt
+++ b/file.txt
@@ -1,4 +1,4 @@
 context line 1
-old line
+new line
 context line 2`;

      const result = guard.validatePatchFormat(validPatch);
      expect(result.valid).toBe(true);
    });

    it('should accept patches with no newline markers', () => {
      const config: FilesystemConfig = {
        allowedPaths: [],
        deniedPaths: [],
        maxFileSize: 1024,
        streamThreshold: 512,
      };
      guard = new FilesystemGuard(config);

      const validPatch = `--- a/file.txt
+++ b/file.txt
@@ -1,2 +1,2 @@
-line 1
+line 1 modified
\\ No newline at end of file`;

      const result = guard.validatePatchFormat(validPatch);
      expect(result.valid).toBe(true);
    });
  });
});
