-- ===========================================================================
-- FIA Academy — Fix existing Arabic blog post slugs (ASCII-only)
-- ===========================================================================
-- Arabic slugs (e.g. "مضاد", "المضادات-الحيوية،-...") get URL-encoded by the
-- browser and Next.js doesn't decode them by default, causing "article not
-- found" on the public /blog/[slug] page.
--
-- This migration replaces all non-ASCII slugs with ASCII-safe slugs.
-- We don't lose history because:
--   1) The post id stays the same
--   2) The slug column was only used for URLs
--   3) The slug is auto-regenerated to ASCII on next admin edit anyway
--
-- Safe to run multiple times — only updates non-ASCII slugs.
-- ===========================================================================

-- Replace any non-ASCII slug with a deterministic ASCII slug (post-<short_id>).
-- We use the first 8 chars of the post id (UUID) to make it unique.
UPDATE blog_posts
SET slug = 'post-' || substr(id::text, 1, 8)
WHERE slug ~ '[^\x00-\x7F]'   -- slug contains any non-ASCII char
  AND slug IS NOT NULL;

-- Also normalize empty/null slugs to a deterministic ASCII slug
UPDATE blog_posts
SET slug = 'post-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Verify all slugs are now ASCII
SELECT id, slug, (slug ~ '[^\x00-\x7F]') AS still_non_ascii
FROM blog_posts
ORDER BY published_at DESC;
