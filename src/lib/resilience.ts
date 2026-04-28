// ─── Resilience: Auto-Retry with Fallback ───────────────────
// Wraps AI provider calls with exponential backoff retry
// and automatic fallback to a secondary provider.

import { logger } from "./logger";

const log = logger.child({ module: "resilience" });

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Execute an async function with exponential backoff retry.
 * Throws after all retries exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
          opts.maxDelayMs
        );
        log.debug({ label, attempt, delay, err: lastError?.message }, "Retrying...");
        await sleep(delay);
      }

      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      opts.onRetry(attempt, lastError);

      // Don't retry on auth/permission errors
      if (isNonRetryable(lastError)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(`${label} failed after ${opts.maxRetries + 1} attempts`);
}

/**
 * Try primary function; on failure, fall back to secondary.
 * Each function gets its own retry budget.
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  label: string,
  options: RetryOptions = {}
): Promise<{ result: T; source: "primary" | "fallback" }> {
  // Try primary with retries
  try {
    const result = await withRetry(primary, `${label}/primary`, options);
    return { result, source: "primary" };
  } catch (primaryErr) {
    log.warn({ label, err: primaryErr instanceof Error ? primaryErr.message : primaryErr },
      "Primary failed, switching to fallback");

    // Try fallback with retries
    try {
      const result = await withRetry(fallback, `${label}/fallback`, options);
      return { result, source: "fallback" };
    } catch (fallbackErr) {
      log.error({ label, primaryErr: primaryErr instanceof Error ? primaryErr.message : primaryErr,
        fallbackErr: fallbackErr instanceof Error ? fallbackErr.message : fallbackErr },
        "Both primary and fallback failed");
      throw fallbackErr;
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Errors that shouldn't be retried (auth, invalid input, etc.) */
function isNonRetryable(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("invalid api key") ||
    msg.includes("quota exceeded") ||
    msg.includes("rate limit") && !msg.includes("retry-after") ||
    msg.includes("bad request") &&
    (msg.includes("invalid") || msg.includes("malformed"))
  );
}
