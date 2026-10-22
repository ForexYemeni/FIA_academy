import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyPaymentRequest } from '@/lib/notifications'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

// ============================================================================
// EXAM RETAKE API — paid retake requests for the royal exam system
// ----------------------------------------------------------------------------
// GET  ?user_id=...   → this student's retake payment rows (status display)
// POST {user_id, course_id, method, reference, proof_url}
//                     → create a retake payment request (payments row with
//                       reference 'RETAKE:<course_id>', status 'قيد الانتظار').
//                       The admin approves it from the payments inbox; after
//                       approval the exam-attempts gate unlocks ONE new attempt.
// ROYAL v4.2: a request is allowed even when retake_fee = 0 (the admin
// sets the fee at review time). When the retake budget is exhausted the
// request is refused outright — the failure is permanent.
// ============================================================================

// GET — list retake payment rows
export async function GET(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    // 🛡️ بيانات إعادات المحاولة لصاحبها فقط (الهوية من التوقيع)
    const userId = g.user.role === 'admin' ? req.nextUrl.searchParams.get('user_id') : g.user.id
    const courseId = req.nextUrl.searchParams.get('course_id')
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .ilike('reference', 'RETAKE%')
      .order('date', { ascending: false })
    if (courseId) query = query.eq('course_id', courseId)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — create a retake payment request
export async function POST(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const gp = await guardAuth(req)
    if (!gp.ok) return gp.res
    const { course_id, method, reference, proof_url } = await req.json()
    const user_id = gp.user.id
    if (!user_id || !course_id || !proof_url) {
      return NextResponse.json({ error: 'user_id و course_id وإثبات الدفع مطلوبة' }, { status: 400 })
    }

    // 1) Course + settings — retake budget enforcement (ROYAL v4.2)
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, title, currency, retake_fee, max_retakes')
      .eq('id', course_id)
      .maybeSingle()
    if (!course) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })
    const fee = Number(course.retake_fee) || 0
    const maxRetakesRaw = Number(course.max_retakes)
    const maxRetakes = Number.isFinite(maxRetakesRaw) ? Math.max(0, maxRetakesRaw) : 2
    const attemptBudget = 1 + maxRetakes

    // 1.5) PERMANENT FAILURE — the budget is exhausted without a pass:
    // no more retake requests, ever.
    const { data: submittedAll } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, passed')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .not('submitted_at', 'is', null)
    const submittedCount = (submittedAll || []).length
    const everPassed = (submittedAll || []).some((a: any) => a.passed === true)
    if (submittedCount > 0 && !everPassed && submittedCount >= attemptBudget) {
      return NextResponse.json(
        { error: `انتهت جميع محاولاتك في هذه الدورة (${submittedCount}/${attemptBudget}) — لم تتوفّق في هذه الدورة أبداً، ولا يمكن طلب إعادة`, code: 'ATTEMPTS_EXHAUSTED' },
        { status: 403 }
      )
    }

    // 2) The student must actually be enrolled (any non-retake payment row)
    const { data: enrollmentRows } = await supabaseAdmin
      .from('payments')
      .select('id, status, amount')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .order('date', { ascending: false })
    const realEnrollments = (enrollmentRows || []).filter((p: any) => !(p.reference || '').startsWith('RETAKE'))
    if (realEnrollments.length === 0) {
      return NextResponse.json({ error: 'أنت غير مسجل في هذه الدورة' }, { status: 403 })
    }

    // 3) The student must have completed at least one attempt
    const { data: submittedRows } = await supabaseAdmin
      .from('exam_attempts')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .not('submitted_at', 'is', null)
      .limit(1)
    if ((submittedRows || []).length === 0) {
      return NextResponse.json({ error: 'يجب أن تكمل الاختبار أولاً قبل طلب الإعادة' }, { status: 400 })
    }

    // 4) No duplicate pending retake request
    const { data: pendingRows } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .eq('status', 'قيد الانتظار')
      .ilike('reference', 'RETAKE%')
      .limit(1)
    if ((pendingRows || []).length > 0) {
      return NextResponse.json({ error: 'لديك طلب إعادة قيد المراجعة بالفعل' }, { status: 400 })
    }

    // 5) Create the retake payment request (admin approves from the inbox)
    const fullReference = `RETAKE:${course_id}${reference ? ` | ${reference}` : ''}${proof_url ? ` | PROOF: ${proof_url}` : ''}`
    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id,
        course_id,
        amount: fee,
        currency: course.currency || 'ر.ي',
        method: method || 'إعادة اختبار',
        status: 'قيد الانتظار',
        reference: fullReference,
        date: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    // Notify admins (non-fatal)
    try {
      await notifyPaymentRequest(user_id, course_id, fee, course.currency || 'ر.ي')
    } catch {}

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
