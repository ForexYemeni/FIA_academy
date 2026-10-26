import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 👑 v10.11 — GET /api/admin/contact
 * يُعيد هوية حساب الإدارة الأساسي لفتح «دردشة فورية مع الإدارة»
 * من بطاقة الحظر الملكية (والبطاقات المستقبلية). عام مقصوداً —
 * يعيد المعرف والاسم فقط دون أي بيانات حساسة.
 */
export async function GET() {
  try {
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
