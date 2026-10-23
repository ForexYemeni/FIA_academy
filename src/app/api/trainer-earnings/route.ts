import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  resolveTrainerProfileId,
  resolveTrainerUserId,
  notifyTrainerNewEarning,
  notifyWithdrawalApproved,
  notifyWithdrawalRejected,
} from '@/lib/notifications'
import { guardAdmin, guardAuth } from '@/lib/api-auth'

// ===========================================================================
// TRAINER EARNINGS ROYAL — محفظة أرباح المدربين متعددة العملات
// كل مدرب يربح بنسبته من كل دورة بالعملة التي بيعت بها الدورة (دولار،
// ريال يمني، سعودي…) — والسحب يتم بعملة الربح نفسها: ما ربح بالدولار
// يُسحب بالدولار، وما ربح بالريال يُسحب بالريال — دون خلط العملات أبداً.
//
// GET  ?trainer_id=ID  → trainer wallet view (totals per currency + earnings + withdrawals + courses)
// GET  ?admin=1        → admin overview (per-trainer per-currency summary + all withdrawals)
// POST {trainer_id, amount, currency} → trainer creates a withdrawal request IN THAT CURRENCY
// PUT  {id, status, screenshot_url, admin_note} → admin approves/rejects
// ===========================================================================

export type CurrencyTotals = { total_earned: number; available: number; withdrawn: number; pending_withdrawals: number }

function newTotals(): CurrencyTotals {
  return { total_earned: 0, available: 0, withdrawn: 0, pending_withdrawals: 0 }
}

/** إجماليات المحفظة مجمعة حسب العملة — كل عملة خزينة مستقلة تماماً
 *  💰 السحب الجزئي: available = Σ(amount − consumed_amount) للصفوف المتاحة —
 *  فلا يضيع أي باقٍ عند سحب مبلغ لا يطابق الصفوف حرفياً */
async function getTotalsByCurrency(trainerId: string): Promise<Record<string, CurrencyTotals>> {
  const [earn, wd] = await Promise.all([
    supabaseAdmin.from('trainer_earnings').select('amount, status, currency, consumed_amount').eq('trainer_id', trainerId),
    supabaseAdmin.from('withdrawal_requests').select('amount, currency').eq('trainer_id', trainerId).eq('status', 'قيد الانتظار'),
  ])
  const out: Record<string, CurrencyTotals> = {}
  const bucket = (cur?: string | null) => {
    const key = (cur || '').trim() || 'ر.ي'
    if (!out[key]) out[key] = newTotals()
    return out[key]
  }
  for (const r of (earn.data || []) as any[]) {
    // الأرباح الملغاة (عن دفعة أُلغيت) لا تُحتسب في الخزينة إطلاقاً
    if (r.status === 'ملغي') continue
    const b = bucket(r.currency)
    const amount = Number(r.amount) || 0
    const consumed = Number(r.consumed_amount || 0)
    b.total_earned += amount
    if (r.status === 'متاح') b.available += Math.max(0, amount - consumed)
    if (r.status === 'مسحوب') b.withdrawn += amount
  }
  for (const r of (wd.data || []) as any[]) {
    bucket(r.currency).pending_withdrawals += Number(r.amount) || 0
  }
  return out
}

/** العملة الأساسية (صاحبة أكبر رصيد مكتسب) — للعرض الافتراضي */
function primaryCurrency(totals: Record<string, CurrencyTotals>): string {
  let best = 'ر.ي'
  let bestVal = -1
  for (const [cur, t] of Object.entries(totals)) {
    if (t.total_earned > bestVal) { bestVal = t.total_earned; best = cur }
  }
  return best
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
    // ضمان وجود عملة على كل صف حتى للسجلات القديمة
    currency: r.currency || courseMap.get(r.course_id)?.currency || 'ر.ي',
  }))
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    // ---------- ADMIN OVERVIEW ----------
    if (sp.get('admin') === '1') {
      // 🛡️ نظرة الإدارة (كل المحافظ وأرقام الاستلام) للإدارة فقط!
      const ga = await guardAdmin(req)
      if (!ga.ok) return ga.res
      const [earn, wds, trainers, wAccs] = await Promise.all([
        supabaseAdmin.from('trainer_earnings').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('trainers').select('id, name, avatar, title, specialization, profit_percentage, payment_method_type, payment_method_name, payment_account'),
        supabaseAdmin.from('trainer_withdrawal_accounts').select('trainer_id, country, method_name, currency, account_name, account_number, is_default').order('is_default', { ascending: false }).order('created_at', { ascending: false }),
      ])
      const tMap = new Map<string, any>((trainers.data || []).map((t: any) => [t.id, t] as [string, any]))
      // حسابات السحب الحقيقية لكل مدرب — من قسم «حسابات السحب» الذي يديره بنفسه
      const accsByTrainer = new Map<string, any[]>()
      for (const a of (wAccs.data || []) as any[]) {
        if (!accsByTrainer.has(a.trainer_id)) accsByTrainer.set(a.trainer_id, [])
        accsByTrainer.get(a.trainer_id)!.push(a)
      }

      // Per-trainer summary — مجمعة حسب العملة + حقول مسطحة للعملة الأساسية
      const summary: any[] = []
      for (const t of (trainers.data || []) as any[]) {
        const rows = (earn.data || []).filter((e: any) => e.trainer_id === t.id)
        const pendingWds = (wds.data || []).filter((w: any) => w.trainer_id === t.id && w.status === 'قيد الانتظار')
        const byCur: Record<string, CurrencyTotals> = {}
        const bucket = (cur?: string | null) => {
          const key = (cur || '').trim() || 'ر.ي'
          if (!byCur[key]) byCur[key] = newTotals()
          return byCur[key]
        }
        for (const r of rows) {
          const b = bucket(r.currency)
          b.total_earned += Number(r.amount) || 0
          if (r.status === 'متاح') b.available += Number(r.amount) || 0
          if (r.status === 'مسحوب') b.withdrawn += Number(r.amount) || 0
        }
        for (const w of pendingWds) bucket(w.currency).pending_withdrawals += Number(w.amount) || 0
        const pCur = primaryCurrency(byCur)
        const pt = byCur[pCur] || newTotals()
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
          // حسابات السحب المضافة من المدرب (البديل الرسمي للحقول القديمة)
          withdrawal_accounts: accsByTrainer.get(t.id) || [],
          // حقول مسطحة (العملة الأساسية) — للتوافق
          currency: pCur,
          total_earned: pt.total_earned,
          available: pt.available,
          withdrawn: pt.withdrawn,
          pending_withdrawals: pt.pending_withdrawals,
          // الخزينة الكاملة لكل عملة
          totals_by_currency: byCur,
          students_paid: rows.length,
        })
      }
      // Sort: those with pending withdrawals or earnings first
      summary.sort((a, b) => (b.total_earned + b.pending_withdrawals * 1000) - (a.total_earned + a.pending_withdrawals * 1000))

      const enrichedWithdrawals = (wds.data || []).map((w: any) => ({
        ...w,
        currency: w.currency || 'ر.ي',
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
    // 🛡️ كل مدرب يرى محفظته هو فقط — الإدارة ترى أي محفظة
    const ga2 = await guardAuth(req)
    if (!ga2.ok) return ga2.res
    const trainerId = sp.get('trainer_id')
    if (!trainerId) return NextResponse.json({ error: 'trainer_id required' }, { status: 400 })
    if (ga2.user.role !== 'admin') {
      const selfProfile = (await resolveTrainerProfileId(ga2.user.id)) || ga2.user.id
      if (selfProfile !== trainerId && ga2.user.id !== trainerId) {
        return NextResponse.json({ error: 'غير مصرح — يمكنك عرض محفظتك فقط' }, { status: 403 })
      }
    }

    const profileId = (await resolveTrainerProfileId(trainerId)) || trainerId
    const profileRes: any = await supabaseAdmin.from('trainers').select('id, name, profit_percentage, payment_method_type, payment_method_name, payment_account, agreement, status').eq('id', profileId).maybeSingle()
    const [earn, wds, totalsByCurrency] = await Promise.all([
      supabaseAdmin.from('trainer_earnings').select('*').eq('trainer_id', profileId).order('created_at', { ascending: false }),
      supabaseAdmin.from('withdrawal_requests').select('*').eq('trainer_id', profileId).order('created_at', { ascending: false }),
      getTotalsByCurrency(profileId),
    ])
    const pCur = primaryCurrency(totalsByCurrency)

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
        // 👑 v6.9 — حالة العقد الملكي + أي عرض إعادة تفاوض معروض على المدرب
        agreement: (profileRes as any)?.agreement || null,
        status: (profileRes as any)?.status || null,
        payment_method_type: profileRes?.payment_method_type || 'محلي',
        payment_method_name: profileRes?.payment_method_name || null,
        payment_account: profileRes?.payment_account || null,
      },
      totals: totalsByCurrency[pCur] || newTotals(),
      primary_currency: pCur,
      totals_by_currency: totalsByCurrency,
      earnings: await enrichEarnings(earn.data || []),
      withdrawals: (wds.data || []).map((w: any) => ({ ...w, currency: w.currency || 'ر.ي' })),
      courses,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — المدرب ينشئ طلب سحب بعملة محددة — لحسابه هو فقط
export async function POST(req: NextRequest) {
  try {
    // 🛡️ الهوية من التوقيع — لا يمكن لطالب أن يسحب أرباح مدرب!
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const body = await req.json()
    const trainerId = g.user.id
    const amount = parseInt(body.amount) || 0
    const currency = (body.currency || '').trim() || 'ر.ي'
    if (amount <= 0) return NextResponse.json({ error: 'أدخل مبلغاً صحيحاً للسحب' }, { status: 400 })

    const profileId = (await resolveTrainerProfileId(trainerId)) || trainerId
    const { data: profile } = await supabaseAdmin
      .from('trainers').select('name, profit_percentage').eq('id', profileId).maybeSingle()

    // 💳 بوابة حسابات السحب: طريقة الاستلام تُؤخذ حصراً من «حسابات السحب» التي
    // أضافها المدرب بنفسه (نفس القسم الذي تديره) — بلا حساب مضاف لا سحب إطلاقاً.
    // نبحث بمعرّفي المدرب (حساب المستخدم + ملف المدرب) تغطيةً لكل حالات الهوية.
    const { data: wAccounts } = await supabaseAdmin
      .from('trainer_withdrawal_accounts')
      .select('*')
      .in('trainer_id', Array.from(new Set([profileId, trainerId])))
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    if (!wAccounts || wAccounts.length === 0) {
      return NextResponse.json({
        error: 'لا يوجد حساب سحب مضاف — أضف حسابك أولاً من قسم «حسابات السحب» ثم اطلب السحب',
        code: 'no_withdrawal_account',
      }, { status: 400 })
    }
    const acc = body.account_id
      ? wAccounts.find((a: any) => a.id === body.account_id)
      : wAccounts[0]
    if (!acc) {
      return NextResponse.json({ error: 'حساب السحب المحدد غير موجود — اختر حساباً من حساباتك المضافة' }, { status: 400 })
    }
    // استنتاج نوع الطريقة من اسمها/عملتها (محلي vs عملات رقمية) — لأيقونة العرض
    const isCrypto = /(usdt|bitcoin|btc|ethereum|\beth\b|binance|tron|tether|عملات\s*رقمية)/i.test(`${acc.method_name || ''} ${acc.currency || ''}`)

    // ⚡ MULTI-CURRENCY GATE: الرصيد يُفحص بعملة الطلب نفسها — ما ربح بالدولار يُسحب بالدولار فقط
    const byCur = await getTotalsByCurrency(profileId)
    const t = byCur[currency]
    const availableForWithdraw = (t?.available || 0) - (t?.pending_withdrawals || 0)
    if (amount > availableForWithdraw) {
      const others = Object.entries(byCur)
        .filter(([cur, v]) => cur !== currency && (v.available - v.pending_withdrawals) > 0)
        .map(([cur, v]) => `${((v.available - v.pending_withdrawals)).toLocaleString('en-US')} ${cur}`)
      return NextResponse.json({
        error: `رصيدك المتاح بعملة ${currency} هو ${availableForWithdraw.toLocaleString('en-US')}${others.length ? ` — ولديك أيضاً: ${others.join(' • ')}` : ''}`,
      }, { status: 400 })
    }

    // Guard: no duplicate pending request with the same amount + currency
    const { data: dup } = await supabaseAdmin
      .from('withdrawal_requests').select('id').eq('trainer_id', profileId).eq('status', 'قيد الانتظار').eq('amount', amount).eq('currency', currency).limit(1)
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: 'لديك طلب سحب مماثل قيد المراجعة بالفعل' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('withdrawal_requests')
      .insert({
        trainer_id: profileId,
        amount,
        currency,
        method_type: isCrypto ? 'عملات رقمية' : 'محلي',
        method_name: acc.method_name,
        account: acc.account_number || acc.account_name,
        account_owner: acc.account_name,
        account_country: acc.country,
      })
      .select()
      .single()
    if (error) {
      // 🛡️ فهرس فريد جزئي: طلب معلق واحد لكل مدرب بكل عملة — يمنع سباق الإنشاء
      if ((error as any).code === '23505' || /duplicate key|unique/i.test(error.message || '')) {
        return NextResponse.json({ error: 'لديك طلب سحب قيد المراجعة بالفعل بهذه العملة — انتظر معالجته' }, { status: 409 })
      }
      throw error
    }

    // Notify admins (non-fatal)
    const trainerName = profile?.name || 'مدرب'
    try {
      const { notifyAdmins } = await import('@/lib/notifications')
      await notifyAdmins('withdrawal',
        `💸 طلب سحب أرباح جديد — ${trainerName}`,
        `طلب المدرب ${trainerName} سحب ${amount.toLocaleString('en-US')} ${currency} إلى ${data.method_name || 'حساب السحب المضاف'}. راجع القسم «أرباح المدربين».`, '/#trainer-earnings')
    } catch {}

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT — الإدارة فقط توافق / ترفض طلب سحب — بمطالبة ذرّية ضد سباق الموافقة
export async function PUT(req: NextRequest) {
  try {
    // 🛡️ كانت الموافقة على السحب متاحة لأي زائر — مع أرقام محافظ الجميع!
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
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

    // ⚡ المطالبة الذرّية: من يغيّر الحالة من «قيد الانتظار» أولاً يفوز —
    // الضغطة الثانية تعود فارغة فلا يُستهلك الصفوف مرتين أبداً
    const claim = await supabaseAdmin
      .from('withdrawal_requests')
      .update({ status, screenshot_url: screenshot_url || null, admin_note: admin_note || null, processed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'قيد الانتظار')
      .select()
      .single()
    if (claim.error || !claim.data) {
      return NextResponse.json({ error: 'تمت معالجة هذا الطلب مسبقاً' }, { status: 409 })
    }
    const updated = claim.data

    if (status === 'مكتمل') {
      // ⚡ FIFO جزئي عادل بعملة الطلب نفسها: نستهلك الصفوف الأقدم أولاً —
      // الصف يُمسح كاملاً فقط إذا استُهلك بالكامل، وإلا يبقى متاحاً بباقيه
      const { data: avail } = await supabaseAdmin
        .from('trainer_earnings').select('id, amount, consumed_amount')
        .eq('trainer_id', request.trainer_id)
        .eq('status', 'متاح')
        .eq('currency', request.currency || 'ر.ي')
        .order('created_at', { ascending: true })
      let remaining = request.amount || 0
      const fullConsumed: string[] = []
      for (const row of avail || []) {
        if (remaining <= 0) break
        const rowAmount = Number(row.amount) || 0
        const rowConsumed = Number(row.consumed_amount || 0)
        const rowFree = Math.max(0, rowAmount - rowConsumed)
        if (rowFree <= 0) continue
        const take = Math.min(rowFree, remaining)
        const newConsumed = rowConsumed + take
        remaining -= take
        if (newConsumed >= rowAmount) {
          fullConsumed.push(row.id)
          await supabaseAdmin.from('trainer_earnings')
            .update({ status: 'مسحوب', consumed_amount: rowAmount }).eq('id', row.id)
        } else {
          await supabaseAdmin.from('trainer_earnings')
            .update({ consumed_amount: newConsumed }).eq('id', row.id)
        }
      }
      if (fullConsumed.length) {
        await supabaseAdmin.from('trainer_earnings').update({ status: 'مسحوب' }).in('id', fullConsumed).neq('status', 'مسحوب')
      }
    }

    // Notify the trainer (non-fatal)
    try {
      const trainerUserId = (await resolveTrainerUserId(request.trainer_id)) || request.trainer_id
      if (status === 'مكتمل') await notifyWithdrawalApproved(trainerUserId, request.amount, request.currency || 'ر.ي', !!screenshot_url)
      else await notifyWithdrawalRejected(trainerUserId, request.amount, request.currency || 'ر.ي', admin_note)
    } catch {}

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
