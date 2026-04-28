import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "user-videos" });

// ─── GET /api/user/videos ────────────────────────────────────
// Paginated video history for the authenticated user.

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status"); // optional filter

    const supabase = createServerClient();

    // Resolve user ID from clerk_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let query = supabase
      .from("video_jobs")
      .select("id, prompt, template_id, style, duration_seconds, aspect_ratio, status, progress, output_url, thumbnail_url, cost_cents, error_message, generation_model, created_at, completed_at", { count: "exact" })
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && ["completed", "failed", "processing", "queued"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query;

    if (error) {
      log.error({ err: error.message }, "Video list fetch failed");
      return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
    }

    return NextResponse.json({
      videos: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Videos API error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
