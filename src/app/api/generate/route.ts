import { NextRequest, NextResponse } from "next/server";
import { GenerationRequest, GenerationResponse } from "@/lib/types";

// TODO: Connect to FastAPI backend pipeline
// TODO: Validate request with Zod schema
// TODO: Authenticate user and check quota
// TODO: Queue job in Redis/database

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    // Validate required fields
    if (!body.script || !body.template || !body.style) {
      return NextResponse.json(
        { error: "Missing required fields: script, template, style" },
        { status: 400 }
      );
    }

    // TODO: Validate with Zod
    // const validated = generationSchema.parse(body);

    // Generate a unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // TODO: Queue the job for processing
    // await queueJob(jobId, body);

    // TODO: Store job status in database
    // await db.job.create({ id: jobId, status: "queued", ...body });

    console.log(`[generate] Queued job ${jobId}:`, {
      template: body.template,
      style: body.style,
      duration: body.duration,
      aspectRatio: body.aspectRatio,
    });

    const response: GenerationResponse = {
      jobId,
      status: "queued",
      message: "Video generation queued. Poll /api/status/[jobId] for updates.",
      estimatedTime: Math.max(30, (body.duration || 15) * 3),
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    console.error("[generate] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
