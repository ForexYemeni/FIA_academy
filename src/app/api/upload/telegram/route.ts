import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileName, fileSize, caption } = body
    if (!fileName || !fileSize) {
      return NextResponse.json({ error: 'بيانات الملف غير مكتملة' }, { status: 400 })
    }

    // Get bot token + channel from site settings (or env defaults)
    const { data: settings } = await supabaseAdmin
      .from('site_settings')
      .select('*')
      .limit(1)
      .single()

    const botToken =
      settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '8648360001:AAEMyb7wP7heOQvoqqK9mQCA1LyOfO3o40A'
    const channelId =
      settings?.telegram_channel_id || process.env.TELEGRAM_CHANNEL_ID || '-1004391183203'

    // Return upload URL info for the client to upload directly to Telegram
    // Client will call https://api.telegram.org/bot{token}/sendVideo or sendDocument with form_data
    return NextResponse.json({
      botToken,
      channelId,
      endpoint: `https://api.telegram.org/bot${botToken}/sendVideo`,
      caption: caption || `FIA Upload — ${fileName}`,
      note: 'العميل يرفع الفيديو مباشرة إلى تيليجرام لتجنب قيود حجم الرفع',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
