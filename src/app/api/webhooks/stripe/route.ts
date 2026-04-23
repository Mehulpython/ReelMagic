import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = verifyWebhookSignature(body, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const credits = session.metadata?.credits;

        if (plan && userId) {
          // TODO: Update user plan in Supabase
          console.log(`✅ User ${userId} upgraded to ${plan}`);
        }

        if (credits && userId) {
          // TODO: Add credits to user account
          console.log(`✅ User ${userId} purchased ${credits} credits`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        // TODO: Update plan in Supabase
        console.log(`🔄 Subscription updated: ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        // TODO: Downgrade to free plan in Supabase
        console.log(`❌ Subscription cancelled: ${subscription.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log(`⚠️ Payment failed: ${invoice.id}`);
        // TODO: Notify user, maybe suspend account
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
