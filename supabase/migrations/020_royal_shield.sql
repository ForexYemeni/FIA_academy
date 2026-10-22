-- ============================================================================
-- FIA ACADEMY — MIGRATION 020: الدرع الملكي (Royal Shield)
-- 1) app_secrets: خزنة أسرار الخادم (RLS مغلقة تماماً — service role فقط)
-- 2) RLS على الجداول الحساسة التي لم تُقفل في 013
-- 3) consumed_amount في trainer_earnings — لسحب جزئي عادل (لا ضياع باقٍ)
-- 4) فهرس فريد جزئي يمنع طلبَي سحب معلقين لنفس المدرب بنفس العملة
-- ============================================================================

-- 1) خزنة الأسرار الملكية
CREATE TABLE IF NOT EXISTS app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- لا سياسات أبداً → الوصول عبر service role فقط

-- 2) RLS على الجداول الحساسة الجديدة (لا يقرأها العميل مباشرة أبداً)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fcm_tokens',
    'telegram_file_cache',
    'telegram_upload_cache',
    'telegram_publish_log',
    'force_logout',
    'coupon_usages'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      -- أزل سياسات allow-all القديمة إن وُجدت
      EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I;', t);
      EXECUTE format('DROP POLICY IF EXISTS allow_all_anon ON %I;', t);
      EXECUTE format('DROP POLICY IF EXISTS anon_all ON %I;', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 3) السحب الجزئي العادل — الباقي لا يضيع أبداً
ALTER TABLE trainer_earnings ADD COLUMN IF NOT EXISTS consumed_amount NUMERIC NOT NULL DEFAULT 0;

-- 4) لا طلبا سحب معلقان لنفس المدرب بنفس العملة — ضد سباق الموافقات والإنشاء
CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawal_pending_per_trainer_currency
  ON withdrawal_requests (trainer_id, currency)
  WHERE status = 'قيد الانتظار';

-- 5) عمود لختم موعد المعالجة في طلبات السحب
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
