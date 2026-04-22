import { NextRequest, NextResponse } from "next/server";
import { JobStatus } from "@/lib/types";

// TODO: Look up job status from database/Redis
// TODO: Return real progress, output URLs, etc.

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // TODO: Fetch actual job from database
  // const job = await db.job.findUnique({ where: { id } });

  // Stub response — simulate job progression
  const now = Date.now();
  const jobCreated = parseInt(id.split("_")[1] || String(now));
  const elapsed = (now - jobCreated) / 1000;

  let status: JobStatus["status"] = "queued";
  let progress = 0;

  if (elapsed > 60) {
    status = "completed";
    progress = 100;
  } else if (elapsed > 10) {
    status = "processing";
    progress = Math.min(95, Math.floor((elapsed / 60) * 100));
  }

  const response: JobStatus = {
    jobId: id,
    status,
    progress,
    createdAt: new Date(jobCreated).toISOString(),
    updatedAt: new Date().toISOString(),
    ...(status === "completed" && {
      outputUrl: `https://cdn.reelmagic.ai/output/${id}.mp4`,
      duration: 15,
    }),
    ...(status === "processing" && {
      currentStep: "Generating visuals",
      estimatedTimeRemaining: Math.max(5, 60 - Math.floor(elapsed)),
    }),
    ...(status === "queued" && {
      queuePosition: 1,
      estimatedTimeRemaining: 60,
    }),
  };

  return NextResponse.json(response);
}
