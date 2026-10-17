import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// We store enrollments in the existing `payments` table creatively.
// - amount = 0 means FREE enrollment
// - amount > 0 means PAID enrollment
// - status field is reused as enrollment status: 'active' | 'completed' | 'cancelled'
// - method field stores the payment method (e.g., 'free', 'جيب', 'جوالي')
// - reference field stores the payment reference (e.g., 'FREE', 'JB-12345')
// - We track lesson completion in the `description` field as JSON

const COMPLETION_MARKER = '__ENROLL_PROGRESS__:'

interface StoredEnrollment {
  id: string
  amount: number
  currency: string | null
  method: string | null
  status: string  // active | completed | cancelled
  reference: string | null
  date: string | null
  user_id: string | null
  course_id: string | null
}

// Normalize various Arabic/English payment-table status values into a canonical
// enrollment `payment_status`. The admin UI marks approved payments as
// 'مكتمل' and the student-course-viewer marks completed courses as 'مكتمل'
// too, so we additionally use `progress >= 100` to disambiguate between
// "payment confirmed, course in progress" (=> 'confirmed') and "course
// completed" (=> 'completed').
function toEnrollment(p: StoredEnrollment): any {
  // Determine if it's free or paid
  const isFree = !p.amount || p.amount === 0

  // Parse progress from reference field (stored as __PROGRESS__:XX)
  let progress = 0
  if (p.reference) {
    const match = p.reference.match(/__PROGRESS__:(\d+)/)
    if (match) progress = parseInt(match[1]) || 0
  }

  // Normalize raw status for matching
  const rawStatus = (p.status || '').trim()
  const normalizedStatus = rawStatus.toLowerCase()
  const isApprovedStatus =
    rawStatus === 'مكتمل' ||
    rawStatus === 'completed' ||
    rawStatus === 'paid' ||
    rawStatus === 'confirmed' ||
    normalizedStatus === 'completed' ||
    normalizedStatus === 'paid' ||
    normalizedStatus === 'confirmed'
  const isPendingStatus =
    rawStatus === 'قيد الانتظار' ||
    rawStatus === 'بانتظار' ||
    rawStatus === 'pending' ||
    normalizedStatus === 'pending'

  // Determine payment_status
  let payment_status: string
  if (isFree) {
    // Free enrollments stay 'free' (or 'completed' if course finished)
    payment_status = progress >= 100 ? 'completed' : 'free'
  } else if (isApprovedStatus) {
    // Payment has been confirmed by admin (or course completed by student).
    // If the course is fully completed (progress 100), label as 'completed'.
    // Otherwise, treat the approval as 'confirmed' (payment OK, course in progress).
    payment_status = progress >= 100 ? 'completed' : 'confirmed'
  } else if (isPendingStatus) {
    payment_status = 'pending'
  } else {
    // 'active' or unknown status — if it's a paid enrollment, assume pending
    payment_status = 'pending'
  }

  return {
    id: p.id,
    user_id: p.user_id,
    course_id: p.course_id,
    status: p.status || 'active',
    progress,
    payment_status,
    amount_paid: p.amount || 0,
    currency: p.currency || 'ر.ي',
    payment_method: p.method,
    payment_reference: p.reference,
    enrolled_at: p.date,
    completed_at: null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const courseId = req.nextUrl.searchParams.get('course_id')

    let query = supabaseAdmin.from('payments').select('*')
    if (userId) query = query.eq('user_id', userId)
    if (courseId) query = query.eq('course_id', courseId)
    const { data, error } = await query.order('date', { ascending: false })
    if (error) throw error

    // Deduplicate: keep only ONE enrollment per user+course pair
    // If there are duplicates, prefer: 'مكتمل' > 'completed' > 'active' > anything else
    const seen = new Map<string, any>()
    for (const p of (data || [])) {
      const key = `${p.user_id}_${p.course_id}`
      if (!seen.has(key)) {
        seen.set(key, p)
      } else {
        const existing = seen.get(key)
        // Replace if current one is more "advanced" status
        const priority: any = { 'مكتمل': 3, 'completed': 3, 'active': 2, 'pending': 1 }
        const curPriority = priority[p.status] || 0
        const existingPriority = priority[existing.status] || 0
        if (curPriority > existingPriority) {
          seen.set(key, p)
        }
      }
    }

    return NextResponse.json(Array.from(seen.values()).map(p => toEnrollment(p as StoredEnrollment)))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Check if already enrolled (payment record exists for this user+course)
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('user_id', body.user_id)
      .eq('course_id', body.course_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ already_enrolled: true, ...toEnrollment(existing as StoredEnrollment) })
    }

    const isFree = body.payment_status === 'free' || !body.amount_paid || body.amount_paid === 0

    // For paid courses, set status to 'قيد الانتظار' (pending) so the admin
    // sees it in their payments inbox and can approve/reject. For free
    // courses, set status to 'مكتمل' (completed) immediately.
    const initialStatus = isFree ? 'مكتمل' : 'قيد الانتظار'

    // Look up the course to get the correct currency — if the caller
    // didn't pass a currency, we use the course's currency rather than
    // defaulting to 'ر.ي' (which is wrong for USD courses).
    let currency = body.currency
    if (!currency) {
      try {
        const { data: courseRow } = await supabaseAdmin
          .from('courses')
          .select('currency')
          .eq('id', body.course_id)
          .maybeSingle()
        currency = courseRow?.currency || 'ر.ي'
      } catch {
        currency = 'ر.ي'
      }
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: body.user_id,
        course_id: body.course_id,
        amount: body.amount_paid || 0,
        currency,
        method: body.payment_method || (isFree ? 'free' : null),
        status: initialStatus,
        reference: body.payment_reference || (isFree ? 'FREE' : null),
        date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Send notifications — to the user + to all admins
    try {
      // Lookup course title
      const { data: course } = await supabaseAdmin.from('courses').select('title').eq('id', body.course_id).maybeSingle()
      const courseTitle = course?.title || 'دورة'
      // Notify the student
      await supabaseAdmin.from('notifications').insert({
        user_id: body.user_id,
        type: 'enrollment',
        title: 'تم تسجيلك في الدورة بنجاح',
        body: `أنت الآن مسجّل في دورة "${courseTitle}". ابدأ التعلم الآن!`,
        link: '/',
      })
      // Notify all admins
      const { data: admins } = await supabaseAdmin.from('users').select('id').eq('role', 'admin')
      for (const admin of admins || []) {
        await supabaseAdmin.from('notifications').insert({
          user_id: admin.id,
          type: 'enrollment',
          title: 'تسجيل جديد في دورة',
          body: `متدرب جديد سجّل في دورة "${courseTitle}"`,
          link: '/',
        })
      }
    } catch {}

    return NextResponse.json(toEnrollment(data as StoredEnrollment))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Map enrollment fields back to payment fields
    const paymentUpdates: any = {}
    if (updates.status !== undefined) paymentUpdates.status = updates.status
    if (updates.amount_paid !== undefined) paymentUpdates.amount = updates.amount_paid
    if (updates.currency !== undefined) paymentUpdates.currency = updates.currency
    if (updates.payment_method !== undefined) paymentUpdates.method = updates.payment_method
    if (updates.payment_reference !== undefined) paymentUpdates.reference = updates.payment_reference
    if (updates.enrolled_at !== undefined) paymentUpdates.date = updates.enrolled_at

    // Store progress in reference field (append to existing reference)
    if (updates.progress !== undefined) {
      // Fetch current reference to preserve payment proof info
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('reference')
        .eq('id', id)
        .maybeSingle()
      const existingRef = existing?.reference || ''
      // Remove old progress marker if exists
      const cleanRef = existingRef.replace(/\s*\|?\s*__PROGRESS__:\d+/g, '').trim()
      // Add new progress marker
      paymentUpdates.reference = cleanRef ? `${cleanRef} | __PROGRESS__:${updates.progress}` : `__PROGRESS__:${updates.progress}`
    }

    if (Object.keys(paymentUpdates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(paymentUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(toEnrollment(data as StoredEnrollment))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('payments').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
