-- ═══════════════════════════════════════════════════════════════
-- Migration 003: Share Pages + Batch Metadata
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES video_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_video_jobs_is_public ON video_jobs (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_video_jobs_batch_id   ON video_jobs (batch_id) WHERE batch_id IS NOT NULL;
