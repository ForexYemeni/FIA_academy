import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// 🛡️ بروكسي بث الملفات الملكي — يجلب الملف من تلجرام بالتوكن داخل الخادم
// ويبثه للعميل مباشرة. التوكن لا يظهر في أي رابط يصل للمتصفح — إغلاق كامل
// لأخطر تسريب في الأكاديمية (كان التوكن مضمّناً في كل روابط الفيديو).

async function getBotToken(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('telegram_bot_token')
    .limit(1)
    .single()
  return data?.telegram_bot_token || ''
}

export async function GET(req: NextRequest) {
  try {
    const token = await getBotToken()
    if (!token) {
      return NextResponse.json({ error: 'إعدادات تيليجرام غير مُهيأة' }, { status: 500 })
    }

    const fileId = req.nextUrl.searchParams.get('file_id')
    const legacyPath = req.nextUrl.searchParams.get('path')
    if (!fileId && !legacyPath) {
      return NextResponse.json({ error: 'file_id أو path مطلوب' }, { status: 400 })
    }

    let filePath = legacyPath || ''
    if (!filePath && fileId) {
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`)
      const fileData = await fileRes.json()
      if (!fileData.ok || !fileData.result?.file_path) {
        return NextResponse.json({ error: 'فشل في جلب مسار الملف من تيليجرام' }, { status: 502 })
      }
      filePath = fileData.result.file_path
    }

    const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'الملف غير متاح من تيليجرام' }, { status: 502 })
    }

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
    const len = upstream.headers.get('content-length')
    if (len) headers.set('Content-Length', len)
    headers.set('Cache-Control', 'private, max-age=3600')
    headers.set('Content-Disposition', 'inline')

    return new NextResponse(upstream.body, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
