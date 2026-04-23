// ─── Core Types ───────────────────────────────────────────────
// ReelMagic application-level types.
// DB-specific row types live in ./db-types.ts and are re-exported here.

import type {
  PlanTier,
  ProfileRow,
  VideoJobRow,
  TemplateRow,
  CreditsLedgerRow,
  ApiKeyRow,
  UsageDailyRow,
  Database,
} from "./db-types";

// Re-export DB types for convenience
export type {
  PlanTier,
  ProfileRow,
  VideoJobRow,
  TemplateRow,
  CreditsLedgerRow,
  ApiKeyRow,
  UsageDailyRow,
  Database,
} from "./db-types";
// Note: JobStatus from db-types is NOT re-exported here because this file
// defines its own local JobStatus interface (API response type). Import
// the DB enum directly from "./db-types" if you need it: `import type { JobStatus as DbJobStatus } from "@/lib/db-types"`

// ─── Application VideoJob (extends DB row) ────────────────────

export interface VideoJob extends VideoJobRow {
  /** Legacy alias for prompt — the user's script text */
  script: string;
  /** Legacy alias for template slug */
  template: string;
  /** Legacy alias for duration_seconds */
  duration: number;
  /** Legacy alias for aspect_ratio */
  aspectRatio: "9:16" | "16:9" | "1:1";
  /** Legacy alias for output_url */
  outputUrl?: string;
  /** Legacy alias for thumbnail_url */
  thumbnailUrl?: string;
  /** Legacy alias for error_message */
  error?: string;
  /** Legacy alias for updated_at (DB trigger-maintained) */
  updatedAt: string;
  /** Legacy alias for completed_at */
  completedAt?: string;
}

// ─── Application Template (extends DB row) ────────────────────

export interface Template extends TemplateRow {
  /** Legacy alias for thumbnail_url */
  thumbnail?: string;
  /** Legacy alias for default_duration */
  defaultDuration: number;
  /** Tags for filtering (application-level, not in DB) */
  tags: string[];
  /** Optional template configuration */
  config?: TemplateConfig;
}

// ─── Template Configuration Types ─────────────────────────────

export interface TemplateConfig {
  scenes?: SceneConfig[];
  transitions?: string[];
  audioStyle?: string;
  textStyle?: TextStyleConfig;
  effects?: string[];
}

export interface SceneConfig {
  type: "intro" | "content" | "cta" | "outro";
  duration: number;
  overlay?: string;
  animation?: string;
}

export interface TextStyleConfig {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  position?: "top" | "center" | "bottom";
  animation?: "fade" | "slide" | "typewriter" | "bounce";
}

// ─── API Types ────────────────────────────────────────────────

export interface GenerationRequest {
  script: string;
  template: string;
  style: string;
  duration?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
}

export interface GenerationResponse {
  jobId: string;
  status: "queued";
  message: string;
  estimatedTime: number;
}

export interface JobStatus {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  createdAt: string;
  updatedAt: string;
  outputUrl?: string;
  duration?: number;
  currentStep?: string;
  estimatedTimeRemaining?: number;
  queuePosition?: number;
  error?: string;
}

// ─── User & Pricing Types ────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  plan: PlanTier;
  videosGenerated: number;
  videosLimit: number;
  stripeCustomerId?: string;
  createdAt: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  videosPerMonth: number;
  maxDuration: number;
  resolution: string;
  features: string[];
  stripePriceId: string;
}

// ─── Pipeline Types ───────────────────────────────────────────

export interface PipelineStep {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
}

export interface PipelineConfig {
  imageProvider: "fal" | "replicate" | "openai";
  videoProvider: "replicate" | "fal";
  audioProvider: "elevenlabs" | "suno";
  voiceId?: string;
  musicStyle?: string;
  effects?: string[];
}
