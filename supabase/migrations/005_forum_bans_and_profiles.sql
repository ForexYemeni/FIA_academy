-- ===========================================================================
-- FIA Academy — Forum bans + user display info
-- ===========================================================================

-- 1) Forum bans — admin or trainer can ban a user from the forum ----------
CREATE TABLE IF NOT EXISTS forum_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banned_user_id UUID NOT NULL,
  banned_by_user_id UUID NOT NULL,        -- who issued the ban (admin/trainer/team)
  reason TEXT,
  scope TEXT DEFAULT 'all',               -- 'all' = entire forum, or a category_id
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                  -- NULL = permanent
  UNIQUE(banned_user_id, scope)
);

-- 2) Public user profiles — denormalized display info for forum + reviews
-- (avoids N+1 JOIN lookups; updated from users/trainers tables on first read)
CREATE TABLE IF NOT EXISTS public_profiles (
  user_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT,                                -- admin | trainer | student | founder | leader | team
  title TEXT,
  specialization TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE forum_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_forum_bans" ON forum_bans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_public_profiles" ON public_profiles FOR ALL USING (true) WITH CHECK (true);
