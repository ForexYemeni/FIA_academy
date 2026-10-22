import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

// GET /api/continue?user_id=...
// Returns the user's in-progress courses, sorted by last_accessed_at desc,
// with the lesson they last touched so the UI can resume from there.
export async function GET(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const userId = req.nextUrl.searchParams.get('user_id')
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    // Fetch user's course_progress rows that aren't completed (or all, sorted by recency)
    const { data: courses, error: cErr } = await supabaseAdmin
      .from('course_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_accessed_at', { ascending: false })
    if (cErr) throw cErr

    if (!courses || courses.length === 0) return NextResponse.json([])

    // Enrich with course + last lesson info
    const courseIds = courses.map((c: any) => c.course_id)
    const { data: courseRows } = await supabaseAdmin
      .from('courses')
      .select('id, title, cover, level, duration_hours')
      .in('id', courseIds)

    const result = await Promise.all(
      courses.map(async (c: any) => {
        const course = (courseRows || []).find((r: any) => r.id === c.course_id)
        let lastLesson: any = null
        if (c.last_lesson_id) {
          const { data: lesson } = await supabaseAdmin
            .from('lessons')
            .select('id, title, module_id')
            .eq('id', c.last_lesson_id)
            .maybeSingle()
          lastLesson = lesson
        }
        return {
          ...c,
          course_title: course?.title || null,
          course_cover: course?.cover || null,
          course_level: course?.level || null,
          course_duration_hours: course?.duration_hours || 0,
          last_lesson: lastLesson,
        }
      }),
    )
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
