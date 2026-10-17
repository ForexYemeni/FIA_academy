-- ===========================================================================
-- FIA Academy — Course promotional offers + featured flag
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
-- ===========================================================================

-- Promotional offer fields. A course can be flagged as a "promotional
-- offer" (e.g. "5-day course for $20 instead of $50") which gets
-- displayed prominently in the student dashboard with a professional
-- badge.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS offer_type TEXT DEFAULT 'none';
-- offer_type: 'none' | 'limited_time' | 'featured'

-- Offer duration value (e.g. 5 for "5-day"). Combined with
-- offer_duration_unit.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS offer_duration_value INT DEFAULT 0;

-- offer_duration_unit: 'hours' | 'days' | 'weeks' | 'months'
ALTER TABLE courses ADD COLUMN IF NOT EXISTS offer_duration_unit TEXT DEFAULT 'days';

-- Optional promotional price (the "attractive" price). If null, the
-- regular `price` field is used as the offer price.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS offer_price NUMERIC DEFAULT NULL;

-- Short promotional headline (e.g. "عرض خاص لمدة محدودة!").
ALTER TABLE courses ADD COLUMN IF NOT EXISTS offer_headline TEXT DEFAULT NULL;

-- Force PostgREST to refresh its schema cache (so the new columns are
-- visible to the API immediately).
NOTIFY pgrst, 'reload schema';
