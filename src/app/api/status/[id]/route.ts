import { NextRequest, NextResponse } from "next/server";
import { getQueueJobStatus } from "@/lib/queue";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const status = await getQueueJobStatus(id);

    if (!status) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
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
    console.error("Status error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
