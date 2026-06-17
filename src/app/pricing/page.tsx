"use client";

import { useState } from "react";
import { PricingCard } from "@/components/PricingCard";

const TIERS_MONTHLY = [
  {
    name: "Free",
    price: "$0",
    description: "Try it out with limited videos per month.",
    features: [
      "5 videos per month",
      "Up to 15 seconds",
      "720p resolution",
      "3 templates",
      "Watermark on exports",
    ],
    cta: "Get Started Free",
    annual: null as null | { price: string },
  },
  {
    name: "Starter",
    price: "$29",
    description: "For creators who need more volume and quality.",
    features: [
      "30 videos per month",
      "Up to 60 seconds",
      "1080p resolution",
      "All templates",
      "No watermark",
      "Priority rendering",
      "Email support",
    ],
    cta: "Start Starter Plan",
    popular: true,
    annual: { price: "$23/mo" },
  },
  {
    name: "Pro",
    price: "$99",
    description: "For teams and agencies with heavy workloads.",
    features: [
      "Unlimited videos",
      "Up to 120 seconds",
      "4K resolution",
      "All templates + custom",
      "No watermark",
      "Fastest rendering",
      "API access",
      "Dedicated support",
      "Custom branding",
    ],
    cta: "Start Pro Plan",
    annual: { price: "$79/mo" },
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const TIERS = TIERS_MONTHLY;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Simple, Transparent <span className="gradient-text">Pricing</span>
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          Start free. Upgrade when you need more. Cancel anytime.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mb-12 flex items-center justify-center gap-3">
        <button
          onClick={() => setAnnual(false)}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            !annual ? "bg-primary-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            annual ? "bg-primary-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          Annual
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            annual ? "bg-white/20" : "bg-green-500/20 text-green-400"
          }`}>
            SAVE 20%
          </span>
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-8 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <PricingCard
            key={tier.name}
            {...tier}
            price={annual && tier.annual ? tier.annual.price : tier.price}
            period={annual && tier.annual ? "/mo billed annually" : tier.price !== "$0" ? "/mo" : undefined}
          />
        ))}
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-20 max-w-2xl">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: "Can I cancel anytime?", a: "Yes, cancel anytime from your dashboard. No questions asked." },
            { q: "Is there a free trial?", a: "You get 5 free videos every month with the Free plan. No credit card required." },
            { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe." },
            { q: "Do unused videos roll over?", a: "No, your monthly video quota resets at the start of each billing cycle." },
            { q: "Can I upgrade mid-month?", a: "Yes! You'll be prorated for the remainder of your billing cycle." },
            { q: "What's the difference between templates?", a: "Each template has different pacing, visual style, audio choices, and text treatment. Same script, completely different output." },
          ].map((faq, i) => (
            <div key={i} className="glass-card p-5">
              <div className="font-semibold text-white text-sm">{faq.q}</div>
              <div className="mt-1.5 text-sm text-gray-400">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom note */}
      <div className="mt-16 text-center">
        <p className="text-sm text-gray-500">
          All plans include access to AI video generation, templates, and community support.
        </p>
      </div>
    </div>
  );
}
