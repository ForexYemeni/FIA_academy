-- ═══════════════════════════════════════════════════════════════════════════
-- 026 — كتالوج التخصصات العالمية + منظومة سحب عمولات المسوّقين
--   1) جدول specializations: كتالوج مركزي من نوعين
--      type='title'          → المسميات الوظيفية (مدرب/استشاري/أخصائي/محاضر...)
--      type='specialization' → التخصصات العالمية (يضيفها المستخدمون لملفهم)
--      تديره الإدارة (إضافة/تعديل/تفعيل/ترتيب) ويظهر للجميع
--   2) users.specialization — عمود التخصص للمستخدمين (كان title فقط)
--   3) affiliate_withdrawal_accounts — حسابات سحب المسوّقين
--   4) affiliate_withdrawals — طلبات سحب العمولات
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) كتالوج التخصصات ─────────────────────────────────────────────────────
create table if not exists specializations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'specialization',
  icon text,
  enabled boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists specializations_type_name_uq on specializations (type, name);
create index if not exists specializations_type_sort_idx on specializations (type, sort, name);

-- المسميات الوظيفية الافتراضية
insert into specializations (name, type, icon, sort) values
  ('مدرب',            'title', '🎓', 10),
  ('مدرب معتمد',      'title', '🏅', 20),
  ('مدرب دولي معتمد', 'title', '🌍', 30),
  ('استشاري',         'title', '🩺', 40),
  ('أخصائي',          'title', '📊', 50),
  ('محاضر',           'title', '🎤', 60),
  ('مدرس',            'title', '📘', 70),
  ('مدرس معتمد',      'title', '✅', 80),
  ('خبير',            'title', '⭐', 90),
  ('مستشار',          'title', '🧭', 100)
on conflict (type, name) do nothing;

-- التخصصات العالمية الافتراضية (طبقي / إداري / تقني / تنموي)
insert into specializations (name, type, icon, sort) values
  -- الطب والصحة
  ('الطب الباطني', 'specialization', '🩺', 10),
  ('طب الطوارئ', 'specialization', '🚑', 20),
  ('التمريض', 'specialization', '⚕️', 30),
  ('الإنعاش القلبي الرئوي', 'specialization', '❤️', 40),
  ('مكافحة العدوى', 'specialization', '🛡️', 50),
  ('صحة الأم والطفل', 'specialization', '🤱', 60),
  ('الصيدلة السريرية', 'specialization', '💊', 70),
  ('إدارة المنشآت الصحية', 'specialization', '🏥', 80),
  ('التعليم الطبي', 'specialization', '📖', 90),
  ('طب الأسنان', 'specialization', '🦷', 100),
  ('العلاج الطبيعي', 'specialization', '🦿', 110),
  ('التغذية العلاجية', 'specialization', '🥗', 120),
  ('الصحة النفسية', 'specialization', '🧠', 130),
  ('الإسعافات الأولية', 'specialization', '⛑️', 140),
  -- الإدارة والأعمال
  ('إدارة الأعمال', 'specialization', '💼', 200),
  ('الموارد البشرية', 'specialization', '👥', 210),
  ('إدارة المشاريع', 'specialization', '📋', 220),
  ('المحاسبة المالية', 'specialization', '🧾', 230),
  ('التدقيق الداخلي', 'specialization', '🔍', 240),
  ('إدارة المخاطر', 'specialization', '⚠️', 250),
  ('إدارة سلاسل الإمداد', 'specialization', '🚚', 260),
  ('ريادة الأعمال', 'specialization', '🚀', 270),
  ('إدارة الجودة', 'specialization', '🏆', 280),
  ('الاقتصاد والتمويل', 'specialization', '📈', 290),
  ('التجارة الإلكترونية', 'specialization', '🛒', 300),
  -- التسويق
  ('التسويق الرقمي', 'specialization', '📱', 400),
  ('وسائل التواصل الاجتماعي', 'specialization', '🌐', 410),
  ('إدارة العلامة التجارية', 'specialization', '✨', 420),
  ('المبيعات وخدمة العملاء', 'specialization', '🤝', 430),
  ('العلاقات العامة', 'specialization', '📢', 440),
  -- التقنية
  ('البرمجة وتطوير الويب', 'specialization', '💻', 500),
  ('الأمن السيبراني', 'specialization', '🔐', 510),
  ('تحليل البيانات', 'specialization', '📊', 520),
  ('الذكاء الاصطناعي', 'specialization', '🤖', 530),
  ('شبكات الحاسوب', 'specialization', '🔗', 540),
  ('الحوسبة السحابية', 'specialization', '☁️', 550),
  ('قواعد البيانات', 'specialization', '🗄️', 560),
  ('التصميم الجرافيكي', 'specialization', '🎨', 570),
  -- التعليم والتنمية
  ('منهجيات التدريس', 'specialization', '📚', 600),
  ('القياس والتقويم', 'specialization', '📝', 610),
  ('إدارة التعليم', 'specialization', '🏛️', 620),
  ('التعليم الإلكتروني', 'specialization', '🖥️', 630),
  ('المهارات القيادية', 'specialization', '👑', 640),
  ('التنمية البشرية', 'specialization', '🌱', 650),
  ('السلامة المهنية', 'specialization', '🦺', 660),
  ('اللغة الإنجليزية', 'specialization', '🔤', 670),
  ('القانون والأنظمة', 'specialization', '⚖️', 680),
  ('الإنتاج الإعلامي', 'specialization', '🎬', 690),
  ('التنمية المجتمعية', 'specialization', '🤲', 700)
on conflict (type, name) do nothing;

-- ── 2) عمود التخصص للمستخدمين ──────────────────────────────────────────────
alter table users add column if not exists specialization text;

-- ── 3) حسابات سحب المسوّقين ────────────────────────────────────────────────
create table if not exists affiliate_withdrawal_accounts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  country text,
  method_name text not null,
  currency text default 'ر.ي',
  account_name text,
  account_number text not null,
  extra_info text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_wa_affiliate_idx on affiliate_withdrawal_accounts (affiliate_id);

-- ── 4) طلبات سحب العمولات ──────────────────────────────────────────────────
create table if not exists affiliate_withdrawals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text default 'ر.ي',
  method_name text,
  account_name text,
  account_number text,
  account_country text,
  status text not null default 'معلق',
  admin_note text,
  screenshot_url text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists affiliate_withdrawals_aff_idx on affiliate_withdrawals (affiliate_id, created_at desc);
create index if not exists affiliate_withdrawals_status_idx on affiliate_withdrawals (status);
