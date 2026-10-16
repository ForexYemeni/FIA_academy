-- ===========================================================================
-- FIA Academy — Final feature extension (chat, notifications, affiliate clicks)
-- ===========================================================================

-- 1) Notifications ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,                    -- enrollment | review | reply | payment | affiliate | system | message
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id) WHERE read_at IS NULL;

-- 2) Chat ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(LEAST(participant_1, participant_2), GREATEST(participant_1, participant_2))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at);

-- 3) Affiliate clicks -----------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  user_agent TEXT,
  -- Stored visitor identity (set after registration, NULL for anonymous visitors)
  registered_user_id UUID,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate
  ON affiliate_clicks(affiliate_id, created_at);

-- Enable RLS + open policies (Supabase Realtime needs RLS for broadcast)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_chat_conversations" ON chat_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_affiliate_clicks" ON affiliate_clicks FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for chat messages + notifications so dashboards update live
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
