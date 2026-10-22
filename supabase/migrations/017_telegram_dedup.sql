-- 017: TELEGRAM ROYAL DEDUP (نظام التلجرام الملكي — مرة واحدة فقط) — v4.7
-- 1) telegram_file_cache: يمنع تكرار forwardMessage عند كل معاينة/فتح لفيديو أو PDF
--    (كل فتح سابقاً كان يعيد توجيه الرسالة إلى القناة = تكرار مزعج)
-- 2) telegram_upload_cache: رفع كل ملف فريد مرة واحدة فقط حسب بصمة المحتوى
--    (إعادة رفع نفس الملف تعيد نفس الرابط دون رسالة جديدة)
-- 3) telegram_publish_log: سجل النشر — كل إعلان يُنشر مرة واحدة دون تكرار أو فقدان
--    (الفشل لا يُسجَّل → يُعاد المحاولة تلقائياً في المرة القادمة = لا فقدان)
-- APPLIED DIRECTLY to production via pooler connection on 2026-10-22.

CREATE TABLE IF NOT EXISTS telegram_file_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  file_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_upload_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  file_id TEXT,
  kind TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_publish_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,
  content_hash TEXT,
  message_ids JSONB,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_file_cache_key ON telegram_file_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_tg_upload_hash ON telegram_upload_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_tg_publish_key ON telegram_publish_log(event_key);
