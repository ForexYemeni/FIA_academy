import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    // Strip passwords AND filter out team members (founder/leader/team)
    // Team members have password starting with __TEAM_MEMBER__: — they should NOT appear as trainers
    const safe = (data || [])
      .filter((t: any) => !t.password || !t.password.startsWith(TEAM_MARKER_PREFIX))
      .map(({ password, ...rest }: any) => rest)
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('trainers')
      .insert({
        name: body.name,
        title: body.title || null,
        specialization: body.specialization || null,
        bio: body.bio || null,
        avatar: body.avatar || null,
        email: body.email,
        password: body.password,
        phone: body.phone || null,
        courses_count: body.courses_count || 0,
        years_experience: body.years_experience || 0,
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
    // Don't allow password updates through this route unless explicitly provided
    if (!updates.password) delete updates.password
    const { data, error } = await supabaseAdmin
      .from('trainers')
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
    const { error } = await supabaseAdmin.from('trainers').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
