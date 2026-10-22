import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthUser,
  signMediaToken,
  rateLimit,
  clientIp,
  tooMany,
} from '@/lib/api-auth'
import { resolveAudioLesson, isAudioLesson, checkAudioAccess } from '@/lib/lesson-access'

export const runtime = 'nodejs'

// ═══════════════════════════════════════════════════════════════
// 🎫 إصدار رمز البث الإعلامي للدروس الصوتية
// ───────────────────────────────────────────────────────────────
// عنصر <audio> لا يستطيع إرسال ترويسات Authorization، لذا كانت البوابة
// ترى الطلب بلا هوية → 403 → «تعذّر تحميل الصوت».
// الحل: الواجهة تطلب رمزاً من هنا (طلب عادي يحمل التوقيع عبر جسر
// المصادقة) ثم تُلحق الرمز برابط البث كوسيط mt قصير العمر (15 دقيقة)
// ومرتبط بدرس واحد وحساب واحد — والبوابة تعيد فحص الصلاحيات كاملة.
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    // حد محاولات: 60 طلب/دقيقة لكل IP — كافٍ للتشغيل الطبيعي
    const rl = rateLimit(`audio-token:${clientIp(req)}`, 60, 60_000)
    if (!rl.ok) return tooMany(rl.retryAfterSec)

    const lessonId = req.nextUrl.searchParams.get('lesson_id')
    const courseId = req.nextUrl.searchParams.get('course_id')
    if (!lessonId) {
      return NextResponse.json({ error: 'lesson_id مطلوب' }, { status: 400 })
    }

    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 })
    }

    const resolved = await resolveAudioLesson(lessonId, courseId)
    if (!resolved || !resolved.lesson) {
      return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404 })
    }
    const { course, lesson } = resolved

    if (!isAudioLesson(lesson)) {
      return NextResponse.json({ error: 'هذا الدرس ليس درساً صوتياً' }, { status: 404 })
    }

    const allowed = await checkAudioAccess(user, course, lesson)
    if (!allowed) {
      return NextResponse.json(
        { error: 'هذا الدرس متاح للمسجلين في الدورة فقط' },
        { status: 403 }
      )
    }

    const mt = await signMediaToken(user.id, lessonId)
    const url =
      `/api/lessons/audio-stream?lesson_id=${encodeURIComponent(lessonId)}` +
      (courseId ? `&course_id=${encodeURIComponent(courseId)}` : '') +
      `&mt=${encodeURIComponent(mt)}`

    return NextResponse.json({ url, expiresIn: 900 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'خطأ غير متوقع' },
      { status: 500 }
    )
  }
}
