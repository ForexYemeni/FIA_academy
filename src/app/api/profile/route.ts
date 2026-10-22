import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'

/**
 * 👑 /api/profile — الملف الشخصي الذاتي الملكي
 * PUT: يحدّث المستخدم ملفه هو بنفسه (هاتف/تخصص/نبذة) — دون تمس
 * أي حقل حساس (الدور/البريد/كلمة المرور/الأفاتار عبر مساراتها الخاصة).
 * 🔒 الاسم مغلّق نهائياً (طلب المالك): يُحدد مرة واحدة عند التسجيل ولا يُعدَّل
 * أبداً من أي حساب متدرب أو مدرب — أمر تعديل الاسم يُتجاهل ويُردّ برسالة ملكية.
 */
const ALLOWED_FIELDS = ['phone', 'title', 'bio'] as const

export async function PUT(req: NextRequest) {
  try {
    const g = await guardAuth(req)
    if (!g.ok) return g.res

    const body = await req.json()
    const updates: Record<string, string> = {}
    for (const field of ALLOWED_FIELDS) {
      const v = body?.[field]
      if (typeof v === 'string') {
        updates[field] = v.trim()
      }
    }
    if (Object.keys(updates).length === 0) {
      // محاولة تعديل الاسم وحده → رد ملكي واضح
      if (typeof body?.name === 'string' && body.name.trim()) {
        return NextResponse.json({ error: '🔒 الاسم مغلّق ملكياً — يُحدد مرة واحدة عند التسجيل ولا يمكن تعديله' }, { status: 403 })
      }
      return NextResponse.json({ error: 'لا توجد حقول صالحة للتحديث' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', g.user.id)
      .select('id, name, phone, title, bio')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, profile: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
