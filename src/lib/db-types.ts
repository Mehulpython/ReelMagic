// ─── ReelMagic Database Types ─────────────────────────────────
// Auto-generated-style types matching the Supabase schema exactly.
// Keep in sync with supabase/schema.sql.

// ─── Enums (as union types) ──────────────────────────────────
export type PlanTier = "free" | "starter" | "pro" | "enterprise";
export type JobStatus =
  | "queued"
  | "submitted"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

// ─── Table Row Types ─────────────────────────────────────────

export interface ProfileRow {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: PlanTier;
  credits_remaining: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoJobRow {
  id: string;
  user_id: string;
  template_id: string | null;
  prompt: string | null;
  negative_prompt: string | null;
  input_image_url: string | null;
  style: string | null;
  duration_seconds: number;
  aspect_ratio: string;
  status: JobStatus;
  progress: number;
  fal_request_id: string | null;
  replicate_prediction_id: string | null;
  output_url: string | null;
  thumbnail_url: string | null;
  cost_cents: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  generation_model: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreditsLedgerRow {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  reason: string;
  job_id: string | null;
  created_at: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  prompt_template: string | null;
  default_style: string | null;
  default_duration: number | null;
  default_aspect_ratio: string | null;
  is_premium: boolean;
  sort_order: number;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export interface UsageDailyRow {
  id: string;
  user_id: string;
  date: string;
  videos_created: number;
  credits_used: number;
  cost_cents: number;
}

// ─── Insert Types (omit auto-generated fields) ───────────────

export type ProfileInsert = Omit<
  ProfileRow,
  "id" | "created_at" | "updated_at"
>;
export type VideoJobInsert = Omit<
  VideoJobRow,
  "id" | "created_at"
>;
export type CreditsLedgerInsert = Omit<
  CreditsLedgerRow,
  "id" | "created_at"
>;
export type TemplateInsert = Omit<TemplateRow, "id" | "created_at">;
export type ApiKeyInsert = Omit<ApiKeyRow, "id" | "created_at">;
export type UsageDailyInsert = Omit<UsageDailyRow, "id">;

// ─── Update Types (all fields optional except id) ────────────

export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at">>;
export type VideoJobUpdate = Partial<Omit<VideoJobRow, "id" | "created_at">>;

// ─── Database Schema Type (Supabase generated-types pattern) ─

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      video_jobs: {
        Row: VideoJobRow;
        Insert: VideoJobInsert;
        Update: VideoJobUpdate;
      };
      credits_ledger: {
        Row: CreditsLedgerRow;
        Insert: CreditsLedgerInsert;
        Update: never; // append-only
      };
      templates: {
        Row: TemplateRow;
        Insert: TemplateInsert;
        Update: Partial<Omit<TemplateRow, "id" | "created_at">>;
      };
      api_keys: {
        Row: ApiKeyRow;
        Insert: ApiKeyInsert;
        Update: Partial<Omit<ApiKeyRow, "id" | "created_at">>;
      };
      usage_daily: {
        Row: UsageDailyRow;
        Insert: UsageDailyInsert;
        Update: Partial<Omit<UsageDailyRow, "id">>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      plan_tier: PlanTier;
      job_status: JobStatus;
    };
  };
}
