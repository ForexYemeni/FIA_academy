import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, hashPassword } from '@/lib/auth-server'
import { guardAuth, rateLimit, clientIp, tooMany } from '@/lib/api-auth'

// POST /api/auth/verify-password
// Body: { user_id, password }
// Returns: { valid: boolean }
//
// Used by the PasswordConfirmDialog to verify the currently-logged-in
// admin's password before destructive operations (delete course,
// delete student, delete trainer, delete team member, etc.).
//
// Supports BOTH bcrypt-hashed passwords (the modern format used by
// the register endpoint) AND legacy plain-text passwords (so old
// admin accounts created before the bcrypt migration still work).
// If the stored password is plain-text and matches, we silently
// rehash it to bcrypt so future verifications are secure.
export async function POST(req: NextRequest) {
  try {
    // 🛡️ لا تخمين لكلمات الغير: يجب أن تكون أنت صاحب الحساب + حد محاولات
    const g = await guardAuth(req)
    if (!g.ok) return g.res
    const rl = rateLimit(`vpass:${clientIp(req)}`, 10, 5 * 60 * 1000)
    if (!rl.ok) return tooMany(rl.retryAfterSec)
    const { user_id, password } = await req.json()
    if (user_id !== g.user.id && g.user.role !== 'admin') {
      return NextResponse.json({ valid: false, message: 'غير مصرح — تحقق من كلمة مرورك أنت فقط' }, { status: 403 })
    }
    if (!user_id || !password) {
      return NextResponse.json({ valid: false, message: 'user_id و password مطلوبان' }, { status: 400 })
    }
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, password')
      .eq('id', user_id)
      .maybeSingle()
    if (error) throw error
    // 🪞 حسابات المدربين الذاتية: كلمة مرورهم في جدول trainers (المرآة في users بلا كلمة مرور)
    if ((!user || !user.password) && g.user.role === 'trainer') {
      const { data: t } = await supabaseAdmin
        .from('trainers')
        .select('id, password')
        .eq('id', user_id)
        .maybeSingle()
      if (t?.password) {
        const r = await verifyPassword(String(password), String(t.password))
        if (r.valid && r.needsRehash) {
          try {
            const newHash = await hashPassword(String(password))
            await supabaseAdmin.from('trainers').update({ password: newHash }).eq('id', t.id)
          } catch {}
        }
        return NextResponse.json({ valid: r.valid })
      }
    }
    if (!user) {
      return NextResponse.json({ valid: false, message: 'المستخدم غير موجود' }, { status: 404 })
    }

    // Use the shared verifyPassword helper — handles both bcrypt and
    // legacy plain-text automatically.
    const { valid, needsRehash } = await verifyPassword(String(password), String(user.password || ''))

    // If the password is plain-text and matches, rehash it to bcrypt
    // so future logins/verifications use secure comparison.
    if (valid && needsRehash) {
      try {
        const newHash = await hashPassword(String(password))
        await supabaseAdmin.from('users').update({ password: newHash }).eq('id', user.id)
      } catch {}
    }

    return NextResponse.json({ valid })
  } catch (e: any) {
    return NextResponse.json({ valid: false, error: e.message }, { status: 500 })
  }
}
