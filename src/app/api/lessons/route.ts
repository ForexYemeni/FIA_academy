import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgLessonCreated } from '@/lib/telegram'
import { notifyFollowersNewLesson, resolveTrainerProfileId } from '@/lib/notifications'
import { guardAdmin, guardStaff, guardAuth, getAuthUser } from '@/lib/api-auth'

// Lessons are stored inside modules (which are stored as JSON in the course's description field).
// The /api/modules endpoint handles the full course content. This endpoint provides
// a friendly interface for individual lesson operations.

const MODULES_SEPARATOR = '\n\n===FIA_MODULES===\n'

function genLessonId(): string {
  return `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function parseCourseContent(description: string | null): { description: string; modules: any[] } {
  if (!description) return { description: '', modules: [] }
  const idx = description.indexOf(MODULES_SEPARATOR)
  if (idx === -1) return { description, modules: [] }
  const desc = description.substring(0, idx)
  const jsonStr = description.substring(idx + MODULES_SEPARATOR.length)
  try {
    const modules = JSON.parse(jsonStr)
    if (Array.isArray(modules)) return { description: desc, modules }
  } catch {}
  return { description, modules: [] }
}

async function fetchCourse(courseId: string): Promise<any> {
  const { data } = await supabaseAdmin
    .from('courses')
    .select('description, trainer_id')
    .eq('id', courseId)
    .maybeSingle()
  return data
}

async function saveCourseModules(courseId: string, description: string, modules: any[]): Promise<void> {
  const newDescription = modules.length === 0
    ? description
    : `${description || ''}${MODULES_SEPARATOR}${JSON.stringify(modules)}`
  const modulesCount = modules.length
  const lessonsCount = modules.reduce((acc, m) => acc + ((m.lessons as any[]) || []).length, 0)
  const { error } = await supabaseAdmin
    .from('courses')
    .update({
      description: newDescription,
      modules_count: modulesCount,
      lessons_count: lessonsCount,
    })
    .eq('id', courseId)
  if (error) throw error
}

async function findCourseIdByModule(moduleId: string): Promise<string | null> {
  // We can't easily query JSON in PostgREST, so we have to scan all courses.
  // For small datasets this is fine.
  const { data: courses } = await supabaseAdmin
    .from('courses')
    .select('id, description')
  if (!courses) return null
  for (const c of courses) {
    const { modules } = parseCourseContent(c.description)
    if (modules.some((m) => m.id === moduleId)) return c.id
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const moduleId = req.nextUrl.searchParams.get('module_id')
    const courseId = req.nextUrl.searchParams.get('course_id')

    if (!courseId) return NextResponse.json([])

    const course = await fetchCourse(courseId)
    if (!course) return NextResponse.json([])

    const { modules } = parseCourseContent(course.description)
    let lessons: any[] = []
    if (moduleId) {
      const mod = modules.find((m) => m.id === moduleId)
      lessons = mod?.lessons || []
    } else {
      // All lessons for the course
      modules.forEach((m) => {
        if (Array.isArray(m.lessons)) {
          lessons.push(...m.lessons.map((l: any) => ({ ...l, module_id: m.id })))
        }
      })
    }

    // ⚡ فرز ملكي حسب الترتيب — كان حقل «الترتيب» بلا أثر في العرض
    lessons.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))

    // 🛡️ بوابة المحتوى: الكامل للمسجلين/الإدارة/المدرب المالك — معاينة لغيرهم
    const authUser = await getAuthUser(req)
    let fullAccess = authUser?.role === 'admin'
    if (!fullAccess && authUser) {
      if (authUser.role === 'trainer' && course.trainer_id) {
        if (course.trainer_id === authUser.id) {
          fullAccess = true
        } else {
          const { data: tRow } = await supabaseAdmin
            .from('trainers').select('email, id').eq('id', course.trainer_id).maybeSingle()
          fullAccess = tRow?.email === authUser.email || tRow?.id === authUser.id
        }
      }
      if (!fullAccess) {
        const { data: enr } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('course_id', courseId)
          .eq('status', 'مكتمل')
          .limit(1)
        fullAccess = !!(enr && enr.length > 0)
      }
    }
    if (!fullAccess) {
      lessons = lessons.map((l: any) => ({
        id: l.id,
        module_id: l.module_id,
        title: l.title,
        lesson_type: l.lesson_type || l.type,
        duration_minutes: l.duration_minutes,
        position: l.position,
        is_preview: !!l.is_preview,
      }))
    }

    return NextResponse.json(lessons)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
  const g = await guardStaff(req); if (!g.ok) return g.res
    const body = await req.json()
    if (!body.module_id || !body.title) {
      return NextResponse.json({ error: 'module_id و title مطلوبان' }, { status: 400 })
    }

    // Find course_id from module_id by scanning
    let courseId = body.course_id
    if (!courseId) {
      courseId = await findCourseIdByModule(body.module_id)
      if (!courseId) return NextResponse.json({ error: 'Course not found for module' }, { status: 404 })
    }

    const course = await fetchCourse(courseId)
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const { description, modules } = parseCourseContent(course.description)
    const modIdx = modules.findIndex((m) => m.id === body.module_id)
    if (modIdx === -1) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

    if (!Array.isArray(modules[modIdx].lessons)) modules[modIdx].lessons = []

    const newLesson = {
      id: genLessonId(),
      module_id: body.module_id,
      title: body.title,
      lesson_type: body.lesson_type || 'text',
      content: body.content || null,
      video_url: body.video_url || null,
      pdf_url: body.pdf_url || null,
      duration_minutes: body.duration_minutes || 0,
      position: body.position ?? modules[modIdx].lessons.length,
      is_preview: body.is_preview || false,
    }

    modules[modIdx].lessons.push(newLesson)
    await saveCourseModules(courseId, description, modules)

    // Publish to Telegram — every new lesson is announced on the channel
    try {
      await tgLessonCreated(courseId, body.title, body.lesson_type || 'text')
    } catch {}

    // ROYAL v4.2 — notify ALL followers of the course's trainer:
    // "درس جديد من المدرب فلان" (in-app + FCM push, non-fatal).
    try {
      const profileId = await resolveTrainerProfileId(course.trainer_id)
      if (profileId) {
        const { data: profile } = await supabaseAdmin
          .from('trainers').select('name').eq('id', profileId).maybeSingle()
        await notifyFollowersNewLesson(profileId, profile?.name || 'المدرب', course.title, body.title)
      }
    } catch {}

    return NextResponse.json(newLesson)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
  const g = await guardStaff(req); if (!g.ok) return g.res
    const { id, module_id, course_id, ...updates } = await req.json()
    if (!id || !module_id) {
      return NextResponse.json({ error: 'id و module_id مطلوبان' }, { status: 400 })
    }

    let courseId = course_id
    if (!courseId) {
      courseId = await findCourseIdByModule(module_id)
      if (!courseId) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const course = await fetchCourse(courseId)
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const { description, modules } = parseCourseContent(course.description)
    const modIdx = modules.findIndex((m) => m.id === module_id)
    if (modIdx === -1) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

    const lessons = modules[modIdx].lessons || []
    const lessonIdx = lessons.findIndex((l: any) => l.id === id)
    if (lessonIdx === -1) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    lessons[lessonIdx] = { ...lessons[lessonIdx], ...updates, id, module_id }
    modules[modIdx].lessons = lessons

    await saveCourseModules(courseId, description, modules)
    return NextResponse.json(lessons[lessonIdx])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
  const g = await guardStaff(req); if (!g.ok) return g.res
    const { id, module_id, course_id } = await req.json()
    if (!id || !module_id) {
      return NextResponse.json({ error: 'id و module_id مطلوبان' }, { status: 400 })
    }

    let courseId = course_id
    if (!courseId) {
      courseId = await findCourseIdByModule(module_id)
      if (!courseId) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const course = await fetchCourse(courseId)
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const { description, modules } = parseCourseContent(course.description)
    const modIdx = modules.findIndex((m) => m.id === module_id)
    if (modIdx === -1) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

    modules[modIdx].lessons = (modules[modIdx].lessons || []).filter((l: any) => l.id !== id)
    await saveCourseModules(courseId, description, modules)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
