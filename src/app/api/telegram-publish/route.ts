import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// Telegram caption limit for sendPhoto
const TELEGRAM_CAPTION_LIMIT = 1024
const TELEGRAM_TEXT_LIMIT = 4096

// Escape HTML special characters so user-supplied content (course title,
// trainer name, etc.) can be safely embedded inside a Telegram HTML message.
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

// Build a professional Arabic Telegram message for the course.
// IMPORTANT: only trainer.name + trainer.title/specialization are surfaced —
// never the trainer's phone number, email, or any other personal contact info.
function buildMessage(course: CourseRow, trainer: TrainerRow | null, action: 'create' | 'update'): string {
  const isUpdate = action === 'update'
  const header = isUpdate ? '🔄 تم تحديث دورة' : '🎓 دورة جديدة متاحة الآن'

  const trainerName = trainer?.name || 'غير محدد'
  const trainerTitle = trainer?.title || trainer?.specialization || ''
  const trainerLine = trainerTitle
    ? `👨‍⚕️ المدرب: ${escapeHtml(trainerName)} — ${escapeHtml(trainerTitle)}`
    : `👨‍⚕️ المدرب: ${escapeHtml(trainerName)}`

  const isFree =
    (course.price_type || 'مجانية') === 'مجانية' || !course.price || course.price <= 0
  const priceLine = isFree
    ? '💰 السعر: مجانية'
    : `💰 السعر: ${course.price} ${escapeHtml(course.currency || 'ر.ي')}`

  const modulesCount = course.modules_count || 0
  const lessonsCount = course.lessons_count || 0
  const duration = course.duration_hours || 0

  const shortDesc = (course.short_description || '').trim()
  const shortDescLine = shortDesc ? `📝 الوصف: ${escapeHtml(shortDesc)}` : ''

  const lines: string[] = [
    `<b>${header}</b>`,
    '',
    `📋 العنوان: <b>${escapeHtml(course.title)}</b>`,
  ]
  if (shortDescLine) lines.push(shortDescLine)
  lines.push(
    `⏱️ المدة: ${duration} ساعة`,
    `📊 المستوى: ${escapeHtml(course.level || 'مبتدئ')}`,
    priceLine,
  )
  lines.push('')
  lines.push(trainerLine)
  lines.push('')
  lines.push(
    `📚 عدد الوحدات: ${modulesCount}`,
    `📖 عدد الدروس: ${lessonsCount}`,
  )
  lines.push('')
  lines.push('✅ سجل الآن في منصة FIA')
  lines.push('🔗 fiaacademy.vercel.app')

  return lines.join('\n')
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
// caption followed by a separate text message.
async function sendPhotoWithMessage(
  token: string,
  channelId: string,
  photoUrl: string,
  text: string
): Promise<{ ok: boolean; messageId: number | null; error?: string }> {
  if (text.length <= TELEGRAM_CAPTION_LIMIT) {
    // Caption fits — single sendPhoto call with caption
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        photo: photoUrl,
        caption: text,
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

  const msg = await sendTextMessage(token, channelId, text)
  return msg
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { course_id, action } = (body || {}) as {
      course_id?: string
      action?: 'create' | 'update'
    }

    if (!course_id) {
      return NextResponse.json({ error: 'course_id مطلوب' }, { status: 400 })
    }
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

    // 4) Build the message
    const text = buildMessage(course as CourseRow, trainer, finalAction)

    // 5) Send to Telegram
    const cover =
      typeof course.cover === 'string' && course.cover.trim() ? course.cover.trim() : null

    let result: { ok: boolean; messageId: number | null; error?: string }
    if (cover) {
      result = await sendPhotoWithMessage(token, channelId, cover, text)
    } else {
      result = await sendTextMessage(token, channelId, text)
    }

    if (!result.ok || result.messageId === null) {
      return NextResponse.json(
        { error: result.error || 'فشل إرسال الرسالة إلى تيليجرام' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message_id: result.messageId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
