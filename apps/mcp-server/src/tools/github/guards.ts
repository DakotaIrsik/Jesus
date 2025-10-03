import type { GitHubConfig, RateLimitInfo } from './types.js';

export class GitHubGuard {
  private requestTimestamps: number[] = [];
  private resetTime: number;

  constructor(private config: GitHubConfig) {
    this.resetTime = Date.now() + 60000; // 1 minute from now
  }

  checkRateLimit(_operation: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();

    // Reset if window has passed
    if (now >= this.resetTime) {
      this.requestTimestamps = [];
      this.resetTime = now + 60000;
    }

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > now - 60000);

    const remaining = this.config.maxRequestsPerMinute - this.requestTimestamps.length;

    const info: RateLimitInfo = {
      remaining,
      limit: this.config.maxRequestsPerMinute,
      reset: Math.floor(this.resetTime / 1000),
    };

    if (remaining <= 0) {
      return { allowed: false, info };
    }

    // Record this request
    this.requestTimestamps.push(now);

    return { allowed: true, info };
  }

  isDryRunMode(): boolean {
    return this.config.dryRunMode;
  }

  isAuditLogEnabled(): boolean {
    return this.config.auditLog;
  }

  isOperationAllowed(operation: string): boolean {
    if (this.config.allowedOperations.length === 0) {
      return true; // If no restrictions, allow all
    }
    return this.config.allowedOperations.includes(operation);
  }
}
