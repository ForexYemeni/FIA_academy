import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * 💳 /api/trainer/withdrawal-accounts — حسابات سحب أرباح المدرب
 * GET: حساباتي (أو حسابات مدرب معين للإدارة عبر ?trainer_id=)
 * POST: إضافة حساب (الدولة + الطريقة + اسم صاحب الحساب + الرقم + بيانات إضافية)
 * DELETE ?id=: حذف حساب — المالك فقط أو الإدارة
 */
export async function GET(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  const requested = req.nextUrl.searchParams.get('trainer_id')
  const trainerId = user.role === 'admin' && requested ? requested : user.id
  try {
    const { data, error } = await supabaseAdmin
      .from('trainer_withdrawal_accounts')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر جلب الحسابات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  // الإدارة قد تضيف بالنيابة؛ غير ذلك كل حساب يخص صاحبه
  const body = await req.json().catch(() => ({}))
  const trainerId = user.role === 'admin' && body.trainer_id ? String(body.trainer_id) : user.id
  const country = String(body.country || '').trim()
  const method_name = String(body.method_name || '').trim()
  const account_name = String(body.account_name || '').trim()
  if (!country || !method_name || !account_name) {
    return NextResponse.json({ error: 'الدولة وطريقة السحب واسم صاحب الحساب مطلوبة' }, { status: 400 })
  }
  if (user.role !== 'admin') {
    // المدرب غير المعتمد لا يضيف حسابات — بعد الاعتماد فقط
    const { data: me } = await supabaseAdmin.from('trainers').select('status').eq('id', user.id).maybeSingle()
    if (me && me.status !== 'approved') {
      return NextResponse.json({ error: 'حسابات السحب تُفعَّل بعد اعتمادك وتوقيع الاتفاق' }, { status: 403 })
    }
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('trainer_withdrawal_accounts')
      .insert({
        trainer_id: trainerId,
        country,
        method_name,
        currency: String(body.currency || '').trim() || null,
        account_name,
        account_number: String(body.account_number || '').trim() || null,
        extra_info: String(body.extra_info || '').trim() || null,
        is_default: !!body.is_default,
      })
      .select().single()
    if (error) throw error
    // الافتراضي: أول حساب يصبح الافتراضي تلقائياً
    if (body.is_default) {
      await supabaseAdmin.from('trainer_withdrawal_accounts')
        .update({ is_default: false }).eq('trainer_id', trainerId).neq('id', data.id)
    }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر إضافة الحساب' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })
  try {
    let q = supabaseAdmin.from('trainer_withdrawal_accounts').delete().eq('id', id)
    if (user.role !== 'admin') q = q.eq('trainer_id', user.id)
    const { error } = await q
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر الحذف' }, { status: 500 })
  }
}
