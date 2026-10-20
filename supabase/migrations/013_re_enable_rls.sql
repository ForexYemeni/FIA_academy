-- 013_re_enable_rls.sql
-- Re-enable RLS on all tables with safe policies
-- anon can READ public content, service_role bypasses RLS for admin operations

-- Public read tables (students/visitors can read these)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'courses', 'trainers', 'blog_posts', 'faqs', 'partners', 'licenses',
    'payment_methods', 'site_settings', 'forum_categories', 'forum_topics',
    'forum_replies', 'course_modules', 'lessons', 'course_reviews'
  ])
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_read_%s" ON %I', t, t);
      EXECUTE format('CREATE POLICY "anon_read_%s" ON %I FOR SELECT TO anon USING (true)', t, t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- Public write tables (contact form + affiliate tracking)
DO $$
BEGIN
  BEGIN
    ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "anon_insert_contact" ON contact_messages;
    CREATE POLICY "anon_insert_contact" ON contact_messages FOR INSERT TO anon WITH CHECK (true);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "anon_insert_affiliate_click" ON affiliate_clicks;
    CREATE POLICY "anon_insert_affiliate_click" ON affiliate_clicks FOR INSERT TO anon WITH CHECK (true);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Restricted tables (only service_role can access — no anon access)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users', 'payments', 'enrollments', 'certificates', 'certificate_requests',
    'exam_questions', 'exam_attempts', 'team_members', 'coupons', 'coupon_usage',
    'chat_conversations', 'chat_messages', 'notifications', 'user_profiles',
    'forum_bans', 'blog_comments', 'blog_reactions', 'forum_reactions',
    'affiliate_codes', 'affiliate_referrals', 'payment_proofs'
  ])
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "restrict_%s" ON %I', t, t);
      -- No policy = no access for anon/authenticated (service_role bypasses RLS)
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- Realtime publication: ensure all tables are in the publication
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
