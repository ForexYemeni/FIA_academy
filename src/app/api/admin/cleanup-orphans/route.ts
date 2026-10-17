import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgCleanupOrphans } from '@/lib/telegram'

// POST /api/admin/cleanup-orphans
// Body: { user_id?: string }
//
// Finds and deletes "orphaned" payment rows — payment/enrollment
// rows whose `course_id` no longer exists in the `courses` table.
// This happens when a course is deleted but for some reason the
// cascade didn't catch every payment row (legacy data, race
// conditions, etc.).
//
// Also deletes certificate_request rows whose student or course is
// no longer present.
//
// Returns counts of what was deleted. Posts a Telegram summary.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id as string | undefined

    // 1) Fetch all course IDs (for membership test)
    const { data: courseRows } = await supabaseAdmin.from('courses').select('id')
    const courseIds = new Set((courseRows || []).map((c: any) => c.id))

    // 2) Fetch all user IDs (for orphaned-by-user check)
    const { data: userRows } = await supabaseAdmin.from('users').select('id')
    const userIds = new Set((userRows || []).map((u: any) => u.id))

    // 3) Find ALL payment rows
    const { data: allPayments, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, course_id, method, reference')
    if (payErr) throw payErr

    // 4) Identify orphaned payments — course_id missing OR user_id missing
    let deletedPayments = 0
    const orphanedPaymentIds: string[] = []
    for (const p of allPayments || []) {
      const courseMissing = p.course_id && !courseIds.has(p.course_id)
      const userMissing = p.user_id && !userIds.has(p.user_id)
      if (courseMissing || userMissing) {
        orphanedPaymentIds.push(p.id)
      }
    }

    // 5) Delete orphaned payments in batches of 200 (Supabase limit per .in())
    for (let i = 0; i < orphanedPaymentIds.length; i += 200) {
      const batch = orphanedPaymentIds.slice(i, i + 200)
      const { error } = await supabaseAdmin
        .from('payments')
        .delete()
        .in('id', batch)
      if (!error) deletedPayments += batch.length
    }

    // 6) Identify orphaned certificate_requests — these are stored in
    //    `payments` with method='certificate_request' AND reference
    //    containing '__CERT_REQUEST__'. They were already covered by
    //    the payment cleanup above, but if there are any orphaned
    //    certificate rows (in the separate `certificates` table)
    //    that point to a deleted course, delete those too.
    let deletedCertReqs = 0
    // Certificates with course_id pointing to a non-existent course
    // — actually, the `certificates` table stores `course_title` as
    // text, not course_id, so this check doesn't apply directly.
    // But certificate_REQUESTS in `payments` were already deleted
    // above as part of the orphaned payments. We just count how
    // many of the deleted payments had method='certificate_request'.
    for (const p of allPayments || []) {
      if (orphanedPaymentIds.includes(p.id) && p.method === 'certificate_request') {
        deletedCertReqs += 1
      }
    }

    // 7) Telegram summary
    try {
      await tgCleanupOrphans(deletedPayments, deletedCertReqs, userId)
    } catch {}

    return NextResponse.json({
      success: true,
      deleted_payments: deletedPayments,
      deleted_certificate_requests: deletedCertReqs,
      total_deleted: deletedPayments,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
