import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'

export const runtime = 'nodejs'

// 👑 v10.6 — من أنت؟ نقطة فحص خفيفة للواجهة: تعرف دور الجلسة الحالية
// تُستخدم لبوابة وضع الصيانة (الإدارة تتجاوز) ولميزات تظهر للطاقم فقط.
// لا تكشف أي بيانات حساسة — الدور والاسم الأول فقط.
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ authenticated: false })
    return NextResponse.json({
      authenticated: true,
      id: user.id,
      role: (user as any).role || 'student',
      name: (user as any).name || '',
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
