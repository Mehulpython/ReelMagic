import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";
import { addVideoJob } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "batch" });

// ─── POST /api/generate/batch ────────────────────────────────
// Accept an array of prompts → queue N jobs.
// Body: { items: [{ prompt, templateId?, style? }, ...], options?: {...} }

const BatchItemSchema = z.object({
  prompt: z.string().min(1).max(2000),
  templateId: z.string().min(1).optional(),
  style: z.string().optional(),
});

const BatchRequestSchema = z.object({
  items: z.array(BatchItemSchema).min(1).max(20),
  options: z.object({
    duration: z.coerce.number().int().min(2).max(60).optional(),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
    templateId: z.string().min(1).optional(),
    style: z.string().optional(),
    voiceover: z.boolean().optional(),
    bgm: z.boolean().optional(),
    captions: z.boolean().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = BatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { items, options } = parsed.data;

    // Resolve plan
    let plan: "free" | "starter" | "pro" | "enterprise" = "free";
    try {
      const supabase = createServerClient();
      const { data: profile } = await supabase.from("profiles").select("plan").eq("clerk_id", userId).single();
      if (profile?.plan) plan = profile.plan;
    } catch {}

    // Batch size limits by plan
    const maxBatchSize: Record<string, number> = {
      free: 3,
      starter: 10,
      pro: 20,
      enterprise: 50,
    };

    if (items.length > (maxBatchSize[plan] ?? 3)) {
      return NextResponse.json(
        { error: `Batch too large for your plan. Max: ${maxBatchSize[plan] ?? 3}` },
        { status: 400 }
      );
    }

    // Check rate limit once (batch counts as 1 request)
    const { allowed } = await checkRateLimit(userId, plan);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Queue all jobs
    const batchId = uuidv4();
    const jobs = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const jobId = uuidv4();

      await addVideoJob({
        jobId,
        userId,
        plan,
        prompt: item.prompt.trim(),
        templateId: item.templateId || options?.templateId || "product-launch",
        style: item.style || options?.style || "cinematic",
        durationSeconds: options?.duration || 15,
        aspectRatio: options?.aspectRatio || "9:16",
        voiceover: options?.voiceover,
        bgm: options?.bgm,
        captions: options?.captions ? [] : undefined,
      });

      jobs.push({
        index: i + 1,
        jobId,
        prompt: item.prompt.trim(),
        status: "queued",
      });
    }

    log.info({ userId, batchId, count: jobs.length, plan }, `Batch queued (${jobs.length} jobs)`);

    return NextResponse.json({
      batchId,
      totalJobs: jobs.length,
      jobs,
      statusUrl: `/api/batch/${batchId}`,
    }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Batch generation failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
