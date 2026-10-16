import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// Upload image via Telegram Bot → get public URL
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

  // Send photo to Telegram
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!data.ok) return null

  // Get file_id from the largest photo
  const photos = data.result?.photo
  if (!photos || photos.length === 0) return null
  const fileId = photos[photos.length - 1].file_id

  // Get file path
  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok) return null

  const filePath = fileData.result.file_path
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'images'

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'الملف يجب أن يكون صورة' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الصورة كبير جداً (الحد 10 ميجابايت)' }, { status: 400 })
    }

    const { token, channelId } = await getBotSettings()

    if (!token || !channelId) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة. راجع إعدادات الموقع.' }, { status: 500 })
    }

    const url = await uploadViaTelegram(file, token, channelId)

    if (!url) {
      return NextResponse.json({ error: 'فشل رفع الصورة. حاول مرة أخرى.' }, { status: 500 })
    }

    return NextResponse.json({ url, folder })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
