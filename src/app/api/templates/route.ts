import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { validate, TemplateQuerySchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "templates" });

// ─── GET /api/templates ──────────────────────────────────────
// Fetch templates from Supabase (not hardcoded).
// Revalidates every 5 minutes.

export const dynamic = "force-dynamic";
// Alternatively, use ISR: export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = validate(TemplateQuerySchema, Object.fromEntries(searchParams));

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { category, tag, page: rawPage, limit: rawLimit } = validation.data;
    const page = rawPage ?? 1;
    const limit = rawLimit ?? 20;
    const supabase = createServerClient();

    let query = supabase
      .from("templates")
      .select("*")
      .order("sort_order", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (category) {
      query = query.eq("category", category);
    }

    // Tag filtering uses Supabase `contains` on a JSONB column
    // (if tags are stored in metadata or we do client-side filter)
    if (tag) {
      // For now, filter client-side after fetch since tags are app-level
      log.debug({ tag }, "Tag filter requested — will apply post-fetch");
    }

    const { data, error, count } = await query;

    if (error) {
      log.error({ err: error.message }, "Template fetch failed");
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    // Transform DB rows → application-level Template format
    let templates = (data ?? []).map((row) => ({
      ...row,
      thumbnail: row.thumbnail_url,
      defaultDuration: row.default_duration ?? 15,
      tags: inferTags(row),
    }));

    // Client-side tag filter
    if (tag) {
      templates = templates.filter((t) => t.tags.includes(tag));
    }

    return NextResponse.json({
      templates,
      total: templates.length,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Templates API error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Helper: infer tags from template row data ───────────────

function inferTags(row: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const name = (row.name as string)?.toLowerCase() ?? "";
  const slug = (row.slug as string)?.toLowerCase() ?? "";
  const category = (row.category as string)?.toLowerCase() ?? "";

  // Category-based tags
  if (category) tags.push(category);

  // Name/slug keyword matching
  const keywords: Record<string, string[]> = {
    viral: ["viral", "skibidi", "reaction", "meme"],
    political: ["political", "democrat", "republican", "campaign"],
    ecommerce: ["product", "launch", "dropship", "commerce", "shop"],
    beauty: ["beauty", "influencer", "glam", "lifestyle"],
    trending: ["trending", "tiktok", "social"],
  };

  for (const [tag, words] of Object.entries(keywords)) {
    const combined = `${name} ${slug}`.toLowerCase();
    if (words.some((w) => combined.includes(w))) {
      if (!tags.includes(tag)) tags.push(tag);
    }
  }

  // Premium badge
  if (row.is_premium && !tags.includes("premium")) {
    tags.push("premium");
  }

  return tags;
}
