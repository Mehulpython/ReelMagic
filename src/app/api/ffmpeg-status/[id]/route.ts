// ─── GET /api/ffmpeg-status/[jobId] ──────────────────────────
// Check the status of an async FFmpeg assembly job.

import { NextRequest, NextResponse } from "next/server";
import { getFfmpegJobStatus } from "@/lib/ffmpeg-queue";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = logger.child({ endpoint: "ffmpeg-status" });
  const { id: jobId } = await params;

  try {
    const status = await getFfmpegJobStatus(jobId);

    if (!status) {
      return NextResponse.json(
        { error: "FFmpeg job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message, jobId }, "FFmpeg status check failed");
    return NextResponse.json(
      { error: "Failed to check FFmpeg status" },
      { status: 500 }
    );
  }
}
