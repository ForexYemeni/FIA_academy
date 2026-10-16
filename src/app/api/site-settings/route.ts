import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Default settings (returned if table is empty OR columns don't exist)
const DEFAULTS = {
  academy_name: 'أكاديمية المستقبل الدولية',
  academy_name_en: 'FUTURE INTERNATIONAL ACADEMY',
  academy_short: 'FIA',
  phone: '',
  email: '',
  address: '',
  telegram_bot_token: '',
  telegram_channel_id: '',
  // About Us
  about_vision: '',
  about_mission: '',
  about_values: '',
  about_team: '',
  // Policies
  policy_privacy: '',
  policy_terms: '',
  policy_refund: '',
  policy_support: '',
  // Social links (admin can toggle each)
  social_facebook: '',
  social_facebook_enabled: false,
  social_telegram: '',
  social_telegram_enabled: false,
  social_whatsapp: '',
  social_whatsapp_enabled: false,
  social_sms: '',
  social_sms_enabled: false,
  // Visibility toggles
  show_partners: false,
  show_licenses: false,
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('site_settings').select('*').limit(1).single()
    if (error) {
      // No settings row OR missing columns — return defaults merged with whatever exists
      // Try fetching only basic columns (these definitely exist if table exists)
      const { data: basicData, error: basicErr } = await supabaseAdmin
        .from('site_settings')
        .select('id, academy_name, phone, email, address, telegram_bot_token, telegram_channel_id, updated_at')
        .limit(1).single()
      if (basicErr) {
        return NextResponse.json({ ...DEFAULTS, _migration_needed: true })
      }
      return NextResponse.json({ ...DEFAULTS, ...basicData })
    }
    return NextResponse.json({ ...DEFAULTS, ...data })
  } catch (e: any) {
    return NextResponse.json({ ...DEFAULTS, _migration_needed: true, error: e.message })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    // Strip undefined/null values to prevent overwriting existing data with nulls
    const cleanBody: any = {}
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) cleanBody[k] = v
    }

    // Try update first
    const existing = await supabaseAdmin.from('site_settings').select('id').limit(1).single()
    if (existing.data) {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .update({ ...cleanBody, updated_at: new Date().toISOString() })
        .eq('id', existing.data.id)
        .select()
        .single()
      if (error) {
        // Likely a missing column. Try updating only basic columns that definitely exist
        const basicUpdate: any = {}
        for (const k of ['academy_name', 'phone', 'email', 'address', 'telegram_bot_token', 'telegram_channel_id']) {
          if (cleanBody[k] !== undefined) basicUpdate[k] = cleanBody[k]
        }
        basicUpdate.updated_at = new Date().toISOString()
        const { data: basicData, error: basicErr } = await supabaseAdmin
          .from('site_settings')
          .update(basicUpdate)
          .eq('id', existing.data.id)
          .select()
          .single()
        if (basicErr) throw basicErr
        return NextResponse.json({ ...DEFAULTS, ...basicData, _migration_needed: true, _warning: 'Some fields could not be saved (missing columns). Run migration SQL.' })
      }
      return NextResponse.json(data)
    } else {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .insert({ ...cleanBody, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message, _migration_needed: true }, { status: 500 })
  }
}
