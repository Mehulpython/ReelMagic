-- ═══════════════════════════════════════════════════════════════
-- ReelMagic — Supabase Database Schema
-- Apply with: psql -f supabase/schema.sql
-- Idempotent: safe to re-run (IF NOT EXISTS guards throughout)
-- ═══════════════════════════════════════════════════════════════

-- ─── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────────
DO $$
BEGIN
  -- Plan enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier') THEN
    CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
  END IF;

  -- Job status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM (
      'queued', 'submitted', 'processing', 'completed', 'failed', 'cancelled'
    );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 1. PROFILES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id           TEXT UNIQUE NOT NULL,
  email              TEXT NOT NULL,
  full_name          TEXT,
  avatar_url         TEXT,
  plan               plan_tier NOT NULL DEFAULT 'free',
  credits_remaining  INT NOT NULL DEFAULT 5,
  stripe_customer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON profiles (clerk_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email    ON profiles (email);

-- ═══════════════════════════════════════════════════════════════
-- 2. VIDEO JOBS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS video_jobs (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id             UUID,
  prompt                  TEXT,
  negative_prompt         TEXT,
  input_image_url         TEXT,
  style                   TEXT,
  duration_seconds        INT NOT NULL DEFAULT 5,
  aspect_ratio            TEXT NOT NULL DEFAULT '9:16',
  status                  job_status NOT NULL DEFAULT 'queued',
  progress                INT NOT NULL DEFAULT 0,
  fal_request_id          TEXT,
  replicate_prediction_id TEXT,
  output_url              TEXT,
  thumbnail_url           TEXT,
  cost_cents              INT,
  error_message           TEXT,
  metadata                JSONB,
  generation_model        TEXT,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_user_status   ON video_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_desc  ON video_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_jobs_template_id   ON video_jobs (template_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. CREDITS LEDGER  (append-only audit trail)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credits_ledger (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount         INT NOT NULL,           -- positive = credit, negative = debit
  balance_after  INT NOT NULL,
  reason         TEXT NOT NULL,
  job_id         UUID REFERENCES video_jobs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_ledger_user  ON credits_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_job   ON credits_ledger (job_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. TEMPLATES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS templates (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  description           TEXT,
  category              TEXT,
  thumbnail_url         TEXT,
  prompt_template       TEXT,
  default_style         TEXT,
  default_duration      INT,
  default_aspect_ratio  TEXT,
  is_premium            BOOLEAN NOT NULL DEFAULT false,
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_slug     ON templates (slug);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates (category);

-- ── Starter templates ─────────────────────────────────────────
INSERT INTO templates (name, slug, description, category, thumbnail_url, prompt_template, default_style, default_duration, default_aspect_ratio, is_premium, sort_order)
VALUES
  (
    'Skibidi Reaction',
    'skibidi-reaction',
    'Gen-Z reaction-style ad with skibidi toilet aesthetic. Fast cuts, meme energy, maximum virality.',
    'meme',
    '/templates/skibidi-reaction.png',
    'Create a skibidi-style reaction video ad for {product}. Use fast cuts, zoom-ins, and meme-style text overlays. Hook viewers in the first 0.5 seconds.',
    'chaotic-viral',
    7,
    '9:16',
    false,
    1
  ),
  (
    'Democrat Ad',
    'democrat-ad',
    'Clean, trustworthy political ad template. Professional tone with community-focused messaging.',
    'political',
    '/templates/democrat-ad.png',
    'Create a professional political campaign ad for {candidate}. Focus on community values, hope, and positive change. Use warm lighting and diverse community footage.',
    'clean-professional',
    30,
    '16:9',
    false,
    2
  ),
  (
    'Product Launch',
    'product-launch',
    'High-energy product reveal with cinematic transitions. Perfect for DTC brand launches.',
    'ecommerce',
    '/templates/product-launch.png',
    'Create an exciting product launch video for {product}. Start with a teaser, build anticipation, then reveal the product with dramatic lighting and smooth transitions.',
    'cinematic-modern',
    15,
    '9:16',
    false,
    3
  ),
  (
    'Beauty Influencer',
    'beauty-influencer',
    'Glamorous beauty/tutorial style ad. Soft lighting, close-ups, influencer aesthetic.',
    'beauty',
    '/templates/beauty-influencer.png',
    'Create a beauty influencer-style video ad for {product}. Use soft ring-light lighting, close-up product shots, and a friendly ASMR-style voiceover.',
    'soft-glam',
    12,
    '9:16',
    true,
    4
  ),
  (
    'Political Meme',
    'political-meme',
    'Satirical political meme ad. Edgy humor, bold text overlays, shareable format.',
    'political',
    '/templates/political-meme.png',
    'Create a satirical political meme video about {topic}. Use bold text overlays, trending meme formats, and punchy 3-second loops. Make it shareable.',
    'bold-meme',
    8,
    '1:1',
    false,
    5
  ),
  (
    'Dropship Ad',
    'dropship-ad',
    'Classic AliExpress-style dropshipping ad. Problem-solution format with urgency hooks.',
    'ecommerce',
    '/templates/dropship-ad.png',
    'Create a dropshipping-style ad for {product}. Start with the problem, show the solution, add countdown timer graphics, and end with a strong CTA to buy now.',
    'hype-urgency',
    15,
    '9:16',
    false,
    6
  )
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. API KEYS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL,
  name         TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user    ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash    ON api_keys (key_hash);

-- ═══════════════════════════════════════════════════════════════
-- 6. USAGE DAILY
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usage_daily (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  videos_created INT NOT NULL DEFAULT 0,
  credits_used   INT NOT NULL DEFAULT 0,
  cost_cents     INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_user_date ON usage_daily (user_id, date);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys      ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily   ENABLE ROW LEVEL SECURITY;

-- Helper: resolve clerk_id from request JWT.
-- In a Clerk + Supabase setup the client sends the Clerk JWT;
-- we store clerk_id in profiles so RLS can match it.
-- For service-role (server) calls RLS is bypassed entirely.

-- ── Profiles: users can read/update only their own row ────────
CREATE POLICY "Profiles: read own"       ON profiles      FOR SELECT USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Profiles: update own"     ON profiles      FOR UPDATE USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ── Video Jobs ────────────────────────────────────────────────
CREATE POLICY "VideoJobs: read own"      ON video_jobs    FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));
CREATE POLICY "VideoJobs: insert own"    ON video_jobs    FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));
CREATE POLICY "VideoJobs: update own"    ON video_jobs    FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));
CREATE POLICY "VideoJobs: delete own"    ON video_jobs    FOR DELETE USING (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- ── Credits Ledger (read-only for users; inserts via service role) ──
CREATE POLICY "CreditsLedger: read own"  ON credits_ledger FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- ── Templates: everyone can read ─────────────────────────────
CREATE POLICY "Templates: read all"      ON templates     FOR SELECT USING (true);

-- ── API Keys ──────────────────────────────────────────────────
CREATE POLICY "ApiKeys: read own"        ON api_keys       FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));
CREATE POLICY "ApiKeys: insert own"      ON api_keys       FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));
CREATE POLICY "ApiKeys: delete own"      ON api_keys       FOR DELETE USING (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- ── Usage Daily ───────────────────────────────────────────────
CREATE POLICY "UsageDaily: read own"     ON usage_daily    FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- ── Auto-update updated_at on profiles ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── Update usage_daily when a video job completes ─────────────
CREATE OR REPLACE FUNCTION on_video_job_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO usage_daily (user_id, date, videos_created, credits_used, cost_cents)
    VALUES (
      NEW.user_id,
      COALESCE(NEW.completed_at, now())::date,
      1,
      1,
      COALESCE(NEW.cost_cents, 0)
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      videos_created = usage_daily.videos_created + 1,
      credits_used   = usage_daily.credits_used   + 1,
      cost_cents     = usage_daily.cost_cents     + COALESCE(NEW.cost_cents, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_jobs_completed ON video_jobs;
CREATE TRIGGER trg_video_jobs_completed
  AFTER UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION on_video_job_completed();

-- ── Auto-create profile from Clerk webhook ────────────────────
-- Call this function from your /api/webhooks/clerk route handler:
--   INSERT INTO profiles (clerk_id, email, full_name, avatar_url)
--   VALUES (body.data.id, body.data.email_address, body.data.full_name, body.data.image_url);
-- The trigger below is kept as a safety-net for direct Supabase Auth sign-ups
-- (if you ever switch from Clerk to Supabase Auth).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, clerk_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'clerk_id', NEW.id::text),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auth_new_user ON auth.users;
CREATE TRIGGER trg_auth_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════
