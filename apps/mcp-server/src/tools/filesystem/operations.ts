import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { FilesystemGuard } from './guards.js';
import type {
  FileOperationResult,
  ReadFileRequest,
  WriteFileRequest,
  ApplyPatchRequest,
  SearchRequest,
  SearchResult,
} from './types.js';

/**
 * Filesystem operations with security checks
 */
export class FilesystemOperations {
  constructor(private readonly guard: FilesystemGuard) {}

  /**
   * Read a file with security checks
   */
  async readFile(request: ReadFileRequest): Promise<FileOperationResult> {
    try {
      // Check if path is allowed
      if (!this.guard.isPathAllowed(request.path)) {
        return {
          success: false,
          error: `Access denied: ${request.path} is not in allowed paths`,
        };
      }

      // Check file size
      const sizeOk = await this.guard.checkFileSize(request.path);
      if (!sizeOk) {
        return {
          success: false,
          error: `File exceeds maximum size limit`,
        };
      }

      // Read file
      const content = await fs.readFile(
        request.path,
        request.encoding === 'binary' ? null : 'utf8'
      );

      return {
        success: true,
        data: { content, encoding: request.encoding },
        message: `Successfully read file: ${request.path}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Write a file with security checks
   */
  async writeFile(request: WriteFileRequest): Promise<FileOperationResult> {
    try {
      // Check if path is allowed
      if (!this.guard.isPathAllowed(request.path)) {
        return {
          success: false,
          error: `Access denied: ${request.path} is not in allowed paths`,
        };
      }

      // Create directories if needed
      if (request.createDirs) {
        const dir = path.dirname(request.path);
        await fs.mkdir(dir, { recursive: true });
      }

      // Write file
      await fs.writeFile(
        request.path,
        request.content,
        request.encoding === 'binary' ? null : 'utf8'
      );

      return {
        success: true,
        message: `Successfully wrote file: ${request.path}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Apply a unified diff patch to a file
   */
  async applyPatch(request: ApplyPatchRequest): Promise<FileOperationResult> {
    try {
      // Check if path is allowed
      if (!this.guard.isPathAllowed(request.path)) {
        return {
          success: false,
          error: `Access denied: ${request.path} is not in allowed paths`,
        };
      }

      // Validate patch format
      const validation = this.guard.validatePatchFormat(request.patch);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid patch format: ${validation.error ?? 'unknown error'}`,
        };
      }

      // Read original file
      const original = await fs.readFile(request.path, 'utf8');

      // Apply patch
      const patched = this.applyUnifiedDiff(original, request.patch);

      // Dry run - don't write, just return result
      if (request.dryRun) {
        return {
          success: true,
          data: { patched, dryRun: true },
          message: `Dry run successful - patch can be applied`,
        };
      }

      // Write patched content
      await fs.writeFile(request.path, patched, 'utf8');

      return {
        success: true,
        message: `Successfully applied patch to: ${request.path}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to apply patch: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Search for pattern in files
   */
  async search(request: SearchRequest): Promise<FileOperationResult> {
    try {
      const searchPath = request.path ?? process.cwd();

      // Check if path is allowed
      if (!this.guard.isPathAllowed(searchPath)) {
        return {
          success: false,
          error: `Access denied: ${searchPath} is not in allowed paths`,
        };
      }

      const results: SearchResult[] = [];
      const regex = new RegExp(
        request.pattern,
        request.caseSensitive ? 'g' : 'gi'
      );

      await this.searchDirectory(
        searchPath,
        regex,
        request.filePattern,
        request.maxResults,
        results
      );

      return {
        success: true,
        data: { results, count: results.length },
        message: `Found ${String(results.length)} matches`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Apply unified diff to content
   */
  private applyUnifiedDiff(original: string, patch: string): string {
    const originalLines = original.split('\n');
    const patchLines = patch.split('\n');
    const result: string[] = [];

    let originalIndex = 0;
    let i = 0;

    while (i < patchLines.length) {
      const line = patchLines[i];
      if (!line) {
        i++;
        continue;
      }

      // Skip file headers
      if (line.startsWith('---') || line.startsWith('+++')) {
        i++;
        continue;
      }

      // Process hunk header
      if (line.startsWith('@@')) {
        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (!hunkMatch?.[1]) {
          throw new Error(`Invalid hunk header: ${line}`);
        }

        const oldStart = parseInt(hunkMatch[1], 10);

        // Copy lines before this hunk
        while (originalIndex < oldStart - 1) {
          result.push(originalLines[originalIndex] ?? '');
          originalIndex++;
        }

        i++;
        continue;
      }

      // Process diff content
      if (line.startsWith(' ')) {
        // Context line - keep from original
        result.push(originalLines[originalIndex] ?? '');
        originalIndex++;
      } else if (line.startsWith('-')) {
        // Deletion - skip original line
        originalIndex++;
      } else if (line.startsWith('+')) {
        // Addition - add new line
        result.push(line.substring(1));
      } else if (line.startsWith('\\')) {
        // No newline marker - skip
      }

      i++;
    }

    // Copy remaining original lines
    while (originalIndex < originalLines.length) {
      result.push(originalLines[originalIndex] ?? '');
      originalIndex++;
    }

    return result.join('\n');
  }

  /**
   * Recursively search directory for pattern
   */
  private async searchDirectory(
    dir: string,
    regex: RegExp,
    filePattern: string | undefined,
    maxResults: number,
    results: SearchResult[]
  ): Promise<void> {
    if (results.length >= maxResults) {
      return;
    }

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) {
          break;
        }

        const fullPath = path.join(dir, entry.name);

        // Skip if path not allowed
        if (!this.guard.isPathAllowed(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recurse into subdirectory
          await this.searchDirectory(dir, regex, filePattern, maxResults, results);
        } else if (entry.isFile()) {
          // Check file pattern if specified
          if (filePattern && !this.matchesPattern(entry.name, filePattern)) {
            continue;
          }

          // Check file size
          const sizeOk = await this.guard.checkFileSize(fullPath);
          if (!sizeOk) {
            continue;
          }

          // Search file content
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n');

            for (let lineNum = 0; lineNum < lines.length && results.length < maxResults; lineNum++) {
              const line = lines[lineNum];
              if (!line) continue;

              const matches = [...line.matchAll(regex)];
              for (const match of matches) {
                if (results.length >= maxResults) {
                  break;
                }

                results.push({
                  file: fullPath,
                  line: lineNum + 1,
                  column: match.index,
                  match: match[0],
                  context: line,
                });
              }
            }
          } catch {
            // Skip files that can't be read as text
            continue;
          }
        }
      }
    } catch {
      // Skip directories that can't be read
      return;
    }
  }

  /**
   * Check if filename matches pattern
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob pattern matching (* and ?)
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }
}
