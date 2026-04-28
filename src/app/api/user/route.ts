import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "user" });

// ─── GET /api/user ───────────────────────────────────────────
// Returns user profile summary (credits, plan, usage stats)

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get usage stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: videosThisMonth } = await supabase
      .from("video_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .in("status", ["completed"]);

    const { count: totalVideos } = await supabase
      .from("video_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .in("status", ["completed"]);

    // Get recent jobs (last 10)
    const { data: recentJobs } = await supabase
      .from("video_jobs")
      .select("id, prompt, status, progress, output_url, thumbnail_url, cost_cents, duration_seconds, created_at, completed_at, error_message, generation_model")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Credit ledger summary
    const { data: creditsUsed } = await supabase
      .from("credits_ledger")
      .select("amount")
      .eq("user_id", profile.id)
      .lt("amount", 0); // debits only

    const totalCreditsSpent = (creditsUsed ?? []).reduce((sum, c) => sum + Math.abs(c.amount), 0);
    const totalCostCents = (recentJobs ?? []).reduce((sum, j) => sum + (j.cost_cents ?? 0), 0);

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        plan: profile.plan,
        creditsRemaining: profile.credits_remaining,
        createdAt: profile.created_at,
      },
      stats: {
        videosThisMonth: videosThisMonth ?? 0,
        totalVideos: totalVideos ?? 0,
        creditsSpent: totalCreditsSpent,
        totalCostCents,
        avgCostPerVideo: totalVideos ? Math.round(totalCostCents / totalVideos) : 0,
      },
      recentJobs: recentJobs ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "User summary fetch failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
