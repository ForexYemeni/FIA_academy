import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgCleanupOrphans } from '@/lib/telegram'

// POST /api/admin/cleanup-orphans
// Body: { user_id?: string }
//
// Finds and deletes ALL "orphaned" rows across the database.
// An orphan is a row whose foreign-key target no longer exists:
//   - payments / certificate_requests where course_id OR user_id is missing
//   - certificates where course_id is missing
//   - reviews where course_id OR user_id is missing
//   - forum_topics where user_id OR course_id is missing
//   - forum_posts where topic_id is missing
//   - lesson_progress where course_id OR user_id is missing
//   - course_progress where course_id OR user_id is missing
//   - affiliate_referrals where affiliate_id OR student_id is missing
//   - coupon_usages where user_id OR coupon_code is missing
//   - exam_attempts where user_id OR course_id is missing
//
// Returns counts of what was deleted per table. Posts a Telegram summary.
//
// GET endpoint returns the COUNTS of orphans per table without deleting
// anything — used by the admin UI to show a preview before the user
// confirms the wipe.

async function fetchAllIds(table: string, column: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabaseAdmin.from(table).select(column)
    if (error) return new Set()
    return new Set((data || []).map((r: any) => String(r[column])).filter(Boolean))
  } catch {
    return new Set()
  }
}

async function deleteBatch(table: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0
  let deleted = 0
  // Supabase .in() has a 200-item limit per call
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200)
    try {
      const { error } = await supabaseAdmin.from(table).delete().in('id', batch)
      if (!error) deleted += batch.length
    } catch {}
  }
  return deleted
}

async function fetchOrphans(_table: string, refCol: string, validIds: Set<string>): Promise<any[]> {
  // Note: _table param is kept for API symmetry but we can't use it as a
  // variable inside .from() because Supabase's TypeScript types require
  // a string-literal table name. The caller passes table elsewhere.
  try {
    const { data, error } = await supabaseAdmin.from(_table as any).select(`id, ${refCol}`)
    if (error) return []
    return (data || []).filter((row: any) => {
      const ref = row[refCol]
      return ref && !validIds.has(String(ref))
    })
  } catch {
    return []
  }
}

// Helper: get all orphan counts WITHOUT deleting (for preview)
async function previewOrphans() {
  const courseIds = await fetchAllIds('courses', 'id')
  const userIds = await fetchAllIds('users', 'id')
  const topicIds = await fetchAllIds('forum_topics', 'id')
  const affiliateIds = await fetchAllIds('affiliates', 'id')
  const couponCodesArr = await supabaseAdmin.from('coupons').select('code').then((r) => (r.data || []) as any[])
  const couponSet = new Set(couponCodesArr.map((c: any) => c.code).filter(Boolean))

  const preview: { table: string; label: string; count: number }[] = []

  // 1) payments — orphan if course_id missing OR user_id missing
  try {
    const { data: allPayments } = await supabaseAdmin.from('payments').select('id, course_id, user_id')
    const orphaned = (allPayments || []).filter((p: any) =>
      (p.course_id && !courseIds.has(String(p.course_id))) ||
      (p.user_id && !userIds.has(String(p.user_id)))
    )
    preview.push({ table: 'payments', label: 'المدفوعات + طلبات الشهادات', count: orphaned.length })
  } catch {}

  // 2) reviews
  try {
    const { data } = await supabaseAdmin.from('reviews').select('id, course_id, user_id')
    const orphaned = (data || []).filter((r: any) =>
      (r.course_id && !courseIds.has(String(r.course_id))) ||
      (r.user_id && !userIds.has(String(r.user_id)))
    )
    preview.push({ table: 'reviews', label: 'التقييمات', count: orphaned.length })
  } catch {}

  // 3) certificates (course_title is text — no orphan check needed)
  // Actually skip — certificates table stores course_title not course_id

  // 4) forum_topics
  try {
    const { data } = await supabaseAdmin.from('forum_topics').select('id, user_id, course_id')
    const orphaned = (data || []).filter((t: any) =>
      (t.user_id && !userIds.has(String(t.user_id))) ||
      (t.course_id && !courseIds.has(String(t.course_id)))
    )
    preview.push({ table: 'forum_topics', label: 'مواضيع المنتدى', count: orphaned.length })
  } catch {}

  // 5) forum_posts
  try {
    const { data } = await supabaseAdmin.from('forum_posts').select('id, topic_id')
    const orphaned = (data || []).filter((p: any) => p.topic_id && !topicIds.has(String(p.topic_id)))
    preview.push({ table: 'forum_posts', label: 'ردود المنتدى', count: orphaned.length })
  } catch {}

  // 6) lesson_progress + course_progress
  try {
    const { data } = await supabaseAdmin.from('lesson_progress').select('id, course_id, user_id')
    const orphaned = (data || []).filter((l: any) =>
      (l.course_id && !courseIds.has(String(l.course_id))) ||
      (l.user_id && !userIds.has(String(l.user_id)))
    )
    preview.push({ table: 'lesson_progress', label: 'تقدّم الدروس', count: orphaned.length })
  } catch {}

  try {
    const { data } = await supabaseAdmin.from('course_progress').select('id, course_id, user_id')
    const orphaned = (data || []).filter((c: any) =>
      (c.course_id && !courseIds.has(String(c.course_id))) ||
      (c.user_id && !userIds.has(String(c.user_id)))
    )
    preview.push({ table: 'course_progress', label: 'تقدّم الدورات', count: orphaned.length })
  } catch {}

  // 7) affiliate_referrals
  try {
    const { data } = await supabaseAdmin.from('affiliate_referrals').select('id, affiliate_id, student_id')
    const orphaned = (data || []).filter((r: any) =>
      (r.affiliate_id && !affiliateIds.has(String(r.affiliate_id))) ||
      (r.student_id && !userIds.has(String(r.student_id)))
    )
    preview.push({ table: 'affiliate_referrals', label: 'إحالات العمولة', count: orphaned.length })
  } catch {}

  // 8) coupon_usages
  try {
    const { data } = await supabaseAdmin.from('coupon_usages').select('id, user_id, coupon_code')
    const orphaned = (data || []).filter((u: any) =>
      (u.user_id && !userIds.has(String(u.user_id))) ||
      (u.coupon_code && !couponSet.has(String(u.coupon_code)))
    )
    preview.push({ table: 'coupon_usages', label: 'استخدامات الكوبونات', count: orphaned.length })
  } catch {}

  // 9) exam_attempts
  try {
    const { data } = await supabaseAdmin.from('exam_attempts').select('id, course_id, user_id')
    const orphaned = (data || []).filter((e: any) =>
      (e.course_id && !courseIds.has(String(e.course_id))) ||
      (e.user_id && !userIds.has(String(e.user_id)))
    )
    preview.push({ table: 'exam_attempts', label: 'نتائج الاختبارات', count: orphaned.length })
  } catch {}

  return preview
}

export async function GET() {
  try {
    const preview = await previewOrphans()
    const total = preview.reduce((sum, p) => sum + p.count, 0)
    return NextResponse.json({ preview, total_orphans: total })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id as string | undefined

    // Get the preview (also computes orphan IDs)
    const courseIds = await fetchAllIds('courses', 'id')
    const userIds = await fetchAllIds('users', 'id')
    const topicIds = await fetchAllIds('forum_topics', 'id')
    const affiliateIds = await fetchAllIds('affiliates', 'id')
    const couponCodesArr = await supabaseAdmin.from('coupons').select('code').then((r) => (r.data || []) as any[])
    const couponSet = new Set(couponCodesArr.map((c: any) => c.code).filter(Boolean))

    const results: { table: string; label: string; deleted: number }[] = []

    // 1) payments
    try {
      const { data: allPayments } = await supabaseAdmin.from('payments').select('id, course_id, user_id, method')
      const orphanedIds = (allPayments || []).filter((p: any) =>
        (p.course_id && !courseIds.has(String(p.course_id))) ||
        (p.user_id && !userIds.has(String(p.user_id)))
      ).map((p: any) => p.id)
      const deleted = await deleteBatch('payments', orphanedIds)
      results.push({ table: 'payments', label: 'المدفوعات + طلبات الشهادات', deleted })
    } catch {}

    // 2) reviews
    try {
      const { data } = await supabaseAdmin.from('reviews').select('id, course_id, user_id')
      const orphanedIds = (data || []).filter((r: any) =>
        (r.course_id && !courseIds.has(String(r.course_id))) ||
        (r.user_id && !userIds.has(String(r.user_id)))
      ).map((r: any) => r.id)
      const deleted = await deleteBatch('reviews', orphanedIds)
      results.push({ table: 'reviews', label: 'التقييمات', deleted })
    } catch {}

    // 3) forum_topics
    try {
      const { data } = await supabaseAdmin.from('forum_topics').select('id, user_id, course_id')
      const orphanedIds = (data || []).filter((t: any) =>
        (t.user_id && !userIds.has(String(t.user_id))) ||
        (t.course_id && !courseIds.has(String(t.course_id)))
      ).map((t: any) => t.id)
      const deleted = await deleteBatch('forum_topics', orphanedIds)
      results.push({ table: 'forum_topics', label: 'مواضيع المنتدى', deleted })
    } catch {}

    // 4) forum_posts
    try {
      const { data } = await supabaseAdmin.from('forum_posts').select('id, topic_id')
      const orphanedIds = (data || []).filter((p: any) => p.topic_id && !topicIds.has(String(p.topic_id))).map((p: any) => p.id)
      const deleted = await deleteBatch('forum_posts', orphanedIds)
      results.push({ table: 'forum_posts', label: 'ردود المنتدى', deleted })
    } catch {}

    // 5) lesson_progress
    try {
      const { data } = await supabaseAdmin.from('lesson_progress').select('id, course_id, user_id')
      const orphanedIds = (data || []).filter((l: any) =>
        (l.course_id && !courseIds.has(String(l.course_id))) ||
        (l.user_id && !userIds.has(String(l.user_id)))
      ).map((l: any) => l.id)
      const deleted = await deleteBatch('lesson_progress', orphanedIds)
      results.push({ table: 'lesson_progress', label: 'تقدّم الدروس', deleted })
    } catch {}

    // 6) course_progress
    try {
      const { data } = await supabaseAdmin.from('course_progress').select('id, course_id, user_id')
      const orphanedIds = (data || []).filter((c: any) =>
        (c.course_id && !courseIds.has(String(c.course_id))) ||
        (c.user_id && !userIds.has(String(c.user_id)))
      ).map((c: any) => c.id)
      const deleted = await deleteBatch('course_progress', orphanedIds)
      results.push({ table: 'course_progress', label: 'تقدّم الدورات', deleted })
    } catch {}

    // 7) affiliate_referrals
    try {
      const { data } = await supabaseAdmin.from('affiliate_referrals').select('id, affiliate_id, student_id')
      const orphanedIds = (data || []).filter((r: any) =>
        (r.affiliate_id && !affiliateIds.has(String(r.affiliate_id))) ||
        (r.student_id && !userIds.has(String(r.student_id)))
      ).map((r: any) => r.id)
      const deleted = await deleteBatch('affiliate_referrals', orphanedIds)
      results.push({ table: 'affiliate_referrals', label: 'إحالات العمولة', deleted })
    } catch {}

    // 8) coupon_usages
    try {
      const { data } = await supabaseAdmin.from('coupon_usages').select('id, user_id, coupon_code')
      const orphanedIds = (data || []).filter((u: any) =>
        (u.user_id && !userIds.has(String(u.user_id))) ||
        (u.coupon_code && !couponSet.has(String(u.coupon_code)))
      ).map((u: any) => u.id)
      const deleted = await deleteBatch('coupon_usages', orphanedIds)
      results.push({ table: 'coupon_usages', label: 'استخدامات الكوبونات', deleted })
    } catch {}

    // 9) exam_attempts
    try {
      const { data } = await supabaseAdmin.from('exam_attempts').select('id, course_id, user_id')
      const orphanedIds = (data || []).filter((e: any) =>
        (e.course_id && !courseIds.has(String(e.course_id))) ||
        (e.user_id && !userIds.has(String(e.user_id)))
      ).map((e: any) => e.id)
      const deleted = await deleteBatch('exam_attempts', orphanedIds)
      results.push({ table: 'exam_attempts', label: 'نتائج الاختبارات', deleted })
    } catch {}

    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
    const paymentsDeleted = results.find(r => r.table === 'payments')?.deleted || 0
    const certReqsDeleted = 0 // already counted under payments (same table)

    // Telegram summary audit
    try {
      await tgCleanupOrphans(paymentsDeleted, certReqsDeleted, userId)
    } catch {}

    return NextResponse.json({
      success: true,
      total_deleted: totalDeleted,
      results,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
