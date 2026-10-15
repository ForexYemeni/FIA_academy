CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  avatar TEXT,
  title TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  short_description TEXT,
  description TEXT,
  category TEXT,
  specialization TEXT,
  level TEXT DEFAULT 'مبتدئ',
  price_type TEXT DEFAULT 'مجانية',
  price INT DEFAULT 0,
  currency TEXT DEFAULT 'ر.ي',
  duration_hours INT DEFAULT 0,
  modules_count INT DEFAULT 0,
  lessons_count INT DEFAULT 0,
  pass_score INT DEFAULT 60,
  attempts INT DEFAULT 2,
  certificate_type TEXT,
  cover TEXT,
  status TEXT DEFAULT 'منشورة',
  rating FLOAT DEFAULT 0,
  enrolled INT DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  trainer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trainers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  specialization TEXT,
  bio TEXT,
  avatar TEXT,
  email TEXT UNIQUE,
  password TEXT,
  phone TEXT,
  courses_count INT DEFAULT 0,
  years_experience INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_number TEXT UNIQUE NOT NULL,
  student_name TEXT NOT NULL,
  course_title TEXT,
  issued_by TEXT DEFAULT 'أكاديمية المستقبل الدولية',
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'صالحة',
  has_external_accreditation BOOLEAN DEFAULT false,
  external_accreditation_body TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount INT NOT NULL,
  currency TEXT DEFAULT 'ر.ي',
  method TEXT,
  status TEXT DEFAULT 'قيد الانتظار',
  reference TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  course_id TEXT
);

CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT DEFAULT '🤝',
  description TEXT,
  website TEXT,
  status TEXT DEFAULT 'نشط',
  since TEXT
);

CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issuing_body TEXT NOT NULL,
  type TEXT,
  number TEXT UNIQUE,
  issued_at TEXT,
  expires_at TEXT,
  status TEXT DEFAULT 'ساري',
  verification_url TEXT
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💳',
  type TEXT DEFAULT 'manual',
  currency TEXT DEFAULT 'ر.ي',
  wallet_id TEXT,
  description TEXT,
  instructions TEXT,
  enabled BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_name TEXT DEFAULT 'أكاديمية المستقبل الدولية',
  phone TEXT DEFAULT '+967 700 000 000',
  email TEXT DEFAULT 'info@fia.edu',
  address TEXT DEFAULT 'صنعاء، الجمهورية اليمنية',
  telegram_bot_token TEXT DEFAULT '8648360001:AAEMyb7wP7heOQvoqqK9mQCA1LyOfO3o40A',
  telegram_channel_id TEXT DEFAULT '-1004391183203',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow all (service_role bypasses RLS anyway)
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_trainers" ON trainers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_certificates" ON certificates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_partners" ON partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_licenses" ON licenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_payment_methods" ON payment_methods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_site_settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO site_settings (academy_name, phone, email, address, telegram_bot_token, telegram_channel_id)
VALUES ('أكاديمية المستقبل الدولية', '+967 700 000 000', 'info@fia.edu', 'صنعاء، الجمهورية اليمنية', '8648360001:AAEMyb7wP7heOQvoqqK9mQCA1LyOfO3o40A', '-1004391183203')
ON CONFLICT DO NOTHING;
