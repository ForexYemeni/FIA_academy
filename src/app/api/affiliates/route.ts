import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin, guardAuth, getAuthUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const userId = req.nextUrl.searchParams.get('user_id')
    // 🛡️ قائمة كل المسوقين للإدارة فقط — بالكود علني (تتبع الزائر)، وبالمستخدم لنفسه
    if (!code) {
      const au = await getAuthUser(req)
      const isAdmin = au?.role === 'admin'
      if (!isAdmin) {
        if (!au) {
          return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })
        }
        if (!userId) {
          return NextResponse.json({ error: 'غير مصرح — قائمة المسوقين للإدارة فقط' }, { status: 403 })
        }
        if (userId !== au.id) {
          return NextResponse.json({ error: 'غير مصرح — يمكنك عرض إحالاتك فقط' }, { status: 403 })
        }
      }
    }
    if (code) {
      // Look up a single affiliate by their unique_code (public view)
      const { data, error } = await supabaseAdmin
        .from('affiliates')
        .select('*')
        .eq('unique_code', code)
        .eq('status', 'نشط')
        .maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ valid: false }, { status: 404 })
      return NextResponse.json({ valid: true, affiliate: data })
    }
    if (userId) {
      // Look up the affiliate record for a specific user (used by the
      // AffiliateDashboard component in the student/trainer dashboards).
      const { data, error } = await supabaseAdmin
        .from('affiliates')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ valid: false }, { status: 404 })
      return NextResponse.json({ valid: true, affiliate: data })
    }
    // List all affiliates (admin view)
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function genUniqueCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'FIA'
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `FIA-${base}-${rand}`
}

export async function POST(req: NextRequest) {
  try {
    const ga = await guardAdmin(req)
    if (!ga.ok) return ga.res
    const body = await req.json()
    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'الاسم والبريد مطلوبان' }, { status: 400 })
    }
    const uniqueCode = body.unique_code || genUniqueCode(body.name)
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        unique_code: uniqueCode,
        commission_percent: body.commission_percent ?? 10,
        status: body.status || 'نشط',
        user_id: body.user_id || null,
      })
      .select()
      .single()
    if (error) {
      if (error.message?.includes('duplicate')) {
        return NextResponse.json({ error: 'الكود مستخدم بالفعل' }, { status: 400 })
      }
      throw error
    }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ga = await guardAdmin(req)
    if (!ga.ok) return ga.res
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ga = await guardAdmin(req)
    if (!ga.ok) return ga.res
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('affiliates').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
