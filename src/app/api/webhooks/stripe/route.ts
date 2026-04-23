import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, stripe } from "@/lib/stripe";

// ─── POST /api/webhooks/stripe ───────────────────────────────
// Handles all Stripe webhook events

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = verifyWebhookSignature(body, signature);
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Process event
  try {
    switch (event.type) {
      // ── New subscription created ──
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as "starter" | "pro" | undefined;
        const type = session.metadata?.type;
        const credits = session.metadata?.credits;

        if (!userId) break;

        if (type === "credit_pack" && credits) {
          // Credit pack purchase
          await updateUserCredits(userId, parseInt(credits));
          console.log(`💳 Credits added: ${credits} for user ${userId}`);
        } else if (plan) {
          // Subscription purchase
          await updateUserPlan(userId, plan, session.customer as string);
          console.log(`✅ Plan activated: ${plan} for user ${userId}`);
        }
        break;
      }

      // ── Subscription renewed ──
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.billing_reason === "subscription_cycle") {
          const customerId = invoice.customer as string;
          await resetMonthlyUsage(customerId);
          console.log(`🔄 Monthly reset for customer ${customerId}`);
        }
        break;
      }

      // ── Subscription cancelled ──
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        await downgradeUser(customerId);
        console.log(`❌ Subscription cancelled: ${customerId}`);
        break;
      }

      // ── Payment failed ──
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        console.warn(`⚠️ Payment failed for customer ${customerId}`);
        // Could send notification email here
        break;
      }

      default:
        console.log(`ℹ️ Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ─── Database helpers (Supabase) ─────────────────────────────
// These would call Supabase in production

async function updateUserPlan(
  userId: string,
  plan: string,
  customerId: string
) {
  // TODO: Call Supabase to update user plan
  // await supabase.from('profiles').update({ plan, stripe_customer_id: customerId }).eq('id', userId)
  console.log(`[DB] Update plan: ${userId} → ${plan} (customer: ${customerId})`);
}

async function updateUserCredits(userId: string, credits: number) {
  // TODO: Call Supabase to add credits
  // await supabase.rpc('add_credits', { user_id: userId, amount: credits })
  console.log(`[DB] Add credits: ${userId} +${credits}`);
}

async function resetMonthlyUsage(customerId: string) {
  // TODO: Reset monthly video count
  console.log(`[DB] Monthly reset: ${customerId}`);
}

async function downgradeUser(customerId: string) {
  // TODO: Downgrade to free plan
  console.log(`[DB] Downgrade: ${customerId} → free`);
}
