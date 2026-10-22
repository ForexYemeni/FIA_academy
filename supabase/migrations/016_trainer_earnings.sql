-- 016: TRAINER EARNINGS ROYAL (أرباح المدربين) — v4.3
-- نسبة أرباح كل مدرب + طريقة استلام الأرباح (محلي / عملات رقمية)
-- + جدول أرباح يتراكم تلقائياً بعد تأكيد الدفع من الإدارة
-- + جدول طلبات سحب يوافق عليها المشرف مع لقطة شاشة إثبات التحويل.
-- APPLIED DIRECTLY to production via pooler connection on 2026-10-22.

ALTER TABLE trainers ADD COLUMN IF NOT EXISTS profit_percentage NUMERIC DEFAULT 0;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS payment_method_type TEXT DEFAULT 'محلي';
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS payment_method_name TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS payment_account TEXT;

CREATE TABLE IF NOT EXISTS trainer_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  payment_id UUID,
  course_id TEXT,
  student_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'ر.ي',
  status TEXT NOT NULL DEFAULT 'متاح',           -- متاح | مسحوب
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_trainer_earnings_payment
  ON trainer_earnings (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_trainer_earnings_trainer
  ON trainer_earnings (trainer_id, status);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'ر.ي',
  method_type TEXT DEFAULT 'محلي',
  method_name TEXT,
  account TEXT,
  status TEXT NOT NULL DEFAULT 'قيد الانتظار',   -- قيد الانتظار | مكتمل | ملغي
  admin_note TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_withdrawals_trainer
  ON withdrawal_requests (trainer_id, status);
CREATE INDEX IF NOT EXISTS ix_withdrawals_status
  ON withdrawal_requests (status, created_at);

NOTIFY pgrst, 'reload schema';
