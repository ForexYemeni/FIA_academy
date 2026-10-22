import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * 👑 PUT /api/trainers/self-profile — المدرب يحدّث ملفه المهني هو بنفسه
 * 🔒 الاسم مغلّق ملكياً نهائياً (يُحدد عند التسجيل ويُعدّل من الإدارة فقط).
 * 🔒 v6.6 (طلب صاحب المنصة): المسمى الوظيفي + التخصص مغلّقان في ملف المدرب
 *    تماماً — يراهما لكن لا يعدّلهما؛ التعديل من حساب الإدارة فقط
 *    (من «المدربون» → تعديل المدرب). مسموح للمدرب: الهاتف + النبذة + الصورة.
 * كان الحفظ القديم ينادي PUT /api/trainers المحمي للإدارة فكان يفشل 403 —
 * هذا المسار يمنح المدرب ملفه هو فقط دون تمس أي حقل حساس.
 */
const ALLOWED = ['phone', 'bio', 'avatar'] as const

export async function PUT(req: NextRequest) {
  const g = await guardAuth(req)
  if (!g.ok) return g.res
  const user = g.user!

  const body = await req.json().catch(() => ({}))

  // 🔒 محاولة تعديل الاسم → رد ملكي صريح
  if (typeof body?.name === 'string' && body.name.trim() && body.name !== user.name) {
    return NextResponse.json({ error: '🔒 الاسم مغلّق ملكياً — يُحدد مرة واحدة ولا يُعدّل إلا من إدارة الأكاديمية' }, { status: 403 })
  }

  // 🔒 v6.6 — المسمى الوظيفي/التخصص مغلّقان: يُشطرمان صامتاً من أي طلب
  //    (حقلان رسميان يوثّقهما الأكاديمي — للإدارة وحدها حق التعديل من
  //    «المدربون» → تعديل المدرب). لا يمرّ تغييرهما عبر هذا المسار إطلاقاً.
  delete body?.title
  delete body?.specialization

  const patch: Record<string, string> = {}
  for (const field of ALLOWED) {
    const v = body?.[field]
    if (typeof v === 'string') patch[field] = v.trim()
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'لا توجد حقول صالحة للتحديث' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('trainers')
      .update(patch)
      .eq('id', user.id)
      .select('id, name, phone, title, specialization, bio, avatar')
      .single()
    if (error) throw error

    // 🪞 مزامنة المرآة في public.users (نفس المعرف) — لتصلح الجداول المرتبطة بها
    //    (specialization أصبح عموداً حقيقياً في users منذ الترحيل 026)
    const mirrorPatch: Record<string, string> = {}
    for (const f of ['phone', 'bio', 'avatar']) if (patch[f] !== undefined) mirrorPatch[f] = patch[f]
    if (Object.keys(mirrorPatch).length > 0) {
      try { await supabaseAdmin.from('users').update(mirrorPatch).eq('id', user.id) } catch {}
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (e: any) {
    console.error('trainer self-profile error:', e?.message)
    return NextResponse.json({ error: 'تعذر حفظ الملف — أعد المحاولة' }, { status: 500 })
  }
}
