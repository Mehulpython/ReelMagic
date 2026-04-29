// ─── /api/language ──────────────────────────────────────────
// GET  — Return available languages + user's current preference
// POST — Save user's language preference to profiles table

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLocales, type LocaleCode } from "@/lib/i18n";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "language" });

// ─── GET: Available Languages ────────────────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    let savedLocale: string | null = null;

    if (userId) {
      try {
        const supabase = createServerClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("locale")
          .eq("clerk_id", userId)
          .single();

        savedLocale = (profile as any)?.locale;
      } catch {
        // Column may not exist yet — that's fine
      }
    }

    return NextResponse.json({
      locales: getLocales(),
      currentLocale: savedLocale || "en",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Language GET failed");
    return NextResponse.json(
      { locales: getLocales(), currentLocale: "en" },
      { status: 200 }
    );
  }
}

// ─── POST: Save Language Preference ─────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { locale } = body;

    if (!locale || !["en", "es", "fr", "de", "ja", "zh", "pt", "ko"].includes(locale)) {
      return NextResponse.json(
        { error: `Invalid locale. Supported: en, es, fr, de, ja, zh, pt, ko` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Use raw SQL to handle case where locale column might not exist yet
    // The migration adds it; if column missing, this is a no-op we can ignore
    const { error } = await supabase
      .from("profiles")
      .update({ locale: locale as string })
      .eq("clerk_id", userId);

    if (error && !error.message?.includes("locale")) {
      // Only log if it's not a "column doesn't exist" error
      log.error({ err: error, locale }, "Failed to save locale preference");
      return NextResponse.json(
        { error: "Failed to save preference" },
        { status: 500 }
      );
    }

    // Set cookie for middleware detection
    const response = NextResponse.json({ success: true, locale });
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Language POST failed");
    return NextResponse.json(
      { error: "Failed to save language preference" },
      { status: 500 }
    );
  }
}
