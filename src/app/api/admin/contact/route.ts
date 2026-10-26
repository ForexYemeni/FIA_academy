import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 👑 v10.11 — GET /api/admin/contact
 * يُعيد هوية حساب الإدارة لفتح «دردشة فورية مع الإدارة» من بطاقة الحظر
 * (والمحادثة المفروضة على المحظورين). عام مقصوداً — يعيد المعرف والاسم
 * والصورة فقط دون أي بيانات حساسة.
 *
 * 🚫 v10.18 — «الإدارة الحقيقية أولاً»: كان المسار يعيد أول حساب إداري
 * بالتاريخ (قد يكون حساباً إدارياً آخر) — الآن يتبع بروتوكول هوية المؤسس
 * الرسمي نفسه (v6.9 / v10.17):
 *   1) علامة الفريق founder في جدول المدربين → حساب المستخدم بنفس البريد
 *   2) جدول team_members (role=founder) بالمعرّف أو البريد → حساب المستخدم
 *   3) احتياطي: أول حساب إداري بالتاريخ
 */
export async function GET() {
  try {
    // الوعاء الأول: علامة المؤسس في جدول المدربين (المعتمد في كل الأنظمة)
    try {
      const { data: tr } = await supabaseAdmin
        .from('trainers')
        .select('email')
        .like('password', '__TEAM_MEMBER__:founder__%')
        .limit(1)
        .maybeSingle()
      const founderEmail = (tr as any)?.email as string | undefined
      if (founderEmail) {
        const { data: adminUser } = await supabaseAdmin
          .from('users')
          .select('id, name, avatar, email')
          .ilike('email', founderEmail)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle()
        if (adminUser) {
          return NextResponse.json({ id: adminUser.id, name: adminUser.name, avatar: (adminUser as any).avatar || null })
        }
      }
    } catch {}

    // الوعاء الثاني: جدول الفريق المحصّن (team_members) — founder بالمعرّف أو البريد
    try {
      const { data: tms } = await supabaseAdmin
        .from('team_members')
        .select('user_id, email')
        .eq('role', 'founder')
        .limit(10)
      for (const tm of tms || []) {
        if (tm?.user_id) {
          const { data: byId } = await supabaseAdmin
            .from('users')
            .select('id, name, avatar, email')
            .eq('id', tm.user_id)
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle()
          if (byId) {
            return NextResponse.json({ id: byId.id, name: byId.name, avatar: (byId as any).avatar || null })
          }
        }
        if (tm?.email) {
          const { data: byEmail } = await supabaseAdmin
            .from('users')
            .select('id, name, avatar, email')
            .ilike('email', tm.email)
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle()
          if (byEmail) {
            return NextResponse.json({ id: byEmail.id, name: byEmail.name, avatar: (byEmail as any).avatar || null })
          }
        }
      }
    } catch {}

    // الاحتياطي: أول حساب إداري بالتاريخ (السلوك السابق)
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar, email')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'لا يوجد حساب إداري' }, { status: 404 })
    return NextResponse.json({ id: data.id, name: data.name, avatar: (data as any).avatar || null })
  } catch {
    return NextResponse.json({ error: 'خطأ في الاتصال' }, { status: 500 })
  }
}
