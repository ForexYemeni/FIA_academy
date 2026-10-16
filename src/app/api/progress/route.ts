import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/progress?user_id=...&course_id=... — list user's lesson progress
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const courseId = req.nextUrl.searchParams.get('course_id')
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    // Fetch per-lesson progress for the user (and optionally filtered to one course)
    let lessonQuery = supabaseAdmin.from('lesson_progress').select('*').eq('user_id', userId)
    if (courseId) lessonQuery = lessonQuery.eq('course_id', courseId)
    const { data: lessons, error: lErr } = await lessonQuery
    if (lErr) throw lErr

    // Fetch per-course aggregated progress
    let courseQuery = supabaseAdmin.from('course_progress').select('*').eq('user_id', userId)
    if (courseId) courseQuery = courseQuery.eq('course_id', courseId)
    const { data: courses, error: cErr } = await courseQuery
    if (cErr) throw cErr

    return NextResponse.json({ lessons: lessons || [], courses: courses || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — update lesson progress (called periodically as the student studies)
export async function POST(req: NextRequest) {
  try {
    const {
      user_id,
      course_id,
      lesson_id,
      status,
      progress_percent,
      time_spent_seconds,
      last_position_seconds,
    } = await req.json()

    if (!user_id || !course_id || !lesson_id) {
      return NextResponse.json({ error: 'user_id, course_id, lesson_id required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const completedAt = status === 'completed' ? now : null

    // Upsert lesson progress (unique constraint on user_id+lesson_id)
    const { data: existing } = await supabaseAdmin
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('lesson_id', lesson_id)
      .maybeSingle()

    let lessonRow: any
    if (existing) {
      // Accumulate time_spent_seconds instead of overwriting
      const newTime = (existing.time_spent_seconds || 0) + (time_spent_seconds || 0)
      const newPercent = Math.max(existing.progress_percent || 0, progress_percent || 0)
      const newStatus = status === 'completed' || newPercent >= 100 ? 'completed' : (status || existing.status)
      const { data, error } = await supabaseAdmin
        .from('lesson_progress')
        .update({
          status: newStatus,
          progress_percent: newPercent,
          time_spent_seconds: newTime,
          last_position_seconds: last_position_seconds ?? existing.last_position_seconds,
          last_accessed_at: now,
          completed_at: newStatus === 'completed' ? (existing.completed_at || now) : null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      lessonRow = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('lesson_progress')
        .insert({
          user_id,
          course_id,
          lesson_id,
          status: status || 'in_progress',
          progress_percent: progress_percent || 0,
          time_spent_seconds: time_spent_seconds || 0,
          last_position_seconds: last_position_seconds || 0,
          last_accessed_at: now,
          completed_at: completedAt,
        })
        .select()
        .single()
      if (error) throw error
      lessonRow = data
    }

    // Recompute course_progress
    const { data: allLessons } = await supabaseAdmin
      .from('lesson_progress')
      .select('status, progress_percent')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
    const totalLessons = (allLessons || []).length
    const completedLessons = (allLessons || []).filter((l: any) => l.status === 'completed').length
    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    const { data: cpExisting } = await supabaseAdmin
      .from('course_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .maybeSingle()
    if (cpExisting) {
      const { error } = await supabaseAdmin
        .from('course_progress')
        .update({
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          progress_percent: percent,
          last_lesson_id: lesson_id,
          last_accessed_at: now,
        })
        .eq('user_id', user_id)
        .eq('course_id', course_id)
      if (error) throw error
    } else {
      const { error } = await supabaseAdmin
        .from('course_progress')
        .insert({
          user_id,
          course_id,
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          progress_percent: percent,
          last_lesson_id: lesson_id,
          last_accessed_at: now,
        })
      if (error) throw error
    }

    return NextResponse.json({ lesson: lessonRow, course: { total_lessons: totalLessons, completed_lessons: completedLessons, progress_percent: percent } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
