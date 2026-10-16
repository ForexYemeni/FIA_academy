import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// Get bot settings from site_settings
async function getBotSettings() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .single()
  if (error || !data) return { token: '', channelId: '' }
  return { token: data.telegram_bot_token || '', channelId: data.telegram_channel_id || '' }
}

// Upload file via Telegram Bot API — supports photos, videos, and documents (PDFs)
async function uploadViaTelegram(file: File, botToken: string, channelId: string): Promise<string | null> {
  if (!botToken || !channelId) return null

  const formData = new FormData()
  formData.append('chat_id', channelId)

  // Classify file type
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  let apiMethod = 'sendDocument'
  let fileField = 'document'

  if (isImage) {
    apiMethod = 'sendPhoto'
    fileField = 'photo'
  } else if (isVideo) {
    apiMethod = 'sendVideo'
    fileField = 'video'
  } else if (isPdf) {
    apiMethod = 'sendDocument'
    fileField = 'document'
  }

  formData.append(fileField, file)

  // Send to Telegram
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${apiMethod}`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!data.ok) return null

  // Extract file_id from the response
  let fileId: string | null = null
  if (isImage) {
    const photos = data.result?.photo
    if (photos && photos.length > 0) fileId = photos[photos.length - 1].file_id
  } else if (isVideo) {
    fileId = data.result?.video?.file_id || data.result?.document?.file_id
  } else {
    fileId = data.result?.document?.file_id
  }

  if (!fileId) return null

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

    // Validate file type — accept images, videos, and PDFs
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    if (!isImage && !isVideo && !isPdf) {
      return NextResponse.json({ error: 'الملف يجب أن يكون صورة أو فيديو أو PDF' }, { status: 400 })
    }

    // Validate file size
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for video, 10MB for others
    if (file.size > maxSize) {
      return NextResponse.json({ error: `حجم الملف كبير جداً (الحد ${isVideo ? '50' : '10'} ميجابايت)` }, { status: 400 })
    }

    const { token, channelId } = await getBotSettings()

    if (!token || !channelId) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة. راجع إعدادات الموقع.' }, { status: 500 })
    }

    const url = await uploadViaTelegram(file, token, channelId)

    if (!url) {
      return NextResponse.json({ error: 'فشل رفع الملف. حاول مرة أخرى.' }, { status: 500 })
    }

    return NextResponse.json({ url, folder })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
