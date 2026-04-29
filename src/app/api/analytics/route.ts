// ─── /api/analytics ─────────────────────────────────────────
// GET  — Query analytics (own data for users, all for admin)
// POST — Batch record analytics events (server-side)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAnalytics, trackEvent, type AnalyticsEvent, type AnalyticsEventType } from "@/lib/analytics";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "analytics" });

// ─── GET: Query Analytics ────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const options = {
      startDate: searchParams.get("start") || undefined,
      endDate: searchParams.get("end") || undefined,
      eventTypes: (searchParams.getAll("type") as AnalyticsEventType[]) || undefined,
      limit: parseInt(searchParams.get("limit") || "1000", 10),
    };

    const data = await getAnalytics(userId, options);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Analytics query failed");
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// ─── POST: Record Events (Server-Side) ──────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth optional — allow server-to-server calls
    let userId: string | undefined;
    try {
      const authResult = await auth();
      userId = authResult.userId || undefined;
    } catch {
      // Unauthenticated
    }

    const body = await req.json();

    // Support single event or batch
    const events: AnalyticsEvent[] = Array.isArray(body)
      ? body
      : [body];

    for (const event of events) {
      if (!event.type || !event.sessionId) {
        return NextResponse.json(
          { error: "Each event must have 'type' and 'sessionId'" },
          { status: 400 }
        );
      }

      trackEvent({
        ...event,
        userId: userId || event.userId,
      });
    }

    return NextResponse.json({
      received: events.length,
      message: "Events recorded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Analytics record failed");
    return NextResponse.json(
      { error: "Failed to record events" },
      { status: 500 }
    );
  }
}
