import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAdmin } from '@/lib/api-auth'
import { notifyFreeEnrollment } from '@/lib/notifications'

/**
 * 👑 /api/admin/enroll — التسجيل اليدوي الملكي
 * POST { user_id, course_id } — الإدارة تسجّل أي متدرب في أي دورة مباشرة
 * (مثلاً بعد تحويل بنكي خارج المنصة أو هدية ملكية). التسجيل يُنشأ
 * «مكتمل» مجاناً بمرجع يوضح أنه تسجيل إداري — ويصل المتدرب إشعار
 * افتتاحي فخم. Idempotent: إن كان مسجلاً مسبقاً لا يتكرر.
 */
export async function POST(req: NextRequest) {
  try {
    const g = await guardAdmin(req)
    if (!g.ok) return g.res

    const { user_id, course_id } = await req.json()
    if (!user_id || !course_id) {
      return NextResponse.json({ error: 'user_id و course_id مطلوبان' }, { status: 400 })
    }

    // تحقق من وجود الطالب والدورة
    const [{ data: student }, { data: course }] = await Promise.all([
      supabaseAdmin.from('users').select('id, name').eq('id', user_id).maybeSingle(),
      supabaseAdmin.from('courses').select('id, title, price, currency, price_type').eq('id', course_id).maybeSingle(),
    ])
    if (!student) return NextResponse.json({ error: 'المتدرب غير موجود' }, { status: 404 })
    if (!course) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })

    // Idempotent — لا تسجيل مزدوج
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .neq('status', 'ملغي')
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'المتدرب مسجّل في هذه الدورة مسبقاً' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id,
        course_id,
        amount: 0,
        currency: course.currency || 'ر.ي',
        method: 'تسجيل يدوي ملكي — من الإدارة',
        status: 'مكتمل',
        reference: `ADMIN-ENROLL:${g.user.id}`,
        date: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    // تحديث عدّاد المسجّلين في الدورة
    try {
      const { count } = await supabaseAdmin
        .from('payments').select('id', { count: 'exact', head: true }).eq('course_id', course_id)
      await supabaseAdmin.from('courses').update({ enrolled: count || 0 }).eq('id', course_id)
    } catch {}

    // إشعار ملكي للمتدرب
    try {
      await notifyFreeEnrollment(user_id, course_id)
    } catch {}

    return NextResponse.json({ success: true, enrollment: data, student_name: student.name, course_title: course.title })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
