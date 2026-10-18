import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyPaymentApproved, notifyPaymentRejected } from '@/lib/notifications'
import { tgPaymentApproved, tgPaymentRejected as tgReject } from '@/lib/telegram'

// GET /api/payments — admin: list all PAID payments only.
// Free enrollments (amount=0, method='free') are tracked in the
// enrollments system, NOT in payments — so we filter them out here
// to keep the admin's "المدفوعات" view clean.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    let query = supabaseAdmin
      .from('payments')
      .select('*')
      // Exclude free enrollments: amount = 0 + method = 'free' + reference starts with FREE
      .or('amount.gt.0,method.neq.free')
      // Also exclude certificate requests stored in the payments table
      .neq('method', 'certificate_request')
      .order('date', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — admin: manually create a payment record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert(body)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT — admin: update payment status (approve / reject / etc.)
// When the admin approves a payment (status = 'مكتمل'), we also update
// ALL duplicate payment rows for the same user+course to the same status
// — this fixes the legacy duplicate-row issue where the admin approved
// one row but the student's enrollment was reading from another (un-updated)
// row. The student's enrollment viewer reads via /api/enrollments which
// already deduplicates, but we still want all duplicate rows to reflect
// the approved status for consistency.
export async function PUT(req: NextRequest) {
  try {
    const { id, status, ...otherUpdates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

    // 1) Update the targeted payment row
    const updates: any = { status, ...otherUpdates }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (updateError) throw updateError

    // 2) If this is an approval, also update duplicate rows for same
    //    user+course so the student's enrollment reflects the new status.
    //    (Only for approval, not rejection — rejection should NOT
    //    update other rows.)
    if (status === 'مكتمل' && updated?.user_id && updated?.course_id) {
      try {
        await supabaseAdmin
          .from('payments')
          .update({ status })
          .eq('user_id', updated.user_id)
          .eq('course_id', updated.course_id)
          .neq('id', id)
      } catch {}
    }

    // 3) Send notification to the student about the decision
    if (updated?.user_id) {
      try {
        const isApproved = status === 'مكتمل' || status === 'completed' || status === 'paid'
        const isRejected = status === 'ملغي' || status === 'cancelled' || status === 'failed'
        if (isApproved) {
          await notifyPaymentApproved(updated.user_id, updated.course_id)
          await tgPaymentApproved(updated.user_id, updated.course_id)
        } else if (isRejected) {
          await notifyPaymentRejected(updated.user_id, updated.course_id)
          await tgReject(updated.user_id, updated.course_id)
        }
      } catch {}
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
