import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cancelVideoJob, getQueueJobStatus } from "@/lib/queue";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "jobs" });

// ─── DELETE /api/jobs/:id ─────────────────────────────────────
// Cancel a queued/waiting job. Only works before processing starts.

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify job belongs to this user
    const status = await getQueueJobStatus(id);
    if (!status) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Resolve user's DB ID for ownership check
    const supabase = createServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!profile || status.data?.userId !== profile.id) {
      return NextResponse.json({ error: "Not your job" }, { status: 403 });
    }

    // Attempt cancellation (only works if waiting/delayed)
    const cancelled = await cancelVideoJob(id);

    if (cancelled) {
      // Update DB status to cancelled
      await supabase
        .from("video_jobs")
        .update({ status: "cancelled", error_message: "Cancelled by user" })
        .eq("id", id);

      log.info({ jobId: id, userId }, "Job cancelled by user");
      return NextResponse.json({ success: true, message: "Job cancelled" });
    } else {
      // Job is already being processed — can't cancel
      return NextResponse.json(
        { success: false, message: "Job is already being processed and cannot be cancelled" },
        { status: 409 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Job cancellation failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
