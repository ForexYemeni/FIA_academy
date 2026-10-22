-- ============================================================
-- 024 — مرآة هوية المدرب في public.users (v6.2)
-- الجذر: المدربون المسجلون ذاتياً يُنشَأون في trainers فقط، بينما
-- ثمانية جداول تشغيلية (منتدى/مواضيع/إشعارات/محادثة/تقييمات...) لها
-- مفتاح أجنبي إلى public.users — فكانت مشاركتهم في المنتدى وإشعاراتهم
-- الخاصة تفشل بصمت (FK violation). الحل: صف مرآة بنفس المعرف.
-- تعارض البريد (مدرب سُجّل ببريد مستخدم قائم): تُشتق بريدة مرآة فريدة —
-- المعرّف نفسه هو ما يتطلبه المفتاح الأجنبي، والدخول يمر عبر trainers.
-- (الزرع حسب عدم الوجود — آمن للتكرار)
-- ============================================================

INSERT INTO public.users (id, email, name, phone, password, role, avatar, title, bio)
SELECT t.id,
  CASE WHEN EXISTS (SELECT 1 FROM public.users u2 WHERE u2.email = t.email)
       THEN 'trainer.' || substr(t.id::text, 1, 8) || '@fia-mirror.local'
       ELSE t.email END,
  t.name, t.phone, t.password, 'trainer', t.avatar, t.title, t.bio
FROM public.trainers t
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.id);
