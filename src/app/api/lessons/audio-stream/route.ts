import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

// ═══════════════════════════════════════════════════════════════
// 🛡️ بوابة بث الدروس الصوتية الملكية — الحماية أولاً
// ───────────────────────────────────────────────────────────────
// 1) تُحلّل هوية الطالب/المدرب/الإدارة من الجلسة.
// 2) تتحقق من صلاحية الوصول للدرس: الإدارة، أو المدرب المالك،
//    أو متدرب دفع مكتمل، أو درس معاينة مجاني — وإلا 403.
// 3) تسحب الملف من تيليجرام بالتوكن داخل الخادم فقط (لا يغادر
//    التوكن أبداً) وتبثه مع دعم Range للتقديم/الإرجاع الفوري.
// ═══════════════════════════════════════════════════════════════

const MODULES_SEPARATOR = '\n\n===FIA_MODULES===\n'

async function getBotToken(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('site_settings')
      .select('telegram_bot_token')
      .limit(1)
      .maybeSingle()
    return data?.telegram_bot_token || ''
  } catch {
    return ''
  }
}

function parseCourseContent(description: string | null): { modules: any[] } {
  if (!description) return { modules: [] }
  const idx = description.indexOf(MODULES_SEPARATOR)
  if (idx === -1) return { modules: [] }
  try {
    const modules = JSON.parse(description.substring(idx + MODULES_SEPARATOR.length))
    if (Array.isArray(modules)) return { modules }
  } catch {}
  return { modules: [] }
}

interface ResolvedLesson {
  course: any
  lesson: any
}

async function resolveAudioLesson(lessonId: string, courseId?: string | null): Promise<ResolvedLesson | null> {
  // نحلّل الدرس من JSON محتوى الدورة — مع course_id نتخطى المسح الكامل
  const { data: courses } = courseId
    ? await supabaseAdmin.from('courses').select('id, description, trainer_id').eq('id', courseId).limit(1)
    : await supabaseAdmin.from('courses').select('id, description, trainer_id')
  if (!courses) return null
  for (const course of courses) {
    const { modules } = parseCourseContent(course.description)
    for (const m of modules) {
      const lesson = (m.lessons || []).find((l: any) => l.id === lessonId)
      if (lesson) return { course, lesson }
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const lessonId = req.nextUrl.searchParams.get('lesson_id')
    const courseIdParam = req.nextUrl.searchParams.get('course_id')
    if (!lessonId) {
      return NextResponse.json({ error: 'lesson_id مطلوب' }, { status: 400 })
    }

    const resolved = await resolveAudioLesson(lessonId, courseIdParam)
    if (!resolved || !resolved.lesson) {
      return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404 })
    }
    const { course, lesson } = resolved

    if ((lesson.lesson_type || lesson.type) !== 'audio' || !lesson.audio_file_id) {
      return NextResponse.json({ error: 'هذا الدرس ليس درساً صوتياً' }, { status: 404 })
    }

    // ═══ بوابة الصلاحيات ═══
    const authUser = await getAuthUser(req)
    let allowed = false
    if (authUser?.role === 'admin') {
      allowed = true
    } else if (authUser?.role === 'trainer' && course.trainer_id) {
      if (course.trainer_id === authUser.id) {
        allowed = true
      } else {
        const { data: tRow } = await supabaseAdmin
          .from('trainers').select('email, id').eq('id', course.trainer_id).maybeSingle()
        allowed = !!(tRow && (tRow.email === authUser.email || tRow.id === authUser.id))
      }
    }
    if (!allowed && authUser) {
      const { data: enr } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('course_id', course.id)
        .eq('status', 'مكتمل')
        .limit(1)
      allowed = !!(enr && enr.length > 0)
    }
    if (!allowed && lesson.is_preview) {
      // درس معاينة مجاني — متاح للزوار كما هو مسموح لبقية الأنواع
      allowed = true
    }
    if (!allowed) {
      return NextResponse.json({ error: 'هذا الدرس متاح للمسجلين في الدورة فقط' }, { status: 403 })
    }

    // ═══ البث من تيليجرام — التوكن داخل الخادم حصراً ═══
    const token = await getBotToken()
    if (!token) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة' }, { status: 500 })
    }

    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(lesson.audio_file_id)}`
    )
    const fileData = await fileRes.json().catch(() => null)
    if (!fileData?.ok || !fileData.result?.file_path) {
      return NextResponse.json({ error: 'تعذّر جلب الملف من تيليجرام' }, { status: 502 })
    }
    const filePath = fileData.result.file_path

    // تمرير Range كما هو — يدعم التقديم/الإرجاع الفوري في المشغل
    const range = req.headers.get('range')
    const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
      headers: range ? { Range: range } : undefined,
    })
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: 'الملف غير متاح من تيليجرام' }, { status: 502 })
    }

    const headers = new Headers()
    headers.set('Content-Type', lesson.audio_mime || upstream.headers.get('content-type') || 'audio/mpeg')
    const len = upstream.headers.get('content-length')
    if (len) headers.set('Content-Length', len)
    const contentRange = upstream.headers.get('content-range')
    if (contentRange) headers.set('Content-Range', contentRange)
    headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes')
    headers.set('Cache-Control', 'private, max-age=3600')
    headers.set('Content-Disposition', 'inline')

    return new NextResponse(upstream.body, { status: upstream.status, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
