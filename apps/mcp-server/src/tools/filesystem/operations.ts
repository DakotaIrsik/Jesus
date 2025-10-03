import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FilesystemGuard } from './guards.js';
import type {
  ReadFileRequest,
  WriteFileRequest,
  ApplyPatchRequest,
  SearchRequest,
  ToolResult,
} from './types.js';

export class FilesystemOperations {
  constructor(private guard: FilesystemGuard) {}

  async readFile(request: ReadFileRequest): Promise<ToolResult> {
    const pathValidation = this.guard.validatePath(request.path);
    if (!pathValidation.valid) {
      return { success: false, error: pathValidation.error };
    }

    const resolvedPath = pathValidation.resolvedPath!;
    const accessCheck = await this.guard.checkFileAccess(resolvedPath, fs.constants.R_OK);
    if (!accessCheck.accessible) {
      return { success: false, error: accessCheck.error };
    }

    try {
      const stats = await fs.promises.stat(resolvedPath);
      const sizeValidation = this.guard.validateFileSize(stats.size);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }

      const encoding = request.encoding || 'utf8';
      const content = await fs.promises.readFile(
        resolvedPath,
        encoding === 'binary' ? null : encoding
      );

      return {
        success: true,
        data: {
          content: encoding === 'binary' ? content.toString('base64') : content,
          size: stats.size,
          path: resolvedPath,
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to read file: ${error}` };
    }
  }

  async writeFile(request: WriteFileRequest): Promise<ToolResult> {
    const pathValidation = this.guard.validatePath(request.path);
    if (!pathValidation.valid) {
      return { success: false, error: pathValidation.error };
    }

    const resolvedPath = pathValidation.resolvedPath!;

    // Check content size
    const contentSize = Buffer.byteLength(request.content, 'utf8');
    const sizeValidation = this.guard.validateFileSize(contentSize);
    if (!sizeValidation.valid) {
      return { success: false, error: sizeValidation.error };
    }

    try {
      // Create parent directories if requested
      if (request.createDirs) {
        await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });
      }

      const encoding = request.encoding || 'utf8';
      const content =
        encoding === 'binary' ? Buffer.from(request.content, 'base64') : request.content;

      await fs.promises.writeFile(resolvedPath, content, encoding === 'binary' ? null : encoding);

      return {
        success: true,
        data: {
          path: resolvedPath,
          size: contentSize,
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to write file: ${error}` };
    }
  }

  async applyPatch(request: ApplyPatchRequest): Promise<ToolResult> {
    const pathValidation = this.guard.validatePath(request.path);
    if (!pathValidation.valid) {
      return { success: false, error: pathValidation.error };
    }

    const resolvedPath = pathValidation.resolvedPath!;

    if (request.dryRun) {
      return {
        success: true,
        data: {
          dryRun: true,
          path: resolvedPath,
          patch: request.patch,
          message: 'Dry run: patch not applied',
        },
      };
    }

    return {
      success: false,
      error: 'Patch functionality not yet implemented',
    };
  }

  async search(request: SearchRequest): Promise<ToolResult> {
    const searchPath = request.path || process.cwd();
    const pathValidation = this.guard.validatePath(searchPath);
    if (!pathValidation.valid) {
      return { success: false, error: pathValidation.error };
    }

    const resolvedPath = pathValidation.resolvedPath!;

    try {
      const regex = new RegExp(
        request.pattern,
        request.caseSensitive !== false ? '' : 'i'
      );
      const maxResults = request.maxResults || 100;
      const results: { file: string; line: number; match: string }[] = [];

      await this.searchDirectory(resolvedPath, regex, request.filePattern, results, maxResults);

      return {
        success: true,
        data: {
          results,
          count: results.length,
          truncated: results.length >= maxResults,
        },
      };
    } catch (error) {
      return { success: false, error: `Search failed: ${error}` };
    }
  }

  private async searchDirectory(
    dirPath: string,
    pattern: RegExp,
    filePattern: string | undefined,
    results: { file: string; line: number; match: string }[],
    maxResults: number
  ): Promise<void> {
    if (results.length >= maxResults) return;

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        if (entry.isDirectory()) {
          await this.searchDirectory(fullPath, pattern, filePattern, results, maxResults);
        } else if (entry.isFile()) {
          if (filePattern && !entry.name.match(new RegExp(filePattern))) {
            continue;
          }

          try {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length && results.length < maxResults; i++) {
              const line = lines[i];
              if (line && pattern.test(line)) {
                results.push({
                  file: fullPath,
                  line: i + 1,
                  match: line.trim(),
                });
              }
            }
          } catch {
            continue;
          }
        }
      }
    } catch {
      return;
    }
  }
}
