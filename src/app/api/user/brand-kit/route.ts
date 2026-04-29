import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { z } from "zod";

const log = logger.child({ endpoint: "brand-kit" });

const BrandConfigSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  fontName: z.string().max(100).optional().nullable(),
  ctaText: z.string().max(50).optional().nullable(),
  watermarkText: z.string().max(50).optional().nullable(),
  outroText: z.string().max(200).optional().nullable(),
});

type BrandConfig = z.infer<typeof BrandConfigSchema>;

// ─── GET /api/user/brand-kit ────────────────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("brand_config")
      .eq("clerk_id", userId)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Merge with defaults
    const defaults: BrandConfig = {
      logoUrl: null,
      primaryColor: "#8B5CF6",
      secondaryColor: "#EC4899",
      fontName: "Inter",
      ctaText: "Learn More",
      watermarkText: "ReelMagic",
      outroText: null,
    };

    return NextResponse.json({
      brandConfig: { ...defaults, ...(profile.brand_config as Record<string, unknown> ?? {}) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Brand kit fetch failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PUT /api/user/brand-kit ────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = BrandConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        brand_config: parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_id", userId);

    if (error) throw new Error(`Failed to update brand kit: ${error.message}`);

    log.info({ userId }, "Brand kit updated");
    return NextResponse.json({ success: true, brandConfig: parsed.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Brand kit update failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
