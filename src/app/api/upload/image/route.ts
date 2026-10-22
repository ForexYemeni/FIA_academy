import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { guardAdmin, guardStaff, guardAuth } from '@/lib/api-auth'

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

// ⚡ ROYAL UPLOAD-ONCE: every unique file (by content hash) is uploaded to
// Telegram EXACTLY ONCE — re-uploading the same video/PDF/image instantly
// returns the stored URL without sending a new message to the channel.
async function findCachedUpload(hash: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('telegram_upload_cache')
      .select('url')
      .eq('content_hash', hash)
      .maybeSingle()
    return data?.url || null
  } catch {
    return null
  }
}

async function cacheUpload(hash: string, url: string, fileId: string | null, kind: string) {
  try {
    await supabaseAdmin
      .from('telegram_upload_cache')
      .upsert({ content_hash: hash, url, file_id: fileId, kind }, { onConflict: 'content_hash' })
  } catch {}
}

// Upload via Telegram Bot API — supports photos, videos, documents (PDFs), and audio (sendAudio)
async function uploadViaTelegram(file: File, botToken: string, channelId: string): Promise<{ url: string | null; error?: string; file_id?: string | null; duration?: number; mime?: string }> {
  if (!botToken || !channelId) {
    return { url: null, error: 'إعدادات تيليجرام غير مُهيأة' }
  }

  const formData = new FormData()
  formData.append('chat_id', channelId)

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isAudio = file.type.startsWith('audio/')

  let apiMethod = 'sendDocument'
  let fileField = 'document'
  if (isImage) {
    apiMethod = 'sendPhoto'
    fileField = 'photo'
  } else if (isVideo) {
    apiMethod = 'sendVideo'
    fileField = 'video'
  } else if (isAudio) {
    // 🎙️ sendAudio يحفظ الصوت بصيغته الأصلية كاملة الجودة مع المدة تلقائياً
    apiMethod = 'sendAudio'
    fileField = 'audio'
    formData.append('title', (formData.get('caption') as string) || 'FIA Audio Lesson')
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
    let audioDuration: number | undefined
    let audioMime: string | undefined
    if (isImage) {
      const photos = data.result?.photo
      if (photos && photos.length > 0) fileId = photos[photos.length - 1].file_id
    } else if (isVideo) {
      fileId = data.result?.video?.file_id || data.result?.document?.file_id
    } else if (isAudio) {
      fileId = data.result?.audio?.file_id || data.result?.document?.file_id
      audioDuration = data.result?.audio?.duration
      audioMime = data.result?.audio?.mime_type
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
    // 🛡️ رابط ملكي آمن عبر البروكسي — التوكن لا يغادر الخادم أبداً
    return { url: `/api/telegram-file/stream?path=${encodeURIComponent(filePath)}`, file_id: fileId, duration: audioDuration, mime: audioMime }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { url: null, error: 'انتهت مهلة الرفع (أكثر من 55 ثانية)' }
    }
    return { url: null, error: e.message || 'Network error' }
  } finally {
    clearTimeout(timeout)
  }
}

// Fallback: store the file locally. On Vercel, /public is read-only,
// so we use /tmp (writable) and return a data: URI (base64) that
// works everywhere — no file serving needed. For large files (>2MB),
// we skip the data URI (too big) and return the error so the caller
// can retry with Telegram.
async function uploadLocally(file: File, folder: string): Promise<{ url: string; error?: never }> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const hash = crypto.randomBytes(8).toString('hex')
  const safeFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9-]/g, '')
  const filename = `${hash}.${ext}`

  // Try /tmp first (writable on Vercel + all platforms)
  const tmpDir = path.join('/tmp', safeFolder)
  const tmpPath = path.join(tmpDir, filename)
  try {
    await fs.mkdir(tmpDir, { recursive: true })
    const arrayBuffer = await file.arrayBuffer()
    const buf = Buffer.from(arrayBuffer)
    await fs.writeFile(tmpPath, buf)
    // Convert to data URI so it works without a file server
    const mime = file.type || 'application/octet-stream'
    // Only use data URI for small files (<2MB) to avoid huge payloads
    if (buf.length < 2 * 1024 * 1024) {
      const b64 = buf.toString('base64')
      return { url: `data:${mime};base64,${b64}` }
    }
    // For larger files, return a /tmp path (won't be served, but at
    // least the upload technically succeeded — caller can retry)
    throw new Error('File too large for data URI fallback')
  } catch (e: any) {
    throw new Error(`Local storage failed: ${e.message}`)
  }
}

export async function POST(req: NextRequest) {
  try {
  const g = await guardAuth(req); if (!g.ok) return g.res
    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'images'

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 })
    }

    // Validate file type — accept images, videos, PDFs, and audio
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isAudio = file.type.startsWith('audio/')

    if (!isImage && !isVideo && !isPdf && !isAudio) {
      return NextResponse.json({ error: 'الملف يجب أن يكون صورة أو فيديو أو PDF أو صوت' }, { status: 400 })
    }

    // Validate file size (Telegram limit is 50MB for videos, 10MB for others;
    // our local fallback has no real limit, but we cap at 100MB to be safe)
    // 🎙️ الصوت: سقف 19MB — لأن بث getFile من تيليجرام محدود بـ 20MB
    const maxSize = isVideo ? 100 * 1024 * 1024 : isAudio ? 19 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        error: isAudio
          ? 'حجم الصوت كبير جداً (الحد 19 ميجابايت ≈ ساعة صوت واضح — قسّم الدرس لأجزاء)'
          : `حجم الملف كبير جداً (الحد ${isVideo ? '100' : '50'} ميجابايت)`,
      }, { status: 400 })
    }

    // ⚡ ROYAL UPLOAD-ONCE — dedup by content hash before any Telegram call
    const buf = Buffer.from(await file.arrayBuffer())
    const contentHash = crypto.createHash('sha1').update(buf).digest('hex')
    const kind = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'pdf'
    const cachedUrl = await findCachedUpload(contentHash)
    if (cachedUrl) {
      return NextResponse.json({ url: cachedUrl, folder, method: 'telegram', deduped: true })
    }

    // Try Telegram first
    const { token, channelId } = await getBotSettings()
    if (token && channelId) {
      const result = await uploadViaTelegram(file, token, channelId)
      if (result.url) {
        await cacheUpload(contentHash, result.url, result.file_id || null, kind)
        return NextResponse.json({
          url: result.url,
          folder,
          method: 'telegram',
          file_id: result.file_id || null,
          duration: result.duration ?? null,
          mime: result.mime || file.type || null,
          size: file.size,
        })
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
