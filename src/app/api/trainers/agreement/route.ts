import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'
import { notifyTrainerCertified, notifyTrainerAgreementDeclined } from '@/lib/notifications'
import { tgTrainerCertified, tgTrainerAgreementDeclined } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/**
 * 🤝 POST /api/trainers/agreement — توقيع المدرب على اتفاق النسبة الملكي
 * body: { trainer_id, response: 'accepted'|'declined', note? }
 * - accepted: يُعتمد المدرب نهائياً (status='approved' + certified_at) ويظهر في «مدربونا»
 * - declined: يعود العرض للإدارة مع ملاحظة المدرب لإعادة التفاوض
 */
export async function POST(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  const body = await req.json().catch(() => ({}))
  const trainerId = String(body.trainer_id || '')
  const response = String(body.response || '')
  const note = String(body.note || '').trim()
  if (!trainerId || !['accepted', 'declined'].includes(response)) {
    return NextResponse.json({ error: 'طلب غير سليم' }, { status: 400 })
  }
  // المدرب يوقّع اتفاقه هو فقط
  if (user.id !== trainerId) {
    return NextResponse.json({ error: 'لا تملك صلاحية التوقيع على هذا الاتفاق' }, { status: 403 })
  }

  const { data: trainer } = await supabaseAdmin
    .from('trainers')
    .select('id, name, status, agreement, profit_percentage')
    .eq('id', trainerId).maybeSingle()
  if (!trainer) return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 })

  const agreement: any = (trainer as any).agreement || {}
  if ((trainer as any).status !== 'agreement_pending' || !agreement.offered_at) {
    return NextResponse.json({ error: 'لا يوجد اتفاق معروض لك حالياً' }, { status: 409 })
  }
  if (agreement.trainer_response && agreement.trainer_response !== 'pending') {
    return NextResponse.json({ error: 'تم التعامل مع هذا العرض مسبقاً — بانتظار رد الإدارة' }, { status: 409 })
  }

  const now = new Date().toISOString()

  try {
    if (response === 'accepted') {
      agreement.trainer_response = 'accepted'
      agreement.responded_at = now
      agreement.confirmed_at = now
      if (note) agreement.response_note = note
      const history = Array.isArray(agreement.history) ? agreement.history : []
      history.push({ at: now, by: user.id, byName: trainer.name, action: 'accepted', percentage: agreement.percentage })
      agreement.history = history

      const { error } = await supabaseAdmin
        .from('trainers')
        .update({ status: 'approved', agreement, certified_at: now })
        .eq('id', trainerId)
      if (error) throw error

      // اعتماد ملكي: إشعار + تلجرام
      try { await notifyTrainerCertified(user.id, trainer.name) } catch {}
      try { await tgTrainerCertified(trainer.name, agreement.percentage || 0) } catch {}

      return NextResponse.json({
        success: true,
        message: `تم اعتمادك رسمياً يا ${trainer.name} — أهلاً بك في نخبة مدربي الأكاديمية`,
      })
    }

    // declined — يعود للإدارة مع الملاحظة
    agreement.trainer_response = 'declined'
    agreement.responded_at = now
    if (note) agreement.response_note = note
    const history = Array.isArray(agreement.history) ? agreement.history : []
    history.push({ at: now, by: user.id, byName: trainer.name, action: 'declined', note: note || null })
    agreement.history = history

    const { error } = await supabaseAdmin
      .from('trainers')
      .update({ agreement })
      .eq('id', trainerId)
    if (error) throw error

    try { await notifyTrainerAgreementDeclined(trainer.name, note || null) } catch {}
    try { await tgTrainerAgreementDeclined(trainer.name, note || null) } catch {}

    return NextResponse.json({
      success: true,
      message: 'أُرسلت ملاحظتك إلى الإدارة — سيراجعون العرض ويعودون إليك بعرض جديد',
    })
  } catch (e: any) {
    console.error('trainer agreement error:', e?.message)
    return NextResponse.json({ error: 'تعذر تنفيذ التوقيع — أعد المحاولة' }, { status: 500 })
  }
}
