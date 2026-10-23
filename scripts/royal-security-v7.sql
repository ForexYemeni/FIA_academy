-- ============================================================================
-- 👑 FIA ACADEMY — الدرع الملكي v7.0.0 (RLS + سجل التدقيق + فهارس)
-- ============================================================================
-- مبدأ صارم: لا يُمسّ أي بند يعمل. الإضافات هنا:
--  1) تفعيل RLS على 8 جداول كانت مكشوفة تماماً (منها جداول مالية)
--  2) سياسات SELECT لـ anon فقط حيث يعتمد Realtime في المتصفح عليها
--     (trainer_earnings / withdrawal_requests / trainer_withdrawal_accounts /
--      trainer_follows) — الكتابة تبقى محصورة بخدمة الخادم حصراً
--  3) جداول بلا أي سياسة = service-role فقط (specializations,
--     withdrawal_methods, affiliate_withdrawal_accounts, affiliate_withdrawals)
--  4) جدول audit_log — سجل التدقيق الملكي (مغلق تماماً على العملاء)
--  5) فهارس ناقصة على مسارات الاستعلام الساخنة
-- ملاحظة: لا يُلمس notifications ولا أي سياسة قائمة على الجداول الأخرى.
-- ============================================================================

-- (1) تفعيل RLS على الجداول المكشوفة
ALTER TABLE public.specializations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_earnings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_follows               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_withdrawal_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_methods            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawals         ENABLE ROW LEVEL SECURITY;

-- (2) سياسات القراءة anon — للجداول التي يشترك عليها المتصفح عبر Realtime
-- (قراءة فقط؛ أي إدراج/تعديل/حذف من العميل يُرفض — service-role فقط)
CREATE POLICY anon_read_trainer_earnings
  ON public.trainer_earnings FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_withdrawal_requests
  ON public.withdrawal_requests FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_trainer_withdrawal_accounts
  ON public.trainer_withdrawal_accounts FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_trainer_follows
  ON public.trainer_follows FOR SELECT TO anon USING (true);

-- (3) specializations يحتاج قراءة anon احتياطية لواجهة الموقع العام
CREATE POLICY anon_read_specializations
  ON public.specializations FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_withdrawal_methods
  ON public.withdrawal_methods FOR SELECT TO anon USING (true);

-- (4) سجل التدقيق الملكي — لا سياسات إطلاقاً: متاح لخدمة الخادم فقط
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           bigserial PRIMARY KEY,
  created_at   timestamptz NOT NULL DEFAULT now(),
  actor_id     text,
  actor_email  text,
  actor_role   text,
  action       text NOT NULL,
  entity       text,
  entity_id    text,
  details      jsonb,
  ip           text,
  user_agent   text
);
REVOKE ALL ON public.audit_log FROM anon, authenticated;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor   ON public.audit_log (actor_id);

-- (5) فهارس ناقصة على مسارات ساخنة
-- ملاحظة: جدول certificates بلا عمود user_id (سجلات تحقق عامة) — لا فهرس مستخدم له
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_date ON public.withdrawal_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trainer_earnings_date    ON public.trainer_earnings (created_at DESC);
