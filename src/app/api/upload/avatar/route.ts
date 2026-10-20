import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/upload/avatar
// Body: FormData with file=File, user_id=string, role=string
//
// Uploads the file via Telegram (primary) and updates the user's avatar
// in the database. Falls back to a base64 data-URI if Telegram fails
// (so the user never gets stuck without an avatar).
// Returns { url, updated: true }

async function getBotSettings() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token, telegram_channel_id')
    .limit(1)
    .maybeSingle()
  if (error || !data) return { token: '', channelId: '' }
  return { token: data.telegram_bot_token || '', channelId: data.telegram_channel_id || '' }
}

async function uploadViaTelegram(file: File, botToken: string, channelId: string): Promise<{ url: string | null; error?: string }> {
  if (!botToken || !channelId) {
    return { url: null, error: 'إعدادات تيليجرام غير مُهيأة' }
  }
  try {
    const formData = new FormData()
    formData.append('chat_id', channelId)
    formData.append('photo', file)
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 55000)
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
        signal: ctrl.signal,
      })
      const data = await res.json()
      if (!data.ok) {
        return { url: null, error: data.description || 'Telegram API error' }
      }
      const photos = data.result?.photo
      const fileId = photos && photos.length > 0 ? photos[photos.length - 1].file_id : null
      if (!fileId) {
        return { url: null, error: 'file_id missing' }
      }
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`, {
        signal: ctrl.signal,
      })
      const fileData = await fileRes.json()
      if (!fileData.ok) {
        return { url: null, error: fileData.description || 'getFile failed' }
      }
      return { url: `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}` }
    } finally {
      clearTimeout(timeout)
    }
  } catch (e: any) {
    return { url: null, error: e.message || 'Network error' }
  }
}

// Fallback: convert the image to a base64 data URI.
// Works everywhere — no file server needed. Capped at 2MB so we
// don't bloat the database row.
async function uploadAsDataUri(file: File): Promise<{ url: string | null; error?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buf = Buffer.from(arrayBuffer)
    if (buf.length > 2 * 1024 * 1024) {
      return { url: null, error: 'حجم الصورة كبير جداً للنسخ الاحتياطي (الحد 2 ميجابايت)' }
    }
    const mime = file.type || 'image/jpeg'
    const b64 = buf.toString('base64')
    return { url: `data:${mime};base64,${b64}` }
  } catch (e: any) {
    return { url: null, error: e.message }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('user_id') as string
    const role = formData.get('role') as string

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'الملف يجب أن يكون صورة' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الملف كبير جداً (الحد 10 ميجابايت)' }, { status: 400 })
    }

    let url: string | null = null
    const { token, channelId } = await getBotSettings()

    // Try Telegram first
    if (token && channelId) {
      const tgResult = await uploadViaTelegram(file, token, channelId)
      if (tgResult.url) {
        url = tgResult.url
      } else {
        console.warn('Avatar Telegram upload failed:', tgResult.error)
      }
    }

    // Fallback to data URI
    if (!url) {
      const dataResult = await uploadAsDataUri(file)
      if (dataResult.url) {
        url = dataResult.url
      } else {
        return NextResponse.json({
          error: `فشل رفع الصورة. ${token ? 'تيليجرام فشل و' : ''}النسخة الاحتياطية فشلت: ${dataResult.error}`,
        }, { status: 500 })
      }
    }

    // Update the user's avatar in the database
    if (userId) {
      const tableName = role === 'trainer' ? 'trainers' : 'users'
      try {
        await supabaseAdmin
          .from(tableName)
          .update({ avatar: url })
          .eq('id', userId)
      } catch (e) {
        console.warn('Failed to update avatar in DB:', e)
      }
    }

    return NextResponse.json({ url, updated: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
