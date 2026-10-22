import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyPaymentApproved, notifyPaymentRejected } from '@/lib/notifications'
import { tgPaymentApproved, tgPaymentRejected as tgReject } from '@/lib/telegram'
import { guardAdmin, guardAuth } from '@/lib/api-auth'
import { notifyAffiliateCommission } from '@/lib/notifications'

// ===========================================================================
// ROYAL EARNINGS ACCRUAL — when the admin approves a student's payment,
// the course trainer's profit percentage is credited to his wallet
// (trainer_earnings) automatically + he gets a luxury notification.
// Guards: enrollment payments only (no retakes / cert requests / free),
// unique per payment_id, and unique per student+course pair.
// ===========================================================================
async function accrueTrainerEarning(payment: any): Promise<void> {
  try {
    const ref: string = payment.reference || ''
    // Only real enrollment payments
    if (ref.startsWith('RETAKE:') || ref.startsWith('__CERT_REQUEST__')) return
    if (payment.method === 'certificate_request' || payment.method === 'free') return
    const amount = Number(payment.amount) || 0
    if (amount <= 0 || !payment.course_id) return

    // Idempotency: this exact payment already credited?
    const { data: existing } = await supabaseAdmin
      .from('trainer_earnings').select('id').eq('payment_id', payment.id).limit(1)
    if (existing && existing.length > 0) return

    // Per-student guard: this student already credited for this course
    // (duplicate payment rows for the same user+course must not double-pay)
    const { data: dupStudent } = await supabaseAdmin
      .from('trainer_earnings').select('id').eq('student_id', payment.user_id).eq('course_id', payment.course_id).limit(1)
    if (dupStudent && dupStudent.length > 0) return

    // Course → trainer profile → profit percentage
    const { data: course } = await supabaseAdmin
      .from('courses').select('id, title, trainer_id').eq('id', payment.course_id).maybeSingle()
    if (!course?.trainer_id) return

    const { resolveTrainerProfileId, resolveTrainerUserId, notifyTrainerNewEarning } = await import('@/lib/notifications')
    const profileId = (await resolveTrainerProfileId(course.trainer_id)) || course.trainer_id
    const { data: trainer } = await supabaseAdmin
      .from('trainers').select('id, name, profit_percentage').eq('id', profileId).maybeSingle()
    const pct = Number(trainer?.profit_percentage || 0)
    if (!trainer || pct <= 0) return

    const share = Math.round(amount * pct / 100)
    if (share <= 0) return

    const { error: insErr } = await supabaseAdmin
      .from('trainer_earnings')
      .insert({
        trainer_id: profileId,
        payment_id: payment.id,
        course_id: payment.course_id,
        student_id: payment.user_id,
        amount: share,
        percentage: pct,
        currency: payment.currency || 'ر.ي',
        status: 'متاح',
      })
    if (insErr) return

    // Luxury notification to the trainer (non-fatal)
    try {
      const trainerUserId = (await resolveTrainerUserId(profileId)) || profileId
      await notifyTrainerNewEarning(trainerUserId, share, payment.currency || 'ر.ي', course.title || 'دورة', pct)
    } catch {}
  } catch {
    // Never break the approval flow because of earnings
  }
}

// ===========================================================================
// AFFILIATE COMMISSION CREDIT (v6.3) — عند اعتماد دفعة، تُحتسب عمولة
// المسوّق المرتبط بالإحالة (affiliate_referrals بحالة «معلق») وتُضاف إلى
// رصيده (affiliates.total_earnings) مع إشعار فوري. متماثلة: status تتحول
// إلى «مؤكد» فلا تُحسب مرتين أبداً.
// ===========================================================================
async function creditAffiliateCommission(payment: any): Promise<void> {
  try {
    if (!payment?.id) return
    const { data: refs } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('id, affiliate_id')
      .eq('payment_id', payment.id)
      .eq('status', 'معلق')
    for (const ref of refs || []) {
      const { data: aff } = await supabaseAdmin
        .from('affiliates')
        .select('id, commission_percent, total_earnings, user_id')
        .eq('id', ref.affiliate_id)
        .maybeSingle()
      if (!aff) continue
      const commission = Math.round(((payment.amount || 0) * (aff.commission_percent || 0) / 100) * 100) / 100
      await supabaseAdmin.from('affiliate_referrals')
        .update({ amount: payment.amount || 0, commission, status: 'مؤكد' })
        .eq('id', ref.id)
      await supabaseAdmin.from('affiliates')
        .update({ total_earnings: (aff.total_earnings || 0) + commission })
        .eq('id', aff.id)
      if (aff.user_id) {
        let courseTitle: string | null = null
        try {
          const { data: c } = await supabaseAdmin.from('courses').select('title').eq('id', payment.course_id).maybeSingle()
          courseTitle = c?.title || null
        } catch {}
        notifyAffiliateCommission(aff.user_id, commission, payment.currency || 'ر.ي', aff.commission_percent || 0, courseTitle).catch(() => {})
      }
    }
  } catch {}
}

// GET /api/payments — admin: list all PAID payments only.
// Free enrollments (amount=0, method='free') are tracked in the
// enrollments system, NOT in payments — so we filter them out here
// to keep the admin's "المدفوعات" view clean.
export async function GET(req: NextRequest) {
  try {
    // 🛡️ المالك يرى مدفوعاته — الإدارة ترى الكل
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const userId = g.user.role === 'admin' ? req.nextUrl.searchParams.get('user_id') : g.user.id
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '0') || 0
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0
    let query = supabaseAdmin
      .from('payments')
      .select('*')
      // Exclude free enrollments: amount = 0 + method = 'free' + reference starts with FREE
      .or('amount.gt.0,method.neq.free')
      // Also exclude certificate requests stored in the payments table
      .neq('method', 'certificate_request')
      // 👑 v5.6: تسجيلات الفريق التلقائية في الدليلين الملكيين (GUIDE-FREE)
      //    إدارية خالصة — لا تظهر كـ«مدفوعات» في أي قسم بعد الحذف الشامل
      .neq('reference', 'GUIDE-FREE')
      .order('date', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — الإدارة فقط: إنشاء سجل دفعة يدوي
export async function POST(req: NextRequest) {
  try {
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
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
    // 🛡️ الموافقة/الرفض للإدارة فقط — كانت مفتوحة على أي زائر!
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
    const { id, status, rejection_reason, ...otherUpdates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

    const updates: any = { status, ...otherUpdates }

    // Store rejection reason in the reference field
    if (rejection_reason && (status === 'ملغي' || status === 'cancelled')) {
      const { data: existing } = await supabaseAdmin
        .from('payments').select('reference').eq('id', id).maybeSingle()
      const existingRef = existing?.reference || ''
      const cleanRef = existingRef.replace(/\s*\|\s*REJECTION:.*$/i, '').trim()
      updates.reference = cleanRef ? `${cleanRef} | REJECTION: ${rejection_reason}` : `REJECTION: ${rejection_reason}`
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (updateError) throw updateError

    // 2.4) 💰 عكس أرباح المدرب عند إلغاء دفعة كانت مكتملة — فلا يبقى ربحٌ
    //      عن دفعة لم تعد صحيحة. نرفض الإلغاء إن كان الربح قد سُحب فعلاً.
    if ((status === 'ملغي' || status === 'cancelled') && updated?.course_id) {
      try {
        const { data: linked } = await supabaseAdmin
          .from('trainer_earnings').select('id, status').eq('payment_id', id)
        if (linked && linked.length > 0) {
          const withdrawn = linked.find((r: any) => r.status === 'مسحوب')
          if (withdrawn) {
            return NextResponse.json(
              { error: 'لا يمكن إلغاء هذه الدفعة — ربحها أُصرف للمدرب بالفعل. تواصل مع المدرب أولاً.' },
              { status: 409 }
            )
          }
          await supabaseAdmin.from('trainer_earnings').update({ status: 'ملغي' }).eq('payment_id', id)
        }
      } catch {}
    }

    // 2) Only update duplicate rows on APPROVAL (not rejection)
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

    // 2.5) ROYAL EARNINGS — accrue the trainer's profit share automatically.
    // Only for PAID ENROLLMENT payments (not retakes, not cert requests,
    // not free enrollments). Idempotent: unique payment_id + per-student guard.
    if (status === 'مكتمل' && updated?.course_id && updated?.user_id) {
      accrueTrainerEarning(updated).catch(() => {})
      creditAffiliateCommission(updated).catch(() => {})
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
          // Include rejection reason in the notification
          try {
            const { data: courseRow } = await supabaseAdmin
              .from('courses').select('title').eq('id', updated.course_id).maybeSingle()
            const courseTitle = courseRow?.title || 'دورة'
            await supabaseAdmin.from('notifications').insert({
              user_id: updated.user_id,
              type: 'payment',
              title: '❌ تم رفض الدفع',
              body: rejection_reason
                ? `تم رفض دفعك لدورة "${courseTitle}". السبب: ${rejection_reason}. يمكنك إعادة الاشتراك برفع إثبات دفع صحيح.`
                : `تم رفض دفعك لدورة "${courseTitle}". يمكنك إعادة الاشتراك برفع إثبات دفع صحيح.`,
              link: '/',
            })
            const { sendPushNotification } = await import('@/lib/onesignal')
            await sendPushNotification(updated.user_id,
              '❌ تم رفض الدفع',
              rejection_reason
                ? `دورة "${courseTitle}". السبب: ${rejection_reason}.`
                : `دورة "${courseTitle}". يمكنك إعادة الاشتراك.`,
              { type: 'payment', link: '/' }
            )
          } catch {}
          await tgReject(updated.user_id, updated.course_id)
        }
      } catch {}
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
