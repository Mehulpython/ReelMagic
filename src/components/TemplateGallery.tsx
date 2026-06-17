"use client";

import { TemplateCard } from "./TemplateCard";

const TEMPLATES = [
  {
    id: "skibidi-reaction",
    name: "Skibidi Reaction",
    description: "Viral reaction-style video with dynamic cuts and trending audio. Perfect for engagement bait.",
    gradient: "from-purple-600 via-pink-500 to-red-500",
    badge: "🔥 Trending",
    duration: "10-15s",
    uses: "TikTok, Reels",
  },
  {
    id: "democrat-ad",
    name: "Democrat Ad",
    description: "Clean, hopeful political ad format with professional voiceover and patriotic visuals.",
    gradient: "from-blue-600 via-blue-400 to-sky-300",
    badge: "🗳️ Political",
    duration: "30-60s",
    uses: "YouTube, Facebook",
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Sleek product showcase with cinematic transitions, feature callouts, and CTA overlay.",
    gradient: "from-blue-600 via-cyan-500 to-teal-400",
    badge: "📦 Popular",
    duration: "15-30s",
    uses: "Instagram, YouTube",
  },
  {
    id: "beauty-influencer",
    name: "Beauty Influencer",
    description: "Glamorous beauty content with soft transitions, product close-ups, and trendy music.",
    gradient: "from-pink-500 via-rose-400 to-orange-300",
    badge: "💅 Beauty",
    duration: "15-20s",
    uses: "TikTok, Instagram",
  },
  {
    id: "political-meme",
    name: "Political Meme",
    description: "Attention-grabbing political content with bold text overlays and fast-paced editing.",
    gradient: "from-amber-500 via-orange-500 to-red-600",
    badge: "😂 Viral",
    duration: "10-15s",
    uses: "Twitter, TikTok",
  },
  {
    id: "dropship-ad",
    name: "Dropship Ad",
    description: "High-converting e-commerce ad with urgency triggers, price callouts, and social proof.",
    gradient: "from-emerald-500 via-green-400 to-lime-300",
    badge: "💰 E-commerce",
    duration: "15-30s",
    uses: "Facebook, TikTok",
  },
];

export function TemplateGallery() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATES.map((template) => (
        <TemplateCard key={template.id} {...template} />
      ))}
    </div>
  );
}
