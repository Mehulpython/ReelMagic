import { PricingCard } from "@/components/PricingCard";

export const metadata = {
  title: "Pricing — ReelMagic",
  description: "Simple, transparent pricing for AI video ad generation.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    description: "Try it out with limited videos per month.",
    features: [
      "3 videos per month",
      "Up to 15 seconds",
      "720p resolution",
      "3 templates",
      "Watermark on exports",
    ],
    cta: "Get Started Free",
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
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Simple, Transparent <span className="gradient-text">Pricing</span>
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          Start free. Upgrade when you need more. Cancel anytime.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-8 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <PricingCard key={tier.name} {...tier} />
        ))}
      </div>

      {/* FAQ note */}
      <div className="mt-16 text-center">
        <p className="text-sm text-gray-500">
          All plans include access to AI video generation, templates, and community support.
          <br />
          Questions?{" "}
          <a href="#" className="text-primary-400 hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
