-- ═══════════════════════════════════════════════════════════════
-- Migration 002: Brand Kit
-- Adds brand configuration to profiles table.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_config JSONB DEFAULT '{}';

COMMENT ON profiles.brand_config IS
  'Brand kit: logo URL, colors, fonts, CTA text, watermark, outro';
