import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('payment_methods').select('*').order('enabled', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const body = await req.json()
    const { data, error } = await supabaseAdmin.from('payment_methods').insert(body).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const { id, ...updates } = await req.json()
    const { data, error } = await supabaseAdmin.from('payment_methods').update(updates).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
  const g = await guardAdmin(req); if (!g.ok) return g.res
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('payment_methods').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
