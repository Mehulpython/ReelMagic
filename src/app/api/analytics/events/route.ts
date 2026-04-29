// ─── POST /api/analytics/events ─────────────────────────────
// Client-side event tracking endpoint.
// Accepts single or batch events. Rate limited to 100/min/user.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { trackEvent, type AnalyticsEvent, ALLOWED_EVENT_TYPES } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "analytics-events" });

// ─── POST: Track Events (Client-Side) ───────────────────────

export async function POST(req: NextRequest) {
  const reqId = crypto.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);

  try {
    // Auth optional for anonymous tracking
    let userId: string | undefined;
    try {
      const result = await auth();
      userId = result.userId || undefined;
    } catch {
      // Unauthenticated — allow anonymous tracking via sessionId
    }

    // Rate limit (100 events per minute)
    const identifier = userId || req.headers.get("x-session-id") || req.ip || "anonymous";
    const { allowed } = await checkRateLimit(identifier, "free");
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Support single event or batch
    const rawEvents: unknown[] = Array.isArray(body) ? body : [body];
    const events: AnalyticsEvent[] = [];
    const rejected: string[] = [];

    for (const raw of rawEvents) {
      const event = raw as Record<string, unknown>;

      if (
        typeof event.type === "string" &&
        ALLOWED_EVENT_TYPES.includes(event.type as AnalyticsEvent["type"]) &&
        typeof event.sessionId === "string"
      ) {
        events.push({
          type: event.type as AnalyticsEvent["type"],
          sessionId: event.sessionId,
          userId,
          properties: typeof event.properties === "object" && event.properties !== null
            ? (event.properties as Record<string, unknown>)
            : {},
          url: typeof event.url === "string" ? event.url : req.headers.get("referer") || undefined,
          userAgent: req.headers.get("user-agent") || undefined,
        });
      } else {
        rejected.push(typeof event.type === "string" ? event.type : "unknown");
      }
    }

    // Track all valid events
    for (const event of events) {
      trackEvent(event);
    }

    return NextResponse.json({
      received: events.length,
      rejected: rejected.length,
      message: rejected.length > 0
        ? `${rejected.length} events had invalid types`
        : "Events recorded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message, reqId }, "Analytics event tracking failed");
    return NextResponse.json(
      { error: "Failed to record events" },
      { status: 500 }
    );
  }
}
