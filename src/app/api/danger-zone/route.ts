import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ===== Danger Zone endpoint =====
// Accepts a POST with { userId, password } and, after verifying the admin's
// password, wipes the academy data (keeping only the founder's account and
// the site_settings table). This action is irreversible.

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json()

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'بيانات ناقصة — يرجى إدخال كلمة المرور' },
        { status: 400 }
      )
    }

    // 1. Look up the requesting user in the `users` table (the founder/admin
    //    always lives in `users`, not `trainers`).
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (adminErr || !adminRow) {
      return NextResponse.json(
        { error: 'حساب المؤسس غير موجود' },
        { status: 404 }
      )
    }

    // 2. Verify the supplied password matches the stored one.
    //    For a regular admin, compare directly. For team members stored in
    //    `users` (rare), the password may carry the team marker — in that case
    //    we extract the actual password and compare.
    let storedPassword: string = adminRow.password || ''
    if (storedPassword.startsWith(TEAM_MARKER_PREFIX)) {
      const afterPrefix = storedPassword.substring(TEAM_MARKER_PREFIX.length)
      const sepIdx = afterPrefix.indexOf('__')
      if (sepIdx !== -1) {
        const afterRole = afterPrefix.substring(sepIdx + 2)
        storedPassword = afterRole.startsWith(':')
          ? afterRole.substring(1)
          : afterRole
      }
    }
    if (!storedPassword || storedPassword !== password) {
      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // 3. Wipe the data. Order matters: delete child/dependent rows first.
    //    NOTE: enrollments and certificate-requests are stored in `payments`,
    //    so deleting `payments` covers them too.
    const results: Record<string, { ok: boolean; error?: string; count?: number }> = {}

    // --- Delete all certificate-requests / certificates references first ---
    // (certificates table)
    const certRes = await supabaseAdmin.from('certificates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    results.certificates = certRes.error
      ? { ok: false, error: certRes.error.message }
      : { ok: true }

    // --- Delete all payments (this also clears enrollments + cert requests) ---
    const payRes = await supabaseAdmin.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    results.payments = payRes.error
      ? { ok: false, error: payRes.error.message }
      : { ok: true }

    // --- Delete all courses ---
    const courseRes = await supabaseAdmin.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    results.courses = courseRes.error
      ? { ok: false, error: courseRes.error.message }
      : { ok: true }

    // --- Delete all trainers EXCEPT team members ---
    //    A team member is identified by a password that starts with the
    //    __TEAM_MEMBER__ marker. We keep those so the founder's team (admin,
    //    leader, etc.) remains intact.
    const { data: trainersList } = await supabaseAdmin
      .from('trainers')
      .select('id, password')
    if (Array.isArray(trainersList)) {
      const toDelete = trainersList
        .filter((t: any) => !(t.password && String(t.password).startsWith(TEAM_MARKER_PREFIX)))
        .map((t: any) => t.id)
      if (toDelete.length > 0) {
        const trRes = await supabaseAdmin.from('trainers').delete().in('id', toDelete)
        results.trainers = trRes.error
          ? { ok: false, error: trRes.error.message }
          : { ok: true, count: toDelete.length }
      } else {
        results.trainers = { ok: true, count: 0 }
      }
    } else {
      results.trainers = { ok: true, count: 0 }
    }

    // --- Delete all non-admin users ---
    //    The founder/admin (role='admin') is preserved. Everyone else
    //    (students, etc.) is removed.
    const usersRes = await supabaseAdmin
      .from('users')
      .delete()
      .neq('role', 'admin')
      .neq('id', '00000000-0000-0000-0000-000000000000')
    results.users = usersRes.error
      ? { ok: false, error: usersRes.error.message }
      : { ok: true }

    // site_settings is intentionally NOT touched — it must survive the wipe.

    // Report any failures so the admin can see what went wrong.
    const failures = Object.entries(results).filter(([, v]) => !v.ok)
    if (failures.length > 0) {
      return NextResponse.json(
        {
          error: 'فشل حذف بعض الجداول',
          details: failures.map(([k, v]) => `${k}: ${v.error}`),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
