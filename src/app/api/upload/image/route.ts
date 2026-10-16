import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// Upload a file via Telegram Bot → get public URL.
// Handles three file categories:
//   • images     → sendPhoto
//   • videos     → sendVideo
//   • documents  → sendDocument (PDFs, etc.)
// The route is named /api/upload/image for historical reasons but is used as the
// generic Telegram-backed upload endpoint across the FIA admin UI.

async function getBotSettings() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .single()
  if (error || !data) return { token: '', channelId: '' }
  return { token: data.telegram_bot_token || '', channelId: data.telegram_channel_id || '' }
}

type TgFileKind = 'photo' | 'video' | 'document'

function classifyFile(file: File): TgFileKind {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return 'photo'
  if (type.startsWith('video/')) return 'video'
  // Everything else (including application/pdf) goes through sendDocument
  return 'document'
}

async function uploadViaTelegram(
  file: File,
  botToken: string,
  channelId: string,
  caption?: string
): Promise<string | null> {
  if (!botToken || !channelId) return null

  const kind = classifyFile(file)
  const formData = new FormData()
  formData.append('chat_id', channelId)
  if (caption) formData.append('caption', caption)

  let endpoint = 'sendDocument'
  let fileField = 'document'
  if (kind === 'photo') {
    endpoint = 'sendPhoto'
    fileField = 'photo'
  } else if (kind === 'video') {
    endpoint = 'sendVideo'
    fileField = 'video'
  }
  formData.append(fileField, file)

  const res = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!data.ok) return null

  // Locate the file_id inside the Telegram response (different shapes per endpoint).
  const result = data.result || {}
  let fileId: string | undefined
  if (kind === 'photo') {
    const photos = result.photo
    if (Array.isArray(photos) && photos.length > 0) {
      fileId = photos[photos.length - 1].file_id
    }
  } else if (kind === 'video') {
    fileId = result.video?.file_id || result.document?.file_id
  } else {
    fileId = result.document?.file_id
  }

  if (!fileId) return null

  // Resolve the direct downloadable URL via getFile.
  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok || !fileData.result?.file_path) return null

  return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'images'
    const caption = (formData.get('caption') as string) || undefined

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 })
    }

    // 50 MB upper bound — covers large videos/PDFs while staying within
    // Telegram's bot API limit (50 MB for sendDocument/sendVideo, 10 MB for photos).
    const isImage = (file.type || '').startsWith('image/')
    const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `حجم الملف كبير جداً (الحد ${isImage ? '10' : '50'} ميجابايت)` },
        { status: 400 }
      )
    }

    const { token, channelId } = await getBotSettings()

    if (!token || !channelId) {
      return NextResponse.json(
        { error: 'إعدادات تيليجرام غير مُهيأة. راجع إعدادات الموقع.' },
        { status: 500 }
      )
    }

    const url = await uploadViaTelegram(file, token, channelId, caption)

    if (!url) {
      return NextResponse.json({ error: 'فشل رفع الملف. حاول مرة أخرى.' }, { status: 500 })
    }

    return NextResponse.json({ url, folder, kind: classifyFile(file) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
