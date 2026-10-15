import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const role = req.nextUrl.searchParams.get('role') || 'student'

    // Fetch all users with role='student'
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Strip passwords before returning
    const safe = (users || []).map(({ password, ...rest }: any) => rest)

    // Optionally enrich with enrollment counts (count of payment records per student)
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select('user_id, id')
      .not('user_id', 'is', null)

    const enrollmentCounts: Record<string, number> = {}
    ;(allPayments || []).forEach((p: any) => {
      if (p.user_id) {
        enrollmentCounts[p.user_id] = (enrollmentCounts[p.user_id] || 0) + 1
      }
    })

    const enriched = safe.map((u: any) => ({
      ...u,
      enrollment_count: enrollmentCounts[u.id] || 0,
    }))

    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: body.name,
        email: body.email,
        password: body.password,
        phone: body.phone || null,
        role: body.role || 'student',
        title: body.title || null,
        bio: body.bio || null,
        avatar: body.avatar || null,
      })
      .select()
      .single()
    if (error) throw error
    const { password, ...safe } = data
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!updates.password) delete updates.password
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const { password, ...safe } = data
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('users').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
