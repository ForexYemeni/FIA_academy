-- ============================================================
-- FIA Academy — Migration 021: المنظومة الملكية للمدربين
-- تسجيل ذاتي فاخر + موافقة الإدارة + اتفاق نسبة الربح + الاعتماد
-- + حسابات سحب الأرباح حسب الدولة + كتالوج طرق السحب والعملات
-- ============================================================

-- 1) أعمدة منظومة الاعتماد والاتفاق على جدول المدربين
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'admin';
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS qualifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS experiences JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS agreement JSONB;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ;

-- المدربون الحاليون (أُنشئوا بالإدارة) معتمدون تلقائياً
UPDATE trainers SET status = 'approved' WHERE status IS NULL;

-- 2) حسابات سحب أرباح المدربين (حسب الدولة)
CREATE TABLE IF NOT EXISTS trainer_withdrawal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT 'اليمن',
  method_name TEXT NOT NULL,
  currency TEXT,
  account_name TEXT NOT NULL,
  account_number TEXT,
  extra_info TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_wa_trainer ON trainer_withdrawal_accounts(trainer_id);

-- 3) كتالوج طرق السحب حسب الدولة (تديره الإدارة) — المقر الرئيسي: اليمن
CREATE TABLE IF NOT EXISTS withdrawal_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'ر.ي',
  instructions TEXT,
  enabled BOOLEAN DEFAULT true,
  sort INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wm_country ON withdrawal_methods(country);
CREATE INDEX IF NOT EXISTS idx_trainers_status ON trainers(status);

-- بذرة ملكية: اليمن (المقر) + عالمي (عملات رقمية) — تُزرع مرة واحدة فقط
INSERT INTO withdrawal_methods (country, name, currency, instructions, sort)
SELECT * FROM (VALUES
  ('اليمن', 'وسترن يونيون', 'ر.ي', 'زوّدنا برقم الحوالة واسم المرسل وبلد الإرسال بعد إتمام التحويل', 1),
  ('اليمن', 'حوالة كاش — الكريمي / التضامن', 'ر.ي', 'اكتب اسم صاحب الحساب ورقم الهاتف المرتبط', 2),
  ('اليمن', 'محفظة جوالي / محفظة كاش', 'ر.ي', 'رقم المحفظة يجب أن يكون باسم صاحب الحساب نفسه', 3),
  ('اليمن', 'تحويل بنكي', 'ر.ي', 'اسم البنك + رقم الحساب / IBAN', 4),
  ('السعودية', 'STC Pay', 'ر.س', 'رقم الجوال المرتبط بالمحفظة', 1),
  ('السعودية', 'تحويل بنكي (IBAN)', 'ر.س', 'اسم البنك + IBAN', 2),
  ('مصر', 'Vodafone Cash', 'ج.م', 'رقم المحفظة باسم صاحب الحساب', 1),
  ('مصر', 'تحويل بنكي', 'ج.م', 'اسم البنك + رقم الحساب', 2),
  ('الإمارات', 'تحويل بنكي', 'د.إ', 'اسم البنك + IBAN', 1),
  ('الأردن', 'تحويل بنكي / CliQ', 'د.أ', 'اسم البنك + رقم الحساب أو CliQ', 1),
  ('عالمي', 'USDT (شبكة TRC20)', 'USDT', 'عنوان المحفظة فقط — تأكد من شبكة TRC20', 1),
  ('عالمي', 'PayPal', '$', 'البريد الإلكتروني المرتبط بحساب PayPal', 2)
) AS v(country, name, currency, instructions, sort)
WHERE NOT EXISTS (SELECT 1 FROM withdrawal_methods);
