import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const text = req.nextUrl.searchParams.get('text')
    const size = parseInt(req.nextUrl.searchParams.get('size') || '200')
    if (!text) {
      return NextResponse.json({ error: 'text param required' }, { status: 400 })
    }
    const pngBuffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: size,
      margin: 1,
      color: { dark: '#0B1635', light: '#FFFFFF' },
    })
    const headers = new Headers()
    headers.set('Content-Type', 'image/png')
    headers.set('Cache-Control', 'public, max-age=3600')
    return new NextResponse(pngBuffer, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
