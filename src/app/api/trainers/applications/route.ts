import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin } from '@/lib/api-auth'
import { notifyTrainerApplicationApproved, notifyTrainerApplicationRejected, notifyTrainerAgreementRevised, resolveTrainerUserId } from '@/lib/notifications'
import { tgTrainerApplicationApproved, tgTrainerApplicationRejected } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/**
 * 👑 GET /api/trainers/applications — طلبات المدربين للإدارة
 * يعيد: pending (بانتظار الموافقة) + agreement_pending (بانتظار توقيع المدرب)
 * + rejected حديثة + إحصاءات.
 */
export async function GET(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  try {
    const { data, error } = await supabaseAdmin
      .from('trainers')
      .select('id, name, email, phone, title, specialization, bio, avatar, country, years_experience, courses_count, qualifications, achievements, experiences, status, agreement, rejected_reason, created_via, created_at, reviewed_at, certified_at, profit_percentage')
      .in('status', ['pending', 'agreement_pending', 'rejected'])
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = data || []
    return NextResponse.json({
      applications: rows.filter((r: any) => r.status === 'pending'),
      awaiting_signature: rows.filter((r: any) => r.status === 'agreement_pending'),
      rejected: rows.filter((r: any) => r.status === 'rejected').slice(0, 30),
      stats: {
        pending: rows.filter((r: any) => r.status === 'pending').length,
        awaiting_signature: rows.filter((r: any) => r.status === 'agreement_pending').length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر جلب الطلبات' }, { status: 500 })
  }
}

/**
 * 👑 POST /api/trainers/applications — قرار الإدارة الملكي
 * body: { id, action: 'approve'|'reject'|'reoffer', percentage?, terms?, reason? }
 * - approve: منح موافقة مبدئية + عرض اتفاق (النسبة + الشروط) → agreement_pending
 * - reoffer: تعديل عرض قائم بنسبة/شروط جديدة (بعد رفض المدرب)
 * - reject:  رفض نهائي مع سبب
 */
export async function POST(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  const admin = g.user!
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  const action = String(body.action || '')
  if (!id || !['approve', 'reject', 'reoffer'].includes(action)) {
    return NextResponse.json({ error: 'طلب غير سليم' }, { status: 400 })
  }

  const { data: trainer } = await supabaseAdmin
    .from('trainers')
    .select('id, name, email, status, agreement, profit_percentage')
    .eq('id', id).maybeSingle()
  if (!trainer) return NextResponse.json({ error: 'المدرب غير موجود' }, { status: 404 })

  const now = new Date().toISOString()

  try {
    if (action === 'approve' || action === 'reoffer') {
      const percentage = Math.max(0, Math.min(90, Number(body.percentage) || 0))
      const terms = String(body.terms || '').trim()
      const prev: any = (trainer as any).agreement || {}
      const history = Array.isArray(prev.history) ? prev.history : []
      history.push({
        at: now, by: admin.id, byName: admin.name || 'الإدارة',
        action: action === 'approve' ? 'offered' : 'revised',
        percentage, terms: terms || null,
      })

      const agreement = {
        percentage, terms: terms || null,
        offered_at: action === 'approve' ? now : (prev.offered_at || now),
        offered_by: admin.id,
        trainer_response: 'pending',
        response_note: null, responded_at: null, confirmed_at: null,
        history,
      }
      const { error } = await supabaseAdmin
        .from('trainers')
        .update({ status: 'agreement_pending', agreement, profit_percentage: percentage, reviewed_at: now, rejected_reason: null })
        .eq('id', id)
      if (error) throw error

      // إشعار المدرب (جرس + FCM) + تلجرام
      const trainerUserId = await resolveTrainerUserId(id)
      if (trainerUserId) {
        if (action === 'approve') await notifyTrainerApplicationApproved(trainerUserId, percentage, terms || null)
        else await notifyTrainerAgreementRevised(trainerUserId, percentage)
      }
      if (action === 'approve') await tgTrainerApplicationApproved(trainer.name, percentage, admin.id)

      return NextResponse.json({
        success: true,
        message: action === 'approve'
          ? `وُقّعت الموافقة المبدئية — وصل الاتفاق الفاخر إلى ${trainer.name} بنسبة ${percentage}%`
          : `حُدّث العرض إلى ${percentage}% — أُرسل إشعار جديد إلى ${trainer.name}`,
      })
    }

    // reject
    const reason = String(body.reason || '').trim()
    if (reason.length < 5) return NextResponse.json({ error: 'اكتب سبب الرفض (5 أحرف على الأقل)' }, { status: 400 })
    const { error } = await supabaseAdmin
      .from('trainers')
      .update({ status: 'rejected', rejected_reason: reason, reviewed_at: now })
      .eq('id', id)
    if (error) throw error

    const trainerUserId = await resolveTrainerUserId(id)
    if (trainerUserId) await notifyTrainerApplicationRejected(trainerUserId, reason)
    await tgTrainerApplicationRejected(trainer.name, reason, admin.id)

    return NextResponse.json({ success: true, message: `رُفض طلب ${trainer.name} وأُرسل إشعار السبب` })
  } catch (e: any) {
    console.error('trainer application decision error:', e?.message)
    return NextResponse.json({ error: 'تعذر تنفيذ القرار — أعد المحاولة' }, { status: 500 })
  }
}
