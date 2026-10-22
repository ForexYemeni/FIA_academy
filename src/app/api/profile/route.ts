import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'

/**
 * 👑 /api/profile — الملف الشخصي الذاتي الملكي
 * PUT: يحدّث المستخدم ملفه هو بنفسه (اسم/هاتف/تخصص/نبذة) — دون تمس
 * أي حقل حساس (الدور/البريد/كلمة المرور/الأفاتار عبر مساراتها الخاصة).
 * كان زر «حفظ التغييرات» في لوحة الطالب يحفظ في المتصفح فقط ويظهر
 * نجاحاً زائفاً — الآن الحفظ حقيقي في قاعدة البيانات ويبقى عبر الأجهزة.
 */
const ALLOWED_FIELDS = ['name', 'phone', 'title', 'bio'] as const

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
      return NextResponse.json({ error: 'لا توجد حقول صالحة للتحديث' }, { status: 400 })
    }

    // الاسم الملكي لا يكون فارغاً
    if ('name' in updates && !updates.name) {
      return NextResponse.json({ error: 'الاسم لا يمكن أن يكون فارغاً' }, { status: 400 })
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
