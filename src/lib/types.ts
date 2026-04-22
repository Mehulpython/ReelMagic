// ─── Core Types ───────────────────────────────────────────────

export interface VideoJob {
  id: string;
  userId: string;
  status: "queued" | "processing" | "completed" | "failed";
  script: string;
  template: string;
  style: string;
  duration: number;
  aspectRatio: "9:16" | "16:9";
  outputUrl?: string;
  thumbnailUrl?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  defaultDuration: number;
  tags: string[];
  config?: TemplateConfig;
}

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
  aspectRatio?: "9:16" | "16:9";
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
  plan: "free" | "starter" | "pro";
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
