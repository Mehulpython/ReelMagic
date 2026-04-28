-- ═══════════════════════════════════════════════════════════════
-- Migration 001: Webhook Idempotency
-- Prevents double-processing of Stripe/Clerk webhook retries.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS processed_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'stripe',  -- 'stripe' | 'clerk'
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_json    JSONB
);

CREATE INDEX IF NOT EXISTS idx_processed_events_event_id ON processed_events (event_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_source    ON processed_events (source);

-- Cleanup: remove events older than 7 days (run via cron or pg_cron)
-- DELETE FROM processed_events WHERE processed_at < now() - interval '7 days';
