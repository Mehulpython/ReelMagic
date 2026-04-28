import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "usage" });

// ─── GET /api/user/usage ─────────────────────────────────────
// Daily usage chart data for the last N days.

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") || "30", 10)));

    const supabase = createServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily usage from usage_daily table (populated by trigger)
    const { data: dailyUsage } = await supabase
      .from("usage_daily")
      .select("date, videos_created, credits_used, cost_cents")
      .eq("user_id", profile.id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    // Also get video jobs for days not yet in usage_daily (in-flight)
    const { data: recentJobs } = await supabase
      .from("video_jobs")
      .select("created_at, cost_cents, status")
      .eq("user_id", profile.id)
      .gte("created_at", startDate.toISOString())
      .in("status", ["completed"]);

    // Build day-by-day chart data
    const chartData: Record<string, { date: string; videos: number; credits: number; costCents: number }> = {};

    // Initialize all days in range
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      chartData[key] = { date: key, videos: 0, credits: 0, costCents: 0 };
    }

    // Fill from usage_daily
    for (const row of dailyUsage ?? []) {
      const key = row.date.slice(0, 10);
      if (chartData[key]) {
        chartData[key].videos += row.videos_created;
        chartData[key].credits += row.credits_used;
        chartData[key].costCents += row.cost_cents;
      }
    }

    // Fill from raw jobs (for days where trigger hasn't fired yet)
    for (const job of recentJobs ?? []) {
      const key = job.created_at?.slice(0, 10);
      if (key && chartData[key]) {
        chartData[key].videos += 1;
        chartData[key].costCents += job.cost_cents ?? 0;
        chartData[key].credits += 1;
      }
    }

    return NextResponse.json({
      range: days,
      data: Object.values(chartData),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Usage fetch failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
