import Stripe from "stripe";

// ─── Stripe Client ───────────────────────────────────────────
// Lazy-initialized to avoid throwing during Next.js build.

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }
  if (!_stripe) {
    _stripe = new Stripe(secretKey, {
      apiVersion: "2024-04-10",
      typescript: true,
    });
  }
  return _stripe;
}

// Convenience getter for common usage
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

// ─── Plan → Price ID Mapping ─────────────────────────────────
// Lazy to avoid throwing during build.

export function getPlanPrices() {
  const starterMonthly = process.env.STRIPE_STARTER_MONTHLY_PRICE_ID;
  const starterYearly = process.env.STRIPE_STARTER_YEARLY_PRICE_ID;
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proYearly = process.env.STRIPE_PRO_YEARLY_PRICE_ID;

  if (!starterMonthly || !starterYearly || !proMonthly || !proYearly) {
    throw new Error(
      "Missing Stripe price IDs. Configure STRIPE_STARTER_MONTHLY_PRICE_ID, STRIPE_STARTER_YEARLY_PRICE_ID, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID"
    );
  }

  return {
    starter: { monthly: starterMonthly, yearly: starterYearly },
    pro: { monthly: proMonthly, yearly: proYearly },
  } as const;
}

// ─── Checkout Session ────────────────────────────────────────

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  plan: "starter" | "pro";
  billing: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const prices = getPlanPrices();
  const priceId = prices[params.plan][params.billing];

  const session = await getStripe().checkout.sessions.create({
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
  const session = await getStripe().billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return { url: session.url };
}

// ─── Credit Pack Checkout ────────────────────────────────────

export async function createCreditPackSession(params: {
  userId: string;
  email: string;
  credits: number;
  priceCents: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const session = await getStripe().checkout.sessions.create({
    customer_email: params.email,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `${params.credits} ReelMagic Credits`,
          description: `One-time purchase of ${params.credits} video generation credits`,
        },
        unit_amount: params.priceCents,
      },
      quantity: 1,
    }],
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

// ─── Webhook Verification ────────────────────────────────────

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}
