import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { addVideoJob } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";
import type { PlanTier } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, templateId, style, duration, aspectRatio, negativePrompt, model } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt must be under 2000 characters" },
        { status: 400 }
      );
    }

    // TODO: Get from Clerk auth when deployed
    const userId = body.userId || "dev-user";
    const plan: PlanTier = body.plan || "free";

    // Check rate limit
    const { allowed, remaining } = await checkRateLimit(userId, plan);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Upgrade your plan for more videos." },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": String(remaining) },
        }
      );
    }

    const durationSeconds = Math.max(2, Math.min(duration || 5, 60));
    const jobId = uuidv4();

    await addVideoJob({
      jobId,
      userId,
      plan,
      prompt: prompt.trim(),
      templateId,
      style,
      durationSeconds,
      aspectRatio: aspectRatio || "9:16",
      negativePrompt,
      model,
    });

    return NextResponse.json({
      jobId,
      status: "queued",
      estimatedTimeSeconds: durationSeconds * 12,
      position: 0, // TODO: get from queue
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Generation error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
