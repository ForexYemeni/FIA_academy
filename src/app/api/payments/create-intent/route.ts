import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth, getJwtSecret } from '@/lib/api-auth'

/** توقيع الويبهوك الملكي — HMAC للدفع بالسر الملكي، لا يُقبض أي وبهوك بلا توقيع */
export async function webhookKey(paymentId: string): Promise<string> {
  const secret = await getJwtSecret()
  return crypto.createHmac('sha256', secret).update(`fia-webhook:${paymentId}`).digest('hex').substring(0, 32)
}

// POST /api/payments/create-intent
// Body: { course_id, user_id, coupon_code?, affiliate_code? }
// Returns: { intent_id, amount, currency, status: 'free' | 'pending' | 'manual', redirect_url }
export async function POST(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const body = await req.json()
    const course_id = body.course_id
    const user_id = g.user.id // 🛡️ الهوية من التوقيع — لا يُقبل user_id من الجسم
    const coupon_code = body.coupon_code
    const affiliate_code = body.affiliate_code
    if (!course_id) {
      return NextResponse.json({ error: 'course_id مطلوب' }, { status: 400 })
    }

    // Fetch the course to get the price — من الخادم حصراً (لا يُقبل سعر من العميل)
    // 👑 إصلاح ملكي v5.5: كان SELECT يطلب عمود «offer_ends_at» غير الموجود في
    //    الجدول فكان يُفشل العثور على الدورة أصلاً — select('*') لا ينكسر أبداً.
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .maybeSingle()
    if (!course) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })

    let finalAmount = course.price || 0
    // سعر العرض الرسمي — إن كان ساري المدة (مطابق للوحة الطالب والمتجر)
    if (course.offer_price != null && Number(course.offer_price) < finalAmount) {
      if (course.offer_type === 'limited_time') {
        const dur = Number(course.offer_duration_value) || 0
        const start = course.updated_at ? new Date(course.updated_at).getTime() : 0
        const unitMs = course.offer_duration_unit === 'hours' ? 3600000 :
          course.offer_duration_unit === 'weeks' ? 604800000 :
          course.offer_duration_unit === 'months' ? 2592000000 : 86400000
        if (dur > 0 && start > 0 && start + dur * unitMs > Date.now()) {
          finalAmount = Number(course.offer_price)
        }
      } else {
        finalAmount = Number(course.offer_price)
      }
    }
    let discount = 0

    // Apply coupon if provided
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('status', 'نشط')
        .maybeSingle()
      if (coupon) {
        if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
          return NextResponse.json({ error: 'انتهت صلاحية الكوبون' }, { status: 400 })
        }
        if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
          return NextResponse.json({ error: 'تم استخدام الكوبون للحد الأقصى' }, { status: 400 })
        }
        if (coupon.course_id && coupon.course_id !== course_id) {
          return NextResponse.json({ error: 'الكوبون غير صالح لهذه الدورة' }, { status: 400 })
        }
        if (coupon.discount_type === 'percentage') {
          discount = (finalAmount * (coupon.discount_value || 0)) / 100
        } else {
          discount = coupon.discount_value || 0
        }
        finalAmount = Math.max(0, finalAmount - discount)
        // Increment used_count on the coupon
        try {
          await supabaseAdmin.from('coupons').update({
            used_count: (coupon.used_count || 0) + 1,
          }).eq('id', coupon.id)
        } catch {}
      }
    }

    // Free course or full discount → mark as paid immediately
    if (course.price_type === 'مجانية' || finalAmount === 0) {
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .insert({
          user_id, course_id, amount: 0,
          currency: course.currency || 'ر.ي',
          method: 'مجاني', status: 'مكتمل',
          reference: 'FREE-' + Date.now(),
        })
        .select().single().catch(() => ({ data: null }))

      try {
        await supabaseAdmin.from('enrollments').upsert({
          user_id, course_id,
          enrolled_at: new Date().toISOString(),
          status: 'نشط',
        }, { onConflict: 'user_id,course_id' })
      } catch {}

      if (affiliate_code) {
        try { await recordAffiliateReferral(affiliate_code, user_id, course_id, payment?.id || null, 0, 0) } catch {}
      }
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id, type: 'enrollment',
          title: 'تم تسجيلك في الدورة بنجاح',
          body: `أنت الآن مسجّل في دورة "${course.title}". ابدأ التعلم الآن!`,
          link: '/?tab=courses',
        })
      } catch {}

      return NextResponse.json({
        intent_id: payment?.id || null,
        amount: 0,
        currency: course.currency || 'ر.ي',
        status: 'free',
        redirect_url: '/?payment=success',
      })
    }

    // Paid course — create a pending payment + return payment URL
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id, course_id, amount: finalAmount,
        currency: course.currency || 'ر.ي',
        method: 'manual', status: 'قيد الانتظار',
        reference: 'PEND-' + Date.now(),
      })
      .select().single().catch(() => ({ data: null }))

    const gateway = (process.env.PAYMENT_GATEWAY || '').toLowerCase()
    let paymentUrl: string | null = null

    if (gateway === 'moyasar' && process.env.MOYASAR_SECRET_KEY) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'https://fiaacademy.vercel.app'
      const callback = `${base}/api/payments/webhook?payment_id=${payment?.id}&key=${await webhookKey(String(payment?.id || ''))}`
      // Use Moyasar's REST API — server-side Basic auth with secret key.
      const auth = Buffer.from(`${process.env.MOYASAR_SECRET_KEY}:`).toString('base64')
      const res = await fetch('https://api.moyasar.com/v1/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(finalAmount * 100),
          currency: course.currency === 'USD' ? 'USD' : 'SAR',
          description: `دورة: ${course.title}`,
          callback_url: callback,
          metadata: { payment_id: payment?.id, course_id, user_id },
        }),
      })
      const data = await res.json().catch(() => ({}))
      paymentUrl = data?.url || null
    } else if (gateway === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'https://fiaacademy.vercel.app'
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': (course.currency || 'USD').toLowerCase(),
          'line_items[0][price_data][unit_amount]': String(Math.round(finalAmount * 100)),
          'line_items[0][price_data][product_data][name]': course.title,
          'success_url': `${base}/api/payments/webhook?payment_id=${payment?.id}&status=success&key=${await webhookKey(String(payment?.id || ''))}`,
          'cancel_url': `${base}/checkout/${course_id}?canceled=1`,
          'metadata[payment_id]': payment?.id || '',
          'metadata[user_id]': user_id,
          'metadata[course_id]': course_id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      paymentUrl = data?.url || null
    }

    return NextResponse.json({
      intent_id: payment?.id,
      amount: finalAmount,
      currency: course.currency || 'ر.ي',
      original_amount: course.price,
      discount,
      status: paymentUrl ? 'pending' : 'manual',
      redirect_url: paymentUrl || `/?payment=pending`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function recordAffiliateReferral(
  affiliateCode: string,
  studentId: string,
  courseId: string,
  paymentId: string | null,
  amount: number,
  commission: number,
) {
  const { data: affiliate } = await supabaseAdmin
    .from('affiliates')
    .select('id, commission_percent')
    .eq('unique_code', affiliateCode)
    .eq('status', 'نشط')
    .maybeSingle()
  if (!affiliate) return

  await supabaseAdmin.from('affiliate_referrals').insert({
    affiliate_id: affiliate.id,
    student_id: studentId, course_id: courseId, payment_id: paymentId,
    amount, commission,
    status: commission > 0 ? 'معلق' : 'مكتمل',
  }).then(() => null).catch(() => null)

  const { data: current } = await supabaseAdmin
    .from('affiliates')
    .select('total_referrals, total_earnings')
    .eq('id', affiliate.id)
    .maybeSingle()
  if (current) {
    await supabaseAdmin.from('affiliates').update({
      total_referrals: (current.total_referrals || 0) + 1,
      total_earnings: (current.total_earnings || 0) + commission,
    }).eq('id', affiliate.id)
  }
}
