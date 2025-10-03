import { FilesystemGuard } from './guards.js';
import { FilesystemOperations } from './operations.js';
import type { FilesystemConfig } from './types.js';

export function createFilesystemTool(config: FilesystemConfig) {
  const guard = new FilesystemGuard(config);
  const operations = new FilesystemOperations(guard);

  return {
    guard,
    operations,
  };
}

export type {
  FilesystemConfig,
  ReadFileRequest,
  WriteFileRequest,
  ApplyPatchRequest,
  SearchRequest,
  ToolResult,
} from './types.js';
