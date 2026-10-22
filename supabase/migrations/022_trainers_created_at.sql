-- ============================================================
-- 👑 Migration 022 — عمود created_at لجدول المدربين
-- ============================================================
-- الهدف: إصلاح جذر hurry — GET /api/trainers/applications يختار
-- ويُرتب بـ created_at، والعمود غير موجود في الجدول الأصلي
-- (بقي ناقصاً حتى بعد 021) → فشل الاستعلام 500 → قائمة طلبات
-- المدربين تظهر فارغة رغم وجود طلبات حقيقية.
-- ============================================================

ALTER TABLE trainers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ترحيل القيم القديمة: أقرب بديل حي هو updated_at ثم now()
UPDATE trainers SET created_at = COALESCE(updated_at, now()) WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trainers_created_at ON trainers(created_at DESC);
