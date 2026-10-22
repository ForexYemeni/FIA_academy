import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgDangerZoneWiped } from '@/lib/telegram'
import { DZ_FULL_TABLES, DZ_SELECTIVE_WIPES, DZ_NEVER_WIPE, createDangerSnapshot } from '@/lib/danger-snapshot'
import { guardDangerZone } from '@/lib/api-auth'
import {
  ROYAL_SLUG_ADMIN_GUIDE,
  ROYAL_SLUG_USER_GUIDE,
  getRoyalScope,
  royalNotInFilter,
} from '@/lib/royal-guard'

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

    // 👑 الخاتم الملكي: جلب هويات الدورتين المحميتين الأبديتين قبل المحو —
    //    دورة إتقان إدارة الأكاديمية + الدليل التعليمي للمتدربين والمدربين
    //    لا تُحذف أبداً (أمر ملكي) — تظل باقية بعد أي محو بكل محتواها.
    const royal = await getRoyalScope(true)
    const royalCoursesNot = royalNotInFilter(royal.courseIds)
    const royalModulesNot = royalNotInFilter(royal.moduleIds)

    // 3. Wipe the data — كل الجداول الموعودة في الحوار، بالترتيب الملكي.
    //    (trainers تُدار بحذف دقيق يُبقي أعضاء الفريق — users: يُحفظ
    //    المؤسس والإدارة. site_settings لا تُمس أبداً. الدورتان الملكيتان
    //    ووحداتها ودروسها وبنك أسئلتها محميان بالخاتم — لا يُمسّان أبداً.)
    const results: Record<string, { ok: boolean; error?: string; count?: number }> = {}

    for (const table of DZ_FULL_TABLES) {
      // المدربون يُحذفون بدقة أدناه (باستثناء أعضاء الفريق)
      if (table === 'trainers') continue
      // 👑 v5.6: جداول محظورة نهائياً — شريان الحياة (دفاع مزدوج)
      if (DZ_NEVER_WIPE.includes(table)) continue
      try {
        let del = supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (table === 'users') del = del.neq('role', 'admin')
        // 👑 v5.6: مسح انتقائي (public_profiles يفقد ملفات المتدربين والمدربين
        //     الممسوحين فقط — ملفات المؤسس والفريق باقية)
        const selective = DZ_SELECTIVE_WIPES[table]
        if (selective) del = selective(del)
        // 👑 الخاتم الملكي — استبعاد صفوف الدورتين المحميتين من المحو:
        if (royalCoursesNot) {
          if (table === 'courses') del = del.not('id', 'in', royalCoursesNot)
          if (table === 'course_modules' || table === 'exam_questions') del = del.not('course_id', 'in', royalCoursesNot)
        }
        if (royalModulesNot && table === 'course_lessons') del = del.not('module_id', 'in', royalModulesNot)
        const res = await del
        // 👑 إصلاح ملكي v5.5: جدول غير موجود أصلاً = لا شيء ليُحذف = نجاح
        //    (كان يُحسب فشلاً فيظهر «فشل حذف بعض الجداول» زوراً رغم أن
        //    كل عمليات الحذف الحقيقية نجحت)
        if (res.error && /does not exist|could not find the table|schema cache/i.test(res.error.message || '')) {
          results[table] = { ok: true, count: 0 }
        } else {
          results[table] = res.error ? { ok: false, error: res.error.message } : { ok: true }
        }
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

    // 👑 الخاتم الملكي — بعد المحو: تحرير الدورتين المحميتين من أي trainer_id
    //    ميت (مدربوها المحميون بتعليمهم الفريق قد يكونون قد مُسوا) ثم إعادة
    //    إحكام التسجيل الملكي: الإدارة الناجية ← دورة الإتقان، وأعضاء
    //    الفريق الناجون ← دليل المتدربين والمدربين. فتبقى الدورتان
    //    جاهزتين للفريق فور عودته إلى أكاديمية حديثة الإنشاء.
    try {
      if (royal.has) {
        await supabaseAdmin.from('courses').update({ trainer_id: null }).in('id', royal.courseIds)

        const bySlug = new Map<string, string>()
        const { data: royalRows } = await supabaseAdmin
          .from('courses').select('id, slug').in('slug', [ROYAL_SLUG_ADMIN_GUIDE, ROYAL_SLUG_USER_GUIDE])
        for (const r of (royalRows || []) as any[]) bySlug.set(r.slug, r.id)
        const adminGuideId = bySlug.get(ROYAL_SLUG_ADMIN_GUIDE)
        const userGuideId = bySlug.get(ROYAL_SLUG_USER_GUIDE)

        const [adminsRes, teamRes] = await Promise.all([
          supabaseAdmin.from('users').select('id').eq('role', 'admin'),
          supabaseAdmin.from('trainers').select('id, password'),
        ])
        const TEAM_MARKER_PREFIX_LOCAL = '__TEAM_MEMBER__:'
        const admins = (adminsRes.data || []).map((u: any) => u.id).filter(Boolean)
        const teamTrainers = ((teamRes.data || []) as any[])
          .filter((t) => t.password && String(t.password).startsWith(TEAM_MARKER_PREFIX_LOCAL))
          .map((t) => t.id)

        const { data: existingEnrollments } = await supabaseAdmin
          .from('payments').select('user_id, course_id').in('course_id', royal.courseIds)
        const enrolled = new Set(((existingEnrollments || []) as any[]).map((p) => `${p.user_id}::${p.course_id}`))

        const reEnroll: { user_id: string; course_id: string }[] = []
        for (const uid of admins) {
          if (adminGuideId && !enrolled.has(`${uid}::${adminGuideId}`)) reEnroll.push({ user_id: uid, course_id: adminGuideId })
        }
        for (const tid of teamTrainers) {
          if (userGuideId && !enrolled.has(`${tid}::${userGuideId}`)) reEnroll.push({ user_id: tid, course_id: userGuideId })
        }
        if (reEnroll.length > 0) {
          await supabaseAdmin.from('payments').insert(
            reEnroll.map((r) => ({
              amount: 0,
              currency: 'ر.ي',
              method: 'تسجيل مجاني ملكي — دليل الأكاديمية',
              status: 'مكتمل',
              reference: 'GUIDE-FREE',
              date: new Date().toISOString(),
              user_id: r.user_id,
              course_id: r.course_id,
            }))
          )
        }
      }
    } catch {}

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
