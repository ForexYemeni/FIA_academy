import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase'
import { verifyPassword } from './auth-server'

/**
 * Verifies that the request comes from an admin user.
 * Checks the x-admin-password header against the user's password.
 * Returns null if authorized, or a NextResponse with 403 if not.
 * 
 * This protects WRITE operations (POST/PUT/DELETE) on API routes
 * that are accessible to the public for GET (read) operations.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  try {
    const adminPassword = req.headers.get('x-admin-password')
    const adminUserId = req.headers.get('x-admin-user-id')

    if (!adminPassword || !adminUserId) {
      return NextResponse.json(
        { error: 'مطلوب تأكيد كلمة المرور — يرجى إدخال كلمة مرور حساب الأدمن' },
        { status: 403 }
      )
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, password, role')
      .eq('id', adminUserId)
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحيات غير كافية — هذا الإجراء مخصص للإدارة فقط' }, { status: 403 })
    }

    const { valid } = await verifyPassword(String(adminPassword), String(user.password || ''))
    if (!valid) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 403 })
    }

    return null // Authorized — proceed
  } catch {
    return NextResponse.json({ error: 'خطأ في التحقق من الصلاحيات' }, { status: 500 })
  }
}
