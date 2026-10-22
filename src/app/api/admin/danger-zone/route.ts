import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgDangerZoneWiped } from '@/lib/telegram'
import { DZ_SECTION_TABLES, createDangerSnapshot } from '@/lib/danger-snapshot'
import { guardDangerZone } from '@/lib/api-auth'

// POST /api/admin/danger-zone
// Body: { section, user_id, password }
//
// Wipes an entire section of data. Used by the admin's Danger Zone
// panel. 🛡️ الحرس الملكي: هوية إدارة حية (JWT) + كلمة مرور صحيحة في
// الخادم + حد محاولات — لم يعد بإمكان أي زائر محو أي قسم.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { section, user_id, password } = body as { section: string, user_id?: string, password?: string }
    if (!section) return NextResponse.json({ error: 'section مطلوب' }, { status: 400 })

    const guard = await guardDangerZone(req, user_id, password)
    if (!guard.ok) return guard.res
    const adminId = guard.user.id

    // 🛡️ الدرع الملكي: التقاط نسخة إنقاذ كاملة قبل أي محو — فلا يُفقد شيء أبداً
    let snapshotId: string | null = null
    const snapshotTables = DZ_SECTION_TABLES[section]
    if (snapshotTables) {
      const snap = await createDangerSnapshot('section', section, section, snapshotTables, adminId)
      snapshotId = snap?.id || null
    }

    let count = 0
    let label = section

    switch (section) {
      case 'courses':
        // Cascade delete: wipe course-related rows first, then courses.
        for (const t of ['payments', 'certificates', 'certificate_requests', 'reviews', 'exam_questions', 'exam_attempts', 'lesson_progress', 'course_progress', 'forum_topics']) {
          try {
            // The payments/certificates/etc tables have course_id
            // — we delete by it. But we can't filter by course_id
            // without knowing the value, so we just wipe everything
            // in these tables (since we're also wiping all courses).
            await supabaseAdmin.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
          } catch {}
        }
        const { data: cd } = await supabaseAdmin.from('courses').select('id')
        count = cd?.length || 0
        await supabaseAdmin.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'الدورات'
        break

      case 'trainers':
        const { data: td } = await supabaseAdmin.from('trainers').select('id')
        count = td?.length || 0
        await supabaseAdmin.from('trainers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'المدربون'
        break

      case 'students':
        // Delete users with role='student'
        const { data: sd } = await supabaseAdmin.from('users').select('id').eq('role', 'student')
        count = sd?.length || 0
        await supabaseAdmin.from('users').delete().eq('role', 'student')
        // Also delete their enrollments (payments where user_id was a student)
        try { await supabaseAdmin.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000') } catch {}
        label = 'المتدربون'
        break

      case 'payments':
        const { data: pd } = await supabaseAdmin.from('payments').select('id')
        count = pd?.length || 0
        await supabaseAdmin.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'المدفوعات'
        break

      case 'certificates':
        const { data: ced } = await supabaseAdmin.from('certificates').select('id')
        count = ced?.length || 0
        await supabaseAdmin.from('certificates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'الشهادات'
        break

      case 'reviews':
        const { data: rd } = await supabaseAdmin.from('reviews').select('id')
        count = rd?.length || 0
        await supabaseAdmin.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'التقييمات'
        break

      case 'coupons':
        const { data: cod } = await supabaseAdmin.from('coupons').select('id')
        count = cod?.length || 0
        await supabaseAdmin.from('coupons').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        // Also clear coupon_usages
        try { await supabaseAdmin.from('coupon_usages').delete().neq('id', '00000000-0000-0000-0000-000000000000') } catch {}
        label = 'الكوبونات'
        break

      case 'blog':
        const { data: bd } = await supabaseAdmin.from('blog_posts').select('id')
        count = bd?.length || 0
        await supabaseAdmin.from('blog_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'منشورات المدوّنة'
        break

      case 'forum':
        const { data: ft } = await supabaseAdmin.from('forum_topics').select('id')
        count = ft?.length || 0
        await supabaseAdmin.from('forum_topics').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        try { await supabaseAdmin.from('forum_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000') } catch {}
        label = 'مواضيع المنتدى'
        break

      case 'contact':
        const { data: cm } = await supabaseAdmin.from('contact_messages').select('id')
        count = cm?.length || 0
        await supabaseAdmin.from('contact_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'رسائل التواصل'
        break

      case 'payment_methods':
        const { data: pm } = await supabaseAdmin.from('payment_methods').select('id')
        count = pm?.length || 0
        await supabaseAdmin.from('payment_methods').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'طرق الدفع'
        break

      case 'team':
        const { data: tm } = await supabaseAdmin.from('team_members').select('id')
        count = tm?.length || 0
        await supabaseAdmin.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'أعضاء الفريق'
        break

      case 'notifications':
        const { data: nd } = await supabaseAdmin.from('notifications').select('id')
        count = nd?.length || 0
        await supabaseAdmin.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        label = 'الإشعارات'
        break

      default:
        return NextResponse.json({ error: `قسم غير معروف: ${section}` }, { status: 400 })
    }

    // Telegram audit log
    try {
      await tgDangerZoneWiped(label, count, adminId, snapshotId)
    } catch {}

    return NextResponse.json({
      success: true,
      section: label,
      deleted: count,
      snapshot_id: snapshotId,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
