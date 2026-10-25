import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardStaff } from '@/lib/api-auth'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 30

// ============================================================================
// 👑 v10.6 — التخزين الملكي المباشر (Supabase Storage) — صفر طرق مسدودة
// ============================================================================
// لماذا؟ بوت تيليجرام لا يبثّ إلا ≤20MB (حد getFile). ضغط المتصفح يعالج
// أغلب الفيديوهات، لكن بعضها يستحيل ضغطه (ترميزات HEVC من آيفون، متصفحات
// بلا MediaRecorder، تعليقات تشغيل). قبل v10.6 كانت هذه «فشل رفع الفيديو».
//
// الحل الجذري: رفع مباشر من جهاز المدرب إلى Supabase Storage (bucket عام
// 'lesson-media') عبر رابط توقيع مؤقت — بلا مرور على Vercel أصلاً (لا مهل
// دوال، لا حدود بوابات)، والبث العام من رابط يدعم Range requests لأي صيغة
// أصلياً (HEVC يُشغّله مشغّل الجهاز حتى لو عجز المتصفح عن فكّه).
// الحجم: ≤50MB (حد Supabase للكائن الواحد) — يتجاوز أي درس معقول.
//
// البروتوكول:
//   POST /api/upload/video-storage { filename, kind }        → رابط توقيع + رابط عام
//   العميل يرفع الملف مباشرة إلى رابط التوقيع ثم يستخدم publicUrl
// ============================================================================

const BUCKET = 'lesson-media'

// التأكد من وجود الـbucket العام — يُنشأ أول مرة فقط (idempotent)
async function ensureBucket(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    if (buckets?.some((b) => b.name === BUCKET)) return { ok: true }
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: '50MB',
      allowedMimeTypes: ['video/*', 'audio/*', 'application/pdf'],
    })
    if (error && !String(error.message || '').toLowerCase().includes('already exists')) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'storage error' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const g = await guardStaff(req)
    if (!g.ok) return g.res

    const body = await req.json().catch(() => ({}))
    const rawName: string = String(body?.filename || 'lesson.mp4')
    const kind: string = ['video', 'audio', 'pdf'].includes(body?.kind) ? body.kind : 'video'

    // اسم ملف آمن: امتداد معروف فقط + تجريد أي مسارات
    const ext = (rawName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!ext || ext.length > 5) {
      return NextResponse.json({ error: 'امتداد الملف غير صالح' }, { status: 400 })
    }
    const base = crypto.randomBytes(10).toString('hex')
    const day = new Date().toISOString().slice(0, 10)
    const path = `${kind}/${day}/${base}.${ext}`

    // تأكد من الـbucket ثم اصنع رابط توقيع رفع صالح 60 دقيقة
    const ensured = await ensureBucket()
    if (!ensured.ok) {
      return NextResponse.json({ error: `تعذّر تهيئة التخزين المباشر: ${ensured.error}` }, { status: 500 })
    }
    const signed = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path)
    if (signed.error || !signed.data) {
      return NextResponse.json({ error: signed.error?.message || 'تعذّر إنشاء رابط الرفع' }, { status: 500 })
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
    const publicUrl = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
      : ''

    return NextResponse.json({
      bucket: BUCKET,
      path,
      token: signed.data.token,
      public_url: publicUrl,
      // رابط الرفع المباشر — العميل يرسل POST multipart إليه بالتوكن
      upload_url: signed.data.signedUrl,
      expires_in: 3600,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ غير متوقع' }, { status: 500 })
  }
}
