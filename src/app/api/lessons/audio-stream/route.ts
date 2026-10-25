import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAuthUserBySub, verifyMediaToken } from '@/lib/api-auth'
import { getBotToken, resolveAudioLesson, isAudioLesson, checkAudioAccess } from '@/lib/lesson-access'

export const runtime = 'nodejs'
export const maxDuration = 60

// ═══════════════════════════════════════════════════════════════
// 🛡️ بوابة بث الدروس الصوتية الملكية — الحماية أولاً
// ───────────────────────────────────────────────────────────────
// 1) تُحلّل هوية الطالب/المدرب/الإدارة من الجلسة — إما من الترويسة
//    (Authorization) أو من رمز البث الإعلامي mt الذي يصدره
//    /api/lessons/audio-token (لأن عنصر <audio> لا يرسل ترويسات).
// 2) تتحقق من صلاحية الوصول للدرس: الإدارة، أو المدرب المالك،
//    أو متدرب دفع مكتمل، أو درس معاينة مجاني — وإلا 403.
// 3) تسحب الملف من تيليجرام بالتوكن داخل الخادم فقط (لا يغادر
//    التوكن أبداً) وتبثه مع دعم Range للتقديم/الإرجاع الفوري.
// ═══════════════════════════════════════════════════════════════

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

    if (!isAudioLesson(lesson)) {
      return NextResponse.json({ error: 'هذا الدرس ليس درساً صوتياً' }, { status: 404 })
    }

    // ═══ بوابة الهوية ═══
    // المسار 1: الترويسة (طلب fetch عادي عبر جسر المصادقة).
    // المسار 2: رمز البث mt — يصدر من /api/lessons/audio-token بعد فحص
    //   الصلاحيات، ومرتبط بدرس واحد وحساب واحد وينتهي خلال 15 دقيقة.
    //   الرمز يحمل الهوية فقط — فحص الصلاحيات يعاد هنا كاملاً كل مرة.
    let authUser = await getAuthUser(req)
    if (!authUser) {
      const mt = req.nextUrl.searchParams.get('mt')
      if (mt) {
        const payload = await verifyMediaToken(mt)
        // الرمز مرتبط بالدرس نفسه — لا إعادة استخدام لرمز درس آخر
        if (payload && payload.lid === lessonId) {
          authUser = await getAuthUserBySub(payload.sub)
        }
      }
    }

    // ═══ بوابة الصلاحيات (تعاد كاملة في كل الطلبات مهما كان مسار الهوية) ═══
    const allowed = await checkAudioAccess(authUser, course, lesson)
    if (!allowed) {
      return NextResponse.json(
        { error: 'هذا الدرس متاح للمسجلين في الدورة فقط' },
        { status: 403 }
      )
    }

    // ═══ البث من التخزين الملكي المباشر أو تيليجرام ═══
    // 👑 v10.6 — audio_file_id يقبل الآن رابطاً مباشراً (التخزين الملكي للصوت
    // الكبير >19MB): إذا بدأ بـhttp نوجه (302) إلى الرابط مباشرة بعد اجتياز
    // البوابة كاملة — المشغّل يتبع التوجيه والبث يدعم Range أصلاً. معرفات
    // تيليجرام لا تبدأ أبداً بـhttp فلا لبس إطلاقاً.
    if (/^https?:\/\//i.test(lesson.audio_file_id || '')) {
      return NextResponse.redirect(lesson.audio_file_id, 302)
    }

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
