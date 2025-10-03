import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { FilesystemConfig } from './types.js';

/**
 * Security guard for filesystem operations
 * Validates paths, file sizes, and patch formats
 */
export class FilesystemGuard {
  constructor(private readonly config: FilesystemConfig) {}

  /**
   * Check if a path is allowed based on allowlist/denylist configuration
   */
  isPathAllowed(filePath: string): boolean {
    const normalizedPath = path.resolve(filePath);

    // Check denylist first
    if (this.config.deniedPaths.length > 0) {
      for (const deniedPath of this.config.deniedPaths) {
        const normalizedDenied = path.resolve(deniedPath);
        if (normalizedPath.startsWith(normalizedDenied)) {
          return false;
        }
      }
    }

    // If allowlist is empty, allow all paths (except denied)
    if (this.config.allowedPaths.length === 0) {
      return true;
    }

    // Check allowlist
    for (const allowedPath of this.config.allowedPaths) {
      const normalizedAllowed = path.resolve(allowedPath);
      if (normalizedPath.startsWith(normalizedAllowed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if file size is within configured limits
   */
  async checkFileSize(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size <= this.config.maxFileSize;
    } catch (error) {
      // If file doesn't exist or can't be accessed, return true to allow operation
      return true;
    }
  }

  /**
   * Determine if file should be streamed based on size threshold
   */
  async shouldStream(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size > this.config.streamThreshold;
    } catch (error) {
      // If file doesn't exist or can't be accessed, don't stream
      return false;
    }
  }

  /**
   * Validate unified diff patch format
   */
  validatePatchFormat(patch: string): { valid: boolean; error?: string } {
    if (!patch || patch.trim().length === 0) {
      return { valid: false, error: 'Patch is empty' };
    }

    const lines = patch.split('\n');
    let hasHunkHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check for file headers (--- and +++)
      if (line.startsWith('---') || line.startsWith('+++')) {
        continue;
      }

      // Check for hunk headers (@@ -start,count +start,count @@)
      if (line.startsWith('@@')) {
        const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
        if (!hunkRegex.test(line)) {
          return {
            valid: false,
            error: `Invalid hunk header at line ${i + 1}: ${line}`,
          };
        }
        hasHunkHeader = true;
        continue;
      }

      // Check for valid diff content lines (should start with ' ', '+', '-', or '\')
      if (line.length > 0 && hasHunkHeader) {
        const firstChar = line[0];
        if (firstChar && ![' ', '+', '-', '\\'].includes(firstChar)) {
          return {
            valid: false,
            error: `Invalid diff line at ${i + 1}: lines must start with ' ', '+', '-', or '\\'`,
          };
        }
      }
    }

    if (!hasHunkHeader) {
      return {
        valid: false,
        error: 'Patch must contain at least one hunk header (@@)',
      };
    }

    return { valid: true };
  }
}
