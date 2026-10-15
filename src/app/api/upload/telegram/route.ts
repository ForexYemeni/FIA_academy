import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileName, fileSize, caption } = body
    if (!fileName || !fileSize) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const { data: settings } = await supabaseAdmin.from('site_settings').select('*').limit(1).single()
    const botToken = settings?.telegram_bot_token || '8648360001:AAEMyb7wP7heOQvoqqK9mQCA1LyOfO3o40A'
    const channelId = settings?.telegram_channel_id || '-1004391183203'

    return NextResponse.json({
      botToken,
      channelId,
      endpoint: `https://api.telegram.org/bot${botToken}/sendVideo`,
      caption: caption || `FIA Upload — ${fileName}`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
