import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 👑 v10.8 — نقطة فحص التحديث التلقائي للتطبيق (APK v2.9.2 — التوقيع الأصلي)
// ============================================================================
// التطبيق يستدعي هذه النقطة عند كل فتح: إن كان version_code أحدث من
// versionCode المثبّت يعرض بطاقة «تحديث متاح» أنيقة بزر تثبيت مباشر.
// ⚠️ حدّث الثوابت مع كل إصدار APK جديد — لا شيء آخر يتغير.
// ✅ v2.9.2 (versionCode 23) موقّعة بالمخزن الأصلي fia-release-v3
// (بصمة 42dfab26…) — التحديث يُثبّت مباشرة فوق التطبيق الأصلي دون حذف.
// ============================================================================

export const APP_VERSION = {
  version_code: 23,
  version_name: '2.9.2',
  apk_url: 'https://fiaacademy.vercel.app/apk/Future-International-Academy-v2.9.2.apk',
  notes: 'خصوصية «مكتبتي» الكاملة: الدروس تُفتح داخل التطبيق حصراً بعارض داخلي فاخر + إصلاح كامل لاستقرار الإقلاع + التوقيع الأصلي للأكاديمية فالتحديث يُثبّت مباشرة دون حذف',
  force_update: false,
}

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
