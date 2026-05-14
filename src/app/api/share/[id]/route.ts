import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "share" });

// ─── GET /api/share/:videoId ────────────────────────────────
// Public metadata for a shared video (no auth required).

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: job, error } = await supabase
      .from("video_jobs")
      .select(`
        id, prompt, template_id, style, duration_seconds, aspect_ratio,
        status, output_url, thumbnail_url, generation_model,
        created_at, completed_at, is_public,
        profiles!inner(full_name)
      `)
      .eq("id", id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Only allow sharing completed, public videos
    if (job.status !== "completed") {
      return NextResponse.json({ error: "Video is not ready for sharing" }, { status: 403 });
    }

    if (!job.is_public) {
      return NextResponse.json({ error: "Video is not public" }, { status: 403 });
    }

    // View count tracking (optional: add a share_views table + trigger)
    // supabase.from('share_views').insert({ job_id: id }).then(() => {}).catch(() => {});

    log.info({ videoId: id }, "Share page accessed");

    return NextResponse.json({
      id: job.id,
      prompt: job.prompt,
      style: job.style,
      durationSeconds: job.duration_seconds,
      aspectRatio: job.aspect_ratio,
      outputUrl: job.output_url,
      thumbnailUrl: job.thumbnail_url,
      model: job.generation_model,
      createdAt: job.created_at,
      creatorName: ((job.profiles as any)?.[0]?.full_name || (job.profiles as any)?.full_name) || "Anonymous",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Share API failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
