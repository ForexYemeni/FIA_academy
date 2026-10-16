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
      // Telegram message link: need to get the message and extract file_id
      // Use getChat + forwardMessage or copyMessage to get the video file_id
      // Actually, we use the bot's getChat + getMessages (not available in Bot API)
      // Better approach: use the bot to copy the message to itself and get the file_id

      // Try forwardMessage to the bot itself (or to the same channel)
      // Actually, the simplest: use copyMessage to copy to the bot's chat
      // But bots can't message themselves. Let's use the channel approach.

      // The bot has access to the channel (it's a member). We can use
      // the Telegram Bot API to forward the message to the channel itself
      // (which doesn't create a duplicate) and get the file_id from the response.

      // Actually, the best approach: use getChat to verify, then
      // use the message_id with the Bot API's "forwardMessage" to the same channel
      // The forwardMessage response will contain the video with file_id

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
      } else {
        return NextResponse.json({ error: 'الرسالة لا تحتوي على فيديو' }, { status: 400 })
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
    const directUrl = `https://api.telegram.org/file/bot${token}/${filePath}`

    return NextResponse.json({ url: directUrl, file_id: resolvedFileId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
