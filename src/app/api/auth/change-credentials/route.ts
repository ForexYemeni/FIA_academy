import { NextRequest, NextResponse } from 'next/server'
import { guardAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, hashPassword } from '@/lib/auth-server'

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

export async function POST(req: NextRequest) {
  try {
    // 🛡️ تغيير بيانات حسابك أنت فقط — الهوية من التوقيع
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const { currentEmail, currentPassword, newEmail, newPassword, role } = await req.json()
    const userId = g.user.id

    if (!userId || !currentPassword) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const tableName = role === 'trainer' ? 'trainers' : 'users'

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('id', userId)
      .single()

    if (userErr || !userRow) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // For team members, the stored password is the marker string, not the
    // actual password — we extract the real password and compare directly.
    let passwordVerified = false
    if (tableName === 'trainers' && userRow.password?.startsWith(TEAM_MARKER_PREFIX)) {
      const afterPrefix = userRow.password.substring(TEAM_MARKER_PREFIX.length)
      const sepIdx = afterPrefix.indexOf('__')
      if (sepIdx !== -1) {
        const afterRole = afterPrefix.substring(sepIdx + 2)
        const actualPassword = afterRole.startsWith(':') ? afterRole.substring(1) : ''
        if (actualPassword === currentPassword) passwordVerified = true
      }
    } else {
      // Regular user/trainer — verify via bcrypt (with plain-text legacy fallback)
      const { valid } = await verifyPassword(currentPassword, userRow.password || '')
      if (valid) passwordVerified = true
    }

    if (!passwordVerified) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 401 })
    }

    // If changing email, check the new email isn't taken
    if (newEmail && newEmail !== userRow.email) {
      const { data: existingSame } = await supabaseAdmin
        .from(tableName)
        .select('id')
        .eq('email', newEmail)
        .maybeSingle()
      if (existingSame) {
        return NextResponse.json({ error: 'البريد الجديد مستخدم بالفعل' }, { status: 400 })
      }
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

    // Build updates — hash the new password if provided
    const updates: any = {}
    if (newEmail) updates.email = newEmail
    if (newPassword) {
      // For team members, preserve the marker prefix + role + new password
      if (tableName === 'trainers' && userRow.password?.startsWith(TEAM_MARKER_PREFIX)) {
        const afterPrefix = userRow.password.substring(TEAM_MARKER_PREFIX.length)
        const sepIdx = afterPrefix.indexOf('__')
        const storedRole = sepIdx !== -1 ? afterPrefix.substring(0, sepIdx) : 'team'
        updates.password = `${TEAM_MARKER_PREFIX}${storedRole}__:${newPassword}`
      } else {
        // Hash with bcrypt — replaces the legacy plain-text/old-hash
        updates.password = await hashPassword(newPassword)
      }
    }

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

    const { password, ...safeUser } = updated
    const userRole = tableName === 'trainers' ? 'trainer' : (userRow.role || 'student')
    return NextResponse.json({
      success: true,
      user: { ...safeUser, role: userRole },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
