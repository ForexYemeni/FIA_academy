import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/auth/check-deleted?user_id=...
 *
 * Checks if a user's account has been deleted (by checking both
 * the force_logout table AND whether the user still exists in the
 * users/trainers tables). Returns { deleted: boolean }.
 *
 * 👑 v6.9 — «هوية المؤسس الخالدة»: يُعيد المسار أيضاً team_role حيّة
 * (علامة الفريق في trainers ← ثم جدول team_members بمعرّف المستخدم أو
 * بريده) ليشفي الجلسات المخزّنة التي سجّل دخولها قبل إنشاء العلامة —
 * فبعد «حذف جميع البيانات» تعود شارة المؤسس بذاتها عند فتح التطبيق.
 *
 * 👑 v10.11 — «مرسوم الحظر الملكي»: يُعيد المسار أيضاً حالة حظر الحساب
 * (banned + banned_reason) من users/trainers — فيرسم الحرس الملكي بطاقة
 * الحظر الفاخرة فوراً بنبضته كل 15 ثانية وحظة العودة للتطبيق.
 *
 * Called by the auth-store on app rehydration to force-logout
 * deleted users and refresh the team role badge.
 */

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

/** 👑 v6.9 — استخراج دور الفريق الحي من أوعيتيه الرسميتين */
async function resolveTeamRole(userId: string, email: string | null | undefined): Promise<string | undefined> {
  try {
    // الوعاء الأول: علامة الفريق في جدول المدربين (مطابقة بريد غير حساسة لحالة الأحرف)
    if (email) {
      const { data: tr } = await supabaseAdmin
        .from('trainers')
        .select('password')
        .ilike('email', email)
        .maybeSingle()
      const pw = (tr as any)?.password
      if (typeof pw === 'string' && pw.startsWith(TEAM_MARKER_PREFIX)) {
        const afterPrefix = pw.substring(TEAM_MARKER_PREFIX.length)
        const sepIdx = afterPrefix.indexOf('__')
        const role = sepIdx !== -1 ? afterPrefix.substring(0, sepIdx) : ''
        if (role) return role
      }
    }
    // الوعاء الثاني: سجل الفريق الرسمي (team_members — محصّن ضد أي محو)
    const byId = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if ((byId.data as any)?.role) return (byId.data as any).role
    if (email) {
      const byEmail = await supabaseAdmin
        .from('team_members')
        .select('role')
        .ilike('email', email)
        .maybeSingle()
      if ((byEmail.data as any)?.role) return (byEmail.data as any).role
    }
  } catch {}
  return undefined
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ deleted: false })
    }

    // 1. Check if the user exists in the users table
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, email, banned, banned_reason, role')
      .eq('id', userId)
      .maybeSingle()

    if (userRow) {
      // User still exists — check force_logout table
      const { data: fl } = await supabaseAdmin
        .from('force_logout')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (fl) {
        return NextResponse.json({ deleted: true, reason: fl.reason })
      }
      // 👑 v10.11 — مرسوم الحظر: حساب محظور (الإدارة لا تُحظر أصلاً من الـ API)
      if ((userRow as any).banned) {
        return NextResponse.json({
          deleted: false,
          banned: true,
          ban_reason: (userRow as any).banned_reason || 'مخالفة سياسات الأكاديمية',
          role: (userRow as any).role || 'student',
        })
      }
      // 👑 v6.9 — شفاء هوية الفريق مع كل فتح للتطبيق
      const team_role = await resolveTeamRole(userId, (userRow as any).email)
      return NextResponse.json({ deleted: false, team_role })
    }

    // 2. Check if the user exists in the trainers table (for team members)
    const { data: trainerRow } = await supabaseAdmin
      .from('trainers')
      .select('id, email, password, banned, banned_reason')
      .eq('id', userId)
      .maybeSingle()

    if (trainerRow) {
      const { data: fl } = await supabaseAdmin
        .from('force_logout')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (fl) {
        return NextResponse.json({ deleted: true, reason: fl.reason })
      }
      // 👑 v6.9 — عضو الفريق الداخل من باب المدربين تُستخرج دورُه من علامته
      const pw = (trainerRow as any).password
      let team_role: string | undefined
      if (typeof pw === 'string' && pw.startsWith(TEAM_MARKER_PREFIX)) {
        const afterPrefix = pw.substring(TEAM_MARKER_PREFIX.length)
        const sepIdx = afterPrefix.indexOf('__')
        team_role = sepIdx !== -1 ? afterPrefix.substring(0, sepIdx) : undefined
      }
      // 👑 v10.11 — مرسوم الحظر: مدرب محظور (أعضاء الفريق = إدارة لا تُحظر)
      if ((trainerRow as any).banned && !team_role) {
        return NextResponse.json({
          deleted: false,
          banned: true,
          ban_reason: (trainerRow as any).banned_reason || 'مخالفة سياسات الأكاديمية',
          role: 'trainer',
        })
      }
      return NextResponse.json({ deleted: false, team_role })
    }

    // 3. User not found in either table — account was deleted
    return NextResponse.json({ deleted: true, reason: 'account_not_found' })
  } catch {
    // On error, don't force-logout (safer to allow than to lock out)
    return NextResponse.json({ deleted: false })
  }
}
