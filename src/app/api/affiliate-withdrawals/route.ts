import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardAuth } from '@/lib/api-auth'
import { notifyAffiliateWithdrawalApproved, notifyAffiliateWithdrawalRejected, notifyAffiliateWithdrawalRequested } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * 💸 /api/affiliate-withdrawals — طلبات سحب عمولات المسوّقين
 * GET  ?admin=1            : الكل (الإدارة) مع أسماء المسوّقين
 * GET  ?affiliate_id=      : طلبات مسوّق محدد (صاحبه أو الإدارة)
 * POST { amount, account_id } : طلب سحب جديد — التحقق من الرصيد والحساب خادمياً
 * PUT  { id, action }      : الإدارة تعتمد/ترفض (متماثل بعدد الطلب)
 */

/** الرصيد القابل للسحب = total_earnings − (السحبات المعلقة + المكتملة) */
async function availableBalance(affiliateId: string): Promise<{ total: number; reserved: number; available: number }> {
  const { data: aff } = await supabaseAdmin.from('affiliates').select('total_earnings').eq('id', affiliateId).maybeSingle()
  const total = Number(aff?.total_earnings || 0)
  const { data: ws } = await supabaseAdmin.from('affiliate_withdrawals').select('amount, status').eq('affiliate_id', affiliateId)
  const reserved = (ws || []).filter((w: any) => w.status === 'معلق' || w.status === 'مكتمل').reduce((s: number, w: any) => s + Number(w.amount || 0), 0)
  return { total, reserved, available: Math.max(0, total - reserved) }
}

export async function GET(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  try {
    if (req.nextUrl.searchParams.get('admin') === '1') {
      if (user.role !== 'admin') return NextResponse.json({ error: 'للإدارة فقط' }, { status: 403 })
      const { data, error } = await supabaseAdmin
        .from('affiliate_withdrawals')
        .select('*, affiliate:affiliates(name, email, unique_code, user_id)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json(data || [])
    }
    const affiliateId = req.nextUrl.searchParams.get('affiliate_id')
    let affId = affiliateId
    if (user.role !== 'admin' || !affiliateId) {
      const { data: aff } = await supabaseAdmin.from('affiliates').select('id, user_id').eq('user_id', user.id).maybeSingle()
      if (!aff) return NextResponse.json([])
      affId = aff.id
      if (affiliateId && affiliateId !== aff.id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
    const { data, error } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .select('*')
      .eq('affiliate_id', affId!)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'تعذر جلب طلبات السحب' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  try {
    const body = await req.json()
    const { data: aff } = await supabaseAdmin.from('affiliates').select('*').eq('user_id', user.id).maybeSingle()
    if (!aff) return NextResponse.json({ error: 'لا يوجد حساب عمولة مرتبط بك' }, { status: 404 })
    if (aff.status !== 'نشط') return NextResponse.json({ error: 'حساب العمولة متوقف — راجع الإدارة' }, { status: 403 })

    const amount = Math.round(Number(body.amount) * 100) / 100
    if (!amount || amount <= 0) return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 })

    const { data: account } = await supabaseAdmin
      .from('affiliate_withdrawal_accounts')
      .select('*')
      .eq('id', String(body.account_id || ''))
      .eq('affiliate_id', aff.id)
      .maybeSingle()
    if (!account) {
      return NextResponse.json({ error: 'أضف حساب سحب أولاً من تبويب «حسابات السحب»', code: 'no_withdrawal_account' }, { status: 400 })
    }

    const bal = await availableBalance(aff.id)
    if (amount > bal.available) {
      return NextResponse.json({ error: `المبلغ يتجاوز رصيدك القابل للسحب (${bal.available.toLocaleString('en-US')} ${account.currency || 'ر.ي'})` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .insert({
        affiliate_id: aff.id,
        amount,
        currency: account.currency || 'ر.ي',
        method_name: account.method_name,
        account_name: account.account_name,
        account_number: account.account_number,
        account_country: account.country,
        status: 'معلق',
      })
      .select()
      .single()
    if (error) throw error

    notifyAffiliateWithdrawalRequested(aff.name, amount, account.currency || 'ر.ي').catch(() => {})
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'تعذر إنشاء طلب السحب' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  try {
    const body = await req.json()
    const id = body.id
    const action = body.action // 'approve' | 'reject'
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'المعرف والإجراء مطلوبان' }, { status: 400 })
    }
    const { data: w } = await supabaseAdmin.from('affiliate_withdrawals').select('*').eq('id', id).maybeSingle()
    if (!w) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if (w.status !== 'معلق') return NextResponse.json({ error: 'هذا الطلب عولج مسبقاً' }, { status: 409 })

    const patch: any = { processed_at: new Date().toISOString() }
    if (action === 'approve') {
      patch.status = 'مكتمل'
      if (body.screenshot_url) patch.screenshot_url = String(body.screenshot_url).trim()
    } else {
      patch.status = 'مرفوض'
      if (body.admin_note) patch.admin_note = String(body.admin_note).trim()
    }
    const { data, error } = await supabaseAdmin.from('affiliate_withdrawals').update(patch).eq('id', id).select().single()
    if (error) throw error

    const { data: aff } = await supabaseAdmin.from('affiliates').select('user_id').eq('id', w.affiliate_id).maybeSingle()
    if (aff?.user_id) {
      if (action === 'approve') notifyAffiliateWithdrawalApproved(aff.user_id, w.amount, w.currency || 'ر.ي', !!body.screenshot_url).catch(() => {})
      else notifyAffiliateWithdrawalRejected(aff.user_id, w.amount, w.currency || 'ر.ي', body.admin_note || null).catch(() => {})
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة الطلب' }, { status: 500 })
  }
}
