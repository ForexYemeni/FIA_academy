import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId, currentEmail, currentPassword, newEmail, newPassword, role } = await req.json()

    if (!userId || !currentPassword) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // Determine which table the user is in
    // role='trainer' → trainers table; otherwise → users table
    const tableName = role === 'trainer' ? 'trainers' : 'users'

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from(tableName)
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
      // Check in same table
      const { data: existingSame } = await supabaseAdmin
        .from(tableName)
        .select('id')
        .eq('email', newEmail)
        .maybeSingle()
      if (existingSame) {
        return NextResponse.json({ error: 'البريد الجديد مستخدم بالفعل' }, { status: 400 })
      }
      // Check in other table
      const otherTable = tableName === 'trainers' ? 'users' : 'trainers'
      const { data: existingOther } = await supabaseAdmin
        .from(otherTable)
        .select('id')
        .eq('email', newEmail)
        .maybeSingle()
      if (existingOther) {
        return NextResponse.json({ error: 'البريد الجديد مستخدم في حساب آخر' }, { status: 400 })
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
      .from(tableName)
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    // Strip password before returning
    const { password, ...safeUser } = updated
    // For trainers, role is always 'trainer'; for users, use stored role
    const userRole = tableName === 'trainers' ? 'trainer' : (userRow.role || 'student')
    return NextResponse.json({
      success: true,
      user: { ...safeUser, role: userRole },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
