import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { getQueueJobStatus } from "@/lib/queue";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "status" });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Authenticate ──
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // ── Verify ownership ──
    const supabase = createServerClient();
    const { data: job } = await supabase
      .from("video_jobs")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Resolve user's profile to get internal UUID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!profile || job.user_id !== profile.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const status = await getQueueJobStatus(id);

    if (!status) {
      return NextResponse.json({ error: "Job not found in queue" }, { status: 404 });
    }

    return NextResponse.json({
      jobId: status.id,
      status: status.status,
      progress: status.progress,
      result: status.result,
      error: status.error,
      attempts: status.attemptsMade,
      createdAt: status.timestamp,
      startedAt: status.processedOn,
      completedAt: status.finishedOn,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Status check error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
