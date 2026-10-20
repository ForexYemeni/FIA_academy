import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

import { requireAdmin } from "@/lib/admin-auth"
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('licenses').select('*').order('issued_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
    const authError = await requireAdmin(req); if (authError) return authError
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin.from('licenses').insert(body).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
    const authError = await requireAdmin(req); if (authError) return authError
  try {
    const { id, ...updates } = await req.json()
    const { data, error } = await supabaseAdmin.from('licenses').update(updates).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
    const authError = await requireAdmin(req); if (authError) return authError
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('licenses').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
