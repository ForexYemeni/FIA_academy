// 👑 v10.6 — الرفع الملكي المباشر إلى Supabase Storage (رابط توقيع مؤقت)
// ============================================================================
// يُستخدم حين يستحيل ضغط الفيديو (ترميزات HEVC…) أو تجاوز الصوت سقف تيليجرام.
// الرفع يمر من جهاز المدرب مباشرة إلى Supabase — بلا مرور على Vercel —
// فيستحيل انتهاء مهلة الدوال، ويعمل شريط تقدم حقيقي عبر XHR.
// ============================================================================

export interface RoyalStorageUpload {
  publicUrl: string
}

/**
 * يرفع الملف مباشرة إلى التخزين الملكي ويعيد رابطه العام القابل للبث.
 * - يطلب رابط توقيع من /api/upload/video-storage (خادم يضمن الأمان)
 * - يرفع عبر XHR مع تقدم حقيقي
 * - إعادة محاولة واحدة تلقائياً عند فشل الشبكة
 */
export async function uploadToRoyalStorage(
  file: File,
  kind: 'video' | 'audio' | 'pdf',
  onProgress?: (percent: number) => void,
): Promise<RoyalStorageUpload> {
  // 1) رابط التوقيع من الخادم
  const prepRes = await fetch('/api/upload/video-storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, kind }),
  })
  const prep = await prepRes.json().catch(() => ({}))
  if (!prepRes.ok || !prep?.upload_url || !prep?.public_url) {
    throw new Error(prep?.error || 'تعذّر تحضير التخزين المباشر')
  }

  // 2) الرفع المباشر مع تقدم حقيقي (محاولة، ثم إعادة محاولة واحدة عند عطل شبكة)
  const doUpload = () => new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', prep.upload_url, true)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`فشل الرفع المباشر (HTTP ${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('انقطع الاتصال أثناء الرفع المباشر'))
    const fd = new FormData()
    fd.append('file', file)
    xhr.send(fd)
  })

  try {
    await doUpload()
  } catch (e: any) {
    // إعادة محاولة واحدة — شبكات الهواتف تتقطع كثيراً
    onProgress?.(0)
    await doUpload()
  }
  onProgress?.(100)

  return { publicUrl: prep.public_url }
}

/** رسائل أسباب فشل الضغط بالعربية الواضحة — لسجل الإدارة لا للمستخدم النهائي */
export function compressFailReasonAr(reason?: string): string {
  switch (reason) {
    case 'decode_unsupported': return 'ترميز الفيديو لا يدعمه المتصفح (مثل HEVC من آيفون)'
    case 'no_mediarecorder': return 'المتصفح لا يدعم إعادة الترميز'
    case 'stalled': return 'توقف التشغيل أثناء الضغط (الشاشة أُغلقت؟)'
    case 'deadline': return 'تجاوز الضغط المدة القصوى'
    case 'empty_output': return 'خرج الضغط فارغاً'
    case 'no_duration': return 'مدة الفيديو غير قابلة للقراءة'
    default: return 'تعذّر الضغط لسبب تقني'
  }
}
