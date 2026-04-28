import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "stripe-webhook" });

// ─── POST /api/webhooks/stripe ───────────────────────────────
// Handles all Stripe webhook events with real DB operations.

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    log.warn("Missing Stripe signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // ── Verify signature ──
  let event;
  try {
    event = verifyWebhookSignature(body, signature);
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, "Stripe webhook verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  // ── Idempotency check ──
  const alreadyProcessed = await isEventProcessed(supabase, event.id, "stripe");
  if (alreadyProcessed) {
    log.info({ eventId: event.id, type: event.type }, "Event already processed, skipping");
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ── Process event ──
  try {
    switch (event.type) {
      // ── New subscription or one-time purchase ──
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as "starter" | "pro" | undefined;
        const type = session.metadata?.type;
        const credits = session.metadata?.credits;

        if (!userId) {
          log.warn({ eventId: event.id }, "checkout.session.completed missing userId metadata");
          break;
        }

        if (type === "credit_pack" && credits) {
          await addCredits(supabase, userId, parseInt(credits), `Credit pack purchase (${event.id})`);
          log.info({ userId, credits, eventId: event.id }, "Credits added from credit pack");
        } else if (plan) {
          await updatePlan(supabase, userId, plan, session.customer as string);
          log.info({ userId, plan, customerId: session.customer, eventId: event.id }, "Plan activated");
        }
        break;
      }

      // ── Subscription renewal ──
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.billing_reason === "subscription_cycle") {
          const customerId = invoice.customer as string;
          await handleRenewal(supabase, customerId);
          log.info({ customerId, eventId: event.id }, "Subscription renewed");
        }
        break;
      }

      // ── Subscription cancelled ──
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        await handleCancellation(supabase, customerId);
        log.info({ customerId, eventId: event.id }, "Subscription cancelled");
        break;
      }

      // ── Payment failed ──
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        log.warn({ customerId, eventId: event.id }, "Payment failed");
        // TODO: Send notification email to user
        break;
      }

      default:
        log.debug({ type: event.type, eventId: event.id }, "Unhandled Stripe event");
    }
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error, type: event.type, eventId: event.id },
      "Error processing Stripe event");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  // ── Mark as processed ──
  await markEventProcessed(supabase, event.id, event.type, "stripe", body);

  return NextResponse.json({ received: true });
}

// ═══════════════════════════════════════════════════════════════
// Idempotency Helpers
// ═══════════════════════════════════════════════════════════════

async function isEventProcessed(
  supabase: ReturnType<typeof createServerClient>,
  eventId: string,
  source: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("processed_events")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("source", source);

  return (count ?? 0) > 0;
}

async function markEventProcessed(
  supabase: ReturnType<typeof createServerClient>,
  eventId: string,
  eventType: string,
  source: string,
  payload: string,
): Promise<void> {
  await supabase.from("processed_events").insert({
    event_id: eventId,
    event_type: eventType,
    source,
    payload_json: JSON.parse(payload),
  });
}

// ═══════════════════════════════════════════════════════════════
// Database Operations (Real Supabase Writes)
// ═══════════════════════════════════════════════════════════════

/** Update user's subscription plan */
async function updatePlan(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  plan: string,
  customerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: plan as "starter" | "pro",
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update plan: ${error.message}`);
}

/** Add credits to user's balance (append-only ledger) */
async function addCredits(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  credits: number,
  reason: string,
): Promise<void> {
  // Get current balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_remaining")
    .eq("id", userId)
    .single();

  const currentBalance = profile?.credits_remaining ?? 0;
  const newBalance = currentBalance + credits;

  // Atomic: update profile + append ledger in a transaction-like pattern
  // (Supabase free tier doesn't support RPC transactions easily, so we do sequential writes
  // with the ledger as source of truth for reconciliation)

  const { error: ledgerError } = await supabase
    .from("credits_ledger")
    .insert({
      user_id: userId,
      amount: credits,
      balance_after: newBalance,
      reason,
    });

  if (ledgerError) throw new Error(`Failed to write credit ledger: ${ledgerError.message}`);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileError) throw new Error(`Failed to update credits: ${profileError.message}`);
}

/** Reset monthly usage counters on renewal */
async function handleRenewal(
  supabase: ReturnType<typeof createServerClient>,
  customerId: string,
): Promise<void> {
  // Find user by stripe_customer_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    log.warn({ customerId }, "Renewal: no profile found for customer");
    return;
  }

  // Reset this month's usage
  const { error } = await supabase
    .from("usage_daily")
    .delete()
    .eq("user_id", profile.id)
    .gte("date", new Date().toISOString().slice(0, 7)); // current month

  // Non-fatal: don't block on cleanup failure
  if (error) {
    log.warn({ err: error.message, userId: profile.id }, "Failed to reset monthly usage");
  }
}

/** Downgrade user to free plan after cancellation */
async function handleCancellation(
  supabase: ReturnType<typeof createServerClient>,
  customerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "free",
      updated_at: new Date().toISOString(),
      // Keep stripe_customer_id for re-subscription
    })
    .eq("stripe_customer_id", customerId);

  if (error) throw new Error(`Failed to downgrade user: ${error.message}`);
}
