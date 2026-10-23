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

  // 🤝 v6.9 — «إعادة التفاوض الملكي»: رد المدرب على عرض تعديل النسبة
  // بعد اغلاق الاتفاق الأصلي — يبقى معتمداً ونشِراً طوال التفاوض،
  // والنسبة القديمة باقية سارية حتى يوقّع على الجديدة.
  const reneg = agreement.renegotiation
  if (reneg && reneg.trainer_response === 'pending' && (trainer as any).status === 'approved') {
    const now2 = new Date().toISOString()
    const history2 = Array.isArray(agreement.history) ? agreement.history : []

    if (response === 'accepted') {
      const previousPercentage = Number((trainer as any).profit_percentage) || 0
      const newPercentage = Number(reneg.percentage) || 0
      reneg.responded_at = now2
      reneg.trainer_response = 'accepted'
      if (note) reneg.response_note = note
      history2.push({ at: now2, by: user.id, byName: trainer.name, action: 'renegotiation_accepted', previous_percentage: previousPercentage, percentage: newPercentage, note: note || null })
      const nextAgreement = {
        ...agreement,
        renegotiation: reneg,
        trainer_response: 'accepted',
        responded_at: now2,
        confirmed_at: now2,
        percentage: newPercentage,
        history: history2,
      }
      const { error } = await supabaseAdmin
        .from('trainers')
        .update({ agreement: nextAgreement, profit_percentage: newPercentage })
        .eq('id', trainerId)
      if (error) throw error
      try { await notifyTrainerCertified(user.id, trainer.name) } catch {}
      return NextResponse.json({
        success: true,
        message: `تم تحديث عقد شراكتك — أصبحت نسبتك ${newPercentage}% من كل دورة، مقفولة وموقَّعة من الطرفين`,
      })
    }

    // declined — تبقى النسبة القديمة سارية ويُسجل الرفض في أرشيف الاتفاق
    reneg.responded_at = now2
    reneg.trainer_response = 'declined'
    if (note) reneg.response_note = note
    history2.push({ at: now2, by: user.id, byName: trainer.name, action: 'renegotiation_declined', percentage: Number(reneg.percentage) || 0, note: note || null })
    const nextAgreement = { ...agreement, renegotiation: reneg, trainer_response: 'accepted', history: history2 }
    const { error } = await supabaseAdmin
      .from('trainers')
      .update({ agreement: nextAgreement })
      .eq('id', trainerId)
    if (error) throw error
    try { await tgTrainerAgreementDeclined(trainer.name, note || null) } catch {}
    return NextResponse.json({
      success: true,
      message: 'رفضت عرض التعديل — بقيت نسبتك السارية كما هي، وسيصل الإدارة ردُّك',
    })
  }

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
