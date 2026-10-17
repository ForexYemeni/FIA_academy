-- ===========================================================================
-- FIA Academy — Per-course original price + auto coupon + per-user coupon usage
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ===========================================================================

-- 1) Add original_price + auto_coupon_code to courses ---------------------
-- `original_price` is the "official" / was-price that will be shown
-- struck-through in red on the course card. NULL = no strikethrough.
-- `auto_coupon_code` is a coupon code that's automatically applied at
-- checkout for THIS course (the trainer's own discount, e.g. "FIA-50").
-- NULL = no auto-applied coupon.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS auto_coupon_code TEXT DEFAULT NULL;

-- 2) Coupon usage tracking — per-user, one coupon per account -------------
-- A student can use a coupon for ONE course only from their account.
-- Once they've used a coupon, they cannot reuse the same coupon on
-- another course. This is enforced here at the data level + in the API.
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_code TEXT NOT NULL,             -- the coupon code that was redeemed
  user_id TEXT NOT NULL,                 -- the student who redeemed it
  course_id UUID,                        -- the course it was redeemed for
  payment_id UUID,                       -- the payment row it was attached to
  discount_amount NUMERIC DEFAULT 0,     -- the discount that was applied
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (coupon_code, user_id)         -- one row per (coupon, user) pair
);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_all_coupon_usages"
  ON coupon_usages FOR ALL USING (true) WITH CHECK (true);

-- Helpful index for the per-user lookup
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_code ON coupon_usages (coupon_code);
