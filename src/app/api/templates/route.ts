import { NextRequest, NextResponse } from "next/server";
import { Template } from "@/lib/types";

// TODO: Fetch templates from database or config file
// TODO: Add pagination and filtering

const TEMPLATES: Template[] = [
  {
    id: "skibidi-reaction",
    name: "Skibidi Reaction",
    description: "Viral reaction-style video with dynamic cuts and trending audio.",
    category: "meme",
    thumbnail: "/templates/skibidi.png",
    defaultDuration: 15,
    tags: ["viral", "reaction", "trending"],
  },
  {
    id: "democrat-ad",
    name: "Democrat Ad",
    description: "Clean, hopeful political ad format with professional voiceover.",
    category: "political",
    thumbnail: "/templates/democrat.png",
    defaultDuration: 30,
    tags: ["political", "democrat", "campaign"],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Sleek product showcase with cinematic transitions and CTA overlay.",
    category: "commerce",
    thumbnail: "/templates/product.png",
    defaultDuration: 20,
    tags: ["product", "launch", "ecommerce"],
  },
  {
    id: "beauty-influencer",
    name: "Beauty Influencer",
    description: "Glamorous beauty content with soft transitions and trendy music.",
    category: "lifestyle",
    thumbnail: "/templates/beauty.png",
    defaultDuration: 15,
    tags: ["beauty", "influencer", "lifestyle"],
  },
  {
    id: "political-meme",
    name: "Political Meme",
    description: "Attention-grabbing political content with bold text and fast pacing.",
    category: "political",
    thumbnail: "/templates/political-meme.png",
    defaultDuration: 10,
    tags: ["political", "meme", "viral"],
  },
  {
    id: "dropship-ad",
    name: "Dropship Ad",
    description: "High-converting e-commerce ad with urgency triggers and social proof.",
    category: "commerce",
    thumbnail: "/templates/dropship.png",
    defaultDuration: 15,
    tags: ["dropship", "ecommerce", "conversion"],
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");

  let filtered = TEMPLATES;

  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }

  if (tag) {
    filtered = filtered.filter((t) => t.tags.includes(tag));
  }

  return NextResponse.json({
    templates: filtered,
    total: filtered.length,
  });
}
