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

// 👑 v10.17 — «مفتاح الزاوية الإدارية الكلي»: حسم هوية المؤسس حصراً
// نفس بروتوكول «هوية المؤسس الخالدة» (v6.9): علامة الفريق في جدول المدربين
// ثم سجل team_members المحصّن ضد أي محو — بالمعرّف أو بالبريد.
const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

async function isFounderAccount(userId: string, email: string | null | undefined): Promise<boolean> {
  try {
    if (email) {
      const { data: tr } = await supabaseAdmin
        .from('trainers')
        .select('password')
        .ilike('email', email)
        .maybeSingle()
      const pw = (tr as any)?.password
      if (typeof pw === 'string' && pw.startsWith(TEAM_MARKER_PREFIX)) {
        const afterPrefix = pw.substring(TEAM_MARKER_PREFIX.length)
        const sepIdx = afterPrefix.indexOf('__')
        const role = sepIdx !== -1 ? afterPrefix.substring(0, sepIdx) : ''
        if (role === 'founder') return true
      }
    }
    const byId = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if ((byId.data as any)?.role === 'founder') return true
    if (email) {
      const byEmail = await supabaseAdmin
        .from('team_members')
        .select('role')
        .ilike('email', email)
        .maybeSingle()
      if ((byEmail.data as any)?.role === 'founder') return true
    }
  } catch {}
  return false
}

// قراءة القيمة المخزنة حالياً لمفتاح الزاوية الإدارية من JSON الإضافي
async function readStoredCornerEnabled(): Promise<boolean> {
  try {
    const { data: curRow } = await supabaseAdmin
      .from('site_settings')
      .select('address')
      .limit(1)
      .maybeSingle()
    const addr: string = (curRow as any)?.address || ''
    const idx = addr.indexOf(EXTRA_SEPARATOR)
    if (idx !== -1) {
      const ex = JSON.parse(addr.substring(idx + EXTRA_SEPARATOR.length))
      if (ex && ex.admin_corner_enabled !== undefined) return !!ex.admin_corner_enabled
    }
  } catch {}
  return true // الافتراضي: الزاوية تعمل
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

    // 👑 v10.17 — «مفتاح الزاوية الإدارية الكلي»: تغيير إيقاف/تشغيل الزاوية
    // (الإعلانات المختومة + بطاقة الرسالة العامة) بقرار المؤسس حصراً.
    // أي طلب من غير المؤسس يحاول تحريك المفتاح (عمداً عبر API أو ببيانات قديمة)
    // تُطبَّع قيمته صمتاً إلى القيمة المخزنة بقرار المؤسس — فلا يُحرك المفتاح أبداً،
    // ولا يفشل حفظٌ بريء لإعدادات أخرى بسبب بيانات قديمة.
    if (body.admin_corner_enabled !== undefined) {
      const newVal = !!body.admin_corner_enabled
      const curVal = await readStoredCornerEnabled()
      if (curVal !== newVal) {
        const founder = await isFounderAccount(String(g.user?.id || ''), (g.user as any)?.email)
        if (!founder) {
          body.admin_corner_enabled = curVal
        }
      }
    }

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
