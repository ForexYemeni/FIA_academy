import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardAuth, verifyOwnPassword } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * 💳 /api/affiliate-accounts — حسابات سحب عمولات المسوّقين
 * GET ?affiliate_id= : حسابات مسوّق (الإدارة أو صاحبها فقط)
 * POST               : إضافة حساب (صاحب حساب العمولة نفسه أو الإدارة)
 * DELETE ?id=        : حذف — المالك فقط + 🔐 تأكيد كلمة المرور الإلزامي
 */
async function resolveAffiliate(userId: string, role: string, affiliateId: string | null): Promise<{ ok: boolean; affiliate?: any; error?: string; status?: number }> {
  let q = supabaseAdmin.from('affiliates').select('*').limit(1)
  if (affiliateId) q = q.eq('id', affiliateId)
  else q = q.eq('user_id', userId)
  const { data, error } = await q.maybeSingle()
  if (error) return { ok: false, error: 'تعذر جلب حساب العمولة', status: 500 }
  if (!data) return { ok: false, error: 'لا يوجد حساب عمولة مرتبط بك — انضم إلى البرنامج أولاً', status: 404 }
  if (role !== 'admin' && data.user_id !== userId) return { ok: false, error: 'غير مصرح — هذا الحساب ليس لك', status: 403 }
  return { ok: true, affiliate: data }
}

export async function GET(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  const affiliateId = req.nextUrl.searchParams.get('affiliate_id')
  const resolved = await resolveAffiliate(user.id, user.role, affiliateId)
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  try {
    const { data, error } = await supabaseAdmin
      .from('affiliate_withdrawal_accounts')
      .select('*')
      .eq('affiliate_id', resolved.affiliate.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'تعذر جلب الحسابات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  try {
    const body = await req.json()
    const resolved = await resolveAffiliate(user.id, user.role, body.affiliate_id || null)
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const method_name = String(body.method_name || '').trim()
    const account_number = String(body.account_number || '').trim()
    if (!method_name || !account_number) return NextResponse.json({ error: 'طريقة السحب ورقم الحساب مطلوبان' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('affiliate_withdrawal_accounts')
      .insert({
        affiliate_id: resolved.affiliate.id,
        country: body.country || 'اليمن',
        method_name,
        currency: body.currency || 'ر.ي',
        account_name: (body.account_name || '').trim() || null,
        account_number,
        extra_info: (body.extra_info || '').trim() || null,
        is_default: !!body.is_default,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'تعذر إضافة الحساب' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAuth(req); if (!g.ok) return g.res
  const user = g.user!
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })

  // 🔐 تأكيد الحذف بكلمة مرور صاحب الحساب — لا حذف بلا تحقق (v6.3)
  const confirmPw = req.headers.get('x-confirm-password') || ''
  if (!confirmPw) return NextResponse.json({ error: 'تأكيد كلمة المرور مطلوب لحذف الحساب' }, { status: 400 })
  const pwOk = await verifyOwnPassword(user.id, user.role, confirmPw)
  if (!pwOk) return NextResponse.json({ error: 'كلمة المرور غير صحيحة — لم يُحذف الحساب' }, { status: 403 })

  try {
    let q = supabaseAdmin.from('affiliate_withdrawal_accounts').delete().eq('id', id)
    if (user.role !== 'admin') {
      const resolved = await resolveAffiliate(user.id, user.role, null)
      if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
      q = q.eq('affiliate_id', resolved.affiliate.id)
    }
    const { error } = await q
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'تعذر الحذف' }, { status: 500 })
  }
}
