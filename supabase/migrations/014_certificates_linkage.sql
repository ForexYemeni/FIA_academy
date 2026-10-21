-- ============================================================================
-- Migration 014 — Certificates linkage & trainer attribution
-- يضيف أعمدة الربط للشهادات: معرّف المتدرب، معرّف الدورة، معرّف التسجيل،
-- واسم المدرب — تُستخدم عند إصدار الشهادة يدوياً من لوحة الإدارة.
-- آمنة للتشغيل المتكرر (IF NOT EXISTS) ولا تمس أي بيانات قائمة.
-- ============================================================================

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS enrollment_id UUID;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS trainer_name TEXT;

-- فهارس خفيفة لتسريع البحث والربط
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates (student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id  ON certificates (course_id);
