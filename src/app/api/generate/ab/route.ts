import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";
import { addVideoJob } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";
import { validate, GenerationRequestSchema } from "@/lib/validation";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "generate-ab" });

// ─── POST /api/generate/ab ───────────────────────────────────
// Queue 2 variants (A & B) of the same generation request.

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validation = validate(GenerationRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message, fields: validation.error.fields }, { status: 400 });
    }

    const {
      prompt, templateId, style,
      duration: rawDuration, aspectRatio: rawAspectRatio,
      negativePrompt, model,
    } = validation.data;

    const durationSeconds = rawDuration ?? 15;
    const aspectRatio = rawAspectRatio ?? "9:16";

    // Resolve plan
    let plan: "free" | "starter" | "pro" | "enterprise" = "free";
    try {
      const supabase = createServerClient();
      const { data: profile } = await supabase.from("profiles").select("plan").eq("clerk_id", userId).single();
      if (profile?.plan) plan = profile.plan;
    } catch {}

    // Check rate limit (2 jobs = 2x cost)
    const { allowed } = await checkRateLimit(userId, plan);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // A/B test ID
    const abTestId = uuidv4();

    // Queue variant A
    const jobA = await addVideoJob({
      jobId: uuidv4(), userId, plan,
      prompt: prompt.trim(), templateId, style,
      durationSeconds, aspectRatio, negativePrompt, model,
    });

    // Queue variant B (different seed via metadata)
    const jobB = await addVideoJob({
      jobId: uuidv4(), userId, plan,
      prompt: prompt.trim(), templateId, style,
      durationSeconds, aspectRatio, negativePrompt, model,
    });

    log.info({ userId, abTestId, jobIdA: jobA, jobIdB: jobB }, "A/B test queued");

    return NextResponse.json({
      abTestId,
      variants: [
        { id: jobA, label: "A" },
        { id: jobB, label: "B" },
      ],
      compareUrl: `/dashboard/compare/${abTestId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "A/B generation failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
