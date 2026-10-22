import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 15

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

// Resolve a Telegram message link or file_id to a direct file URL
export async function GET(req: NextRequest) {
  try {
    const { token } = await getBotSettings()
    if (!token) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة' }, { status: 500 })
    }

    const channelId = req.nextUrl.searchParams.get('channel_id')
    const messageId = req.nextUrl.searchParams.get('message_id')
    const fileId = req.nextUrl.searchParams.get('file_id')

    let resolvedFileId: string | null = null

    if (fileId) {
      // Direct file_id provided
      resolvedFileId = fileId
    } else if (channelId && messageId) {
      // ⚡ ROYAL DEDUP: the resolved file_id is cached per (channel, message).
      // Previously EVERY preview/open forwarded the message to the channel again
      // — flooding it with duplicates. Now: cache hit → zero Telegram calls;
      // cache miss → forward ONCE, grab the file_id, delete the temporary
      // forward so the channel stays pristine, and cache it forever.
      const cacheKey = `msg:${channelId}:${messageId}`
      try {
        const { data: cached } = await supabaseAdmin
          .from('telegram_file_cache')
          .select('file_id')
          .eq('cache_key', cacheKey)
          .maybeSingle()
        if (cached?.file_id) {
          resolvedFileId = cached.file_id
        }
      } catch {}

      if (!resolvedFileId) {
        const fwdRes = await fetch(
          `https://api.telegram.org/bot${token}/forwardMessage?chat_id=${channelId}&from_chat_id=${channelId}&message_id=${messageId}`
        )
        const fwdData = await fwdRes.json()

        if (!fwdData.ok) {
          return NextResponse.json({
            error: 'فشل في جلب الرسالة من تيليجرام: ' + (fwdData.description || '')
          }, { status: 500 })
        }

        // Extract video file_id from the forwarded message
        const video = fwdData.result?.video || fwdData.result?.document
        if (video && video.file_id) {
          resolvedFileId = video.file_id
          // Persist the resolution forever — never forward this message again
          try {
            await supabaseAdmin
              .from('telegram_file_cache')
              .upsert({ cache_key: cacheKey, file_id: resolvedFileId }, { onConflict: 'cache_key' })
          } catch {}
          // Delete the temporary forward so the channel shows no duplicates
          const fwdMessageId = fwdData.result?.message_id
          if (fwdMessageId) {
            fetch(`https://api.telegram.org/bot${token}/deleteMessage?chat_id=${channelId}&message_id=${fwdMessageId}`).catch(() => {})
          }
        } else {
          return NextResponse.json({ error: 'الرسالة لا تحتوي على فيديو' }, { status: 400 })
        }
      }
    } else {
      return NextResponse.json({ error: 'file_id أو (channel_id + message_id) مطلوب' }, { status: 400 })
    }

    if (!resolvedFileId) {
      return NextResponse.json({ error: 'تعذر الحصول على file_id' }, { status: 500 })
    }

    // Now use getFile to get the file path
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${resolvedFileId}`
    )
    const fileData = await fileRes.json()

    if (!fileData.ok) {
      return NextResponse.json({
        error: 'فشل في جلب مسار الملف: ' + (fileData.description || '')
      }, { status: 500 })
    }

    const filePath = fileData.result.file_path
    // 🛡️ الروابط الملكية الآمنة: بروكسي بث داخلي بلا توكن — كان الرابط يضمّن
    //    `bot<TOKEN>/...` فيكشف توكن البوت لكل طالب يفتح درساً!
    const safeUrl = `/api/telegram-file/stream?file_id=${encodeURIComponent(resolvedFileId)}`

    return NextResponse.json({ url: safeUrl, file_id: resolvedFileId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
