import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * 🛡️ v6.9.4 — GET /api/trainers/offer-status — نبضة ذهبية معزولة
 * مسار مستقل 100% عن منظومة الإشعارات الثلاثية (Polling+FCM+Web Push)
 * لا يمس sw.js ولا أي إشعار قائم — يُقرأ منه فقط حالة عرض تعديل
 * النسبة المعلّق لصاحب الجلسة (هوية مزدوجة: id ثم البريد) ليعرف
 * المنبّث الذهبي في لوحة المدرب متى يرنّ الجرس ويعرض البطاقة.
 * يعيد الحد الأدنى من الحقول — لا بيانات حساسة إطلاقاً.
 */
export async function GET(req: NextRequest) {
  const g = await guardAuth(req)
  if (!g.ok) return g.res
  const user = g.user!
  try {
    let row: any = null
    // هوية مزدوجة مثل GET /api/trainers?id= — صف المدرب قد يحمل معرّفاً مختلفاً عن حسابه
    const { data: byId } = await supabaseAdmin
      .from('trainers')
      .select('id, name, status, profit_percentage, agreement')
      .eq('id', user.id)
      .maybeSingle()
    row = byId
    if (!row && user.email) {
      const { data: byEmail } = await supabaseAdmin
        .from('trainers')
        .select('id, name, status, profit_percentage, agreement')
        .ilike('email', user.email)
        .limit(1)
        .maybeSingle()
      row = byEmail
    }
    if (!row) return NextResponse.json({ found: false, pending: false })

    const reneg: any = row.agreement?.renegotiation || null
    const pending = !!reneg && reneg.trainer_response === 'pending'
    return NextResponse.json({
      found: true,
      pending,
      trainer_id: row.id,
      name: row.name || '',
      account_status: row.status || '',
      current_percentage: Number(row.profit_percentage) || 0,
      offered_at: pending ? (reneg.offered_at || null) : null,
      percentage: pending ? Number(reneg.percentage) || 0 : 0,
      note: pending ? (reneg.note || null) : null,
    })
  } catch {
    // فشل النبضة لا يُسقط شيئاً — المنبّث يكتفي بالصمت هذه الدورة
    return NextResponse.json({ found: false, pending: false })
  }
}
