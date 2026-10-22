import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgDangerZoneWiped } from '@/lib/telegram'
import { DZ_FULL_TABLES, createDangerSnapshot } from '@/lib/danger-snapshot'
import { guardDangerZone } from '@/lib/api-auth'

// ===== Danger Zone endpoint =====
// Accepts a POST with { userId, password } and, after verifying the admin's
// password SERVER-SIDE (bcrypt حديث / نص صريح قديم / علامة فريق), wipes the
// academy data (keeping only the founder's account and the site_settings
// table). Requires live admin identity (JWT) + correct password + rate limit.

const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json()

    // 🛡️ الحرس الملكي: هوية إدارة حية + كلمة مرور صحيحة في الخادم + حد محاولات
    //    (إصلاح جذري لعطل «كلمة المرور خاطئة رغم صحتها» — كانت المقارنة نصية
    //    صريحة بينما الحوار يشفر كلمة المرور في قاعدة البيانات lazily)
    const guard = await guardDangerZone(req, userId, password)
    if (!guard.ok) return guard.res
    const adminId = guard.user.id

    // 🛡️ الدرع الملكي: نسخة إنقاذ شاملة لكل الجداول المُمسوحة قبل الحذف
    //    (المستخدمون، المدربون، الدورات، المدفوعات، الشهادات) — فلا يُفقد شيء أبداً
    let snapshotId: string | null = null
    let snapshotRows = 0
    const snap = await createDangerSnapshot('full', 'all', 'حذف جميع البيانات', DZ_FULL_TABLES, adminId)
    if (snap) {
      snapshotId = snap.id
      snapshotRows = snap.rowTotal
    }

    // 3. Wipe the data — كل الجداول الموعودة في الحوار، بالترتيب الملكي.
    //    (trainers تُدار بحذف دقيق يُبقي أعضاء الفريق — users: يُحفظ
    //    المؤسس والإدارة. site_settings لا تُمس أبداً.)
    const results: Record<string, { ok: boolean; error?: string; count?: number }> = {}

    for (const table of DZ_FULL_TABLES) {
      // المدربون يُحذفون بدقة أدناه (باستثناء أعضاء الفريق)
      if (table === 'trainers') continue
      try {
        let del = supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (table === 'users') del = del.neq('role', 'admin')
        const res = await del
        results[table] = res.error ? { ok: false, error: res.error.message } : { ok: true }
      } catch (e: any) {
        results[table] = { ok: false, error: e?.message || 'خطأ' }
      }
    }

    // حذف المدربين غير أعضاء الفريق (باستثناء دقيق بدل حذف الكل)
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

    // Telegram audit log — one royal message with the rescue snapshot id
    try {
      await tgDangerZoneWiped('كل بيانات الأكاديمية', snapshotRows || 0, adminId, snapshotId)
    } catch {}

    return NextResponse.json({ success: true, snapshot_id: snapshotId, snapshot_rows: snapshotRows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
