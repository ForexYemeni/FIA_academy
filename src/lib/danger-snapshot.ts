/**
 * ============================================================================
 * FIA ACADEMY — الدرع الملكي لمنطقة الخطر (Royal Rescue Shield)
 * ============================================================================
 * قبل أي حذف من منطقة الخطر (شامل أو قسم محدد) يتم التقاط نسخة إنقاذ
 * ملكية كاملة لكل صف سيُمحى وتخزينها في جدول danger_zone_snapshots —
 * فلا يُفقد شيء أبداً ويمكن استعادة أي حذف بالكامل من أرشيف الإنقاذ.
 * ============================================================================
 */

import { supabaseAdmin } from '@/lib/supabase'

/** كل جدول يُمسح عند حذف قسم محدد — يطابق حرفياً منطق الحذف في المسار */
export const DZ_SECTION_TABLES: Record<string, string[]> = {
  // 👑 ملاحظة v5.5: جدول certificate_requests غير موجود أصلاً في القاعدة
  //    (طلبات الشهات تخزن في payments بترميز ذكي) — أُزيل من كل القوائم
  //    لأن محاولة مسحه كانت تفشل وتظهر «فشل حذف بعض الجداول» زوراً!
  courses: ['payments', 'certificates', 'reviews', 'exam_questions', 'exam_attempts', 'lesson_progress', 'course_progress', 'forum_topics', 'course_modules', 'course_lessons', 'coupon_usages', 'courses'],
  trainers: ['trainers'],
  students: ['payments', 'users'],
  payments: ['payments'],
  certificates: ['certificates'],
  reviews: ['reviews'],
  coupons: ['coupon_usages', 'coupons'],
  blog: ['blog_posts'],
  forum: ['forum_posts', 'forum_topics'],
  contact: ['contact_messages'],
  payment_methods: ['payment_methods'],
  team: ['team_members'],
  notifications: ['notifications'],
}

/**
 * كل جدول يُمسح عند "حذف جميع البيانات" الشامل — يطابق حرفياً ما يقوله
 * حوار التأكيد (الدورات، المتدربون، المدربون، المدفوعات، الشهادات، المدونة،
 * المنتدى، الكوبونات، الإشعارات، أرباح المدربين، رسائل التواصل…).
 * يبقى محفوظاً دائماً: المؤسس والإدارة، أعضاء الفريق، إعدادات الموقع،
 * ونسخ الإنقاذ نفسها.
 */
export const DZ_FULL_TABLES = [
  // محتوى الدورات والاختبارات (أبناء قبل الآباء)
  'lesson_progress', 'course_progress', 'exam_attempts', 'exam_questions',
  'course_lessons', 'course_modules',
  // مالية وأرباح
  'withdrawal_requests', 'trainer_earnings', 'payments',
  // شهادات وتقييمات
  'certificates', 'reviews',
  // محتوى اجتماعي
  'forum_posts', 'forum_topics', 'blog_posts', 'contact_messages',
  // تجارة ومتابعة وإشعارات
  'coupon_usages', 'coupons', 'trainer_follows', 'notifications',
  'chat_messages', 'chat_conversations',
  // الدورات والمدربون والمستخدمون (الآباء — أخيراً)
  'courses', 'trainers', 'users',
]

/** ترتيب الاستعادة الملكي: الآباء أولاً ثم الأبناء */
const RESTORE_ORDER = [
  'users', 'trainers', 'courses', 'team_members', 'payment_methods',
  'course_modules', 'course_lessons', 'exam_questions',
  'payments', 'trainer_earnings', 'withdrawal_requests',
  'certificates', 'reviews',
  'exam_attempts', 'lesson_progress', 'course_progress',
  'coupons', 'coupon_usages', 'blog_posts', 'forum_topics', 'forum_posts',
  'contact_messages', 'notifications', 'trainer_follows',
  'chat_conversations', 'chat_messages',
]

export interface DangerSnapshotMeta {
  id: string
  kind: string
  section: string
  label: string
  tables: string[]
  counts: Record<string, number>
  row_total: number
  created_by: string | null
  created_at: string
}

/**
 * التقاط نسخة الإنقاذ الملكية قبل المحو — تُجلب كل الصفوف من كل جدول
 * مُتأثر ثم تُخزن دفعة واحدة. لا تُلغي أبداً عملية الحذف عند فشلها
 * (نحاول فقط) حتى لا يتعطل سلوك منطقة الخطر الحالي.
 */
export async function createDangerSnapshot(
  kind: 'full' | 'section',
  section: string,
  label: string,
  tables: string[],
  createdBy?: string
): Promise<{ id: string; counts: Record<string, number>; rowTotal: number } | null> {
  try {
    const data: Record<string, any[]> = {}
    const counts: Record<string, number> = {}
    let rowTotal = 0

    for (const t of tables) {
      try {
        let q = supabaseAdmin.from(t).select('*')
        // قسم "المتدربون" يمسح مستخدمي role=student فقط + كل المدفوعات
        if (t === 'users' && kind === 'section' && section === 'students') {
          q = q.eq('role', 'student')
        }
        const { rows, error } = await fetchAllRows(q)
        if (error) { counts[t] = 0; data[t] = []; continue }
        data[t] = rows || []
        counts[t] = rows?.length || 0
        rowTotal += counts[t]
      } catch {
        counts[t] = 0
        data[t] = []
      }
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('danger_zone_snapshots')
      .insert({
        kind,
        section,
        label,
        tables,
        counts,
        data,
        row_total: rowTotal,
        created_by: createdBy || null,
      })
      .select('id')
      .single()

    if (error || !inserted?.id) return null
    return { id: inserted.id, counts, rowTotal }
  } catch {
    return null
  }
}

/** جلب كل صفوف استعلام بترقيم صفحات تلقائي (حد 1000 لكل طلب) */
async function fetchAllRows(query: any): Promise<{ rows: any[]; error: string | null }> {
  const PAGE = 1000
  let from = 0
  const all: any[] = []
  for (let i = 0; i < 200; i++) {
    const { data, error } = await query.range(from, from + PAGE - 1)
    if (error) return { rows: all, error: error.message }
    const batch = data || []
    all.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return { rows: all, error: null }
}

/** أرشيف الإنقاذ — آخر النسخ (بدون البيانات الثقيلة) */
export async function listDangerSnapshots(limit = 12): Promise<DangerSnapshotMeta[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('danger_zone_snapshots')
      .select('id, kind, section, label, tables, counts, row_total, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return (data || []) as DangerSnapshotMeta[]
  } catch {
    return []
  }
}

/**
 * الاستعادة الملكية — يعيد كل صفوف النسخة إلى أماكنها (upsert على id
 * فلا يُكسر شيء إن وُجد صف مطابق). تُعاد الأقسام بترتيب ملكي آمن.
 */
export async function restoreDangerSnapshot(
  id: string
): Promise<{ ok: boolean; restored: Record<string, number>; rowTotal: number; error?: string }> {
  const { data: snap, error } = await supabaseAdmin
    .from('danger_zone_snapshots')
    .select('id, data, row_total')
    .eq('id', id)
    .single()

  if (error || !snap?.data) return { ok: false, restored: {}, rowTotal: 0, error: 'النسخة غير موجودة' }

  const payload = snap.data as Record<string, any[]>
  const restored: Record<string, number> = {}
  let rowTotal = 0

  for (const t of RESTORE_ORDER) {
    const rows = payload[t]
    if (!Array.isArray(rows) || rows.length === 0) continue
    let count = 0
    // رفع على دفعات لتجنّب حدود حجم الطلب
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200)
      const { error: upErr } = await supabaseAdmin.from(t).upsert(chunk, { onConflict: 'id' })
      if (upErr) {
        return { ok: false, restored, rowTotal, error: `${t}: ${upErr.message}` }
      }
      count += chunk.length
    }
    restored[t] = count
    rowTotal += count
  }

  return { ok: true, restored, rowTotal }
}
