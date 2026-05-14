import { describe, it, expect } from "vitest";
import {
  GenerationRequestSchema,
  BillingRequestSchema,
} from "@/lib/validation";

describe("GenerationRequestSchema", () => {
  it("accepts a valid generation request", () => {
    const result = GenerationRequestSchema.safeParse({
      prompt: "Create a product launch video",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prompt).toBe("Create a product launch video");
      expect(result.data.duration).toBe(15); // default
      expect(result.data.aspectRatio).toBe("9:16"); // default
    }
  });

  it("rejects empty prompt", () => {
    const result = GenerationRequestSchema.safeParse({ prompt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects prompt over 2000 chars", () => {
    const result = GenerationRequestSchema.safeParse({ prompt: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid aspect ratio", () => {
    const result = GenerationRequestSchema.safeParse({
      prompt: "test",
      aspectRatio: "4:3",
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration over 60", () => {
    const result = GenerationRequestSchema.safeParse({
      prompt: "test",
      duration: 120,
    });
    expect(result.success).toBe(false);
  });

  it("accepts image-to-video mode", () => {
    const result = GenerationRequestSchema.safeParse({
      prompt: "Animate this image",
      mode: "image-to-video",
      inputImageUrl: "https://example.com/image.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all supported languages", () => {
    for (const lang of ["en", "es", "fr", "de", "ja", "zh", "pt", "ko"]) {
      const result = GenerationRequestSchema.safeParse({
        prompt: "test",
        language: lang,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("BillingRequestSchema", () => {
  it("accepts subscribe action", () => {
    const result = BillingRequestSchema.safeParse({
      action: "subscribe",
      plan: "pro",
      billing: "monthly",
    });
    expect(result.success).toBe(true);
  });

  it("accepts portal action", () => {
    const result = BillingRequestSchema.safeParse({
      action: "portal",
      customerId: "cus_123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts credits action", () => {
    const result = BillingRequestSchema.safeParse({
      action: "credits",
      credits: 100,
      priceCents: 999,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid plan", () => {
    const result = BillingRequestSchema.safeParse({
      action: "subscribe",
      plan: "enterprise",
      billing: "monthly",
    });
    expect(result.success).toBe(false);
  });
});
