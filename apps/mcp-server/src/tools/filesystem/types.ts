import { z } from 'zod';

/**
 * Configuration for filesystem tool security and limits
 */
export const FilesystemConfigSchema = z.object({
  allowedPaths: z.array(z.string()).default([]),
  deniedPaths: z.array(z.string()).default([]),
  maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB default
  streamThreshold: z.number().default(1024 * 1024), // 1MB default
});

export type FilesystemConfig = z.infer<typeof FilesystemConfigSchema>;

/**
 * File read request schema
 */
export const ReadFileRequestSchema = z.object({
  path: z.string(),
  encoding: z.enum(['utf8', 'binary']).default('utf8'),
});

export type ReadFileRequest = z.infer<typeof ReadFileRequestSchema>;

/**
 * File write request schema
 */
export const WriteFileRequestSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.enum(['utf8', 'binary']).default('utf8'),
  createDirs: z.boolean().default(false),
});

export type WriteFileRequest = z.infer<typeof WriteFileRequestSchema>;

/**
 * Patch application request schema (unified diff format)
 */
export const ApplyPatchRequestSchema = z.object({
  path: z.string(),
  patch: z.string(),
  dryRun: z.boolean().default(false),
});

export type ApplyPatchRequest = z.infer<typeof ApplyPatchRequestSchema>;

/**
 * Code search request schema
 */
export const SearchRequestSchema = z.object({
  pattern: z.string(),
  path: z.string().optional(),
  filePattern: z.string().optional(),
  maxResults: z.number().default(100),
  caseSensitive: z.boolean().default(true),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

/**
 * Search result
 */
export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context?: string;
}
