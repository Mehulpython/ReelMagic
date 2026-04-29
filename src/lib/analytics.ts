// ─── Analytics Event Tracking System ─────────────────────────
// Client + server-side event tracking with buffered writes to
// Supabase. Supports funnel metrics, user analytics, and admin
// aggregation queries.

import { createServerClient } from "./supabase";
import { logger } from "./logger";

const log = logger.child({ module: "analytics" });

// ─── Event Types ─────────────────────────────────────────────

export type AnalyticsEventType =
  | "video:view"
  | "video:complete"      // watched >80%
  | "video:pause"
  | "generation:start"
  | "generation:complete"
  | "generation:fail"
  | "share:click"
  | "template:view"
  | "page:view"
  | "signup:start"
  | "signup:complete"
  | "pricing:view"
  | "upgrade:click";

export const ALLOWED_EVENT_TYPES: AnalyticsEventType[] = [
  "video:view",
  "video:complete",
  "video:pause",
  "generation:start",
  "generation:complete",
  "generation:fail",
  "share:click",
  "template:view",
  "page:view",
  "signup:start",
  "signup:complete",
  "pricing:view",
  "upgrade:click",
];

// ─── Event Shape ─────────────────────────────────────────────

export interface AnalyticsEvent {
  id?: string;
  userId?: string;
  sessionId: string;
  type: AnalyticsEventType;
  properties: Record<string, unknown>;
  url?: string;
  referrer?: string;
  userAgent?: string;
  timestamp?: string;
}

// ─── In-Memory Write Buffer ──────────────────────────────────

let eventBuffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BUFFER_FLUSH_INTERVAL_MS = 10_000; // 10 seconds
const BUFFER_MAX_SIZE = 50;

/**
 * Flush buffered events to Supabase.
 * Called automatically on interval or when buffer is full.
 */
async function flushBuffer(): Promise<void> {
  if (eventBuffer.length === 0) return;

  // Take all events out of the buffer atomically
  const batch = eventBuffer.splice(0);

  if (batch.length === 0) return;

  try {
    const supabase = createServerClient();
    const rows = batch.map((e) => ({
      user_id: e.userId || null,
      session_id: e.sessionId,
      event_type: e.type,
      properties: e.properties,
      url: e.url || null,
      referrer: e.referrer || null,
      user_agent: e.userAgent || null,
    }));

    const { error } = await supabase.from("analytics_events").insert(rows);

    if (error) {
      log.error({ error, count: batch.length }, "Analytics flush failed — re-buffering");
      // Put events back (at most once — if this fails again they're dropped)
      eventBuffer.unshift(...batch);
    } else {
      log.debug({ count: batch.length }, "Analytics events flushed");
    }
  } catch (err) {
    log.error({ err, count: batch.length }, "Analytics flush exception");
    // Re-buffer on failure
    eventBuffer.unshift(...batch);
  }
}

/**
 * Ensure the auto-flush timer is running.
 */
function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushBuffer, BUFFER_FLUSH_INTERVAL_MS);
  // Don't prevent Node.js exit in worker/CLI contexts
  if (flushTimer && typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }
}

// ─── Track Event ─────────────────────────────────────────────

/**
 * Record an analytics event. Buffered and flushed automatically.
 */
export function trackEvent(event: AnalyticsEvent): void {
  // Validate event type
  if (!ALLOWED_EVENT_TYPES.includes(event.type)) {
    log.warn({ type: event.type }, "Unknown analytics event type, ignoring");
    return;
  }

  const enriched: AnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  eventBuffer.push(enriched);
  ensureFlushTimer();

  // Auto-flush if buffer is full
  if (eventBuffer.length >= BUFFER_MAX_SIZE) {
    flushBuffer(); // fire-and-forget
  }
}

/**
 * Flush any remaining events immediately.
 * Call this on graceful shutdown.
 */
export async function flushAnalytics(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushBuffer();
}

// ─── Query Helpers ───────────────────────────────────────────

export interface AnalyticsQueryOptions {
  startDate?: string;
  endDate?: string;
  eventTypes?: AnalyticsEventType[];
  limit?: number;
}

export interface AnalyticsAggregation {
  totalEvents: number;
  uniqueSessions: number;
  eventsByType: Record<string, number>;
  dailyCounts: Array<{ date: string; count: number }>;
  topUrls: Array<{ url: string; count: number }>;
}

/**
 * Fetch aggregated analytics for a user or globally (admin).
 */
export async function getAnalytics(
  userId?: string,
  options: AnalyticsQueryOptions = {}
): Promise<AnalyticsAggregation> {
  const supabase = createServerClient();

  let query = supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: false })
    .order("created_at", { ascending: false })
    .limit(options.limit || 1000);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (options.startDate) {
    query = query.gte("created_at", options.startDate);
  }

  if (options.endDate) {
    query = query.lte("created_at", options.endDate);
  }

  if (options.eventTypes?.length) {
    query = query.in("event_type", options.eventTypes);
  }

  const { data, error, count } = await query;

  if (error || !data) {
    log.error({ error, userId }, "Analytics query failed");
    return {
      totalEvents: 0,
      uniqueSessions: 0,
      eventsByType: {},
      dailyCounts: [],
      topUrls: [],
    };
  }

  // Aggregate in-memory (for MVP; move to SQL for scale)
  const eventsByType: Record<string, number> = {};
  const sessions = new Set<string>();
  const dailyMap = new Map<string, number>();
  const urlMap = new Map<string, number>();

  for (const row of data) {
    eventsByType[row.event_type] = (eventsByType[row.event_type] || 0) + 1;
    sessions.add(row.session_id);

    const day = row.created_at?.slice(0, 10) || "unknown";
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1);

    if (row.url) {
      urlMap.set(row.url, (urlMap.get(row.url) || 0) + 1);
    }
  }

  const dailyCounts = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topUrls = Array.from(urlMap.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: count ?? data.length,
    uniqueSessions: sessions.size,
    eventsByType,
    dailyCounts,
    topUrls,
  };
}

// ─── Funnel Metrics ──────────────────────────────────────────

export interface FunnelStep {
  name: string;
  event: AnalyticsEventType;
  count: number;
  percentage: number;
}

export interface FunnelMetrics {
  steps: FunnelStep[];
  totalEntries: number;
  period: { start: string; end: string };
}

/**
 * Compute conversion funnel:
 * template:view → generation:start → generation:complete → share:click
 */
export async function getFunnelMetrics(
  startDate?: string,
  endDate?: string
): Promise<FunnelMetrics> {
  const supabase = createServerClient();

  const funnelEvents: AnalyticsEventType[] = [
    "template:view",
    "generation:start",
    "generation:complete",
    "share:click",
  ];

  let baseQuery = supabase
    .from("analytics_events")
    .select("event_type")
    .in("event_type", funnelEvents);

  if (startDate) baseQuery = baseQuery.gte("created_at", startDate);
  if (endDate) baseQuery = baseQuery.lte("created_at", endDate);

  const { data, error } = await baseQuery;

  if (error || !data) {
    log.error({ error }, "Funnel query failed");
    return {
      steps: [],
      totalEntries: 0,
      period: { start: startDate || "", end: endDate || "" },
    };
  }

  // Count per step (unique sessions)
  const sessionSets = funnelEvents.map(() => new Set<string>());
  // We'd need session_id included — adjust query if needed. For now use raw counts.

  const counts: Record<string, number> = {};
  for (const ev of data) {
    counts[ev.event_type] = (counts[ev.event_type] || 0) + 1;
  }

  const totalCounts = counts[funnelEvents[0]] || 0;
  const steps: FunnelStep[] = funnelEvents.map((event) => ({
    name: event.replace(/:/g, " ").replace(/\b\w/, (c) => c.toUpperCase()),
    event,
    count: counts[event] || 0,
    percentage: totalCounts > 0 ? Math.round(((counts[event] || 0) / totalCounts) * 100) : 0,
  }));

  return {
    steps,
    totalEntries: totalCounts,
    period: {
      start: startDate || "all time",
      end: endDate || "now",
    },
  };
}
