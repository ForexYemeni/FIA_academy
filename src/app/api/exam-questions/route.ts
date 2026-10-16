import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('course_id')
    const lessonId = req.nextUrl.searchParams.get('lesson_id')
    if (!courseId) return NextResponse.json({ error: 'course_id required' }, { status: 400 })

    let query = supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'نشط')
      .order('created_at', { ascending: true })
    if (lessonId) query = query.eq('lesson_id', lessonId)
    const { data, error } = await query
    if (error) throw error
    // Note: in a real exam scenario we would NOT return correct_answer.
    // For the admin editor (this endpoint), we DO return it so they can edit.
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { course_id, lesson_id, question_type, prompt, options, correct_answer, explanation, difficulty, points } = await req.json()
    if (!course_id || !prompt) {
      return NextResponse.json({ error: 'course_id و prompt مطلوبان' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('exam_questions')
      .insert({
        course_id,
        lesson_id: lesson_id || null,
        question_type: question_type || 'mcq',
        prompt,
        options: options || null,
        correct_answer: correct_answer || null,
        explanation: explanation || null,
        difficulty: difficulty || 'متوسط',
        points: points || 1,
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
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('exam_questions')
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
    const { error } = await supabaseAdmin.from('exam_questions').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
