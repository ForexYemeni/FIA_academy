/**
 * ============================================================================
 * FIA ACADEMY — الدرع الملكي لحرس البوابة (Royal API Guard)
 * ============================================================================
 * قبل هذا الملف كانت كل مسارات API مفتوحة: أي زائر يستطيع الموافقة على
 * دفعته، منح نفسه شهادة، حذف أقسام كاملة، أو قراءة محادثات الغير.
 * الآن: كل مسار حساس يمر من هنا — توقيع ملكي (JWT) يُتحقق منه في الخادم،
 * ودور المستخدم يُجلب من قاعدة البيانات حياً في كل طلب (فلا نفاء بصلاحية
 * تم سحبها)، مع حد محاولات ملكي ضد التخمين.
 * ============================================================================
 */

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase'
import { verifyPassword } from './auth-server'

export interface AuthUser {
  id: string
  role: 'admin' | 'trainer' | 'student' | 'team'
  email: string
  name: string
  teamRole?: string
  /** true إذا كان الحساب في جدول trainers (وليس users) */
  trainerProfile?: boolean
}

export type Guard =
  | { ok: true; user: AuthUser }
  | { ok: false; res: NextResponse }

// ============================================================================
// سر التوقيع الملكي — يُخزن في app_secrets (RLS مغلقة تماماً على الغير)
// حتى لا يكون في متناول أي أحد من المستودع العام
// ============================================================================

let secretCache: string | null = null

export async function getJwtSecret(): Promise<string> {
  if (secretCache) return secretCache
  const envSecret = process.env.JWT_SECRET
  if (envSecret && envSecret !== 'fia-academy-secure-secret-key-2026-change-in-production') {
    secretCache = envSecret
    return secretCache
  }
  try {
    const { data } = await supabaseAdmin
      .from('app_secrets')
      .select('value')
      .eq('key', 'jwt_secret')
      .maybeSingle()
    if (data?.value) {
      secretCache = String(data.value)
      return secretCache
    }
  } catch {}
  // أول تشغيل: توليد سر ملكي قوي وتثبيته في app_secrets
  const generated = crypto.randomBytes(48).toString('hex')
  try {
    await supabaseAdmin
      .from('app_secrets')
      .upsert({ key: 'jwt_secret', value: generated }, { onConflict: 'key' })
  } catch {}
  secretCache = generated
  return secretCache
}

/** توقيع رمز ملكي (يستخدم السر من app_secrets) */
export async function signTokenAsync(payload: {
  sub: string
  email: string
  role: string
  name: string
}): Promise<string> {
  const secret = await getJwtSecret()
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

/**
 * 🔊 رمز البث الإعلامي قصير العمر — لعناصر <audio>/<video> التي لا تستطيع
 * إرسال ترويسات Authorization. رمز مخصص لغرض واحد (درس واحد لمستخدم واحد)
 * وينتهي خلال 15 دقيقة — لا يصلح لأي مسار آخر.
 */
export async function signMediaToken(sub: string, lid: string): Promise<string> {
  const secret = await getJwtSecret()
  return jwt.sign({ typ: 'media-audio', sub, lid }, secret, { expiresIn: '15m' })
}

export async function verifyMediaToken(
  token: string
): Promise<{ sub: string; lid: string } | null> {
  try {
    const secret = await getJwtSecret()
    const p = jwt.verify(token, secret) as any
    if (p?.typ !== 'media-audio' || !p?.sub || !p?.lid) return null
    return { sub: String(p.sub), lid: String(p.lid) }
  } catch {
    return null
  }
}

/** التحقق من رمز ملكي — يعيد الحمولة أو null */
export async function verifyTokenAsync(token: string): Promise<any | null> {
  try {
    const secret = await getJwtSecret()
    return jwt.verify(token, secret) as any
  } catch {
    // محاولة أخيرة بالسر البيئي القديم — لتفعيل الرموز الصادرة قبل الترحيل
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'fia-academy-secure-secret-key-2026-change-in-production') as any
    } catch {
      return null
    }
  }
}

// ============================================================================
// استخراج الهوية من الطلب — ثم جلب الدور حياً من قاعدة البيانات
// ============================================================================

function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.substring(7).trim()
  const alt = req.headers.get('x-fia-token')
  return alt ? alt.trim() : null
}

/**
 * هوية الطلب: توقيع صالح + حساب حي في قاعدة البيانات.
 * يبحث في users أولاً ثم في trainers (حسابات المدربين المستقلة).
 */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const token = extractToken(req)
  if (!token) return null
  const payload = await verifyTokenAsync(token)
  if (!payload?.sub) return null
  return getAuthUserBySub(String(payload.sub), payload.role === 'team')
}

/**
 * جلب الهوية الحية من معرف الحساب مباشرة (users أولاً ثم trainers).
 * تُستخدم من getAuthUser ومن مسار رموز البث الإعلامي (mt) على حد سواء.
 */
export async function getAuthUserBySub(
  sub: string,
  teamFlag = false
): Promise<AuthUser | null> {
  const { data: u } = await supabaseAdmin
    .from('users')
    .select('id, role, email, name')
    .eq('id', sub)
    .maybeSingle()
  if (u) {
    return {
      id: u.id,
      role: (u.role as AuthUser['role']) || 'student',
      email: u.email || '',
      name: u.name || '',
      teamRole: teamFlag ? 'team' : undefined,
    }
  }

  const { data: t } = await supabaseAdmin
    .from('trainers')
    .select('id, email, name, password')
    .eq('id', sub)
    .maybeSingle()
  if (t) {
    const marker = t.password && String(t.password).startsWith('__TEAM_MEMBER__:')
    return {
      id: t.id,
      role: 'trainer',
      email: t.email || '',
      name: t.name || '',
      trainerProfile: true,
      teamRole: marker || teamFlag ? 'team' : undefined,
    }
  }
  return null
}

/** أي مستخدم مسجل — 401 إن لم يكن */
export async function guardAuth(req: Request): Promise<Guard> {
  const user = await getAuthUser(req)
  if (!user) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      ),
    }
  }
  return { ok: true, user }
}

/** إدارة فقط — 401/403 غيره */
export async function guardAdmin(req: Request): Promise<Guard> {
  const user = await getAuthUser(req)
  if (!user) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      ),
    }
  }
  if (user.role !== 'admin') {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'صلاحيات غير كافية — هذا الإجراء مخصص للإدارة فقط' },
        { status: 403 }
      ),
    }
  }
  return { ok: true, user }
}

/** إدارة أو مدرب */
export async function guardStaff(req: Request): Promise<Guard> {
  const g = await guardAuth(req)
  if (!g.ok) return g
  if (g.user.role !== 'admin' && g.user.role !== 'trainer') {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'هذا الإجراء مخصص للإدارة والمدربين فقط' },
        { status: 403 }
      ),
    }
  }
  return g
}

/** هل المستخدم إدارة؟ */
export function isAdmin(user?: AuthUser | null): boolean {
  return user?.role === 'admin'
}

/** هل يملك هذا المستخدم ملف مدرب (trainers.id) بنفس المعرّف أو البريد؟ */
export async function ownsTrainerProfile(user: AuthUser): Promise<boolean> {
  if (user.trainerProfile) return true
  if (user.role === 'trainer') {
    const { data } = await supabaseAdmin
      .from('trainers')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    return !!data
  }
  return false
}

// ============================================================================
// كلمات المرور المرنة — bcrypt حديث أو نص صريح قديم أو علامة فريق
// ============================================================================

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

/** استخراج كلمة المرور الفعلية من علامة الفريق `__TEAM_MEMBER__:<role>__:<pw>` */
export function extractTeamPassword(stored: string): { actual: string; role: string } | null {
  if (!stored || !stored.startsWith(TEAM_MARKER_PREFIX)) return null
  const afterPrefix = stored.substring(TEAM_MARKER_PREFIX.length)
  const sepIdx = afterPrefix.indexOf('__')
  if (sepIdx === -1) return null
  const role = afterPrefix.substring(0, sepIdx) || 'team'
  const afterRole = afterPrefix.substring(sepIdx + 2)
  const actual = afterRole.startsWith(':') ? afterRole.substring(1) : afterRole
  return { actual, role }
}

/**
 * التحقق من كلمة مرور أي حساب (users أو trainers) بمرونة كاملة:
 * علامة فريق → bcrypt حديث → نص صريح قديم. هذا هو إصلاح عطل
 * «كلمة المرور خاطئة رغم صحتها» في منطقة الخطر.
 */
export async function verifyAccountPassword(
  storedPassword: string | null | undefined,
  plain: string
): Promise<{ valid: boolean; needsRehash: boolean; rehashTarget?: 'plain' | 'team'; teamRole?: string }> {
  const stored = String(storedPassword || '')
  if (!stored) return { valid: false, needsRehash: false }

  // 1) علامة فريق — كلمة المرور داخل العلامة
  const team = extractTeamPassword(stored)
  if (team) {
    const r = await verifyPassword(plain, team.actual)
    return { valid: r.valid, needsRehash: false, teamRole: team.role }
  }

  // 2) bcrypt حديث أو نص صريح قديم
  const r = await verifyPassword(plain, stored)
  return { valid: r.valid, needsRehash: r.needsRehash }
}

/**
 * 🔐 التحقق من كلمة مرور صاحب الطلب نفسه — لتأكيد العمليات الحساسة
 * (حذف طرق السحب مثلًا). يبحث في users أولاً، ثم في trainers للحسابات
 * المدربية الذاتية التي كلمة مرورها في جدول المدربين (المرآة بلا كلمة مرور).
 */
export async function verifyOwnPassword(userId: string, role: string | undefined | null, plain: string): Promise<boolean> {
  if (!userId || !plain) return false
  try {
    const { data: u } = await supabaseAdmin.from('users').select('id, password').eq('id', userId).maybeSingle()
    if (u?.password) return (await verifyAccountPassword(u.password, plain)).valid
    if (role === 'trainer') {
      const { data: t } = await supabaseAdmin.from('trainers').select('id, password').eq('id', userId).maybeSingle()
      if (t?.password) return (await verifyAccountPassword(t.password, plain)).valid
    }
  } catch {}
  return false
}

// ============================================================================
// حد المحاولات الملكي — ضد تخمين كلمات المرور وإغراق الرفع
// ============================================================================

const buckets = new Map<string, { count: number; resetAt: number }>()

// تنظيف دوري خفيف
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k)
  }, 60_000)
  if (typeof timer === 'object' && 'unref' in timer) (timer as any).unref?.()
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  b.count += 1
  if (b.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfterSec: 0 }
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** رد 429 جاهز */
export function tooMany(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: `محاولات كثيرة — انتظر ${retryAfterSec} ثانية ثم أعد المحاولة` },
    { status: 429 }
  )
}

/**
 * حرس منطقة الخطر الملكي — يجمع كل شيء:
 * هوية إدارة حية + كلمة مرور صحيحة (bcrypt/نصي/فريق) + حد محاولات.
 * هذا هو الإصلاح الجذري لعطل «كلمة المرور خاطئة رغم صحتها».
 */
export async function guardDangerZone(
  req: Request,
  userId: string | undefined,
  password: string | undefined
): Promise<{ ok: false; res: NextResponse } | { ok: true; user: AuthUser }> {
  // حد محاولات صارم: 5 محاولات كل 10 دقائق لكل IP
  const rl = rateLimit(`dz:${clientIp(req)}`, 5, 10 * 60 * 1000)
  if (!rl.ok) {
    return { ok: false, res: tooMany(rl.retryAfterSec) }
  }

  if (!userId || !password) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'بيانات ناقصة — يرجى إدخال كلمة المرور' },
        { status: 400 }
      ),
    }
  }

  // 1) الهوية الحية: يجب أن يكون طالبَ الإدارة نفسه (وليس أي حساب)
  const user = await getAuthUser(req)
  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 }),
    }
  }
  if (user.role !== 'admin') {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'صلاحيات غير كافية — منطقة الخطر مخصصة للإدارة فقط' },
        { status: 403 }
      ),
    }
  }
  if (userId !== user.id) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'لا يمكن التأكيد بحساب آخر — يجب أن تكون أنت صاحب الإجراء' },
        { status: 403 }
      ),
    }
  }

  // 2) جلب صف الحساب الحي والتحقق بمرونة (bcrypt حديث / نص صريح / فريق)
  const { data: row, error } = await supabaseAdmin
    .from('users')
    .select('password')
    .eq('id', userId)
    .maybeSingle()
  if (error || !row) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'حساب الإدارة غير موجود' }, { status: 404 }),
    }
  }

  const { valid } = await verifyAccountPassword(row.password, String(password))
  if (!valid) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 }),
    }
  }

  return { ok: true, user }
}
