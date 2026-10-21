-- =====================================================
-- FIA Academy — Migration 015
-- Exam duration + retake fee settings (per course)
-- =====================================================

-- 1) Exam duration in minutes. NULL or 0 = unlimited time (no countdown).
ALTER TABLE courses ADD COLUMN IF NOT EXISTS exam_duration_minutes INT DEFAULT NULL;

-- 2) Retake fee. 0 or NULL = retaking the exam is NOT possible at all.
--    When > 0, the student must pay this fee (with proof of payment +
--    admin approval) before starting a new attempt.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS retake_fee NUMERIC DEFAULT 0;

-- Force PostgREST to refresh its schema cache so the new columns are
-- visible to the API immediately.
NOTIFY pgrst, 'reload schema';
