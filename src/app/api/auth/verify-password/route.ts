import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/auth/verify-password
// Body: { user_id, password }
// Returns: { valid: boolean }
//
// Used by the PasswordConfirmDialog to verify the currently-logged-in
// admin's password before destructive operations (delete course,
// delete student, delete trainer, delete team member, etc.).
//
// This is intentionally a simple plaintext compare because the legacy
// `users` table stores passwords as plain text. When bcrypt hashing
// is added later, this endpoint should be updated to use bcrypt.compare.
export async function POST(req: NextRequest) {
  try {
    const { user_id, password } = await req.json()
    if (!user_id || !password) {
      return NextResponse.json({ valid: false, message: 'user_id و password مطلوبان' }, { status: 400 })
    }
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, password')
      .eq('id', user_id)
      .maybeSingle()
    if (error) throw error
    if (!user) {
      return NextResponse.json({ valid: false, message: 'المستخدم غير موجود' }, { status: 404 })
    }
    // Plaintext compare (legacy). TODO: bcrypt.compare when hashing lands.
    const valid = String(user.password || '') === String(password)
    return NextResponse.json({ valid })
  } catch (e: any) {
    return NextResponse.json({ valid: false, error: e.message }, { status: 500 })
  }
}
