import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, hashPassword } from '@/lib/auth-server'
import { guardAdmin } from '@/lib/api-auth'

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
    // 🛡️ التوكن لا يُرسل للعميل أبداً — فقط مؤشر وجوده للواجهة
    telegram_bot_token: '',
    telegram_token_set: !!row.telegram_bot_token,
    telegram_channel_id: row.telegram_channel_id || '',
    ...extra,
  }
}

export async function GET(req: NextRequest) {
  try {
    // Select only known-existing columns to avoid schema cache errors
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('id, academy_name, phone, email, address, telegram_bot_token, telegram_channel_id')
      .limit(1)
      .single()
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
    // 🛡️ تعديل إعدادات الموقع للإدارة فقط
    const g = await guardAdmin(req)
    if (!g.ok) return g.res
    const body = await req.json()

    // === Telegram integration protection ===
    // The Telegram bot token + channel ID are critical — they control
    // how images, videos, and notifications get published to the
    // academy's channel. If they're being CHANGED (different from the
    // currently stored values), we require the caller to verify their
    // admin password via /api/auth/verify-password. This prevents
    // accidental lockout (e.g. a typo in the bot token would break
    // all image uploads).
    const PROTECTED_FIELDS = ['telegram_bot_token', 'telegram_channel_id']
    const tryingToChangeTelegram = PROTECTED_FIELDS.some((f) =>
      body[f] !== undefined && body[f] !== null && String(body[f]).trim() !== ''
    )
    if (tryingToChangeTelegram) {
      // Verify password
      const { user_id, password } = body as { user_id?: string, password?: string }
      if (!user_id || !password) {
        return NextResponse.json({
          error: 'لتغيير إعدادات تيليجرام (التوكن أو الـ Channel ID)، يجب إدخال كلمة مرور حسابك للتأكيد.',
        }, { status: 403 })
      }
      const { data: u, error: uErr } = await supabaseAdmin
        .from('users')
        .select('id, password')
        .eq('id', user_id)
        .maybeSingle()
      if (uErr || !u) {
        return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
      }
      // Use verifyPassword so both bcrypt-hashed AND legacy plain-text
      // passwords work correctly. The previous plaintext compare was
      // broken because the register endpoint stores bcrypt hashes.
      const { valid, needsRehash } = await verifyPassword(String(password), String(u.password || ''))
      if (!valid) {
        return NextResponse.json({ error: 'كلمة المرور غير صحيحة — لا يمكن تغيير إعدادات تيليجرام' }, { status: 403 })
      }
      // Silently rehash legacy plain-text passwords so future checks are secure
      if (needsRehash) {
        try {
          const newHash = await hashPassword(String(password))
          await supabaseAdmin.from('users').update({ password: newHash }).eq('id', u.id)
        } catch {}
      }
    }

    // Split into basic fields (existing columns) and extra fields (stored as JSON)
    const basicFields: any = {
      academy_name: body.academy_name,
      phone: body.phone,
      email: body.email,
      telegram_channel_id: body.telegram_channel_id,
    }
    // 🛡️ التوكن: يُحدَّث فقط عند إرسال قيمة غير فارغة — الحفظ العادي (بلا توكن
    // لأن GET لا يعيده أبداً) لا يمس التوكن المخزن إطلاقاً
    if (body.telegram_bot_token && String(body.telegram_bot_token).trim() !== '') {
      basicFields.telegram_bot_token = String(body.telegram_bot_token).trim()
    }

    // Build extra JSON from all non-basic fields (excluding password + user_id which we used above)
    const extra: any = {}
    const basicKeys = ['academy_name', 'phone', 'email', 'telegram_bot_token', 'telegram_channel_id', 'id', 'updated_at', 'password', 'user_id']
    for (const [k, v] of Object.entries(body)) {
      if (!basicKeys.includes(k) && v !== undefined) {
        extra[k] = v
      }
    }

    // Store extra JSON in the address field (reusing existing column)
    const cleanAddress = body.address || ''
    const extraJson = Object.keys(extra).length > 0 ? EXTRA_SEPARATOR + JSON.stringify(extra) : ''
    basicFields.address = cleanAddress + extraJson
    // Don't set updated_at explicitly — let DB default handle it (avoids schema cache errors)

    // Try update first — select only 'id' to avoid schema cache issues with other columns
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
