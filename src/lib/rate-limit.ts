// ─── Rate Limiting ──────────────────────────────────────────
// Plan-based rate limiting using Upstash Redis.
// Falls back to no-op in development, fails closed in production.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const PLAN_LIMITS = {
  free:       { perHour: 2,   perDay: 10,  maxDuration: 5,  monthlyCredits: 10 },
  starter:    { perHour: 10,  perDay: 30,  maxDuration: 15, monthlyCredits: 30 },
  pro:        { perHour: 30,  perDay: 100, maxDuration: 60, monthlyCredits: -1 },
  enterprise: { perHour: 100, perDay: 500, maxDuration: 120, monthlyCredits: -1 },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

const isProduction = process.env.NODE_ENV === "production";

function getUpstashRedis(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return null;
}

export function createRateLimiter(plan: PlanTier) {
  const limits = PLAN_LIMITS[plan];
  const upstash = getUpstashRedis();

  if (!upstash) {
    // In production, fail closed — no Redis means no access
    if (isProduction) {
      return {
        limit: async (_key: string) => ({
          success: false as const,
          remaining: 0,
          limit: limits.perHour,
          reset: 0,
        }),
      };
    }
    // Dev mode: no-op (allow all)
    return {
      limit: async (_key: string) => ({
        success: true as const,
        remaining: limits.perHour,
        limit: limits.perHour,
        reset: 0,
      }),
    };
  }

  return new Ratelimit({
    redis: upstash,
    limiter: Ratelimit.slidingWindow(limits.perHour, "1 h"),
    prefix: `reelmagic:${plan}`,
  });
}

export async function checkRateLimit(
  userId: string,
  plan: PlanTier
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const limiter = createRateLimiter(plan);
    const result = await limiter.limit(userId);
    return { allowed: result.success, remaining: result.remaining };
  } catch {
    // In production, fail closed on error
    if (isProduction) {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: PLAN_LIMITS[plan].perHour };
  }
}
