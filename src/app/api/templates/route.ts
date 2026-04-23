import { NextRequest, NextResponse } from "next/server";
import { Template } from "@/lib/types";

// TODO: Fetch templates from database or config file
// TODO: Add pagination and filtering

const TEMPLATES: Template[] = [
  {
    id: "skibidi-reaction",
    name: "Skibidi Reaction",
    slug: "skibidi-reaction",
    description:
      "Viral reaction-style video with dynamic cuts and trending audio.",
    category: "meme",
    thumbnail_url: "/templates/skibidi.png",
    thumbnail: "/templates/skibidi.png",
    prompt_template: null,
    default_style: null,
    default_duration: 15,
    default_aspect_ratio: "9:16",
    defaultDuration: 15,
    is_premium: false,
    sort_order: 1,
    created_at: new Date().toISOString(),
    tags: ["viral", "reaction", "trending"],
  },
  {
    id: "democrat-ad",
    name: "Democrat Ad",
    slug: "democrat-ad",
    description:
      "Clean, hopeful political ad format with professional voiceover.",
    category: "political",
    thumbnail_url: "/templates/democrat.png",
    thumbnail: "/templates/democrat.png",
    prompt_template: null,
    default_style: null,
    default_duration: 30,
    default_aspect_ratio: "16:9",
    defaultDuration: 30,
    is_premium: false,
    sort_order: 2,
    created_at: new Date().toISOString(),
    tags: ["political", "democrat", "campaign"],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    slug: "product-launch",
    description:
      "Sleek product showcase with cinematic transitions and CTA overlay.",
    category: "commerce",
    thumbnail_url: "/templates/product.png",
    thumbnail: "/templates/product.png",
    prompt_template: null,
    default_style: null,
    default_duration: 20,
    default_aspect_ratio: "9:16",
    defaultDuration: 20,
    is_premium: false,
    sort_order: 3,
    created_at: new Date().toISOString(),
    tags: ["product", "launch", "ecommerce"],
  },
  {
    id: "beauty-influencer",
    name: "Beauty Influencer",
    slug: "beauty-influencer",
    description:
      "Glamorous beauty content with soft transitions and trendy music.",
    category: "lifestyle",
    thumbnail_url: "/templates/beauty.png",
    thumbnail: "/templates/beauty.png",
    prompt_template: null,
    default_style: null,
    default_duration: 15,
    default_aspect_ratio: "9:16",
    defaultDuration: 15,
    is_premium: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
    tags: ["beauty", "influencer", "lifestyle"],
  },
  {
    id: "political-meme",
    name: "Political Meme",
    slug: "political-meme",
    description:
      "Attention-grabbing political content with bold text and fast pacing.",
    category: "political",
    thumbnail_url: "/templates/political-meme.png",
    thumbnail: "/templates/political-meme.png",
    prompt_template: null,
    default_style: null,
    default_duration: 10,
    default_aspect_ratio: "1:1",
    defaultDuration: 10,
    is_premium: false,
    sort_order: 5,
    created_at: new Date().toISOString(),
    tags: ["political", "meme", "viral"],
  },
  {
    id: "dropship-ad",
    name: "Dropship Ad",
    slug: "dropship-ad",
    description:
      "High-converting e-commerce ad with urgency triggers and social proof.",
    category: "commerce",
    thumbnail_url: "/templates/dropship.png",
    thumbnail: "/templates/dropship.png",
    prompt_template: null,
    default_style: null,
    default_duration: 15,
    default_aspect_ratio: "9:16",
    defaultDuration: 15,
    is_premium: false,
    sort_order: 6,
    created_at: new Date().toISOString(),
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
