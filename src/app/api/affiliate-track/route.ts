import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/affiliate-track?code=FIA-XXX — record a click on a referral link.
// The visitor IP is used to dedupe clicks (one click per IP per 24h).
export async function POST(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (!code) return NextResponse.json({ valid: false }, { status: 400 })

    // Look up the affiliate by code
    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id, status')
      .eq('unique_code', code)
      .eq('status', 'نشط')
      .maybeSingle()
    if (!affiliate) return NextResponse.json({ valid: false }, { status: 404 })

    // Get the visitor IP (Vercel puts the real client IP in x-forwarded-for)
    const xff = req.headers.get('x-forwarded-for') || ''
    const ip = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || '0.0.0.0'
    const ua = req.headers.get('user-agent') || ''

    // Dedupe — only one click per IP per 24h
    const since = new Date(Date.now() - 86400000).toISOString()
    const { data: existing } = await supabaseAdmin
      .from('affiliate_clicks')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('visitor_ip', ip)
      .gte('created_at', since)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ valid: true, dedupe: true })
    }

    // Record the click
    const { error } = await supabaseAdmin
      .from('affiliate_clicks')
      .insert({
        affiliate_id: affiliate.id,
        visitor_ip: ip,
        user_agent: ua,
      })
    if (error) throw error

    return NextResponse.json({ valid: true, dedupe: false })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
