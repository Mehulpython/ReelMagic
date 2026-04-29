import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { addVideoJob } from "@/lib/queue";
import { getQueueJobStatus } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";
import { validate, GenerationRequestSchema } from "@/lib/validation";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "api-v1" });

// ─── API Key Authentication ────────────────────────────────────

async function authenticateApiKey(req: NextRequest): Promise<{
  userId: string;
  plan: string;
} | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const apiKey = header.slice(7);
  if (!apiKey) return null;

  try {
    // Hash lookup (in production use bcrypt/scrypt)
    const supabase = createServerClient();
    const { data: keyRecord } = await supabase
      .from("api_keys")
      .select("user_id, profiles!inner(plan)")
      .eq("key_hash", apiKey) // TODO: hash comparison
      .single();

    if (!keyRecord) return null;

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", apiKey);

    return {
      userId: keyRecord.user_id,
      plan: (keyRecord as any).profiles?.plan ?? "free",
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/jobs — Create a video generation job
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  // Auth via API key or Clerk session
  let authResult = await authenticateApiKey(req);

  if (!authResult) {
    // Fallback: try Clerk session (for browser-based API calls)
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = await auth();
      if (userId) {
        const supabase = createServerClient();
        const { data: profile } = await supabase.from("profiles").select("id, plan").eq("clerk_id", userId).single();
        if (profile) authResult = { userId: profile.id, plan: profile.plan };
      }
    } catch {}
  }

  if (!authResult) {
    return NextResponse.json(
      { error: "Unauthorized. Provide an API key via Authorization: Bearer <key>." },
      { status: 401 }
    );
  }

  // Validate input
  const body = await req.json().catch(() => ({}));
  const validation = validate(GenerationRequestSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message, fields: validation.error.fields },
      { status: 400 }
    );
  }

  const {
    prompt, templateId, style,
    duration: rawDuration, aspectRatio: rawAspectRatio,
    negativePrompt, model,
  } = validation.data;

  const durationSeconds = rawDuration ?? 15;
  const aspectRatio = rawAspectRatio ?? "9:16";

  // Rate limit
  const { allowed, remaining } = await checkRateLimit(authResult.userId, authResult.plan as any);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Queue job
  const jobId = uuidv4();

  await addVideoJob({
    jobId,
    userId: authResult.userId,
    plan: authResult.plan,
    prompt: prompt.trim(),
    templateId,
    style,
    durationSeconds,
    aspectRatio,
    negativePrompt,
    model,
  });

  log.info({ jobId, userId: authResult.userId, source: "api-v1" }, "Job created via REST API");

  return NextResponse.json({
    data: {
      id: jobId,
      type: "video_job",
      attributes: {
        status: "queued",
        prompt: prompt.trim(),
        templateId,
        style,
        durationSeconds,
        aspectRatio,
      },
      links: {
        self: `/api/v1/jobs/${jobId}`,
        status: `/api/v1/jobs/${jobId}/status`,
      },
    },
  }, { status: 201 });
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/jobs — List user's jobs (paginated)
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const statusFilter = searchParams.get("status");

  const supabase = createServerClient();

  let query = supabase
    .from("video_jobs")
    .select("id, prompt, status, progress, output_url, thumbnail_url, cost_cents, duration_seconds, created_at, completed_at", { count: "exact" })
    .eq("user_id", authResult.userId)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (statusFilter && ["completed", "failed", "processing", "queued"].includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data, count, error } = await query;

  if (error) {
    log.error({ err: error.message }, "API v1 list jobs failed");
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }

  return NextResponse.json({
    data: (data ?? []).map((job) => ({
      id: job.id,
      type: "video_job",
      attributes: job,
      links: { self: `/api/v1/jobs/${job.id}` },
    })),
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}
