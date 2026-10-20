-- 013_re_enable_rls.sql — Applied to live DB on 2026-10-20
-- RLS enabled on ALL tables. anon can only READ public content.
-- service_role bypasses RLS for all admin operations via API routes.

-- Public read tables (anon SELECT only)
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'courses','trainers','blog_posts','faqs','partners','licenses',
    'payment_methods','site_settings','forum_categories','forum_topics',
    'forum_posts','course_modules','reviews'
  ]) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_read_%s" ON %I', t, t);
      EXECUTE format('CREATE POLICY "anon_read_%s" ON %I FOR SELECT TO anon USING (true)', t, t);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;

-- Public insert (contact form + affiliate tracking)
DO $$ BEGIN
  BEGIN
    ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "anon_insert_contact" ON contact_messages FOR INSERT TO anon WITH CHECK (true);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "anon_insert_affiliate_click" ON affiliate_clicks FOR INSERT TO anon WITH CHECK (true);
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Restricted tables (NO anon access — service_role only)
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users','payments','enrollments','certificates','exam_questions','exam_attempts',
    'chat_conversations','chat_messages','notifications','coupons','coupon_usages',
    'team_members','public_profiles','affiliates','course_lessons','course_progress',
    'lesson_progress','affiliate_referrals','forum_bans','blog_comments',
    'blog_reactions','forum_reactions'
  ]) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;

-- Drop ALL allow_all_* policies (dangerous — allowed anon writes)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'allow_all%' LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;
