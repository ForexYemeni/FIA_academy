import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, clientIp, tooMany } from '@/lib/api-auth'
import { notifyPasswordResetRequested } from '@/lib/notifications'

/**
 * 👑 /api/auth/forgot-password — بوابة الاستعادة الملكية
 * POST { email } — يستقبل طلب نسيان كلمة المرور:
 *  - حد محاولات صارم (3/10 دقائق لكل IP) ضد الإزعاج والتخمين
 *  - لا يكشف أبداً إن كان البريد مسجلاً أم لا (رد موحد لامتعاض الحصر)
 *  - إن وُجد الحساب: إشعار ملكي للإدارة كاملة بالاسم/البريد/الهاتف/المعرّف
 *    + إشعار طمأنة للطالب بأن طلبه وصل — ثم تصدر الإدارة كلمة مرور جديدة
 *    من لوحة المستخدمين وتتواصل معه.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`forgot:${clientIp(req)}`, 3, 10 * 60 * 1000)
    if (!rl.ok) return tooMany(rl.retryAfterSec)

    const { email } = await req.json().catch(() => ({ email: '' }))
    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'أدخل بريداً إلكترونياً صحيحاً' }, { status: 400 })
    }

    // نجده أولاً بين المستخدمين ثم بين المدربين (حسابات المدربين منفصلة)
    let found: any = null
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('id, name, email, phone, role')
      .ilike('email', cleanEmail)
      .maybeSingle()
    if (u) found = { ...u, kind: 'users' }
    if (!found) {
      const { data: t } = await supabaseAdmin
        .from('trainers')
        .select('id, name, email, phone')
        .ilike('email', cleanEmail)
        .maybeSingle()
      if (t) found = { ...t, kind: 'trainers' }
    }

    if (found) {
      try {
        await notifyPasswordResetRequested(found.id, found.name || 'عضو الأكاديمية', found.email, found.phone)
      } catch {}
    }

    // رد موحد دائماً — لا تسريب وجود الحسابات
    return NextResponse.json({
      success: true,
      message: 'إن كان بريدك مسجلاً لديناً وصل طلبك إلى الإدارة الآن — ستتواصل معك الأكاديمية لإصدار كلمة مرور جديدة 👑',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
