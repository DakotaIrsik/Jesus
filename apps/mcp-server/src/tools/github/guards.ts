import type { GitHubConfig, RateLimitInfo } from './types.js';

/**
 * Security guard for GitHub operations with permission checks and rate limiting
 */
export class GitHubGuard {
  private config: GitHubConfig;
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  /**
   * Check if an operation is allowed by configuration
   */
  isOperationAllowed(operation: string): boolean {
    // If allowedOperations is empty, allow all operations
    if (this.config.allowedOperations.length === 0) {
      return true;
    }
    return this.config.allowedOperations.includes(operation as any);
  }

  /**
   * Check rate limit and track requests
   */
  checkRateLimit(operation: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const key = operation;

    // Get or create request timestamps for this operation
    const timestamps = this.rateLimitTracker.get(key) || [];

    // Remove timestamps outside the current window
    const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    // Check if we're over the limit
    const allowed = recentTimestamps.length < this.config.maxRequestsPerMinute;

    // Add current timestamp if allowed
    if (allowed) {
      recentTimestamps.push(now);
      this.rateLimitTracker.set(key, recentTimestamps);
    }

    // Calculate reset time (start of next window)
    const oldestTimestamp = recentTimestamps[0] || now;
    const resetTime = oldestTimestamp + windowMs;

    return {
      allowed,
      info: {
        limit: this.config.maxRequestsPerMinute,
        remaining: Math.max(0, this.config.maxRequestsPerMinute - recentTimestamps.length),
        reset: Math.floor(resetTime / 1000),
        used: recentTimestamps.length,
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<GitHubConfig> {
    return this.config;
  }

  /**
   * Check if audit logging is enabled
   */
  isAuditEnabled(): boolean {
    return this.config.auditLog;
  }

  /**
   * Check if dry-run mode is enabled globally
   */
  isDryRunMode(): boolean {
    return this.config.dryRunMode;
  }

  /**
   * Reset rate limit tracking (useful for testing)
   */
  resetRateLimits(): void {
    this.rateLimitTracker.clear();
  }
}
