import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * 🎓 /api/specializations — كتالوج التخصصات العالمية والمسميات الوظيفية
 * GET  عام: المفعّلة فقط (الإدارة ترى الكل) — ?type=title|specialization
 * POST/PUT/DELETE للإدارة: إدارة الكتالوج (إضافة/تعديل/تفعيل/ترتيب/حذف)
 */
export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAuthUser(req)
    const isAdmin = adminUser?.role === 'admin'
    const type = req.nextUrl.searchParams.get('type')
    let q = supabaseAdmin.from('specializations').select('*').order('sort', { ascending: true }).order('name')
    if (type === 'title' || type === 'specialization') q = q.eq('type', type)
    if (!isAdmin) q = q.eq('enabled', true)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'تعذر جلب كتالوج التخصصات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    const type = body.type === 'title' ? 'title' : 'specialization'
    if (!name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('specializations')
      .insert({ name, type, icon: (body.icon || '').toString().slice(0, 8) || null, sort: Number(body.sort) || 0, enabled: body.enabled !== false })
      .select()
      .single()
    if (error) {
      if ((error as any).code === '23505') return NextResponse.json({ error: 'هذا الاسم موجود مسبقاً في نفس التصنيف' }, { status: 409 })
      throw error
    }
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'تعذر إضافة العنصر' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  try {
    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })
    const patch: any = {}
    if (body.name !== undefined) { const n = String(body.name).trim(); if (!n) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 }); patch.name = n }
    if (body.type !== undefined) patch.type = body.type === 'title' ? 'title' : 'specialization'
    if (body.icon !== undefined) patch.icon = (body.icon || '').toString().slice(0, 8) || null
    if (body.enabled !== undefined) patch.enabled = !!body.enabled
    if (body.sort !== undefined) patch.sort = Number(body.sort) || 0
    const { data, error } = await supabaseAdmin.from('specializations').update(patch).eq('id', id).select().single()
    if (error) {
      if ((error as any).code === '23505') return NextResponse.json({ error: 'هذا الاسم موجود مسبقاً في نفس التصنيف' }, { status: 409 })
      throw error
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'تعذر تحديث العنصر' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin(req); if (!g.ok) return g.res
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })
  try {
    const { error } = await supabaseAdmin.from('specializations').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'تعذر حذف العنصر' }, { status: 500 })
  }
}
