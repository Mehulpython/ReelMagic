import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";
import { addVideoJob } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";
import { validate, GenerationRequestSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

// ─── POST /api/generate ──────────────────────────────────────
// Queue a new video generation job.

export async function POST(req: NextRequest) {
  const reqId = uuidv4().slice(0, 8);
  const log = logger.child({ requestId: reqId, endpoint: "generate" });

  try {
    // ── Authenticate ──
    const { userId } = await auth();
    if (!userId) {
      log.warn("Unauthenticated generation attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate input ──
    const body = await req.json();
    const validation = validate(GenerationRequestSchema, body);
    if (!validation.success) {
      log.warn({ err: validation.error }, "Validation failed");
      return NextResponse.json(
        { error: validation.error.message, fields: validation.error.fields },
        { status: 400 }
      );
    }

    const {
      prompt,
      templateId,
      style,
      duration: rawDuration,
      aspectRatio: rawAspectRatio,
      negativePrompt,
      model,
    } = validation.data;

    const durationSeconds = rawDuration ?? 15;
    const aspectRatio = rawAspectRatio ?? "9:16";

    // ── Resolve user plan from Supabase ──
    let plan: "free" | "starter" | "pro" | "enterprise" = "free";
    try {
      const { createServerClient } = await import("@/lib/supabase");
      const supabase = createServerClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("clerk_id", userId)
        .single();

      if (profile?.plan) {
        plan = profile.plan;
      }
    } catch (err) {
      log.warn({ err: err instanceof Error ? err.message : err }, "Failed to resolve user plan; defaulting to free");
    }

    // ── Check rate limit ──
    const { allowed, remaining } = await checkRateLimit(userId, plan);
    if (!allowed) {
      log.warn({ userId, plan, remaining }, "Rate limit exceeded");
      return NextResponse.json(
        { error: "Rate limit exceeded. Upgrade your plan for more videos." },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": String(remaining) },
        }
      );
    }

    // ── Queue the job ──
    const jobId = uuidv4();

    await addVideoJob({
      jobId,
      userId,
      plan,
      prompt: prompt.trim(),
      templateId,
      style,
      durationSeconds,
      aspectRatio,
      negativePrompt,
      model,
    });

    log.info({ jobId, userId, plan, templateId, durationSeconds }, "Job queued");

    return NextResponse.json({
      jobId,
      status: "queued",
      estimatedTimeSeconds: durationSeconds * 12,
      position: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Generation error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
