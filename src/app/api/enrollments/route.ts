import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  notifyFreeEnrollment, notifyPaymentRequest, notifyCourseCompleted,
} from '@/lib/notifications'
import { tgEnrollmentFree, tgPaymentRequest as tgPayReq, tgCourseCompleted as tgComp } from '@/lib/telegram'
import { guardAdmin, guardAuth } from '@/lib/api-auth'

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

  // ⚡ Fix: 'status' should reflect COURSE completion, not PAYMENT completion.
  // The raw payment status 'مكتمل' means "payment approved" NOT "course finished".
  // Only return 'completed' when progress >= 100 (all lessons done).
  // Otherwise return 'active' (course in progress).
  let enrollmentStatus = 'active'
  if (progress >= 100 && (isApprovedStatus || isFree)) {
    enrollmentStatus = 'completed'
  } else if (isPendingStatus || (!isApprovedStatus && !isFree)) {
    enrollmentStatus = 'pending'
  }

  return {
    id: p.id,
    user_id: p.user_id,
    course_id: p.course_id,
    status: enrollmentStatus,
    progress,
    payment_status,
    amount_paid: p.amount || 0,
    currency: p.currency || 'ر.ي',
    payment_method: p.method,
    payment_reference: p.reference,
    enrolled_at: p.date,
    completed_at: enrollmentStatus === 'completed' ? p.date : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    // 🛡️ كل مستخدم يرى تسجيلاته فقط — الإدارة ترى الكل
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const paramUserId = req.nextUrl.searchParams.get('user_id')
    const userId = g.user.role === 'admin' ? (paramUserId || null) : g.user.id
    const courseId = req.nextUrl.searchParams.get('course_id')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '0') || 0
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0

    let query = supabaseAdmin.from('payments').select('*')
    if (userId) query = query.eq('user_id', userId)
    if (courseId) query = query.eq('course_id', courseId)
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }
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
    // 🛡️ تسجيل شخصي فقط — الهوية من التوقيع الملكي
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const body = await req.json()
    const user_id = g.user.id
    const course_id = body.course_id
    if (!course_id) return NextResponse.json({ error: 'course_id مطلوب' }, { status: 400 })

    // 🛡️ الخادم يقرر المجاني/المدفوع من الدورة نفسها — لا يُقبل كلام العميل
    const { data: courseRow } = await supabaseAdmin
      .from('courses')
      .select('price, currency, price_type, offer_price, offer_ends_at')
      .eq('id', course_id)
      .maybeSingle()
    if (!courseRow) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })

    let serverPrice = Number(courseRow.price || 0)
    const offerActive = courseRow.offer_price != null &&
      (!courseRow.offer_ends_at || new Date(courseRow.offer_ends_at).getTime() > Date.now())
    if (offerActive && Number(courseRow.offer_price) < serverPrice) {
      serverPrice = Number(courseRow.offer_price)
    }
    const isFree = serverPrice <= 0 || courseRow.price_type === 'مجانية'

    // Check if already enrolled — بقراءة آمنة لا تنكسر مع الصفوف المكررة
    // (allow re-subscription if the previous enrollment was REJECTED 'ملغي')
    const { data: existingRows } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .order('date', { ascending: false })
      .limit(2)
    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null

    if (existing) {
      // If the existing enrollment is REJECTED ('ملغي'), allow re-subscription
      // by deleting the rejected record so the student can submit a new
      // payment proof immediately.
      if (existing.status === 'ملغي' || existing.status === 'cancelled' || existing.status === 'failed') {
        await supabaseAdmin.from('payments').delete().eq('id', existing.id)
      } else {
        return NextResponse.json({ already_enrolled: true, ...toEnrollment(existing as StoredEnrollment) })
      }
    }

    const initialStatus = isFree ? 'مكتمل' : 'قيد الانتظار'
    const amountToCharge = isFree ? 0 : (body.amount_paid && Number(body.amount_paid) <= serverPrice ? Number(body.amount_paid) : serverPrice)

    // العملة والسعر من الخادم حصراً — لا يُقبل سعر من العميل
    const currency = courseRow.currency || 'ر.ي'
    const coursePrice = serverPrice

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id,
        course_id,
        amount: amountToCharge,
        currency,
        method: body.payment_method || (isFree ? 'free' : null),
        status: initialStatus,
        reference: body.payment_reference || (isFree ? 'FREE' : null),
        date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // ===== Record coupon usage (per-user restriction) =====
    const appliedCouponMatch = (body.payment_reference || '')?.match(/COUPON:\s*([A-Za-z0-9_-]+)/i)
    const appliedCouponCode = appliedCouponMatch ? appliedCouponMatch[1].toUpperCase() : null
    if (appliedCouponCode && course_id) {
      try {
        await supabaseAdmin
          .from('coupon_usages')
          .insert({
            coupon_code: appliedCouponCode,
            user_id,
            course_id,
            payment_id: data?.id,
            // The discount = original course price − amount the student paid.
            discount_amount: Math.max(0, (coursePrice || 0) - (amountToCharge || 0)),
          })
      } catch {
        // coupon_usages table might not exist yet (pre-migration).
        // Fail silently — the enrollment still succeeded; we just
        // can't enforce the per-user restriction until the
        // migration is applied.
      }
    }

    // Send notifications — use the shared notifications helper which
    // handles different types of enrollment (free vs paid-pending).
    try {
      if (isFree) {
        await notifyFreeEnrollment(user_id, course_id)
        await tgEnrollmentFree(user_id, course_id)
      } else {
        // Paid enrollment: payment is pending admin approval
        await notifyPaymentRequest(user_id, course_id, amountToCharge, currency)
        await tgPayReq(user_id, course_id, amountToCharge, currency, body.payment_method)
      }
    } catch {}

    return NextResponse.json(toEnrollment(data as StoredEnrollment))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 🛡️ الطالب يحدّث تقدمه فقط — تغيير الحالة/المبلغ للإدارة حصراً
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const isAdmin = g.user.role === 'admin'
    const bodyPut = await req.json()
    const id = bodyPut.id
    let updates: any = { ...(bodyPut || {}) }
    delete updates.id
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // جلب الصف الحالي — للملكية ولقيمة التقدم السابقة
    const { data: currentRow } = await supabaseAdmin
      .from('payments').select('user_id, course_id, reference, status').eq('id', id).maybeSingle()
    if (!currentRow) return NextResponse.json({ error: 'التسجيل غير موجود' }, { status: 404 })

    if (!isAdmin) {
      // الملكية: الطالب يعدّل تسجيله هو فقط
      if (currentRow.user_id !== g.user.id) {
        return NextResponse.json({ error: 'غير مصرح — هذا التسجيل ليس لك' }, { status: 403 })
      }
      // الطالب يُمس فقط بحقل التقدم — أي محاولة تغيير حالة/مبلغ تُتجاهل
      const allowedKeys = ['progress']
      updates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowedKeys.includes(k)))
      if (updates.progress !== undefined) {
        const prev = Number(currentRow.reference?.match(/__PROGRESS__:(\d+)/)?.[1] || 0)
        const next = Math.max(0, Math.min(100, Math.floor(Number(updates.progress) || 0)))
        // لا رجوع للورم ولا قفزات مستحيلة
        if (next < prev) updates.progress = prev
      }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'لا يوجد أي تغيير مسموح' }, { status: 403 })
      }
    }

    // Map enrollment fields back to payment fields
    const paymentUpdates: any = {}
    if (updates.status !== undefined) paymentUpdates.status = updates.status
    if (updates.amount_paid !== undefined) paymentUpdates.amount = updates.amount_paid
    if (updates.currency !== undefined) paymentUpdates.currency = updates.currency
    if (updates.payment_method !== undefined) paymentUpdates.method = updates.payment_method
    if (updates.payment_reference !== undefined) paymentUpdates.reference = updates.payment_reference
    if (updates.enrolled_at !== undefined) paymentUpdates.date = updates.enrolled_at

    // Store progress in reference field (append to existing reference)
    // Track the PRE-progress value so we can detect the 100% transition
    // and fire a course-completion notification exactly once.
    let prevProgress = 0
    if (updates.progress !== undefined) {
      // Fetch current reference to preserve payment proof info
      const existingRef = currentRow?.reference || ''
      // Extract the PRE-progress value
      const prevMatch = existingRef.match(/__PROGRESS__:(\d+)/)
      prevProgress = prevMatch ? parseInt(prevMatch[1]) : 0
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

    // === Course completion notification ===
    // If the student reached 100% progress (course completed), notify
    // student + trainer + admins. We only fire this once per
    // enrollment — on the transition < 100 → 100.
    if (updates.progress === 100 && prevProgress < 100 && data?.user_id && data?.course_id) {
      try {
        await notifyCourseCompleted(data.user_id, data.course_id)
        await tgComp(data.user_id, data.course_id)
      } catch {}
    }

    return NextResponse.json(toEnrollment(data as StoredEnrollment))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 🛡️ حذف التسجيلات للإدارة فقط
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('payments').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
