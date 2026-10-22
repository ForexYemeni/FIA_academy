-- ============================================================
-- 018: ROYAL REScue SHIELD — danger_zone_snapshots
-- ------------------------------------------------------------
-- Every danger-zone wipe (full or section) now automatically
-- snapshots ALL affected rows into this table BEFORE deleting,
-- so nothing is ever truly lost and any wipe can be restored
-- from the royal rescue archive in the admin dashboard.
-- ============================================================

CREATE TABLE IF NOT EXISTS danger_zone_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'section',          -- 'full' | 'section'
  section TEXT NOT NULL,                          -- section key or 'all'
  label TEXT NOT NULL DEFAULT '',                 -- Arabic label shown in archive
  tables TEXT[] NOT NULL DEFAULT '{}',            -- which tables were captured
  counts JSONB NOT NULL DEFAULT '{}'::jsonb,      -- { table: rowCount }
  data JSONB NOT NULL DEFAULT '{}'::jsonb,        -- { table: [rows...] }
  row_total BIGINT NOT NULL DEFAULT 0,            -- total captured rows
  created_by UUID,                                -- admin who triggered the wipe
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dzs_created_at ON danger_zone_snapshots (created_at DESC);

-- Lock the table down: only the service role (supabaseAdmin) may touch it.
ALTER TABLE danger_zone_snapshots ENABLE ROW LEVEL SECURITY;
