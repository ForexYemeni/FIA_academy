import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
        bio: userRow.bio,
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
              bio: trainer.bio,
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
          bio: trainer.bio,
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
