import { z } from 'zod';

/**
 * Configuration for GitHub tool security and limits
 */
export const GitHubConfigSchema = z.object({
  /** Enable dry-run mode by default */
  dryRunMode: z.boolean().default(false),
  /** Enable audit trail logging */
  auditLog: z.boolean().default(true),
  /** Max requests per minute for rate limiting */
  maxRequestsPerMinute: z.number().default(60),
  /** Allowed GitHub operations */
  allowedOperations: z
    .array(
      z.enum([
        'issue.create',
        'issue.update',
        'issue.comment',
        'issue.list',
        'pr.create',
        'pr.update',
        'pr.comment',
        'pr.list',
        'label.add',
        'label.remove',
        'label.list',
      ])
    )
    .default([]),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

/**
 * Base request schema with dry-run support
 */
export const BaseGitHubRequestSchema = z.object({
  dryRun: z.boolean().default(false),
});

/**
 * Issue creation request schema
 */
export const CreateIssueRequestSchema = BaseGitHubRequestSchema.extend({
  title: z.string().min(1),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().optional(),
});

export type CreateIssueRequest = z.infer<typeof CreateIssueRequestSchema>;

/**
 * Issue update request schema
 */
export const UpdateIssueRequestSchema = BaseGitHubRequestSchema.extend({
  issueNumber: z.number(),
  title: z.string().optional(),
  body: z.string().optional(),
  state: z.enum(['open', 'closed']).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().nullable().optional(),
});

export type UpdateIssueRequest = z.infer<typeof UpdateIssueRequestSchema>;

/**
 * Comment creation request schema
 */
export const CreateCommentRequestSchema = BaseGitHubRequestSchema.extend({
  issueNumber: z.number(),
  body: z.string().min(1),
});

export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;

/**
 * Pull request creation request schema
 */
export const CreatePullRequestRequestSchema = BaseGitHubRequestSchema.extend({
  title: z.string().min(1),
  body: z.string().optional(),
  head: z.string(), // branch name
  base: z.string().default('main'),
  draft: z.boolean().default(false),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().optional(),
});

export type CreatePullRequestRequest = z.infer<typeof CreatePullRequestRequestSchema>;

/**
 * Label management request schema
 */
export const ManageLabelsRequestSchema = BaseGitHubRequestSchema.extend({
  issueNumber: z.number(),
  labels: z.array(z.string()),
  action: z.enum(['add', 'remove', 'set']),
});

export type ManageLabelsRequest = z.infer<typeof ManageLabelsRequestSchema>;

/**
 * List issues request schema
 */
export const ListIssuesRequestSchema = z.object({
  state: z.enum(['open', 'closed', 'all']).default('open'),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  milestone: z.union([z.number(), z.literal('*'), z.literal('none')]).optional(),
  sort: z.enum(['created', 'updated', 'comments']).default('created'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  per_page: z.number().min(1).max(100).default(30),
  page: z.number().min(1).default(1),
});

export type ListIssuesRequest = z.infer<typeof ListIssuesRequestSchema>;

/**
 * GitHub operation result
 */
export interface GitHubOperationResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
  dryRun?: boolean;
  auditTrail?: AuditEntry;
}

/**
 * Audit trail entry
 */
export interface AuditEntry {
  timestamp: string;
  operation: string;
  user?: string;
  parameters: Record<string, unknown>;
  result: 'success' | 'failure' | 'dry-run';
  error?: string;
}

/**
 * Rate limit tracking
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}
