import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TABLE_NOT_FOUND = 'Could not find the table'

function isTableMissing(error: any): boolean {
  return error?.message?.includes(TABLE_NOT_FOUND) || false
}

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('course_id')
    let query = supabaseAdmin.from('course_modules').select('*')
    if (courseId) query = query.eq('course_id', courseId)
    const { data, error } = await query.order('position', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    if (isTableMissing(e)) {
      return NextResponse.json({
        error: 'جدول الوحدات (course_modules) غير موجود. نفّذ SQL أولاً.',
        needs_setup: true,
        sql_file: '/supabase/migrations/002_modules_lessons_enrollments.sql',
        supabase_sql_editor: 'https://supabase.com/dashboard/project/tzquudmfazysjogorrxz/sql/new',
      }, { status: 404 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.course_id || !body.title) {
      return NextResponse.json({ error: 'course_id و title مطلوبان' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('course_modules')
      .insert({
        course_id: body.course_id,
        title: body.title,
        description: body.description || null,
        position: body.position || 0,
      })
      .select()
      .single()
    if (error) {
      if (isTableMissing(error)) {
        return NextResponse.json({
          error: 'جدول الوحدات غير موجود. الرجاء تنفيذ ملف SQL أولاً في Supabase SQL Editor.',
          needs_setup: true,
          sql_file: '/supabase/migrations/002_modules_lessons_enrollments.sql',
          supabase_sql_editor: 'https://supabase.com/dashboard/project/tzquudmfazysjogorrxz/sql/new',
        }, { status: 404 })
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
    const { id, ...updates } = await req.json()
    const { data, error } = await supabaseAdmin
      .from('course_modules')
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
    const { error } = await supabaseAdmin.from('course_modules').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
