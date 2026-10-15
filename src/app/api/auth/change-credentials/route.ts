import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId, currentEmail, currentPassword, newEmail, newPassword } = await req.json()

    if (!userId || !currentPassword) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // Verify current credentials by looking up the user
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userErr || !userRow) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // Verify the current password matches
    if (userRow.password !== currentPassword) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 401 })
    }

    // If changing email, check the new email isn't taken
    if (newEmail && newEmail !== userRow.email) {
      const { data: existingWithEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', newEmail)
        .maybeSingle()
      if (existingWithEmail) {
        return NextResponse.json({ error: 'البريد الجديد مستخدم بالفعل' }, { status: 400 })
      }
      // Also check trainers table
      const { data: existingTrainer } = await supabaseAdmin
        .from('trainers')
        .select('id')
        .eq('email', newEmail)
        .maybeSingle()
      if (existingTrainer) {
        return NextResponse.json({ error: 'البريد الجديد مستخدم كمدرب' }, { status: 400 })
      }
    }

    // Build updates
    const updates: any = {}
    if (newEmail) updates.email = newEmail
    if (newPassword) updates.password = newPassword

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'لا توجد تغييرات' }, { status: 400 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    // Strip password before returning
    const { password, ...safeUser } = updated
    return NextResponse.json({
      success: true,
      user: { ...safeUser, role: userRow.role },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
