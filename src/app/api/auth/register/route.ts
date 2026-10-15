import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    // Check if email exists in users or trainers
    const [{ data: existingUser }, { data: existingTrainer }] = await Promise.all([
      supabaseAdmin.from('users').select('id').eq('email', email).single(),
      supabaseAdmin.from('trainers').select('id').eq('email', email).single(),
    ])
    if (existingUser || existingTrainer) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجل مسبقاً' }, { status: 400 })
    }

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password,
        phone: phone || null,
        role: 'student',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'فشل إنشاء الحساب' }, { status: 500 })
    }

    const user = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone || '',
      password: newUser.password,
      role: 'student' as const,
      avatar: newUser.avatar,
      title: newUser.title,
      bio: newUser.bio,
    }
    const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64')
    return NextResponse.json({ user, token })
  } catch (e) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
