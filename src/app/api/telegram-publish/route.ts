import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// Telegram message limits
const TELEGRAM_CAPTION_LIMIT = 1024
const TELEGRAM_TEXT_LIMIT = 4096

// Courses store their modules + lessons as JSON inside the `description` field
// after this separator. Same convention used by /api/modules and /api/lessons.
const MODULES_SEPARATOR = '\n\n===FIA_MODULES===\n'

// Registration link surfaced to learners in every course broadcast.
const REGISTRATION_LINK = 'fiaacademy.vercel.app'

// Escape HTML special characters so user-supplied content (course title,
// trainer name, lesson titles, etc.) can be safely embedded inside a Telegram
// HTML message.
function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

interface CourseRow {
  id: string
  title: string
  short_description: string | null
  description: string | null
  level: string | null
  price_type: string | null
  price: number | null
  currency: string | null
  duration_hours: number | null
  modules_count: number | null
  lessons_count: number | null
  cover: string | null
  trainer_id: string | null
}

interface TrainerRow {
  name: string
  title: string | null
  specialization: string | null
}

interface LessonShape {
  id?: string
  title?: string
  lesson_type?: string
  duration_minutes?: number | null
  position?: number
  is_preview?: boolean
}

interface ModuleShape {
  id?: string
  title?: string
  description?: string | null
  position?: number
  lessons?: LessonShape[]
}

// Split the raw `description` column into the human-readable description and the
// JSON-encoded modules array. Mirrors the parser used by /api/modules so the
// wire format stays in lockstep.
function parseCourseContent(
  description: string | null
): { description: string; modules: ModuleShape[] } {
  if (!description) return { description: '', modules: [] }
  const idx = description.indexOf(MODULES_SEPARATOR)
  if (idx === -1) return { description, modules: [] }
  const desc = description.substring(0, idx).trimEnd()
  const jsonStr = description.substring(idx + MODULES_SEPARATOR.length)
  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) {
      return { description: desc, modules: parsed as ModuleShape[] }
    }
  } catch {
    // fall through — treat as no modules
  }
  return { description: desc, modules: [] }
}

// Translate a lesson_type code (video/text/exam/pdf) into its Arabic label.
// Unknown values are escaped and surfaced verbatim so admins can spot typos.
function translateLessonType(type: unknown): string {
  const t = String(type || 'text').toLowerCase()
  if (t === 'video' || t === 'فيديو') return 'فيديو'
  if (t === 'text' || t === 'نص') return 'نص'
  if (t === 'exam' || t === 'اختبار') return 'اختبار'
  if (t === 'pdf') return 'PDF'
  return escapeHtml(t)
}

function buildTrainerLine(trainer: TrainerRow | null): string {
  const trainerName = trainer?.name || 'غير محدد'
  const trainerTitle = trainer?.title || trainer?.specialization || ''
  return trainerTitle
    ? `👨‍⚕️ المدرب: ${escapeHtml(trainerName)} — ${escapeHtml(trainerTitle)}`
    : `👨‍⚕️ المدرب: ${escapeHtml(trainerName)}`
}

function buildPriceLine(course: CourseRow): string {
  const isFree =
    (course.price_type || 'مجانية') === 'مجانية' ||
    !course.price ||
    course.price <= 0
  return isFree
    ? '💰 السعر: مجانية'
    : `💰 السعر: ${course.price} ${escapeHtml(course.currency || 'ر.ي')}`
}

// Message 1 caption — attached to the cover photo (or sent as plain text when
// the course has no cover). Kept compact to fit within Telegram's 1024-char
// caption budget: title + trainer + duration + level + price + link.
function buildCaption(
  course: CourseRow,
  trainer: TrainerRow | null,
  action: 'create' | 'update'
): string {
  const isUpdate = action === 'update'
  const header = isUpdate ? '🔄 تم تحديث دورة' : '🎓 دورة جديدة متاحة الآن'
  const duration = course.duration_hours || 0

  const lines: string[] = [
    `<b>${header}</b>`,
    '',
    `📋 العنوان: <b>${escapeHtml(course.title)}</b>`,
    buildTrainerLine(trainer),
    `⏱️ المدة: ${duration} ساعة`,
    `📊 المستوى: ${escapeHtml(course.level || 'مبتدئ')}`,
    buildPriceLine(course),
    '',
    `✅ سجل الآن في منصة FIA`,
    `🔗 ${REGISTRATION_LINK}`,
  ]
  return lines.join('\n')
}

// Message 2 (and possibly more if the description is very long) — the course
// description plus a compact "details" block (stats, trainer, price, link).
function buildDetailsMessages(
  course: CourseRow,
  trainer: TrainerRow | null,
  action: 'create' | 'update'
): string[] {
  const isUpdate = action === 'update'
  const header = isUpdate ? '🔄 تفاصيل الدورة المُحدّثة' : '📝 تفاصيل الدورة'

  const desc = (course.description || '').trim()
  const descBlock = desc ? `📝 الوصف:\n${escapeHtml(desc)}` : ''

  const modulesCount = course.modules_count || 0
  const lessonsCount = course.lessons_count || 0
  const duration = course.duration_hours || 0

  const detailsLines: string[] = [
    `<b>${header}</b>`,
    '',
    `⏱️ المدة: ${duration} ساعة`,
    `📊 المستوى: ${escapeHtml(course.level || 'مبتدئ')}`,
    `📚 عدد الوحدات: ${modulesCount}`,
    `📖 عدد الدروس: ${lessonsCount}`,
    buildPriceLine(course),
    buildTrainerLine(trainer),
    '',
    `✅ سجل الآن في منصة FIA`,
    `🔗 ${REGISTRATION_LINK}`,
  ]
  const detailsBlock = detailsLines.join('\n')

  const full = descBlock ? `${descBlock}\n\n${detailsBlock}` : detailsBlock

  // Chunk to respect Telegram's 4096-char message limit. Try to break on
  // newlines first, then on spaces, then hard-cut.
  return chunkText(full, TELEGRAM_TEXT_LIMIT)
}

// Messages 3+ — modules with their lessons listed underneath. Modules are
// batched into as few messages as possible while staying under 4096 chars.
// If a single module is itself too large, its lessons are split across
// multiple messages and the module header is repeated for context.
function buildModuleMessages(modules: ModuleShape[]): string[] {
  // Defensive copy + sort by position, lessons sorted within each module.
  const sorted = [...modules].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  )
  sorted.forEach((m) => {
    if (Array.isArray(m.lessons)) {
      m.lessons.sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      )
    }
  })

  const messages: string[] = []
  let currentBatch = ''

  const flush = () => {
    if (currentBatch) {
      messages.push(currentBatch)
      currentBatch = ''
    }
  }

  for (let mi = 0; mi < sorted.length; mi++) {
    const module = sorted[mi]
    const header = `📚 الوحدة ${mi + 1}: <b>${escapeHtml(
      module.title || 'بدون عنوان'
    )}</b>`

    const lessons = Array.isArray(module.lessons) ? module.lessons : []
    const lessonLines: string[] = lessons.map((lesson, li) => {
      const typeAr = translateLessonType(lesson.lesson_type)
      const dur =
        lesson.duration_minutes && Number(lesson.duration_minutes) > 0
          ? ` — ${lesson.duration_minutes} دقيقة`
          : ''
      const preview = lesson.is_preview ? ' 👁️ معاينة مجانية' : ''
      return `  📖 درس ${li + 1}: ${escapeHtml(
        lesson.title || 'بدون عنوان'
      )} (${typeAr}${dur})${preview}`
    })

    const moduleBlock = [header, ...lessonLines].join('\n')

    // Case 1: fits into the current batch — append it.
    if (
      currentBatch.length === 0 ||
      currentBatch.length + moduleBlock.length + 2 <= TELEGRAM_TEXT_LIMIT
    ) {
      currentBatch += (currentBatch ? '\n\n' : '') + moduleBlock
      continue
    }

    // Case 2: doesn't fit in current batch but fits on its own — flush, then
    // start a fresh batch with this module.
    if (moduleBlock.length <= TELEGRAM_TEXT_LIMIT) {
      flush()
      currentBatch = moduleBlock
      continue
    }

    // Case 3: module itself exceeds 4096 chars — split mid-lesson-list.
    // Each chunk restarts with the module header so the reader keeps context.
    flush()
    let chunk = header
    for (const line of lessonLines) {
      const candidate = chunk + '\n' + line
      if (candidate.length <= TELEGRAM_TEXT_LIMIT) {
        chunk = candidate
      } else {
        if (chunk) messages.push(chunk)
        chunk = `${header}\n${line}`.slice(0, TELEGRAM_TEXT_LIMIT)
      }
    }
    currentBatch = chunk
  }
  flush()

  return messages
}

// Split a long string into chunks ≤ max chars, preferring to break at newlines
// (then spaces) so we don't cut words or HTML-escaped entities mid-token.
function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text]
  const chunks: string[] = []
  let s = 0
  while (s < text.length) {
    if (text.length - s <= max) {
      chunks.push(text.substring(s))
      break
    }
    let e = s + max
    let breakAt = text.lastIndexOf('\n', e)
    if (breakAt <= s) breakAt = text.lastIndexOf(' ', e)
    if (breakAt <= s) breakAt = e
    chunks.push(text.substring(s, breakAt))
    s = breakAt
    // Skip the whitespace we broke on
    while (s < text.length && (text[s] === '\n' || text[s] === ' ')) s++
  }
  return chunks
}

// Fetch the Telegram bot token + channel id from site_settings.
async function getBotSettings(): Promise<{ token: string; channelId: string }> {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .single()
  if (error || !data) return { token: '', channelId: '' }
  return {
    token: data.telegram_bot_token || '',
    channelId: data.telegram_channel_id || '',
  }
}

// Send a plain text message to the channel (HTML parse mode).
async function sendTextMessage(
  token: string,
  channelId: string,
  text: string
): Promise<{ ok: boolean; messageId: number | null; error?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: channelId,
      text: text.slice(0, TELEGRAM_TEXT_LIMIT),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  const data = await res.json()
  if (!data.ok) {
    return { ok: false, messageId: null, error: data.description || 'sendMessage failed' }
  }
  return { ok: true, messageId: data.result?.message_id ?? null }
}

// Send a photo to the channel — either with caption (if it fits) or without
// caption followed by a separate text message. Returns the message id of the
// final text message (or the photo's id if no separate text was needed).
async function sendPhotoWithCaption(
  token: string,
  channelId: string,
  photoUrl: string,
  caption: string
): Promise<{ ok: boolean; messageId: number | null; error?: string }> {
  if (caption.length <= TELEGRAM_CAPTION_LIMIT) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        photo: photoUrl,
        caption: caption,
        parse_mode: 'HTML',
      }),
    })
    const data = await res.json()
    if (data.ok) {
      return { ok: true, messageId: data.result?.message_id ?? null }
    }
    // If sendPhoto with caption fails (e.g. caption parse error), fall through
    // to the photo-without-caption + separate-message strategy below.
  }

  // Caption is too long OR the captioned send failed — send photo without
  // caption, then send the text as a separate message.
  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: channelId, photo: photoUrl }),
  })

  const msg = await sendTextMessage(token, channelId, caption)
  return msg
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { course_id, action, lesson_title, lesson_type } = (body || {}) as {
      course_id?: string
      action?: string
      lesson_title?: string
      lesson_type?: string
    }

    if (!course_id) {
      return NextResponse.json({ error: 'course_id مطلوب' }, { status: 400 })
    }

    // Handle lesson/exam publishing
    if (action === 'lesson' && lesson_title) {
      const { token, channelId } = await getBotSettings()
      if (!token || !channelId) {
        return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة' }, { status: 500 })
      }

      // Fetch course title for context
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('title')
        .eq('id', course_id)
        .maybeSingle()

      const courseTitle = course?.title || 'دورة'
      const message = `📚 ${escapeHtml(lesson_type)} جديد في دورة: <b>${escapeHtml(courseTitle)}</b>\n\n📖 العنوان: <b>${escapeHtml(lesson_title)}</b>\n\n✅ سجل الآن في منصة FIA\n🔗 ${REGISTRATION_LINK}`

      const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })
      const sendData = await sendRes.json()
      if (!sendData.ok) {
        return NextResponse.json({ error: sendData.description || 'فشل الإرسال' }, { status: 500 })
      }
      return NextResponse.json({ success: true, message_id: sendData.result.message_id })
    }

    // Handle course create/update publishing
    const finalAction: 'create' | 'update' = action === 'update' ? 'update' : 'create'

    // 1) Fetch the course (by course_id) directly from the database
    const { data: course, error: courseErr } = await supabaseAdmin
      .from('courses')
      .select(
        'id, title, short_description, description, level, price_type, price, currency, duration_hours, modules_count, lessons_count, cover, trainer_id'
      )
      .eq('id', course_id)
      .maybeSingle()
    if (courseErr) throw courseErr
    if (!course) {
      return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })
    }

    // 2) Fetch the trainer (only public profile fields — no phone / email)
    let trainer: TrainerRow | null = null
    if (course.trainer_id) {
      const { data: t } = await supabaseAdmin
        .from('trainers')
        .select('name, title, specialization')
        .eq('id', course.trainer_id)
        .maybeSingle()
      if (t) trainer = t as TrainerRow
    }

    // 3) Get bot settings
    const { token, channelId } = await getBotSettings()
    if (!token || !channelId) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة' }, { status: 500 })
    }

    // 4) Parse the modules + lessons out of the description field so we can
    //    surface the full course outline, not just the high-level summary.
    const { modules } = parseCourseContent(course.description)

    // 5) Build the ordered set of messages:
    //    (a) caption — for the cover photo (or a standalone text msg)
    //    (b) description + details message(s)
    //    (c) module/lesson outline message(s)
    const caption = buildCaption(course as CourseRow, trainer, finalAction)
    const detailsMessages = buildDetailsMessages(
      course as CourseRow,
      trainer,
      finalAction
    )
    const moduleMessages = buildModuleMessages(modules)

    const cover =
      typeof course.cover === 'string' && course.cover.trim()
        ? course.cover.trim()
        : null

    const messageIds: number[] = []
    let firstError: string | undefined

    // (a) Caption: send as photo caption if cover exists, else as plain text.
    if (cover) {
      const result = await sendPhotoWithCaption(token, channelId, cover, caption)
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || 'فشل إرسال صورة الغلاف إلى تيليجرام' },
          { status: 500 }
        )
      }
      if (result.messageId !== null) messageIds.push(result.messageId)
    } else {
      const result = await sendTextMessage(token, channelId, caption)
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || 'فشل إرسال الرسالة إلى تيليجرام' },
          { status: 500 }
        )
      }
      if (result.messageId !== null) messageIds.push(result.messageId)
    }

    // (b) Description + details
    for (const msg of detailsMessages) {
      const result = await sendTextMessage(token, channelId, msg)
      if (!result.ok && !firstError) firstError = result.error
      if (result.messageId !== null) messageIds.push(result.messageId)
    }

    // (c) Modules + lessons
    for (const msg of moduleMessages) {
      const result = await sendTextMessage(token, channelId, msg)
      if (!result.ok && !firstError) firstError = result.error
      if (result.messageId !== null) messageIds.push(result.messageId)
    }

    if (messageIds.length === 0) {
      return NextResponse.json(
        { error: firstError || 'فشل إرسال الرسائل إلى تيليجرام' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message_id: messageIds[messageIds.length - 1],
      message_ids: messageIds,
      sent: messageIds.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
