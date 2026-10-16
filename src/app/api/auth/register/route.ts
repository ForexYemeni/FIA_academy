import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, signToken } from '@/lib/auth-server'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json()
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    // Check if email is already registered
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existingUser) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجّل مسبقاً' }, { status: 400 })
    }

    // Hash the password with bcrypt
    const passwordHash = await hashPassword(password)

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password: passwordHash,
        phone: phone || null,
        role: 'student',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone || '',
      password: '', // never return password to client
      role: 'student' as const,
      avatar: data.avatar,
      title: data.title,
      bio: data.bio,
    }
    const token = signToken({
      sub: data.id,
      email: data.email,
      role: 'student',
      name: data.name,
    })
    return NextResponse.json({ user, token })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
