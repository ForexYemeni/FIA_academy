-- ===========================================================================
-- FIA Academy — Major schema extension (security + commerce + LMS features)
-- Safe to run multiple times (uses IF NOT EXISTS everywhere).
-- ===========================================================================

-- 1)Coupons & discounts ------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage | fixed
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INT DEFAULT NULL,        -- NULL = unlimited
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  course_id UUID,                   -- NULL = applies to all courses
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2)Affiliate program --------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,                     -- the marketer (NULL = guest marketer)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  unique_code TEXT UNIQUE NOT NULL,  -- short referral code, e.g. "FIA-AHMAD"
  commission_percent NUMERIC DEFAULT 10, -- percent of net sale
  status TEXT DEFAULT 'نشط',
  total_earnings NUMERIC DEFAULT 0,
  total_referrals INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  student_id UUID,                  -- the student who used the link
  course_id UUID,                   -- the course purchased
  payment_id UUID,                  -- the payment record
  amount NUMERIC,                   -- the order amount
  commission NUMERIC,              -- commission earned
  status TEXT DEFAULT 'معلق',       -- معلق | مؤكد | مدفوع | ملغي
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3)Reviews & ratings --------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  status TEXT DEFAULT 'نشط',         -- نشط | مخفي | موقوف
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)         -- one review per user per course
);

-- 4)Forum / community --------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '💬',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  pinned BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false,
  views INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5)Blog / articles ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  cover TEXT,
  author_id UUID,
  status TEXT DEFAULT 'منشور',
  tags TEXT,                         -- comma-separated
  views INT DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6)Exam system — professional question bank --------------------------------
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  lesson_id UUID,                   -- optional link to a lesson
  question_type TEXT NOT NULL DEFAULT 'mcq', -- mcq | truefalse | matching | short_answer
  prompt TEXT NOT NULL,
  options JSONB,                    -- array of strings for mcq / matching pairs
  correct_answer JSONB,             -- for mcq: index; truefalse: boolean; matching: pairs; short_answer: string
  explanation TEXT,
  difficulty TEXT DEFAULT 'متوسط',   -- سهل | متوسط | صعب
  points INT DEFAULT 1,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  lesson_id UUID,
  question_ids JSONB,               -- array of question IDs presented
  answers JSONB,                    -- {question_id: answer}
  score NUMERIC,                    -- percentage 0-100
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  duration_seconds INT,
  ip_address TEXT,
  user_agent TEXT,
  tab_switches INT DEFAULT 0         -- anti-cheat metric
);

-- 7)Progress tracking --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  status TEXT DEFAULT 'not_started', -- not_started | in_progress | completed
  progress_percent INT DEFAULT 0,    -- 0-100
  time_spent_seconds INT DEFAULT 0,  -- total seconds spent on this lesson
  last_position_seconds INT DEFAULT 0, -- for video/audio, where they stopped
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS course_progress (
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  total_lessons INT DEFAULT 0,
  completed_lessons INT DEFAULT 0,
  progress_percent INT DEFAULT 0,
  last_lesson_id UUID,             -- for "continue where you left off"
  last_accessed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, course_id)
);

-- 8)Contact messages (from the public contact page) -------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'جديد',        -- جديد | مقروء | مُجاب | مغلق
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9)FAQ ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'عام',
  display_order INT DEFAULT 0,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Open policies
CREATE POLICY "allow_all_coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_affiliates" ON affiliates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_affiliate_referrals" ON affiliate_referrals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_forum_categories" ON forum_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_forum_topics" ON forum_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_forum_posts" ON forum_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_blog_posts" ON blog_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_exam_questions" ON exam_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_exam_attempts" ON exam_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_lesson_progress" ON lesson_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_course_progress" ON course_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_contact_messages" ON contact_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_faqs" ON faqs FOR ALL USING (true) WITH CHECK (true);

-- Seed default forum categories
INSERT INTO forum_categories (name, description, slug, icon, display_order)
VALUES
  ('الأسئلة العامة', 'نقاشات عامة حول الأكاديمية', 'general', '💬', 0),
  ('استفسارات الدورات', 'أسئلة حول محتوى الدورات', 'courses', '📚', 1),
  ('الشهادات والاعتمادات', 'نقاشات حول الشهادات والاعتمادات', 'certificates', '🎓', 2),
  ('الدعم التقني', 'مشاكل تقنية وحلول', 'tech-support', '🛠️', 3)
ON CONFLICT (slug) DO NOTHING;

-- Seed default FAQs
INSERT INTO faqs (question, answer, category, display_order)
VALUES
  ('كيف أسجل في دورة؟', 'بعد تسجيل الدخول، تصفح الدورات المتاحة واضغط زر "اشترك" في الدورة التي تريد الالتحاق بها.', 'تسجيل', 0),
  ('كم تستغرق كل دورة؟', 'تختلف مدة كل دورة بحسب محتواها — يمكنك رؤية عدد الساعات في بطاقة كل دورة.', 'دورات', 1),
  ('هل أحصل على شهادة عند إكمال الدورة؟', 'نعم، تحصل على شهادة إكمال معتمدة عند اجتياز اختبار الدورة بنجاح.', 'شهادات', 2),
  ('كيف أدفع رسوم الدورة؟', 'نوفر طرق دفع متعددة (تحويل بنكي، محافظ إلكترونية، نقداً). اختر ما يناسبك عند التسجيل.', 'دفع', 3),
  ('هل يمكنني استرداد المبلغ؟', 'يمكن استرداد المبلغ خلال 7 أيام من التسجيل إذا لم تكن قد أكملت أكثر من 25% من الدورة. راجع سياسة الاسترداد الكاملة.', 'استرداد', 4)
ON CONFLICT DO NOTHING;
