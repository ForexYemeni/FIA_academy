-- Force-logout table: tracks users whose accounts were deleted
-- or whose sessions should be invalidated.
CREATE TABLE IF NOT EXISTS force_logout (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  reason TEXT DEFAULT 'account_deleted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
ALTER TABLE force_logout ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_force_logout" ON force_logout;
CREATE POLICY "allow_all_force_logout" ON force_logout FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_force_logout_user_id ON force_logout (user_id);
NOTIFY pgrst, 'reload schema';
