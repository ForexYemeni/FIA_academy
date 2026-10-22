import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  resolveTrainerProfileId,
  resolveTrainerUserId,
  notifyTrainerNewEarning,
  notifyWithdrawalApproved,
  notifyWithdrawalRejected,
} from '@/lib/notifications'

// ===========================================================================
// TRAINER EARNINGS ROYAL — نسبة أرباح كل مدرب تُضاف تلقائياً إلى محفظته
// بعد تأكيد الدفع من حساب الإدارة، مع طلبات سحب يوافق عليها المشرف.
//
// GET  ?trainer_id=ID  → trainer wallet view (totals + earnings + withdrawals + courses)
// GET  ?admin=1        → admin overview (per-trainer summary + all withdrawals)
// POST {trainer_id, amount}          → trainer creates a withdrawal request
// PUT  {id, status, screenshot_url, admin_note} → admin approves/rejects
// ===========================================================================

type Totals = { total_earned: number; available: number; withdrawn: number; pending_withdrawals: number }

async function getTotals(trainerId: string): Promise<Totals> {
  const [earn, wd] = await Promise.all([
    supabaseAdmin.from('trainer_earnings').select('amount, status').eq('trainer_id', trainerId),
    supabaseAdmin.from('withdrawal_requests').select('amount').eq('trainer_id', trainerId).eq('status', 'قيد الانتظار'),
  ])
  const rows = earn.data || []
  const pending = (wd.data || []).reduce((a: number, r: any) => a + (r.amount || 0), 0)
  const total_earned = rows.reduce((a: number, r: any) => a + (r.amount || 0), 0)
  const available = rows.filter((r: any) => r.status === 'متاح').reduce((a: number, r: any) => a + (r.amount || 0), 0)
  const withdrawn = rows.filter((r: any) => r.status === 'مسحوب').reduce((a: number, r: any) => a + (r.amount || 0), 0)
  return { total_earned, available, withdrawn, pending_withdrawals: pending }
}

async function enrichEarnings(rows: any[]) {
  if (rows.length === 0) return rows
  const courseIds = Array.from(new Set(rows.map((r) => r.course_id).filter(Boolean)))
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id).filter(Boolean)))
  const [courses, students] = await Promise.all([
    courseIds.length ? supabaseAdmin.from('courses').select('id, title, currency').in('id', courseIds) : Promise.resolve({ data: [] } as any),
    studentIds.length ? supabaseAdmin.from('users').select('id, name, avatar').in('id', studentIds) : Promise.resolve({ data: [] } as any),
  ])
  const courseMap = new Map<string, any>((courses.data || []).map((c: any) => [c.id, c]))
  const userMap = new Map<string, any>((students.data || []).map((u: any) => [u.id, u]))
  return rows.map((r) => ({
    ...r,
    course_title: courseMap.get(r.course_id)?.title || null,
    student_name: userMap.get(r.student_id)?.name || null,
    student_avatar: userMap.get(r.student_id)?.avatar || null,
  }))
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    // ---------- ADMIN OVERVIEW ----------
    if (sp.get('admin') === '1') {
      const [earn, wds, trainers] = await Promise.all([
        supabaseAdmin.from('trainer_earnings').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('trainers').select('id, name, avatar, title, specialization, profit_percentage, payment_method_type, payment_method_name, payment_account'),
      ])
      const tMap = new Map((trainers.data || []).map((t: any) => [t.id, t]))

      // Per-trainer summary
      const summary: any[] = []
      for (const t of (trainers.data || []) as any[]) {
        const rows = (earn.data || []).filter((e: any) => e.trainer_id === t.id)
        const pending = (wds.data || []).filter((w: any) => w.trainer_id === t.id && w.status === 'قيد الانتظار')
        summary.push({
          trainer_id: t.id,
          name: t.name,
          avatar: t.avatar,
          title: t.title,
          specialization: t.specialization,
          profit_percentage: Number(t.profit_percentage || 0),
          payment_method_type: t.payment_method_type || 'محلي',
          payment_method_name: t.payment_method_name,
          payment_account: t.payment_account,
          total_earned: rows.reduce((a: number, r: any) => a + (r.amount || 0), 0),
          available: rows.filter((r: any) => r.status === 'متاح').reduce((a: number, r: any) => a + (r.amount || 0), 0),
          withdrawn: rows.filter((r: any) => r.status === 'مسحوب').reduce((a: number, r: any) => a + (r.amount || 0), 0),
          pending_withdrawals: pending.reduce((a: number, r: any) => a + (r.amount || 0), 0),
          students_paid: rows.length,
        })
      }
      // Sort: those with pending withdrawals or earnings first
      summary.sort((a, b) => (b.total_earned + b.pending_withdrawals * 1000) - (a.total_earned + a.pending_withdrawals * 1000))

      const enrichedWithdrawals = (wds.data || []).map((w: any) => ({
        ...w,
        trainer_name: tMap.get(w.trainer_id)?.name || 'مدرب',
        trainer_avatar: tMap.get(w.trainer_id)?.avatar || null,
      }))

      return NextResponse.json({
        per_trainer: summary,
        withdrawals: enrichedWithdrawals,
        earnings: await enrichEarnings(earn.data || []),
      })
    }

    // ---------- TRAINER WALLET VIEW ----------
    const trainerId = sp.get('trainer_id')
    if (!trainerId) return NextResponse.json({ error: 'trainer_id required' }, { status: 400 })

    const profileId = (await resolveTrainerProfileId(trainerId)) || trainerId
    const profileRes: any = await supabaseAdmin.from('trainers').select('id, name, profit_percentage, payment_method_type, payment_method_name, payment_account').eq('id', profileId).maybeSingle()
    const [earn, wds, totals] = await Promise.all([
      supabaseAdmin.from('trainer_earnings').select('*').eq('trainer_id', profileId).order('created_at', { ascending: false }),
      supabaseAdmin.from('withdrawal_requests').select('*').eq('trainer_id', profileId).order('created_at', { ascending: false }),
      getTotals(profileId),
    ])

    // Courses owned by this trainer (profile id OR user account id) — share per student
    const { data: courseRows } = await supabaseAdmin
      .from('courses').select('id, title, price, currency, price_type, enrolled')
      .or(`trainer_id.eq.${profileId},trainer_id.eq.${trainerId}`)
      .order('created_at', { ascending: false })
    const percentage = Number(profileRes?.profit_percentage || 0)
    const courses = (courseRows || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      price: c.price || 0,
      currency: c.currency || 'ر.ي',
      price_type: c.price_type,
      enrolled: c.enrolled || 0,
      percentage,
      my_share_per_student: Math.round((c.price || 0) * percentage / 100),
    }))

    return NextResponse.json({
      profile: {
        id: profileRes?.id || profileId,
        name: profileRes?.name || null,
        percentage,
        payment_method_type: profileRes?.payment_method_type || 'محلي',
        payment_method_name: profileRes?.payment_method_name || null,
        payment_account: profileRes?.payment_account || null,
      },
      totals,
      earnings: await enrichEarnings(earn.data || []),
      withdrawals: wds.data || [],
      courses,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — trainer creates a withdrawal request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const trainerId = body.trainer_id
    const amount = parseInt(body.amount) || 0
    if (!trainerId) return NextResponse.json({ error: 'trainer_id required' }, { status: 400 })
    if (amount <= 0) return NextResponse.json({ error: 'أدخل مبلغاً صحيحاً للسحب' }, { status: 400 })

    const profileId = (await resolveTrainerProfileId(trainerId)) || trainerId
    const { data: profile } = await supabaseAdmin
      .from('trainers').select('name, payment_method_type, payment_method_name, payment_account, profit_percentage').eq('id', profileId).maybeSingle()

    if (!profile?.payment_method_name || !profile?.payment_account) {
      return NextResponse.json({ error: 'أضف طريقة استلام الأرباح أولاً من بطاقة «طريقة استلام الأرباح»' }, { status: 400 })
    }

    const totals = await getTotals(profileId)
    const availableForWithdraw = totals.available - totals.pending_withdrawals
    if (amount > availableForWithdraw) {
      return NextResponse.json({ error: `المبلغ يتجاوز رصيدك المتاح (${availableForWithdraw.toLocaleString('en-US')})` }, { status: 400 })
    }

    // Guard: no duplicate pending request with the same amount
    const { data: dup } = await supabaseAdmin
      .from('withdrawal_requests').select('id').eq('trainer_id', profileId).eq('status', 'قيد الانتظار').eq('amount', amount).limit(1)
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: 'لديك طلب سحب مماثل قيد المراجعة بالفعل' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('withdrawal_requests')
      .insert({
        trainer_id: profileId,
        amount,
        currency: body.currency || 'ر.ي',
        method_type: body.method_type || profile.payment_method_type || 'محلي',
        method_name: body.method_name || profile.payment_method_name,
        account: body.account || profile.payment_account,
      })
      .select()
      .single()
    if (error) throw error

    // Notify admins (non-fatal)
    try {
      const { notifyAdmins } = await import('@/lib/notifications')
      await notifyAdmins('withdrawal',
        `💸 طلب سحب أرباح جديد — ${profile.name}`,
        `طلب المدرب ${profile.name} سحب ${amount.toLocaleString('en-US')} ${data.currency} إلى ${data.method_name || 'طريقة الدفع المسجلة'}. راجع القسم «أرباح المدربين».`, '/#trainer-earnings')
    } catch {}

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT — admin approves / rejects a withdrawal request
export async function PUT(req: NextRequest) {
  try {
    const { id, status, screenshot_url, admin_note } = await req.json()
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    if (!['مكتمل', 'ملغي'].includes(status)) {
      return NextResponse.json({ error: 'الحالة يجب أن تكون مكتمل أو ملغي' }, { status: 400 })
    }
    // Approval REQUIRES the transfer screenshot proof
    if (status === 'مكتمل' && !screenshot_url) {
      return NextResponse.json({ error: 'ارفع لقطة شاشة لإثبات تحويل الأرباح قبل الموافقة' }, { status: 400 })
    }

    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('withdrawal_requests').select('*').eq('id', id).maybeSingle()
    if (fetchErr) throw fetchErr
    if (!request) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if (request.status !== 'قيد الانتظار') {
      return NextResponse.json({ error: 'تمت معالجة هذا الطلب مسبقاً' }, { status: 400 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('withdrawal_requests')
      .update({ status, screenshot_url: screenshot_url || null, admin_note: admin_note || null, processed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    if (status === 'مكتمل') {
      // FIFO: mark the OLDEST 'متاح' earnings rows as 'مسحوب' until the amount is covered
      const { data: avail } = await supabaseAdmin
        .from('trainer_earnings').select('id, amount').eq('trainer_id', request.trainer_id).eq('status', 'متاح').order('created_at', { ascending: true })
      let remaining = request.amount || 0
      const consumed: string[] = []
      for (const row of avail || []) {
        if (remaining <= 0) break
        consumed.push(row.id)
        remaining -= row.amount || 0
      }
      if (consumed.length) {
        await supabaseAdmin.from('trainer_earnings').update({ status: 'مسحوب' }).in('id', consumed)
      }
    }

    // Notify the trainer (non-fatal)
    try {
      const trainerUserId = (await resolveTrainerUserId(request.trainer_id)) || request.trainer_id
      if (status === 'مكتمل') await notifyWithdrawalApproved(trainerUserId, request.amount, request.currency, !!screenshot_url)
      else await notifyWithdrawalRejected(trainerUserId, request.amount, request.currency, admin_note)
    } catch {}

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
