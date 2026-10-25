import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 👑 v10.10 — نقطة فحص التحديث التلقائي للتطبيق (APK v2.9.4 — التوقيع الأصلي)
// ============================================================================
// التطبيق يستدعي هذه النقطة عند كل فتح: إن كان version_code أحدث من
// versionCode المثبّت يعرض بطاقة «تحديث متاح» أنيقة بزر تثبيت مباشر.
// ⚠️ حدّث الثوابت مع كل إصدار APK جديد — لا شيء آخر يتغير.
// ✅ v2.9.4 (versionCode 25): إزالة «مكتبتي» دون إنترنت نهائياً (بقرار الإدارة)
// + فتح فوري لمعاينة الدروس (كاش ملكي + تحضير مسبق للروابط) — موقّعة بالمخزن
// الأصلي fia-release-v3 (بصمة 42dfab26…) فالتحديث يُثبّت مباشرة دون حذف.
// ============================================================================

export const APP_VERSION = {
  version_code: 25,
  version_name: '2.9.4',
  apk_url: 'https://fiaacademy.vercel.app/apk/Future-International-Academy-v2.9.4.apk',
  notes: 'إزالة «مكتبتي» دون إنترنت نهائياً بقرار الإدارة — تنظيف ملفاتها القديمة تلقائياً + فتح فوري لمعاينة الدروس وتسريع محتوى الدورات + التوقيع الأصلي فالتحديث يُثبّت مباشرة دون حذف',
  force_update: false,
}

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
