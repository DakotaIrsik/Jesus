export interface FilesystemConfig {
  allowedPaths: string[];
  deniedPaths: string[];
  maxFileSize: number;
  streamThreshold: number;
}

export interface ReadFileRequest {
  path: string;
  encoding?: 'utf8' | 'binary';
}

export interface WriteFileRequest {
  path: string;
  content: string;
  encoding?: 'utf8' | 'binary';
  createDirs?: boolean;
}

export interface ApplyPatchRequest {
  path: string;
  patch: string;
  dryRun?: boolean;
}

export interface SearchRequest {
  pattern: string;
  path?: string;
  filePattern?: string;
  maxResults?: number;
  caseSensitive?: boolean;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
