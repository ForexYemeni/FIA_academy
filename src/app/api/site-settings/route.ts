import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('site_settings').select('*').limit(1).single()
    if (error) {
      // No settings row yet — return defaults
      return NextResponse.json({
        academy_name: 'أكاديمية المستقبل الدولية',
        phone: '+967 700 000 000',
        email: 'info@fia.edu',
        address: 'صنعاء، الجمهورية اليمنية',
        telegram_bot_token: '',
        telegram_channel_id: '',
      })
    }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    // Try update first
    const existing = await supabaseAdmin.from('site_settings').select('id').limit(1).single()
    if (existing.data) {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existing.data.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    } else {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .insert({ ...body, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
