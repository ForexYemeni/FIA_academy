import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, getAuthUser, verifyOwnPassword } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * 💱 /api/withdrawal-methods — كتالوج طرق سحب الأرباح حسب الدولة
 * GET عام: الطرق المفعّلة فقط (الإدارة ترى الكل)
 * POST/PUT/DELETE للإدارة: إدارة الكتالوج الملكي
 */
export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAuthUser(req)
    const isAdmin = adminUser?.role === 'admin'
    const country = req.nextUrl.searchParams.get('country')
    let q = supabaseAdmin.from('withdrawal_methods').select('*').order('sort', { ascending: true }).order('name')
    if (country) q = q.eq('country', country)
    // الإدارة ترى المعطّلة أيضاً؛ العام والمدربون يرون المفعّلة فقط
    if (!isAdmin) q = q.eq('enabled', true)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر جلب طرق السحب' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  const body = await req.json().catch(() => ({}))
  const country = String(body.country || '').trim()
  const name = String(body.name || '').trim()
  if (!country || !name) return NextResponse.json({ error: 'الدولة واسم الطريقة مطلوبان' }, { status: 400 })
  try {
    const { data, error } = await supabaseAdmin
      .from('withdrawal_methods')
      .insert({
        country, name,
        currency: String(body.currency || 'ر.ي').trim(),
        instructions: String(body.instructions || '').trim() || null,
        enabled: body.enabled !== false,
        sort: Number(body.sort) || 0,
      })
      .select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر الإضافة' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })
  const patch: any = {}
  if (body.country !== undefined) patch.country = String(body.country).trim()
  if (body.name !== undefined) patch.name = String(body.name).trim()
  if (body.currency !== undefined) patch.currency = String(body.currency).trim()
  if (body.instructions !== undefined) patch.instructions = String(body.instructions).trim() || null
  if (body.enabled !== undefined) patch.enabled = !!body.enabled
  if (body.sort !== undefined) patch.sort = Number(body.sort) || 0
  try {
    const { data, error } = await supabaseAdmin
      .from('withdrawal_methods').update(patch).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر التحديث' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })

  // 🔐 تأكيد الحذف بكلمة مرور الإدارة — لا حذف بلا تحقق (v6.3)
  const confirmPw = req.headers.get('x-confirm-password') || ''
  if (!confirmPw) return NextResponse.json({ error: 'تأكيد كلمة المرور مطلوب لحذف الطريقة' }, { status: 400 })
  const pwOk = await verifyOwnPassword(g.user!.id, 'admin', confirmPw)
  if (!pwOk) return NextResponse.json({ error: 'كلمة المرور غير صحيحة — لم تُحذف الطريقة' }, { status: 403 })

  try {
    const { error } = await supabaseAdmin.from('withdrawal_methods').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'تعذر الحذف' }, { status: 500 })
  }
}
