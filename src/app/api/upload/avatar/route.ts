import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// Upload avatar via Telegram Bot → get public URL, then persist to the DB record
async function getBotSettings() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .single()
  if (error || !data) return { token: '', channelId: '' }
  return { token: data.telegram_bot_token || '', channelId: data.telegram_channel_id || '' }
}

async function uploadViaTelegram(file: File, botToken: string, channelId: string): Promise<string | null> {
  if (!botToken || !channelId) return null

  const formData = new FormData()
  formData.append('chat_id', channelId)
  formData.append('photo', file)

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!data.ok) return null

  const photos = data.result?.photo
  if (!photos || photos.length === 0) return null
  const fileId = photos[photos.length - 1].file_id

  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok) return null

  const filePath = fileData.result.file_path
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`
}

// Persist the avatar URL to the correct DB table based on role.
// For team members (password starts with __TEAM_MEMBER__), we still update the trainers row —
// the avatar column is the same.
async function persistAvatar(userId: string, role: string, url: string): Promise<void> {
  if (role === 'trainer') {
    await supabaseAdmin
      .from('trainers')
      .update({ avatar: url })
      .eq('id', userId)
  } else if (role === 'student') {
    await supabaseAdmin
      .from('users')
      .update({ avatar: url })
      .eq('id', userId)
  } else if (role === 'team') {
    // Team members live in the trainers table — same update path
    await supabaseAdmin
      .from('trainers')
      .update({ avatar: url })
      .eq('id', userId)
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = (formData.get('user_id') as string) || ''
    const role = (formData.get('role') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'الملف يجب أن يكون صورة' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الصورة كبير جداً (الحد 5 ميجابايت)' }, { status: 400 })
    }

    const { token, channelId } = await getBotSettings()

    if (!token || !channelId) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة' }, { status: 500 })
    }

    const url = await uploadViaTelegram(file, token, channelId)

    if (!url) {
      return NextResponse.json({ error: 'فشل رفع الصورة' }, { status: 500 })
    }

    // Persist to DB so admin / homepage see the new avatar immediately
    if (userId && role) {
      try {
        await persistAvatar(userId, role, url)
      } catch {
        // Non-fatal — the URL is still returned to the client which can update its own state.
      }
    }

    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
