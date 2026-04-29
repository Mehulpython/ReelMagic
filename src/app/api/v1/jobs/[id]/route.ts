import { NextRequest, NextResponse } from "next/server";
import { getQueueJobStatus } from "@/lib/queue";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "api-v1-job" });

// ─── API Key Auth (same as parent route) ─────────────────────

async function authenticateApiKey(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const apiKey = header.slice(7);
  try {
    const supabase = createServerClient();
    const { data: keyRecord } = await supabase
      .from("api_keys")
      .select("user_id")
      .eq("key_hash", apiKey)
      .single();
    return keyRecord?.user_id ?? null;
  } catch {
    return null;
  }
}

// ─── GET /api/v1/jobs/:id — Get job details ──────────────────
// ─── GET /api/v1/jobs/:id/status — Get job status only ──────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiKey(req);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check ownership
  const supabase = createServerClient();
  const { data: job } = await supabase
    .from("video_jobs")
    .select("id, user_id, prompt, status, progress, output_url, thumbnail_url, cost_cents, duration_seconds, error_message, generation_model, created_at, completed_at")
    .eq("id", id)
    .eq("user_id", authResult)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // If job is still in queue, also check BullMQ for real-time status
  let queueStatus = null;
  try {
    queueStatus = await getQueueJobStatus(id);
  } catch {}

  return NextResponse.json({
    data: {
      id: job.id,
      type: "video_job",
      attributes: {
        ...job,
        queueStatus: queueStatus ? {
          status: queueStatus.status,
          progress: queueStatus.progress,
          attemptsMade: queueStatus.attemptsMade,
        } : null,
      },
      links: {
        self: `/api/v1/jobs/${id}`,
        output: job.output_url || undefined,
        thumbnail: job.thumbnail_url || undefined,
      },
    },
  });
}
