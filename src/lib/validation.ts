// ─── Zod Validation Schemas ──────────────────────────────────
// Shared input validation for all API endpoints.

import { z } from "zod";

// ─── Generation Request ─────────────────────────────────────

export const GenerationRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt must be under 2000 characters"),
  templateId: z.string().min(1).optional().default("product-launch"),
  style: z.string().optional().default("cinematic"),
  duration: z.coerce.number().int().min(2).max(60).optional().default(15),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional().default("9:16"),
  negativePrompt: z.string().max(500).optional(),
  model: z.string().optional(),
  voiceover: z.boolean().optional().default(true),
  bgm: z.boolean().optional().default(true),
  captions: z.boolean().optional().default(true),
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

// ─── Billing / Checkout Requests ─────────────────────────────

export const SubscribeSchema = z.object({
  action: z.literal("subscribe"),
  plan: z.enum(["starter", "pro"]),
  billing: z.enum(["monthly", "yearly"]),
  email: z.string().email().optional(),
});

export const PortalSchema = z.object({
  action: z.literal("portal"),
  customerId: z.string().min(1),
});

export const CreditsSchema = z.object({
  action: z.literal("credits"),
  credits: z.coerce.number().int().positive(),
  priceCents: z.coerce.number().int().positive(),
  email: z.string().email().optional(),
});

export const BillingRequestSchema = z.discriminatedUnion("action", [
  SubscribeSchema,
  PortalSchema,
  CreditsSchema,
]);

export type BillingRequest = z.infer<typeof BillingRequestSchema>;

// ─── Template Query Params ───────────────────────────────────

export const TemplateQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});

// ─── Helper: validate and return typed data or Zod error ─────

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  error: { message: string; fields?: Record<string, string[]> };
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Flatten field errors into a readable format
  const fields: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "unknown";
    if (!fields[path]) fields[path] = [];
    fields[path].push(issue.message);
  }
  return {
    success: false,
    error: {
      message: result.error.issues[0]?.message || "Validation failed",
      fields,
    },
  };
}
