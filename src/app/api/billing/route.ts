import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createCheckoutSession,
  createPortalSession,
  createCreditPackSession,
} from "@/lib/stripe";

// ─── POST /api/billing/checkout ──────────────────────────────
// Create a Stripe checkout session for plan subscription or credit pack

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const origin = req.headers.get("origin") || "http://localhost:3000";

    switch (action) {
      // ── Subscribe to a plan ──
      case "subscribe": {
        const { plan, billing } = body as {
          plan: "starter" | "pro";
          billing: "monthly" | "yearly";
        };

        if (!plan || !billing) {
          return NextResponse.json(
            { error: "Missing plan or billing" },
            { status: 400 }
          );
        }

        const session = await createCheckoutSession({
          userId,
          email: body.email || "",
          plan,
          billing,
          successUrl: `${origin}/dashboard?upgraded=true`,
          cancelUrl: `${origin}/pricing`,
        });

        return NextResponse.json({ url: session.url });
      }

      // ── Open billing portal ──
      case "portal": {
        const { customerId } = body as { customerId: string };

        if (!customerId) {
          return NextResponse.json(
            { error: "Missing customerId" },
            { status: 400 }
          );
        }

        const session = await createPortalSession({
          customerId,
          returnUrl: `${origin}/dashboard`,
        });

        return NextResponse.json({ url: session.url });
      }

      // ── Buy credit pack ──
      case "credits": {
        const { credits, priceCents } = body as {
          credits: number;
          priceCents: number;
        };

        if (!credits || !priceCents) {
          return NextResponse.json(
            { error: "Missing credits or priceCents" },
            { status: 400 }
          );
        }

        const session = await createCreditPackSession({
          userId,
          email: body.email || "",
          credits,
          priceCents,
          successUrl: `${origin}/dashboard?credits=true`,
          cancelUrl: `${origin}/pricing`,
        });

        return NextResponse.json({ url: session.url });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: subscribe, portal, or credits" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Billing error:", error);
    return NextResponse.json(
      { error: "Billing operation failed" },
      { status: 500 }
    );
  }
}
