-- ===========================================================================
-- FIA Academy — Migration 012: Fix Chat Realtime RLS Policies
-- ===========================================================================
-- المشكلة: Realtime subscriptions في المتصفح لا تستلم الرسائل الجديدة
-- السبب 1: سياسات RLS مفقودة لـ INSERT/UPDATE على chat tables
-- السبب 2: REPLICA IDENTITY DEFAULT لا يرسل بيانات الصف في UPDATE/DELETE
--
-- هذا الـ migration يصلح:
--   ✅ إضافة سياسات INSERT على chat_messages و chat_conversations
--   ✅ إضافة سياسات UPDATE لـ read_at و conversation updates
--   ✅ تعيين REPLICA IDENTITY FULL لكل الجداول الحرجة
--   ✅ إضافة سياسات SELECT على payments و enrollments للـ Realtime subscriptions
--
-- بعد هذا الـ migration:
--   ⚡ الرسائل الجديدة تصل فوراً للطرف الآخر
--   ⚡ typing indicators ستعمل
--   ⚡ read receipts ستعمل
--   ⚡ تحديثات الدفعات والشهادات تصل فوراً
-- ===========================================================================

-- ===========================================================================
-- 1) إصلاح سياسات RLS على chat_conversations
-- ===========================================================================

DROP POLICY IF EXISTS "chat_conversations_insert_auth" ON chat_conversations;
CREATE POLICY "chat_conversations_insert_auth"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "chat_conversations_update_own" ON chat_conversations;
CREATE POLICY "chat_conversations_update_own"
  ON chat_conversations FOR UPDATE
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- ===========================================================================
-- 2) إصلاح سياسات RLS على chat_messages
-- ===========================================================================

DROP POLICY IF EXISTS "chat_messages_insert_auth" ON chat_messages;
CREATE POLICY "chat_messages_insert_auth"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_update_own" ON chat_messages;
CREATE POLICY "chat_messages_update_own"
  ON chat_messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
  );

-- ===========================================================================
-- 3) إصلاح سياسات RLS على payments (للـ Realtime subscriptions)
-- ===========================================================================
-- payments.user_id و course_id من نوع TEXT - نحتاج cast لـ uuid

-- إزالة السياسة المفتوحة (allow_all)
DROP POLICY IF EXISTS "allow_all" ON payments;
DROP POLICY IF EXISTS "allow_all_payments" ON payments;

-- سياسة SELECT: المستخدم يرى دفعاته + المدرب يرى دفعات دوره
DROP POLICY IF EXISTS "payments_select_own" ON payments;
CREATE POLICY "payments_select_own"
  ON payments FOR SELECT
  USING (
    user_id::uuid = auth.uid()
    OR course_id::uuid IN (
      SELECT id FROM courses WHERE trainer_id::uuid = auth.uid()
    )
  );

-- ===========================================================================
-- 4) إصلاح سياسات RLS على enrollments
-- ===========================================================================

DROP POLICY IF EXISTS "enrollments_select_own" ON enrollments;
CREATE POLICY "enrollments_select_own"
  ON enrollments FOR SELECT
  USING (
    user_id::uuid = auth.uid()
    OR course_id IN (
      SELECT id FROM courses WHERE trainer_id::uuid = auth.uid()
    )
  );

-- ===========================================================================
-- 5) تعيين REPLICA IDENTITY FULL على كل الجداول الحرجة
-- ===========================================================================
-- هذا ضروري لـ Realtime لإرسال بيانات الصف كاملة في أحداث UPDATE/DELETE
-- بدون هذا، Realtime يرسل فقط الـ ID (لا يمكن للمتصفح تحديث الـ UI)

ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE enrollments REPLICA IDENTITY FULL;
ALTER TABLE certificates REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ===========================================================================
-- 6) التأكد من نشر كل الأحداث (INSERT, UPDATE, DELETE)
-- ===========================================================================

ALTER PUBLICATION supabase_realtime SET (publish = 'insert, update, delete');

-- ===========================================================================
-- 7) إعادة تحميل schema
-- ===========================================================================

NOTIFY pgrst, 'reload schema';

-- ===========================================================================
-- ✅ انتهى - الدردشة الآن فورية بالكامل
-- ===========================================================================
