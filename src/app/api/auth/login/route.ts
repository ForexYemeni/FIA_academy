import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, verifyPassword } from '@/lib/auth-server'
import { signTokenAsync, rateLimit, clientIp, tooMany } from '@/lib/api-auth'

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'
const BIO_SEPARATOR = '\n\n===FIA_EXTRA===\n'

function mergeLegacyBio(stored: string | null): string {
  if (!stored) return ''
  const idx = stored.indexOf(BIO_SEPARATOR)
  if (idx === -1) return stored
  const bio = stored.substring(0, idx).trim()
  const extraJson = stored.substring(idx + BIO_SEPARATOR.length)
  let extra: any = {}
  try { extra = JSON.parse(extraJson) } catch { extra = {} }
  const parts: string[] = []
  if (bio) parts.push(bio)
  const mergeList = (label: string, raw: any) => {
    if (!raw || typeof raw !== 'string') return
    let arr: string[] | null = null
    try { const p = JSON.parse(raw); if (Array.isArray(p)) arr = p.filter(Boolean) } catch { arr = null }
    if (arr && arr.length > 0) parts.push(`${label}\n` + arr.map((q) => `• ${q}`).join('\n'))
    else {
      const lines = raw.split('\n').map((s: string) => s.trim()).filter(Boolean)
      if (lines.length > 0) parts.push(`${label}\n` + lines.map((q: string) => `• ${q}`).join('\n'))
    }
  }
  mergeList('🎓 المؤهلات العلمية', extra.qualifications)
  mergeList('🏆 الإنجازات', extra.achievements)
  return parts.join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'البريد وكلمة المرور مطلوبان' }, { status: 400 })
    }

    // 🛡️ حد محاولات ملكي — ضد تخمين كلمات المرور (10 محاولات كل 5 دقائق لكل بريد+IP)
    const rl = rateLimit(`login:${String(email).toLowerCase().trim()}:${clientIp(req)}`, 10, 5 * 60 * 1000)
    if (!rl.ok) return tooMany(rl.retryAfterSec)

    // Check users table FIRST (admin role is respected)
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (userRow) {
      const { valid, needsRehash } = await verifyPassword(password, userRow.password)
      if (valid) {
        // If the stored password was plain-text, hash it now and persist
        if (needsRehash) {
          const newHash = await hashPassword(password)
          await supabaseAdmin.from('users').update({ password: newHash }).eq('id', userRow.id)
        }
        // Detect team_role for this admin/trainer user by looking up the
        // trainers table with the same email. Team members have a marker
        // like `__TEAM_MEMBER__:founder__:<password>` in their trainers
        // password — we read that marker to set `team_role` so the
        // dashboard shell can render the correct badge (المؤسس / قائد / فريق)
        // instead of the generic role label. The actual password is never
        // sent to the client (it stays empty), so the shell reads
        // `user.team_role` rather than parsing `user.password`.
        //
        // 👑 v6.9 — «هوية المؤسس الخالدة»: (1) مطابقة البريد غير حساسة
        // لحالة الأحرف، (2) وعاء احتياطي في جدول team_members المحصّن ضد
        // أي محو بيانات — فلن تفقد شارة المؤسس أبداً مهما تغيّرت البيانات.
        let teamRole: string | undefined
        try {
          const { data: trainerRow } = await supabaseAdmin
            .from('trainers')
            .select('password')
            .ilike('email', userRow.email)
            .maybeSingle()
          if (trainerRow?.password?.startsWith(TEAM_MARKER_PREFIX)) {
            const afterPrefix = trainerRow.password.substring(TEAM_MARKER_PREFIX.length)
            const sepIdx = afterPrefix.indexOf('__')
            if (sepIdx !== -1) {
              teamRole = afterPrefix.substring(0, sepIdx) || 'team'
            }
          }
          if (!teamRole) {
            const { data: tm } = await supabaseAdmin
              .from('team_members')
              .select('role')
              .eq('user_id', userRow.id)
              .maybeSingle()
            if ((tm as any)?.role) {
              teamRole = String((tm as any).role)
            } else {
              const { data: tmEmail } = await supabaseAdmin
                .from('team_members')
                .select('role')
                .ilike('email', userRow.email)
                .maybeSingle()
              if ((tmEmail as any)?.role) teamRole = String((tmEmail as any).role)
            }
          }
        } catch {}
        const user = {
          id: userRow.id,
          email: userRow.email,
          name: userRow.name,
          phone: userRow.phone || '',
          password: '', // never return password to client
          role: userRow.role as 'admin' | 'trainer' | 'student',
          team_role: teamRole,
          avatar: userRow.avatar,
          title: userRow.title,
          bio: mergeLegacyBio(userRow.bio),
        }
        const token = await signTokenAsync({
          sub: userRow.id,
          email: userRow.email,
          role: userRow.role,
          name: userRow.name,
        })
        return NextResponse.json({ user, token })
      }
    }

    // Fall back to trainers table
    const { data: trainer } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .eq('email', email)
      .single()

    if (trainer) {
      // Team member login (password marker = __TEAM_MEMBER__)
      if (trainer.password && trainer.password.startsWith(TEAM_MARKER_PREFIX)) {
        const afterPrefix = trainer.password.substring(TEAM_MARKER_PREFIX.length)
        const sepIdx = afterPrefix.indexOf('__')
        if (sepIdx !== -1) {
          const afterRole = afterPrefix.substring(sepIdx + 2)
          const actualPassword = afterRole.startsWith(':') ? afterRole.substring(1) : ''
          // 🛡️ تحقق مرن: كلمة المرور داخل العلامة قد تكون bcrypt حديثة أو نصية قديمة
          const { valid } = await verifyPassword(String(password), actualPassword || '')
          if (valid) {
            const role = afterPrefix.substring(0, sepIdx) || 'team'
            const user = {
              id: trainer.id,
              email: trainer.email,
              name: trainer.name,
              phone: trainer.phone || '',
              password: '',
              role: 'trainer' as const, // team members get trainer dashboard access
              team_role: role,
              avatar: trainer.avatar,
              title: trainer.title,
              bio: mergeLegacyBio(trainer.bio),
            }
            const token = await signTokenAsync({
              sub: trainer.id,
              email: trainer.email,
              role: 'trainer',
              name: trainer.name,
            })
            return NextResponse.json({ user, token })
          }
        }
        return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
      }

      // Regular trainer — verify password (supports bcrypt + plain legacy)
      const { valid, needsRehash } = await verifyPassword(password, trainer.password || '')
      if (valid) {
        if (needsRehash) {
          const newHash = await hashPassword(password)
          await supabaseAdmin.from('trainers').update({ password: newHash }).eq('id', trainer.id)
        }
        const user = {
          id: trainer.id,
          email: trainer.email,
          name: trainer.name,
          phone: trainer.phone || '',
          password: '',
          role: 'trainer' as const,
          avatar: trainer.avatar,
          title: trainer.title,
          bio: mergeLegacyBio(trainer.bio),
        }
        const token = await signTokenAsync({
          sub: trainer.id,
          email: trainer.email,
          role: 'trainer',
          name: trainer.name,
        })
        return NextResponse.json({ user, token })
      }
    }

    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
  } catch (e) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
