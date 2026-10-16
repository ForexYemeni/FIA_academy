-- Migration: Add About Us, Policies, Social Links, Visibility toggles to site_settings
-- Run via SQL editor in Supabase dashboard OR via /api/setup endpoint

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS academy_name_en TEXT DEFAULT 'FUTURE INTERNATIONAL ACADEMY';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS academy_short TEXT DEFAULT 'FIA';

-- About Us (admin-editable)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_vision TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_mission TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_values TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_team TEXT DEFAULT '';

-- Policies (admin-editable, shown when user clicks policy links)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS policy_privacy TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS policy_terms TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS policy_refund TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS policy_support TEXT DEFAULT '';

-- Social links (admin-editable, each toggleable on/off)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_facebook TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_facebook_enabled BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_telegram TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_telegram_enabled BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_whatsapp TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_whatsapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_sms TEXT DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_sms_enabled BOOLEAN DEFAULT false;

-- Visibility toggles (hide/show sections on public site)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS show_partners BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS show_licenses BOOLEAN DEFAULT false;
