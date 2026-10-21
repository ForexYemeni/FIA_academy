-- ============================================================================
-- FIA ACADEMY — FCM Tokens Table Migration
-- ============================================================================
--
-- This table stores FCM (Firebase Cloud Messaging) tokens for each user's
-- device(s). The server uses these tokens to send push notifications
-- directly via Firebase Admin SDK — no OneSignal middleman.
--
-- A user may have multiple tokens (logged in on phone + tablet, or the
-- Firebase SDK rotated the token). The server sends the push to ALL
-- tokens for the user, and on stale-token errors, removes the bad token.
--
-- Run this SQL in Supabase Dashboard → SQL Editor.
-- ============================================================================

-- Drop the table if it exists (clean state for migration)
-- (Commented out to avoid data loss on production)
-- DROP TABLE IF EXISTS fcm_tokens CASCADE;

CREATE TABLE IF NOT EXISTS fcm_tokens (
  -- UUID primary key (default gen_random_uuid())
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user's ID (references users.id)
  -- We don't add a FK constraint because users may be deleted
  -- independently of this table (and we don't want FK violations)
  user_id UUID NOT NULL,

  -- The FCM token (200-500 chars typically)
  -- Indexed for fast lookup by token (used in unregister)
  token TEXT NOT NULL,

  -- Device info (optional — helps with debugging)
  device_info TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one row per (user_id, token) pair
-- This allows upsert in the register endpoint
CREATE UNIQUE INDEX IF NOT EXISTS fcm_tokens_user_id_token_key
  ON fcm_tokens (user_id, token);

-- Index for fast lookup by user_id (used when sending pushes)
CREATE INDEX IF NOT EXISTS fcm_tokens_user_id_idx
  ON fcm_tokens (user_id);

-- Index for fast lookup by token (used in unregister + stale token cleanup)
CREATE INDEX IF NOT EXISTS fcm_tokens_token_idx
  ON fcm_tokens (token);

-- Enable RLS (Row-Level Security)
-- We don't need RLS for this table because all access is via
-- supabaseAdmin (server-side, bypasses RLS). But enabling it
-- is best practice — it prevents accidental client-side access
-- via the anon key.
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (the service_role key bypasses this)
CREATE POLICY "Deny all access to fcm_tokens by default" ON fcm_tokens
  FOR ALL USING (false) WITH CHECK (false);

-- ============================================================================
-- Verification queries (run these to verify the table works):
-- ============================================================================
-- INSERT INTO fcm_tokens (user_id, token) VALUES
--   ('00000000-0000-0000-0000-000000000000', 'test-token-123')
--   ON CONFLICT (user_id, token) DO NOTHING;
--
-- SELECT * FROM fcm_tokens WHERE user_id = '00000000-0000-0000-0000-000000000000';
--
-- DELETE FROM fcm_tokens WHERE token = 'test-token-123';
-- ============================================================================
