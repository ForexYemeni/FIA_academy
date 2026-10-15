import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const moduleId = req.nextUrl.searchParams.get('module_id')
    const courseId = req.nextUrl.searchParams.get('course_id')
    let query = supabaseAdmin.from('course_lessons').select('*')
    if (moduleId) query = query.eq('module_id', moduleId)
    if (courseId) {
      // Get all lessons for a course by joining modules
      const { data: modules } = await supabaseAdmin
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId)
      const moduleIds = (modules || []).map((m: any) => m.id)
      if (moduleIds.length === 0) return NextResponse.json([])
      query = supabaseAdmin.from('course_lessons').select('*').in('module_id', moduleIds)
    }
    const { data, error } = await query.order('position', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('course_lessons')
      .insert({
        module_id: body.module_id,
        title: body.title,
        lesson_type: body.lesson_type || 'text',
        content: body.content || null,
        video_url: body.video_url || null,
        pdf_url: body.pdf_url || null,
        duration_minutes: body.duration_minutes || 0,
        position: body.position || 0,
        is_preview: body.is_preview || false,
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
      .from('course_lessons')
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
    const { error } = await supabaseAdmin.from('course_lessons').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
