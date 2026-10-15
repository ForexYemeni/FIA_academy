import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const courseId = req.nextUrl.searchParams.get('course_id')
    let query = supabaseAdmin.from('enrollments').select('*')
    if (userId) query = query.eq('user_id', userId)
    if (courseId) query = query.eq('course_id', courseId)
    const { data, error } = await query.order('enrolled_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Check if already enrolled
    const { data: existing } = await supabaseAdmin
      .from('enrollments')
      .select('id, status')
      .eq('user_id', body.user_id)
      .eq('course_id', body.course_id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ already_enrolled: true, ...existing })
    }
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .insert({
        user_id: body.user_id,
        course_id: body.course_id,
        status: 'active',
        progress: 0,
        payment_status: body.payment_status || 'free',
        amount_paid: body.amount_paid || 0,
        payment_method: body.payment_method || null,
        payment_reference: body.payment_reference || null,
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
    const { data, error } = await supabaseAdmin
      .from('enrollments')
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
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('enrollments').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
