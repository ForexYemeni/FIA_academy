import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// On Vercel, env vars are present but the DATABASE_URL points at
// db.<ref>.supabase.co which Vercel's serverless network can't resolve.
// We rewrite the URL to use the pooler at aws-0-us-east-1.pooler.supabase.com
// which IS reachable, and switch the user from `postgres` to `postgres.<ref>`.
function rewriteDbUrlForPooler(original: string): string | null {
  if (!original) return null
  try {
    const match = original.match(/db\.([a-z0-9]+)\.supabase\.co/)
    if (!match) return null
    const projectRef = match[1]
    const credsMatch = original.match(/^postgresql:\/\/([^:]+):([^@]+)@/)
    if (!credsMatch) return null
    const password = decodeURIComponent(credsMatch[2])
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(
      password,
    )}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`
  } catch {
    return null
  }
}

// Each chunk is a small group of statements that fits in the 60s Vercel
// function timeout. The frontend hits /api/migrate?chunk=N repeatedly.
const CHUNKS: { name: string; sql: string }[] = [
  // Chunk 1: Coupons + Affiliate
  {
    name: 'coupons + affiliates',
    sql: `
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  course_id UUID,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  unique_code TEXT UNIQUE NOT NULL,
  commission_percent NUMERIC DEFAULT 10,
  status TEXT DEFAULT 'نشط',
  total_earnings NUMERIC DEFAULT 0,
  total_referrals INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID,
  student_id UUID,
  course_id UUID,
  payment_id UUID,
  amount NUMERIC,
  commission NUMERIC,
  status TEXT DEFAULT 'معلق',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_affiliates" ON affiliates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_affiliate_referrals" ON affiliate_referrals FOR ALL USING (true) WITH CHECK (true);
`,
  },
  // Chunk 2: Reviews + Forum
  {
    name: 'reviews + forum',
    sql: `
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  status TEXT DEFAULT 'نشط',
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_course_id_user_id_key;
ALTER TABLE reviews ADD CONSTRAINT reviews_course_id_user_id_key UNIQUE (course_id, user_id);

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
  category_id UUID,
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
  topic_id UUID,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_forum_categories" ON forum_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_forum_topics" ON forum_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_forum_posts" ON forum_posts FOR ALL USING (true) WITH CHECK (true);

INSERT INTO forum_categories (name, description, slug, icon, display_order)
VALUES
  ('الأسئلة العامة', 'نقاشات عامة حول الأكاديمية', 'general', '💬', 0),
  ('استفسارات الدورات', 'أسئلة حول محتوى الدورات', 'courses', '📚', 1),
  ('الشهادات والاعتمادات', 'نقاشات حول الشهادات والاعتمادات', 'certificates', '🎓', 2),
  ('الدعم التقني', 'مشاكل تقنية وحلول', 'tech-support', '🛠️', 3)
ON CONFLICT (slug) DO NOTHING;
`,
  },
  // Chunk 3: Blog + Contact + FAQ
  {
    name: 'blog + contact + faq',
    sql: `
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  cover TEXT,
  author_id UUID,
  status TEXT DEFAULT 'منشور',
  tags TEXT,
  views INT DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'جديد',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'عام',
  display_order INT DEFAULT 0,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_blog_posts" ON blog_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_contact_messages" ON contact_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_faqs" ON faqs FOR ALL USING (true) WITH CHECK (true);

INSERT INTO faqs (question, answer, category, display_order)
VALUES
  ('كيف أسجل في دورة؟', 'بعد تسجيل الدخول، تصفح الدورات المتاحة واضغط زر "اشترك" في الدورة التي تريد الالتحاق بها.', 'تسجيل', 0),
  ('كم تستغرق كل دورة؟', 'تختلف مدة كل دورة بحسب محتواها — يمكنك رؤية عدد الساعات في بطاقة كل دورة.', 'دورات', 1),
  ('هل أحصل على شهادة عند إكمال الدورة؟', 'نعم، تحصل على شهادة إكمال معتمدة عند اجتياز اختبار الدورة بنجاح.', 'شهادات', 2),
  ('كيف أدفع رسوم الدورة؟', 'نوفر طرق دفع متعددة (تحويل بنكي، محافظ إلكترونية، نقداً). اختر ما يناسبك عند التسجيل.', 'دفع', 3),
  ('هل يمكنني استرداد المبلغ؟', 'يمكن استرداد المبلغ خلال 7 أيام من التسجيل إذا لم تكن قد أكملت أكثر من 25% من الدورة. راجع سياسة الاسترداد الكاملة.', 'استرداد', 4)
ON CONFLICT DO NOTHING;
`,
  },
  // Chunk 4: Exam system
  {
    name: 'exam questions + attempts',
    sql: `
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  lesson_id UUID,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  prompt TEXT NOT NULL,
  options JSONB,
  correct_answer JSONB,
  explanation TEXT,
  difficulty TEXT DEFAULT 'متوسط',
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
  question_ids JSONB,
  answers JSONB,
  score NUMERIC,
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  duration_seconds INT,
  ip_address TEXT,
  user_agent TEXT,
  tab_switches INT DEFAULT 0
);

ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_exam_questions" ON exam_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_exam_attempts" ON exam_attempts FOR ALL USING (true) WITH CHECK (true);
`,
  },
  // Chunk 5: Progress tracking
  {
    name: 'lesson + course progress',
    sql: `
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  status TEXT DEFAULT 'not_started',
  progress_percent INT DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
ALTER TABLE lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_id_lesson_id_key;
ALTER TABLE lesson_progress ADD CONSTRAINT lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);

CREATE TABLE IF NOT EXISTS course_progress (
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  total_lessons INT DEFAULT 0,
  completed_lessons INT DEFAULT 0,
  progress_percent INT DEFAULT 0,
  last_lesson_id UUID,
  last_accessed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, course_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_lesson_progress" ON lesson_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_course_progress" ON course_progress FOR ALL USING (true) WITH CHECK (true);
`,
  },
]

async function runChunk(sql: string): Promise<{ ok: number; failed: number; errors: string[] }> {
  let Pool: any
  try {
    const pg = await import('pg')
    Pool = pg.Pool
  } catch {
    return { ok: 0, failed: 0, errors: ['pg module not available'] }
  }

  const original = process.env.DATABASE_URL || ''
  const poolerUrl = rewriteDbUrlForPooler(original)
  if (!poolerUrl) {
    return { ok: 0, failed: 0, errors: ['Could not rewrite DATABASE_URL'] }
  }

  const pool = new Pool({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  })
  const prevTlsReject = (process as any).env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  let ok = 0
  let failed = 0
  const errors: string[] = []

  for (const stmt of statements) {
    const meaningful = stmt.replace(/--.*$/gm, '').trim()
    if (!meaningful) continue
    try {
      await pool.query(stmt + ';')
      ok++
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('already exists') || msg.includes('duplicate key')) {
        // expected
      } else {
        failed++
        errors.push(`${stmt.substring(0, 80).replace(/\s+/g, ' ')} → ${msg.substring(0, 150)}`)
      }
    }
  }

  try { await pool.end() } catch {}
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTlsReject
  return { ok, failed, errors }
}

async function listNewTables() {
  const tables = [
    'coupons', 'affiliates', 'affiliate_referrals', 'reviews',
    'forum_categories', 'forum_topics', 'forum_posts', 'blog_posts',
    'exam_questions', 'exam_attempts', 'lesson_progress', 'course_progress',
    'contact_messages', 'faqs',
  ]
  const existing: string[] = []
  for (const t of tables) {
    const { error } = await supabaseAdmin.from(t).select('*').limit(1)
    if (!error || !error.message?.includes('Could not find')) {
      existing.push(t)
    }
  }
  return existing
}

export async function GET(req: NextRequest) {
  const chunkParam = req.nextUrl.searchParams.get('chunk')
  const chunkIdx = chunkParam ? parseInt(chunkParam, 10) : NaN

  // No chunk → run chunk 0 and instruct the client to call again for the rest
  if (Number.isNaN(chunkIdx) || chunkIdx < 0 || chunkIdx >= CHUNKS.length) {
    const existing = await listNewTables()
    return NextResponse.json({
      total_chunks: CHUNKS.length,
      chunk_names: CHUNKS.map((c) => c.name),
      tables_present: existing,
      tables_count: `${existing.length}/14`,
      next_chunk: existing.length < 14 ? 0 : null,
      message: existing.length < 14 ? 'Call /api/migrate?chunk=0, then chunk=1, etc.' : 'All tables exist.',
    })
  }

  const chunk = CHUNKS[chunkIdx]
  const result = await runChunk(chunk.sql)
  const existing = await listNewTables()

  return NextResponse.json({
    chunk: chunkIdx,
    name: chunk.name,
    ok: result.ok,
    failed: result.failed,
    errors: result.errors.slice(0, 20),
    tables_present: existing,
    tables_count: `${existing.length}/14`,
    next_chunk: chunkIdx + 1 < CHUNKS.length ? chunkIdx + 1 : null,
  })
}
