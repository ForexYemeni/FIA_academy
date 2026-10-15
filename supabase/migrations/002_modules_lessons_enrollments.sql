-- =====================================================
-- FIA Academy — Schema Update (modules, lessons, enrollments, team_members)
-- تنفيذ يدوي في Supabase Dashboard → SQL Editor
-- اضغط زر "Run" بعد لصق كل المحتوى
-- =====================================================

-- 1) Modules per course
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Lessons per module (types: video, text, exam, pdf)
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT DEFAULT 'text',
  content TEXT,
  video_url TEXT,
  pdf_url TEXT,
  duration_minutes INT DEFAULT 0,
  position INT DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Enrollments (student ↔ course)
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  progress INT DEFAULT 0,
  payment_status TEXT DEFAULT 'free',
  amount_paid INT DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

-- 4) Exam attempts
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  answers JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5) Team members (founder + leadership team with extended fields)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  title TEXT,
  role TEXT DEFAULT 'team',  -- founder | leader | team
  specialization TEXT,
  bio TEXT,
  vision TEXT,
  mission TEXT,
  qualifications TEXT,  -- JSON array as text: ["بكالوريوس طب","استشاري باطنة"]
  achievements TEXT,      -- JSON array as text
  avatar TEXT,
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  twitter TEXT,
  years_experience INT DEFAULT 0,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS + policies
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN EXECUTE 'CREATE POLICY "allow_all_modules" ON course_modules FOR ALL USING (true) WITH CHECK (true)'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'CREATE POLICY "allow_all_lessons" ON course_lessons FOR ALL USING (true) WITH CHECK (true)'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'CREATE POLICY "allow_all_enrollments" ON enrollments FOR ALL USING (true) WITH CHECK (true)'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'CREATE POLICY "allow_all_exam_attempts" ON exam_attempts FOR ALL USING (true) WITH CHECK (true)'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'CREATE POLICY "allow_all_team_members" ON team_members FOR ALL USING (true) WITH CHECK (true)'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 6) Storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fia-media', 'fia-media', true)
ON CONFLICT (id) DO NOTHING;

-- 7) Seed the founder as a team member (only if not exists)
INSERT INTO team_members (name, title, role, specialization, bio, vision, mission, email, phone, years_experience, display_order, is_active)
SELECT 'د. عبدالرحمن المحمدي', 'المؤسس والمدير التنفيذي', 'founder', 'الطب الباطني والتعليم الطبي',
       'طبيب استشاري وخبير تعليم طبي مع 15 عامًا من الخبرة في تدريب الكوادر الصحية على مستوى الجمهورية اليمنية.',
       'أن نكون المرجع الأول للتعليم الطبي المستمر في المنطقة العربية.',
       'تمكين الكوادر الصحية بمعارف ومهارات تخدم المرضى وترفع جودة الرعاية الصحية.',
       'admin@fia.edu', '+967 700 000 001', 15, 0, true
WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE role = 'founder');
