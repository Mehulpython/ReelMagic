import Stripe from "stripe";

// ─── Stripe Client ───────────────────────────────────────────

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2024-04-10",
  typescript: true,
});

// ─── Plan → Price ID Mapping ─────────────────────────────────

export const PLAN_PRICES = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || "price_starter_monthly",
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || "price_starter_yearly",
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly",
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "price_pro_yearly",
  },
} as const;

// ─── Checkout Session ────────────────────────────────────────

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  plan: "starter" | "pro";
  billing: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const priceId = PLAN_PRICES[params.plan][params.billing];

  const session = await stripe.checkout.sessions.create({
    customer_email: params.email,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      plan: params.plan,
      billing: params.billing,
    },
  });

  return { url: session.url! };
}

// ─── Customer Portal ─────────────────────────────────────────

export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return { url: session.url };
}

// ─── Webhook Verification ────────────────────────────────────

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// ─── Credit Pack Purchase ────────────────────────────────────

export async function createCreditPackSession(params: {
  userId: string;
  email: string;
  credits: number;
  priceCents: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const session = await stripe.checkout.sessions.create({
    customer_email: params.email,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: params.priceCents,
          product_data: {
            name: `${params.credits} ReelMagic Credits`,
            description: `${params.credits} video generation credits`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      type: "credit_pack",
      credits: String(params.credits),
    },
  });

  return { url: session.url! };
}
