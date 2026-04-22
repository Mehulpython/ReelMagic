"use client";

import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  onSelect?: () => void;
}

export function PricingCard({
  name,
  price,
  period = "/mo",
  description,
  features,
  cta,
  popular = false,
  onSelect,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
        popular
          ? "glass-card glow-border scale-[1.02] lg:scale-105"
          : "glass-card hover:border-primary-500/20"
      }`}
    >
      {/* Popular badge */}
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-4 py-1 text-xs font-semibold text-white shadow-lg">
            <Star className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      </div>

      {/* Price */}
      <div className="mb-8">
        <span className="text-4xl font-extrabold text-white">{price}</span>
        {price !== "$0" && (
          <span className="text-sm text-gray-500">{period}</span>
        )}
      </div>

      {/* Features */}
      <ul className="mb-8 flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={onSelect}
        className={`w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${
          popular
            ? "btn-primary text-center"
            : "btn-secondary text-center"
        }`}
      >
        {cta}
      </button>
    </motion.div>
  );
}
