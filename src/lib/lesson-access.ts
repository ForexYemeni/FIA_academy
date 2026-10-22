// ═══════════════════════════════════════════════════════════════
// 🎙️ الدروس الصوتية الملكية — منطق مشترك للوصول والتحليل
// ───────────────────────────────────────────────────────────────
// مستخدم من طرفين:
//   1) /api/lessons/audio-token  — إصدار رمز بث قصير العمر
//   2) /api/lessons/audio-stream — بوابة البث الفعلية
// منطق واحد مركزي = صلاحيات مطابقة حرفياً في المسارين (لا فجوة).
// ═══════════════════════════════════════════════════════════════

import { supabaseAdmin } from '@/lib/supabase'
import type { AuthUser } from './api-auth'

export const MODULES_SEPARATOR = '\n\n===FIA_MODULES===\n'

export async function getBotToken(): Promise<string> {
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

export function parseCourseContent(description: string | null): { modules: any[] } {
  if (!description) return { modules: [] }
  const idx = description.indexOf(MODULES_SEPARATOR)
  if (idx === -1) return { modules: [] }
  try {
    const modules = JSON.parse(description.substring(idx + MODULES_SEPARATOR.length))
    if (Array.isArray(modules)) return { modules }
  } catch {}
  return { modules: [] }
}

export interface ResolvedAudioLesson {
  course: any
  lesson: any
}

/** تحليل الدرس الصوتي من JSON الدورة — course_id اختياري لتخطي المسح الكامل */
export async function resolveAudioLesson(
  lessonId: string,
  courseId?: string | null
): Promise<ResolvedAudioLesson | null> {
  const { data: courses } = courseId
    ? await supabaseAdmin
        .from('courses')
        .select('id, description, trainer_id')
        .eq('id', courseId)
        .limit(1)
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

export function isAudioLesson(lesson: any): boolean {
  return (lesson?.lesson_type || lesson?.type) === 'audio' && !!lesson?.audio_file_id
}

/**
 * بوابة الصلاحيات المطابقة لعقد GET /api/lessons:
 * الإدارة، أو المدرب المالك، أو متدرب بدفعة مكتملة، أو درس معاينة مجاني.
 */
export async function checkAudioAccess(
  user: AuthUser | null,
  course: any,
  lesson: any
): Promise<boolean> {
  if (!user) return !!lesson?.is_preview
  if (user.role === 'admin') return true
  if (user.role === 'trainer' && course?.trainer_id) {
    if (course.trainer_id === user.id) return true
    const { data: tRow } = await supabaseAdmin
      .from('trainers')
      .select('email, id')
      .eq('id', course.trainer_id)
      .maybeSingle()
    return !!(tRow && (tRow.email === user.email || tRow.id === user.id))
  }
  const { data: enr } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course?.id)
    .eq('status', 'مكتمل')
    .limit(1)
  if (enr && enr.length > 0) return true
  return !!lesson?.is_preview
}
