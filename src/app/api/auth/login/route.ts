import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Legacy encoding marker — kept only for backward compatibility with old data.
const BIO_SEPARATOR = '\n\n===FIA_EXTRA===\n'

// Decode legacy encoded bio and merge any embedded qualifications/achievements
// into a single professional bio string. New trainer records store bio as a
// plain string (no encoding), so this is effectively a no-op for them.
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
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) arr = parsed.filter(Boolean)
    } catch { arr = null }
    if (arr && arr.length > 0) {
      parts.push(`${label}\n` + arr.map((q) => `• ${q}`).join('\n'))
    } else {
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

    // Check users table FIRST (so admin role is respected)
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (userRow) {
      const user = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        phone: userRow.phone || '',
        password: userRow.password,
        role: userRow.role as 'admin' | 'trainer' | 'student',
        avatar: userRow.avatar,
        title: userRow.title,
        bio: mergeLegacyBio(userRow.bio),
      }
      const token = Buffer.from(`${userRow.id}:${Date.now()}`).toString('base64')
      return NextResponse.json({ user, token })
    }

    // Fall back to trainers table
    const { data: trainer } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .eq('email', email)
      .single()

    if (trainer) {
      // Check if this is a team member (password starts with __TEAM_MEMBER__)
      const TEAM_MARKER = '__TEAM_MEMBER__:'
      if (trainer.password && trainer.password.startsWith(TEAM_MARKER)) {
        // Format: __TEAM_MEMBER__:<role>__:<actual_password>
        const afterPrefix = trainer.password.substring(TEAM_MARKER.length)
        const sepIdx = afterPrefix.indexOf('__')
        if (sepIdx !== -1) {
          const afterRole = afterPrefix.substring(sepIdx + 2)
          const actualPassword = afterRole.startsWith(':') ? afterRole.substring(1) : ''
          if (actualPassword === password) {
            // Team member login successful
            const role = afterPrefix.substring(0, sepIdx) || 'team'
            const user = {
              id: trainer.id,
              email: trainer.email,
              name: trainer.name,
              phone: trainer.phone || '',
              password: trainer.password || '',
              role: role === 'founder' ? 'trainer' : 'trainer', // Team members get trainer role for dashboard access
              avatar: trainer.avatar,
              title: trainer.title,
              bio: mergeLegacyBio(trainer.bio),
            }
            const token = Buffer.from(`${trainer.id}:${Date.now()}`).toString('base64')
            return NextResponse.json({ user, token })
          }
        }
        // Old format team member without password → cannot login
        return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
      }

      // Regular trainer — direct password match
      if (trainer.password === password) {
        const user = {
          id: trainer.id,
          email: trainer.email,
          name: trainer.name,
          phone: trainer.phone || '',
          password: trainer.password || '',
          role: 'trainer' as const,
          avatar: trainer.avatar,
          title: trainer.title,
          bio: mergeLegacyBio(trainer.bio),
        }
        const token = Buffer.from(`${trainer.id}:${Date.now()}`).toString('base64')
        return NextResponse.json({ user, token })
      }
    }

    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
  } catch (e) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
