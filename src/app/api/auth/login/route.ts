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
      .eq('password', password)
      .single()

    if (trainer) {
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

    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
  } catch (e) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
