-- ============================================================
-- 028 — جدول force_logout (v9.1)
-- الجذر: كود الحذف (المتدربون/المدربون/الفريق) يكتب في force_logout
-- منذ زمن، لكن الجدول لم يكن موجوداً في قاعدة البيانات أصلاً — فكانت
-- كل الكتابات تفشل بصمت (try/catch) ويعتمد حرس الجلسة على
-- account_not_found فقط. هذا الجدول يمنح الخروج الفوري سبباً معلناً
-- (account_deleted) وتاريخاً، ويغطي حالات الحذف الجماعي مستقبلاً.
-- user_id نصي (وليس uuid) ليتسع لأي معرّف جلسة دون كسر الكتابة.
-- (الإنشاء حسب عدم الوجود — آمن للتكرار)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.force_logout (
  user_id text PRIMARY KEY,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.force_logout ENABLE ROW LEVEL SECURITY;

-- لا سياسات عامة — الكتابة والقراءة عبر service_role من الخادم فقط
-- (service key يتجاوز RLS، والمستخدم العام لا يرى شيئاً).
