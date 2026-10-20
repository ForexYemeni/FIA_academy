import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgModuleCreated } from '@/lib/telegram'

// Store modules as JSON inside the course's `description` field.
// Format: <regular description>\n\n===FIA_MODULES===\n<JSON array of modules>
// Each module: { id, title, description, position, lessons: [{ id, title, lesson_type, content, video_url, pdf_url, duration_minutes, position, is_preview }] }

const MODULES_SEPARATOR = '\n\n===FIA_MODULES===\n'

function genId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

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

function serializeCourseContent(description: string, modules: any[]): string {
  if (!modules || modules.length === 0) return description || ''
  return `${description || ''}${MODULES_SEPARATOR}${JSON.stringify(modules)}`
}

async function fetchCourseModules(courseId: string): Promise<any[]> {
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('description')
    .eq('id', courseId)
    .maybeSingle()
  if (!course) return []
  const { modules } = parseCourseContent(course.description)
  return modules
}

// ⚡ Lookup helper: given a module id, find which course contains it.
// Used by PUT/DELETE as a fallback when the frontend forgets to send
// course_id (e.g. legacy modules stored without course_id field).
// Returns the course_id or null if not found.
async function findCourseIdByModuleId(moduleId: string): Promise<string | null> {
  // Fetch a light slice (id + description) for every course. We only need
  // the description to parse modules JSON. This is bounded by #courses.
  const { data: courses, error } = await supabaseAdmin
    .from('courses')
    .select('id, description')
  if (error || !courses) return null
  for (const c of courses) {
    const { modules } = parseCourseContent(c.description)
    if (Array.isArray(modules) && modules.some((m) => m.id === moduleId)) {
      return c.id
    }
  }
  return null
}

async function saveCourseModules(courseId: string, modules: any[]): Promise<void> {
  // First fetch the current description to preserve the original
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('description')
    .eq('id', courseId)
    .maybeSingle()
  if (!course) throw new Error('Course not found')

  const { description } = parseCourseContent(course.description)
  const newDescription = serializeCourseContent(description, modules)

  // Also update modules_count and lessons_count
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

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('course_id')
    if (!courseId) return NextResponse.json([])
    const modules = await fetchCourseModules(courseId)
    // Sort by position
    modules.sort((a, b) => (a.position || 0) - (b.position || 0))
    // Sort lessons too
    modules.forEach((m) => {
      if (Array.isArray(m.lessons)) {
        m.lessons.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      }
    })
    return NextResponse.json(modules)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.course_id || !body.title) {
      return NextResponse.json({ error: 'course_id و title مطلوبان' }, { status: 400 })
    }
    const modules = await fetchCourseModules(body.course_id)
    const newModule = {
      id: genId(),
      course_id: body.course_id,
      title: body.title,
      description: body.description || null,
      position: body.position ?? modules.length,
      lessons: [],
    }
    modules.push(newModule)
    await saveCourseModules(body.course_id, modules)

    // Publish to Telegram — every new module is announced on the channel
    try {
      await tgModuleCreated(body.course_id, body.title)
    } catch {}

    return NextResponse.json(newModule)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, course_id, ...updates } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    // ⚡ Fallback: if course_id wasn't sent, look it up by scanning
    // courses for the module with this id. This fixes the
    // "id و course_id مطلوبان" error that happens when the
    // ModuleDialog saves an edit without course_id in the body.
    let resolvedCourseId = course_id
    if (!resolvedCourseId) {
      resolvedCourseId = await findCourseIdByModuleId(id)
      if (!resolvedCourseId) {
        return NextResponse.json({ error: 'Module not found in any course' }, { status: 404 })
      }
    }
    const modules = await fetchCourseModules(resolvedCourseId)
    const idx = modules.findIndex((m) => m.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    modules[idx] = { ...modules[idx], ...updates, id, course_id: resolvedCourseId }
    await saveCourseModules(resolvedCourseId, modules)
    return NextResponse.json(modules[idx])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, course_id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    // ⚡ Same fallback as PUT — find course by module id if course_id
    // wasn't provided.
    let resolvedCourseId = course_id
    if (!resolvedCourseId) {
      resolvedCourseId = await findCourseIdByModuleId(id)
      if (!resolvedCourseId) {
        return NextResponse.json({ error: 'Module not found in any course' }, { status: 404 })
      }
    }
    const modules = await fetchCourseModules(resolvedCourseId)
    const filtered = modules.filter((m) => m.id !== id)
    await saveCourseModules(resolvedCourseId, filtered)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
