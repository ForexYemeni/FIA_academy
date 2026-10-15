-- =====================================================
-- FIA Academy — Schema Update (modules, lessons, enrollments)
-- تنفيذ يدوي في Supabase Dashboard → SQL Editor
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
  lesson_type TEXT DEFAULT 'text', -- video | text | exam | pdf
  content TEXT,                    -- text content or exam JSON
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
  status TEXT DEFAULT 'active',  -- active | completed | cancelled
  progress INT DEFAULT 0,         -- 0..100
  payment_status TEXT DEFAULT 'free', -- free | pending | paid | refunded
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

-- RLS + policies
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_modules" ON course_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_lessons" ON course_lessons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_enrollments" ON enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_exam_attempts" ON exam_attempts FOR ALL USING (true) WITH CHECK (true);

-- 5) Storage bucket for profile images + lesson PDFs (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fia-media', 'fia-media', true)
ON CONFLICT (id) DO NOTHING;
