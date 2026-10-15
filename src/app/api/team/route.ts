import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const role = req.nextUrl.searchParams.get('role') // founder | leader | team
    let query = supabaseAdmin.from('team_members').select('*')
    if (role) query = query.eq('role', role)
    const { data, error } = await query.order('display_order', { ascending: true })

    if (error) {
      // Fallback: table doesn't exist, return empty array
      if (error.message?.includes('Could not find the table')) {
        return NextResponse.json({
          exists: false,
          data: [],
          message: 'team_members table not found. Run SQL migration first.',
        })
      }
      throw error
    }
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .insert({
        user_id: body.user_id || null,
        name: body.name,
        title: body.title || null,
        role: body.role || 'team',
        specialization: body.specialization || null,
        bio: body.bio || null,
        vision: body.vision || null,
        mission: body.mission || null,
        qualifications: body.qualifications || null,
        achievements: body.achievements || null,
        avatar: body.avatar || null,
        email: body.email || null,
        phone: body.phone || null,
        linkedin: body.linkedin || null,
        twitter: body.twitter || null,
        years_experience: body.years_experience || 0,
        display_order: body.display_order || 0,
        is_active: body.is_active !== false,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('team_members').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
