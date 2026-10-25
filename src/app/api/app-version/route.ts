import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 👑 v10.6 — نقطة فحص التحديث التلقائي للتطبيق (APK v2.9.0+)
// ============================================================================
// التطبيق يستدعي هذه النقطة عند كل فتح: إن كان version_code أحدث من
// versionCode المثبّت يعرض بطاقة «تحديث متاح» أنيقة بزر تثبيت مباشر.
// ⚠️ حدّث الثوابت مع كل إصدار APK جديد — لا شيء آخر يتغير.
// ============================================================================

export const APP_VERSION = {
  version_code: 22,
  version_name: '2.9.1',
  apk_url: 'https://fiaacademy.vercel.app/apk/Future-International-Academy-v2.9.1.apk',
  notes: 'السحب للتحديث يبقى في نفس الصفحة (لا عودة للوحة التحكم) + شريط العرض في الحسابات + وضع صيانة يتخطى الإدارة دائماً + رسائل جماعية بعدّ صادق وبطاقة نتيجة فاخرة',
  force_update: false,
}

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
