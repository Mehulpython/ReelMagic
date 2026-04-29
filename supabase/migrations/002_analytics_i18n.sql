-- ─── Phase 4: Analytics & i18n Schema Migration ─────────────
-- Apply on Supabase instance after deploying Phase 4.
-- Adds analytics_events table, locale column, and usage aggregation.

-- ─── 1. Analytics Events Table ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'video:view', 'video:complete', 'video:pause',
    'generation:start', 'generation:complete', 'generation:fail',
    'share:click', 'template:view', 'page:view',
    'signup:start', 'signup:complete',
    'pricing:view', 'upgrade:click'
  )),
  properties JSONB DEFAULT '{}',
  url TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
  ON public.analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON public.analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON public.analytics_events(session_id);

-- Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
CREATE POLICY "Users can read own analytics"
  ON public.analytics_events FOR SELECT
  USING (user_id = auth.uid());

-- Service role / admins can insert (via API)
CREATE POLICY "Service role can insert analytics"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- ─── 2. Locale Column on Profiles ────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en'
  CHECK (locale IN ('en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'ko'));

-- ─── 3. Mode Column on Video Jobs ────────────────────────────

ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'text-to-video'
  CHECK (mode IN ('text-to-video', 'image-to-video'));

-- ─── 4. Language Column on Video Jobs ────────────────────────

ALTER TABLE public.video_job
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Fix: table name should be plural to match schema
DO $$ BEGIN
  ALTER TABLE public.video_jobs
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
EXCEPTION WHEN undefined_column THEN
  -- column already added or doesn't need it
END $$;

-- ─── 5. Aggregation Function ─────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_usage_daily()
RETURNS void AS $$
DECLARE
  today_date TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
BEGIN
  INSERT INTO public.usage_daily (user_id, date, videos_created, credits_used, cost_cents)
  SELECT
    user_id,
    today_date,
    COUNT(*) FILTER (WHERE event_type = 'generation:complete'),
    COALESCE(SUM((properties->>'costCents')::int), 0),
    COUNT(*) FILTER (WHERE event_type = 'generation:complete')
  FROM public.analytics_events
  WHERE created_at >= DATE_TRUNC('day', NOW())
    AND user_id IS NOT NULL
  GROUP BY user_id
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    videos_created = usage_daily.videos_created + EXCLUDED.videos_created,
    credits_used = usage_daily.credits_used + EXCLUDED.credits_used,
    cost_cents = usage_daily.cost_cents + EXCLUDED.cost_cents;
END;
$$ LANGUAGE plpgsql;

-- ─── 6. Scheduled Refresh (optional) ─────────────────────────
-- Uncomment if using pg_cron or Supabase dashboards:
-- SELECT cron.schedule('aggregate-daily-usage', '0 1 * * *', 'SELECT upsert_usage_daily()');
