import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 👑 v10.9 — نقطة فحص التحديث التلقائي للتطبيق (APK v2.9.3 — التوقيع الأصلي)
// ============================================================================
// التطبيق يستدعي هذه النقطة عند كل فتح: إن كان version_code أحدث من
// versionCode المثبّت يعرض بطاقة «تحديث متاح» أنيقة بزر تثبيت مباشر.
// ⚠️ حدّث الثوابت مع كل إصدار APK جديد — لا شيء آخر يتغير.
// ✅ v2.9.3 (versionCode 24): إصلاح فتح «مكتبتي» (VerifyError في openFile)
// + كل مميزات v2.9.2 — موقّعة بالمخزن الأصلي fia-release-v3 (بصمة 42dfab26…).
// ============================================================================

export const APP_VERSION = {
  version_code: 24,
  version_name: '2.9.3',
  apk_url: 'https://fiaacademy.vercel.app/apk/Future-International-Academy-v2.9.3.apk',
  notes: 'إصلاح فتح «مكتبتي» في وضع عدم الاتصال + خصوصية «مكتبتي» الكاملة بعارض داخلي فاخر + التوقيع الأصلي للأكاديمية فالتحديث يُثبّت مباشرة دون حذف',
  force_update: false,
}

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
