import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * 👑 PUT /api/trainers/self-profile — المدرب يحدّث ملفه المهني هو بنفسه
 * 🔒 الاسم مغلّق ملكياً نهائياً (يُحدد عند التسجيل ويُعدّل من الإدارة فقط).
 * مسموح فقط: الهاتف + المسمى الوظيفي + التخصص + النبذة.
 * كان الحفظ القديم ينادي PUT /api/trainers المحمي للإدارة فكان يفشل 403 —
 * هذا المسار يمنح المدرب ملفه هو فقط دون تمس أي حقل حساس.
 */
const ALLOWED = ['phone', 'title', 'specialization', 'bio', 'avatar'] as const

export async function PUT(req: NextRequest) {
  const g = await guardAuth(req)
  if (!g.ok) return g.res
  const user = g.user!

  const body = await req.json().catch(() => ({}))

  // 🔒 محاولة تعديل الاسم → رد ملكي صريح
  if (typeof body?.name === 'string' && body.name.trim() && body.name !== user.name) {
    return NextResponse.json({ error: '🔒 الاسم مغلّق ملكياً — يُحدد مرة واحدة ولا يُعدّل إلا من إدارة الأكاديمية' }, { status: 403 })
  }

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

    return NextResponse.json({ success: true, profile: data })
  } catch (e: any) {
    console.error('trainer self-profile error:', e?.message)
    return NextResponse.json({ error: 'تعذر حفظ الملف — أعد المحاولة' }, { status: 500 })
  }
}
