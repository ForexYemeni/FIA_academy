import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { webhookKey } from '../create-intent/route'

// POST /api/payments/webhook?payment_id=...&key=...
// 🛡️ محمي بتوقيع ملكي (HMAC) — أي نداء بلا توقيع صحيح يُرفض فوراً.
// كان سابقاً مفتوحاً: أي شخص يضع payment_id الخاص به فيصبح مسجلاً مجاناً!
export async function POST(req: NextRequest) {
  try {
    const paymentId = req.nextUrl.searchParams.get('payment_id') || (await req.json().catch(() => ({}))).payment_id
    const key = req.nextUrl.searchParams.get('key') || ''

    if (!paymentId) return NextResponse.json({ error: 'payment_id required' }, { status: 400 })

    // 🛡️ التحقق من التوقيع الملكي
    const expected = await webhookKey(String(paymentId))
    if (!key || key !== expected) {
      return NextResponse.json({ error: 'توقيع غير صالح' }, { status: 403 })
    }

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()
    if (!payment) return NextResponse.json({ error: 'payment not found' }, { status: 404 })

    if (payment.status === 'مكتمل') {
      // Already marked complete — idempotent
      return NextResponse.json({ success: true, already: true })
    }

    // Update payment status
    await supabaseAdmin.from('payments').update({
      status: 'مكتمل',
      date: new Date().toISOString(),
    }).eq('id', paymentId)

    // Create enrollment record
    try {
      await supabaseAdmin.from('enrollments').upsert({
        user_id: payment.user_id,
        course_id: payment.course_id,
        enrolled_at: new Date().toISOString(),
        status: 'نشط',
      }, { onConflict: 'user_id,course_id' })
    } catch {}

    // Notify user
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: payment.user_id,
        type: 'payment',
        title: 'تم تأكيد دفعتك',
        body: `تم تأكيد دفع ${payment.amount} ${payment.currency} بنجاح. تم تسجيلك في الدورة.`,
        link: '/?tab=courses',
      })
    } catch {}

    // Notify admin team
    try {
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin')
      for (const a of admins || []) {
        await supabaseAdmin.from('notifications').insert({
          user_id: a.id, type: 'payment',
          title: 'دفعة جديدة مؤكدة',
          body: `دفعة من ${payment.amount} ${payment.currency} للدورة ${payment.course_id}`,
          link: '/?tab=payments',
        })
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — فقط إعادة توجيه أنيقة بعد العودة من بوابة الدفع (بدون أي اعتماد للدفع)
// تأكيد الدفع يتم عبر نداء البوابة الموقّع (POST) أو موافقة الإدارة اليدوية.
export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('payment_id')
  if (!paymentId) return NextResponse.redirect(new URL('/', req.url))
  return NextResponse.redirect(new URL('/?payment=pending', req.url))
}
