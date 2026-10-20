import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

import { requireAdmin } from "@/lib/admin-auth"
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('faqs')
      .select('*')
      .eq('status', 'نشط')
      .order('display_order', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
    const authError = await requireAdmin(req); if (authError) return authError
  try {
    const { question, answer, category, display_order } = await req.json()
    if (!question || !answer) {
      return NextResponse.json({ error: 'السؤال والإجابة مطلوبان' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('faqs')
      .insert({
        question,
        answer,
        category: category || 'عام',
        display_order: display_order || 0,
        status: 'نشط',
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
    const authError = await requireAdmin(req); if (authError) return authError
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('faqs')
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
    const authError = await requireAdmin(req); if (authError) return authError
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('faqs').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
