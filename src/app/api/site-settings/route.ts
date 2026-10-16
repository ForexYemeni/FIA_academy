import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Default settings (returned if table is empty)
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
  // Social links
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

// We store extra fields as JSON in the 'address' column (reusing existing column)
// This avoids needing ALTER TABLE / SQL migration
const EXTRA_SEPARATOR = '\n===FIA_EXTRA===\n'

function parseRow(row: any) {
  if (!row) return { ...DEFAULTS }
  // Parse extra JSON from address field
  let extra: any = {}
  const addr: string = row.address || ''
  const idx = addr.indexOf(EXTRA_SEPARATOR)
  let cleanAddress = addr
  if (idx !== -1) {
    cleanAddress = addr.substring(0, idx)
    try {
      extra = JSON.parse(addr.substring(idx + EXTRA_SEPARATOR.length))
    } catch {}
  }
  return {
    ...DEFAULTS,
    academy_name: row.academy_name || DEFAULTS.academy_name,
    phone: row.phone || '',
    email: row.email || '',
    address: cleanAddress || '',
    telegram_bot_token: row.telegram_bot_token || '',
    telegram_channel_id: row.telegram_channel_id || '',
    ...extra,
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('site_settings').select('*').limit(1).single()
    if (error) {
      return NextResponse.json({ ...DEFAULTS })
    }
    return NextResponse.json(parseRow(data))
  } catch (e: any) {
    return NextResponse.json({ ...DEFAULTS })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()

    // Split into basic fields (existing columns) and extra fields (stored as JSON)
    const basicFields: any = {
      academy_name: body.academy_name,
      phone: body.phone,
      email: body.email,
      telegram_bot_token: body.telegram_bot_token,
      telegram_channel_id: body.telegram_channel_id,
    }

    // Build extra JSON from all non-basic fields
    const extra: any = {}
    const basicKeys = ['academy_name', 'phone', 'email', 'telegram_bot_token', 'telegram_channel_id', 'id', 'updated_at']
    for (const [k, v] of Object.entries(body)) {
      if (!basicKeys.includes(k) && v !== undefined) {
        extra[k] = v
      }
    }

    // Store extra JSON in the address field (reusing existing column)
    const cleanAddress = body.address || ''
    const extraJson = Object.keys(extra).length > 0 ? EXTRA_SEPARATOR + JSON.stringify(extra) : ''
    basicFields.address = cleanAddress + extraJson
    basicFields.updated_at = new Date().toISOString()

    // Try update first
    const existing = await supabaseAdmin.from('site_settings').select('id').limit(1).single()
    if (existing.data) {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .update(basicFields)
        .eq('id', existing.data.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(parseRow(data))
    } else {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .insert(basicFields)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(parseRow(data))
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
