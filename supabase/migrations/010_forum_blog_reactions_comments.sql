-- ===========================================================================
-- FIA Academy — Forum likes/dislikes + Blog likes/dislikes + comments
-- Safe to run multiple times (uses IF NOT EXISTS where supported).
-- ===========================================================================

-- 1) Forum topic likes/dislikes (aggregate counts on the topic row)
ALTER TABLE forum_topics ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
ALTER TABLE forum_topics ADD COLUMN IF NOT EXISTS dislikes_count INT DEFAULT 0;

-- 2) Forum post likes/dislikes (aggregate counts on the post row)
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS dislikes_count INT DEFAULT 0;

-- 3) Individual forum reactions table (tracks who liked/disliked what)
CREATE TABLE IF NOT EXISTS forum_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id UUID,
  post_id UUID,
  reaction TEXT NOT NULL DEFAULT 'like',  -- 'like' | 'dislike'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, topic_id),
  UNIQUE (user_id, post_id)
);
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_forum_reactions" ON forum_reactions;
CREATE POLICY "allow_all_forum_reactions" ON forum_reactions FOR ALL USING (true) WITH CHECK (true);

-- 4) Blog post likes/dislikes + comments
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS dislikes_count INT DEFAULT 0;

-- 5) Individual blog reactions table
CREATE TABLE IF NOT EXISTS blog_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  blog_post_id UUID NOT NULL,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, blog_post_id)
);
ALTER TABLE blog_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_blog_reactions" ON blog_reactions;
CREATE POLICY "allow_all_blog_reactions" ON blog_reactions FOR ALL USING (true) WITH CHECK (true);

-- 6) Blog comments table (in-app comments on blog posts)
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  parent_id UUID,  -- for nested replies (NULL = top-level comment)
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_blog_comments" ON blog_comments;
CREATE POLICY "allow_all_blog_comments" ON blog_comments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments (blog_post_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_topic ON forum_reactions (topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_post ON forum_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_blog_reactions_post ON blog_reactions (blog_post_id);

NOTIFY pgrst, 'reload schema';
