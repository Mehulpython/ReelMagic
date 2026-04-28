import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createCheckoutSession,
  createPortalSession,
  createCreditPackSession,
} from "@/lib/stripe";
import { validate, BillingRequestSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "billing" });

// ─── POST /api/billing ───────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Authenticate ──
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate ──
    const body = await req.json();
    const validation = validate(BillingRequestSchema, body);
    if (!validation.success) {
      log.warn({ err: validation.error, userId }, "Billing validation failed");
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    switch (validation.data.action) {
      case "subscribe": {
        const session = await createCheckoutSession({
          userId,
          email: body.email || "",
          plan: validation.data.plan,
          billing: validation.data.billing,
          successUrl: `${origin}/dashboard?upgraded=true`,
          cancelUrl: `${origin}/pricing`,
        });
        log.info({ userId, plan: validation.data.plan, billing: validation.data.billing }, "Checkout session created");
        return NextResponse.json({ url: session.url });
      }

      case "portal": {
        const session = await createPortalSession({
          customerId: validation.data.customerId,
          returnUrl: `${origin}/dashboard`,
        });
        return NextResponse.json({ url: session.url });
      }

      case "credits": {
        const session = await createCreditPackSession({
          userId,
          email: body.email || "",
          credits: validation.data.credits,
          priceCents: validation.data.priceCents,
          successUrl: `${origin}/dashboard?credits=true`,
          cancelUrl: `${origin}/pricing`,
        });
        log.info({ userId, credits: validation.data.credits }, "Credit pack session created");
        return NextResponse.json({ url: session.url });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Billing error");
    return NextResponse.json(
      { error: "Billing operation failed" },
      { status: 500 }
    );
  }
}
