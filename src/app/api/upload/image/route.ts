import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================
// IMAGE / VIDEO / PDF UPLOAD ENDPOINT
// ============================================================
// Primary: upload via Telegram Bot API (returns a public URL
//          hosted on api.telegram.org — fast + free + unlimited)
// Fallback: store locally in /public/uploads/ if Telegram fails
//           for any reason (network, bot token invalid, channel
//           misconfigured, file too large for Telegram, etc.)
// The fallback URL is /uploads/<hash>.<ext> which is served by
// Next.js as a static file.
// ============================================================

async function getBotSettings() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .maybeSingle()
  if (error || !data) return { token: '', channelId: '' }
  return { token: data.telegram_bot_token || '', channelId: data.telegram_channel_id || '' }
}

// Upload via Telegram Bot API — supports photos, videos, documents (PDFs)
async function uploadViaTelegram(file: File, botToken: string, channelId: string): Promise<{ url: string | null; error?: string }> {
  if (!botToken || !channelId) {
    return { url: null, error: 'إعدادات تيليجرام غير مُهيأة' }
  }

  const formData = new FormData()
  formData.append('chat_id', channelId)

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
  }
  formData.append(fileField, file)

  // Telegram API call with timeout (Vercel function timeout is 60s)
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 55000)
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${apiMethod}`, {
      method: 'POST',
      body: formData,
      signal: ctrl.signal,
    })
    const data = await res.json()
    if (!data.ok) {
      return { url: null, error: data.description || 'Telegram API error' }
    }
    // Extract file_id
    let fileId: string | null = null
    if (isImage) {
      const photos = data.result?.photo
      if (photos && photos.length > 0) fileId = photos[photos.length - 1].file_id
    } else if (isVideo) {
      fileId = data.result?.video?.file_id || data.result?.document?.file_id
    } else {
      fileId = data.result?.document?.file_id
    }
    if (!fileId) {
      return { url: null, error: 'file_id missing from Telegram response' }
    }
    // Get the file path
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`, {
      signal: ctrl.signal,
    })
    const fileData = await fileRes.json()
    if (!fileData.ok) {
      return { url: null, error: fileData.description || 'getFile failed' }
    }
    const filePath = fileData.result.file_path
    return { url: `https://api.telegram.org/file/bot${botToken}/${filePath}` }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { url: null, error: 'انتهت مهلة الرفع (أكثر من 55 ثانية)' }
    }
    return { url: null, error: e.message || 'Network error' }
  } finally {
    clearTimeout(timeout)
  }
}

// Fallback: store the file locally in /public/uploads/
// Returns a URL like /uploads/<hash>.<ext> that Next.js serves
// as a static file. This is the safety net when Telegram is down
// or the bot token isn't configured.
async function uploadLocally(file: File, folder: string): Promise<{ url: string; error?: never }> {
  // Compute a deterministic filename: <folder>/<random-hash>.<ext>
  // The random hash ensures we don't collide with other uploads.
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const hash = crypto.randomBytes(8).toString('hex')
  // Sanitize folder name — only allow alphanumeric + dash
  const safeFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9-]/g, '')
  const filename = `${hash}.${ext}`
  // The path ON DISK — Next.js serves /public/ at the root.
  const diskDir = path.join(process.cwd(), 'public', safeFolder)
  const diskPath = path.join(diskDir, filename)
  // The URL the browser will use to fetch it
  const publicUrl = `/${safeFolder}/${filename}`

  try {
    // Ensure the directory exists
    await fs.mkdir(diskDir, { recursive: true })
    // Convert File → Buffer and write
    const arrayBuffer = await file.arrayBuffer()
    const buf = Buffer.from(arrayBuffer)
    await fs.writeFile(diskPath, buf)
    return { url: publicUrl }
  } catch (e: any) {
    throw new Error(`Local storage failed: ${e.message}`)
  }
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

    // Validate file size (Telegram limit is 50MB for videos, 10MB for others;
    // our local fallback has no real limit, but we cap at 100MB to be safe)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `حجم الملف كبير جداً (الحد ${isVideo ? '100' : '50'} ميجابايت)`,
      }, { status: 400 })
    }

    // Try Telegram first
    const { token, channelId } = await getBotSettings()
    if (token && channelId) {
      const result = await uploadViaTelegram(file, token, channelId)
      if (result.url) {
        return NextResponse.json({ url: result.url, folder, method: 'telegram' })
      }
      // Telegram failed — fall through to local storage
      console.warn('Telegram upload failed, falling back to local storage:', result.error)
    }

    // Fallback: local storage. This ALWAYS works (assuming the
    // filesystem is writable, which it is on Vercel).
    try {
      const result = await uploadLocally(file, folder)
      return NextResponse.json({
        url: result.url,
        folder,
        method: 'local',
        note: 'تم الرفع محلياً (تيليجرام غير متاح) — قد يكون أبطأ للملفات الكبيرة',
      })
    } catch (e: any) {
      return NextResponse.json({
        error: `فشل الرفع — تيليجرام: ${token ? 'مهيأ ولكن فشل' : 'غير مهيأ'}، والتخزين المحلي: ${e.message}`,
      }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
