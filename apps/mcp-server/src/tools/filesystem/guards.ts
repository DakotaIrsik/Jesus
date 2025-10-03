import * as path from 'node:path';
import * as fs from 'node:fs';
import type { FilesystemConfig } from './types.js';

export class FilesystemGuard {
  constructor(private config: FilesystemConfig) {}

  validatePath(filePath: string): { valid: boolean; error?: string; resolvedPath?: string } {
    try {
      const resolvedPath = path.resolve(filePath);

      // Check for path traversal
      if (filePath.includes('..')) {
        return { valid: false, error: 'Path traversal detected' };
      }

      // Check denied paths
      for (const deniedPath of this.config.deniedPaths) {
        const resolvedDenied = path.resolve(deniedPath);
        if (resolvedPath.startsWith(resolvedDenied)) {
          return { valid: false, error: `Access denied to path: ${deniedPath}` };
        }
      }

      // Check allowed paths (if configured)
      if (this.config.allowedPaths.length > 0) {
        const isAllowed = this.config.allowedPaths.some((allowedPath) => {
          const resolvedAllowed = path.resolve(allowedPath);
          return resolvedPath.startsWith(resolvedAllowed);
        });

        if (!isAllowed) {
          return { valid: false, error: 'Path not in allowed list' };
        }
      }

      return { valid: true, resolvedPath };
    } catch (error) {
      return { valid: false, error: `Invalid path: ${error}` };
    }
  }

  validateFileSize(size: number): { valid: boolean; error?: string } {
    if (size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size ${size} exceeds maximum ${this.config.maxFileSize}`,
      };
    }
    return { valid: true };
  }

  shouldStream(size: number): boolean {
    return size > this.config.streamThreshold;
  }

  async checkFileAccess(
    filePath: string,
    mode: number = fs.constants.R_OK
  ): Promise<{ accessible: boolean; error?: string }> {
    try {
      await fs.promises.access(filePath, mode);
      return { accessible: true };
    } catch (error) {
      return { accessible: false, error: `File not accessible: ${error}` };
    }
  }
}
