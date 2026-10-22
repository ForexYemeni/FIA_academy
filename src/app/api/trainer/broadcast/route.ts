import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth, rateLimit, clientIp, tooMany } from '@/lib/api-auth'
import { sendRoyalBroadcast } from '@/lib/notifications'

/**
 * 👑 /api/trainer/broadcast — النداء الملكي الجماعي للمدرب
 * POST { course_id?: string | 'all', title, message }
 * - المدرب يبث لطلاب دوراته فقط (تحقق ملكية صارم) — أو لطلابه جميعاً
 *   إن كان course_id = 'all'
 * - الطلاب = أصحاب تسجيلات مؤكدة/مجانية فقط (لا المعلّق والمرفوض)
 * - حد محاولات: 8 رسائل/ساعة للمدرب الواحد — فلا يتحول العرش إلى مزعج
 * - الإشعار يصل عبر القناة الملكية الكاملة: الجرس + FCM + OneSignal
 */
export async function POST(req: NextRequest) {
  try {
    const g = await guardAuth(req)
    if (!g.ok) return g.res

    const rl = rateLimit(`broadcast:${g.user.id}:${clientIp(req)}`, 8, 60 * 60 * 1000)
    if (!rl.ok) return tooMany(rl.retryAfterSec)

    const { course_id, title, message } = await req.json()
    const cleanTitle = String(title || '').trim()
    const cleanMessage = String(message || '').trim()
    if (!cleanTitle || !cleanMessage) {
      return NextResponse.json({ error: 'العنوان والرسالة مطلوبان' }, { status: 400 })
    }
    if (cleanTitle.length > 120 || cleanMessage.length > 800) {
      return NextResponse.json({ error: 'الرسالة طويلة جداً — اختصر بلغة الملوك' }, { status: 400 })
    }

    // 1) دورات المدرب المؤهَّل بثُها
    const { data: allCourses } = await supabaseAdmin
      .from('courses').select('id, title, trainer_id')
    const courses = allCourses || []

    let ownCourses: any[] = []
    if (g.user.role === 'admin') {
      ownCourses = course_id === 'all' ? courses : courses.filter((c: any) => c.id === course_id)
    } else {
      const { data: profile } = await supabaseAdmin
        .from('trainers').select('id, email').eq('id', g.user.id).maybeSingle()
      const profileId = profile?.id || g.user.id
      const email = profile?.email || g.user.email
      const { data: byEmail } = email
        ? await supabaseAdmin.from('trainers').select('id').eq('email', email).maybeSingle()
        : { data: null }
      const ownIds = new Set(
        courses
          .filter((c: any) => c.trainer_id === profileId || (byEmail?.id && c.trainer_id === byEmail.id))
          .map((c: any) => c.id)
      )
      ownCourses = course_id === 'all'
        ? courses.filter((c: any) => ownIds.has(c.id))
        : courses.filter((c: any) => c.id === course_id && ownIds.has(c.id))
    }

    if (course_id !== 'all' && ownCourses.length === 0) {
      return NextResponse.json({ error: 'غير مصرح — هذه الدورة ليست من دوراتك' }, { status: 403 })
    }
    if (ownCourses.length === 0) {
      return NextResponse.json({ error: 'لا توجد دورات مؤهلة للبث' }, { status: 400 })
    }

    // 2) طلاب الدورات المستهدفة (تسجيلات مؤكدة/مجانية فقط)
    const targetCourseIds = ownCourses.map((c: any) => c.id)
    const { data: pays } = await supabaseAdmin
      .from('payments')
      .select('user_id, course_id, amount, status')
      .in('course_id', targetCourseIds)
    const studentIds = new Set<string>()
    for (const p of pays || []) {
      const approved = p.status === 'مكتمل' || p.status === 'completed' || Number(p.amount) === 0
      if (approved && p.user_id && p.user_id !== g.user.id) studentIds.add(p.user_id)
    }
    if (studentIds.size === 0) {
      return NextResponse.json({ error: 'لا يوجد طلاب مسجّلون بعد في هذا النطاق' }, { status: 400 })
    }

    // 3) البث الملكي
    const scopeLabel = course_id === 'all'
      ? 'جميع طلابك'
      : ownCourses.map((c: any) => c.title).join('، ')
    const finalTitle = cleanTitle
    const finalBody = course_id === 'all'
      ? cleanMessage
      : `[${scopeLabel}] ${cleanMessage}`

    const delivered = await sendRoyalBroadcast(Array.from(studentIds), finalTitle, finalBody, '/')

    return NextResponse.json({
      success: true,
      delivered,
      scope: scopeLabel,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
