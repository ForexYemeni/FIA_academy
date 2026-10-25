// 👑 v10.6 — الضغط الملكي للفيديو v2: سلّم ترميز ذكي مع حارسات صارمة
// ============================================================================
// لماذا v2؟ v10.5 كان يعيد الترميز بزمن حقيقي 1x عبر MediaRecorder — وكان
// يفشل في حالات حقيقية سببت «فشل رفع الفيديو» لبعض الدروس:
//   1) ترميزات لا يفكّها المتصفح (HEVC/H.265 من آيفون وكاميرات حديثة) —
//      الميتاداتا تُقرأ لكن الفيديو لا يُشغّل → إخراج فارغ أو تعليق.
//   2) لا حارس تعليق — لو توقف التشغيل (الشاشة أطفأت/التطبيق بالخلفية)
//      ظلّ الضغط «يعمل» للأبد.
//   3) لا بديل عند الفشل — كان يُرفض الرفع كلياً.
// v2 يحسم الثلاثة:
//   • مسبار فكّ ترميز حقيقي قبل أي جهد (0.9 ثانية تشغيل صامت حقيقي)
//   • حارسان صارمان: توقف التقدم + مهلة كلية محسوبة من مدة الفيديو
//   • سبب فشل مُوثَّق (decode_unsupported / stalled / …) ليُسقط المُستدعي
//     بذكاء إلى مسار التخزين الملكي المباشر (Supabase Storage ≤50MB)
//     الذي يبثّ أي صيغة أصلياً بلا حدود getFile — صفر طرق مسدودة.
// ============================================================================

export interface CompressProgress {
  stage: 'prepare' | 'compress' | 'finalize'
  percent: number // 0..100
}

export interface CompressResult {
  file: File
  originalSize: number
  compressedSize: number
  skipped: boolean // true = أُعيد الأصل كما هو (صغير أو فشل الضغط)
  reason?: string // عند الفشل: لماذا لم يُضغط (ليقرر المُستدعي المسار البديل)
}

export const COMPRESS_TARGET_BYTES = 19 * 1024 * 1024 // أقل من حد بث تيليجرام (20MB)

const MIN_VIDEO_BPS = 350_000
const MAX_VIDEO_BPS = 6_000_000
const AUDIO_BPS = 96_000

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) {
    try { if (MediaRecorder.isTypeSupported(c)) return c } catch {}
  }
  return null
}

function extFor(mime: string): string {
  return mime.includes('mp4') ? 'mp4' : 'webm'
}

/**
 * مسبار فكّ الترميز: هل يستطيع هذا المتصفح تشغيل الفيديو فعلاً؟
 * الميتاداتا وحدها لا تكفي — HEVC يقرأها ثم يفشل بالتشغيل. نشغّل 0.9 ثانية
 * صامتة خلف الكواليس ونتأكد أن currentTime تقدّم فعلاً.
 */
async function probeDecode(video: HTMLVideoElement): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      try { video.pause(); video.currentTime = 0 } catch {}
      resolve(ok)
    }
    const timer = setTimeout(() => finish(video.currentTime > 0.1), 9000)
    video.onplaying = () => {
      // أعطِ التشغيل لحظة ثم تحقق من تقدّم الوقت فعلياً
      setTimeout(() => {
        clearTimeout(timer)
        finish(video.currentTime > 0.05)
      }, 850)
    }
    video.onerror = () => { clearTimeout(timer); finish(false) }
    video.muted = true
    try {
      const p = video.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => { clearTimeout(timer); finish(false) })
      }
    } catch {
      clearTimeout(timer)
      finish(false)
    }
  })
}

/**
 * يضغط ملف فيديو إلى ≤ 19MB مع أعلى جودة ممكنة.
 * يعيد الملف الأصلي مع reason واضح إن تعذّر الضغط — فيمرّ المُستدعي
 * إلى مسار التخزين المباشر بدل رفض الرفع.
 */
export async function compressVideoIfNeeded(
  input: File,
  onProgress?: (p: CompressProgress) => void,
): Promise<CompressResult> {
  const skippedResult = (reason?: string, f: File = input): CompressResult => ({
    file: f, originalSize: input.size, compressedSize: f.size, skipped: true, reason,
  })

  // صغير أصلاً → يُرفع كما هو بلا أي إعادة ترميز (صفر تأثير على الجودة)
  if (input.size <= COMPRESS_TARGET_BYTES) return skippedResult()

  onProgress?.({ stage: 'prepare', percent: 2 })

  const mime = pickMime()
  if (!mime || typeof document === 'undefined') {
    // متصفح لا يدعم MediaRecorder — مسار التخزين المباشر يتكفل
    return skippedResult('no_mediarecorder')
  }

  const srcUrl = URL.createObjectURL(input)
  const video = document.createElement('video')
  video.src = srcUrl
  video.muted = false
  video.playsInline = true
  video.preload = 'auto'

  const cleanup = () => {
    try { video.pause() } catch {}
    try { URL.revokeObjectURL(srcUrl) } catch {}
  }

  try {
    // انتظر جاهزية الميتاداتا لمعرفة المدة والأبعاد
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout-metadata')), 20000)
      video.onloadedmetadata = () => { clearTimeout(t); resolve() }
      video.onerror = () => { clearTimeout(t); reject(new Error('video-error')) }
    })

    const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0
    if (!duration) return skippedResult('no_duration')

    // 👑 v10.6 — مسبار فكّ الترميز الحقيقي (HEVC وغيره يُكشف هنا)
    onProgress?.({ stage: 'prepare', percent: 4 })
    const decodable = await probeDecode(video)
    if (!decodable) {
      cleanup()
      return skippedResult('decode_unsupported')
    }

    // بِت-ريت محسوب: كل الميزانية للجودة مع الوصول للهدف
    const totalBps = (COMPRESS_TARGET_BYTES * 8 * 0.92) / duration
    const videoBps = Math.max(MIN_VIDEO_BPS, Math.min(MAX_VIDEO_BPS, totalBps - AUDIO_BPS))

    // دقة محفوظة (سقف 1080p لأداء سلس على الهواتف)
    const srcW = video.videoWidth || 1280
    const srcH = video.videoHeight || 720
    const cap = 1920
    const scale = Math.min(1, cap / Math.max(srcW, srcH))
    const w = Math.max(2, Math.round((srcW * scale) / 2) * 2)
    const h = Math.max(2, Math.round((srcH * scale) / 2) * 2)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return skippedResult('no_canvas')

    // مسار الالتقاط: video.captureStream (صوت+صورة) وإلا canvas+audio fallback
    let stream: MediaStream | null = null
    const vcs = (video as any).captureStream || (video as any).mozCaptureStream
    if (typeof vcs === 'function') {
      try { stream = vcs.call(video) as MediaStream } catch { stream = null }
    }
    if (!stream || stream.getVideoTracks().length === 0) {
      const cs = (canvas as any).captureStream?.(30) as MediaStream | undefined
      if (!cs) return skippedResult('no_capture_stream')
      stream = cs
    }
    // ضمان وجود مسار صوتي (captureStream من canvas بلا صوت)
    if (stream.getAudioTracks().length === 0) {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext
        if (AC) {
          const ac = new AC()
          const source = ac.createMediaElementSource(video)
          const dest = ac.createMediaStreamDestination()
          source.connect(dest)
          dest.stream.getAudioTracks().forEach((t) => stream!.addTrack(t))
        }
      } catch {}
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: videoBps,
      audioBitsPerSecond: AUDIO_BPS,
    })
    const chunks: BlobPart[] = []
    let lastSize = 0
    let lastGrowth = Date.now()
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data)
        lastSize = chunks.reduce((s: number, c: any) => s + (c.size || 0), 0)
        lastGrowth = Date.now()
      }
    }

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }))
      recorder.onerror = () => reject(new Error('recorder-error'))
    })

    // حلقة الرسم — كل إطار يُرسَم على الكانفس (هذا مصدر الصورة عند استخدام canvas)
    let rafId = 0
    const draw = () => {
      try { ctx.drawImage(video, 0, 0, w, h) } catch {}
      rafId = requestAnimationFrame(draw)
    }

    // تتبع التقدم أثناء التشغيل الحقيقي (الضغط بزمن حقيقي 1x)
    const progressTimer = setInterval(() => {
      const pct = Math.min(97, Math.round((video.currentTime / duration) * 90) + 5)
      onProgress?.({ stage: 'compress', percent: pct })
    }, 700)

    // 👑 v10.6 — الحارسان الصارمان:
    // (أ) حارس التعليق: لا نمو في البيانات 15 ثانية → أوقف كل شيء
    // (ب) المهلة الكلية: مدة الفيديو + هامش 90 ثانية → أوقف كل شيء
    // قبل v10.6 كان التعليق يبقى «يعمل» للأبد فيعلّق رفع الدرس كله.
    let aborted = false
    let abortReason = 'stalled'
    const stallTimer = setInterval(() => {
      if (Date.now() - lastGrowth > 15000 && !aborted) {
        aborted = true
        abortReason = 'stalled'
        try { recorder.stop() } catch {}
        try { video.pause() } catch {}
      }
    }, 3000)
    const deadline = setTimeout(() => {
      if (!aborted) {
        aborted = true
        abortReason = 'deadline'
        try { recorder.stop() } catch {}
        try { video.pause() } catch {}
      }
    }, (duration + 90) * 1000)

    const finishAborted = (): CompressResult => {
      clearInterval(stallTimer)
      clearTimeout(deadline)
      try { cancelAnimationFrame(rafId) } catch {}
      clearInterval(progressTimer)
      cleanup()
      return skippedResult(abortReason)
    }

    recorder.start(1000)
    draw()
    await video.play()

    await new Promise<void>((resolve) => {
      video.onended = () => resolve()
      // لو أُجهض الدوران (الحارسان) — الخروج فوراً أيضاً
      const watchAborts = setInterval(() => {
        if (aborted) { clearInterval(watchAborts); resolve() }
      }, 500)
    })

    clearInterval(stallTimer)
    clearTimeout(deadline)
    try { cancelAnimationFrame(rafId) } catch {}
    clearInterval(progressTimer)

    if (aborted) return finishAborted()

    onProgress?.({ stage: 'finalize', percent: 96 })
    recorder.stop()
    const blob = await done
    cleanup()

    // 👑 v10.6 — فحص سلامة الإخراج: ملف شبه فارغ = فشل صامت (كان يمرّ قبل v10.6)
    if (blob.size < 64 * 1024) return skippedResult('empty_output')

    const base = input.name.replace(/\.[^.]+$/, '') || 'video'
    const ext = extFor(mime)
    const outFile = new File([blob], `${base} (مضغوط).${ext}`, { type: blob.type || `video/${ext}` })
    onProgress?.({ stage: 'finalize', percent: 100 })

    // نجحنا ونحن أصغر من الهدف؟ أعِد النتيجة — وإلا سيقرر المُستدعي المسار البديل
    if (outFile.size <= COMPRESS_TARGET_BYTES * 1.08 && outFile.size < input.size) {
      return { file: outFile, originalSize: input.size, compressedSize: outFile.size, skipped: false }
    }
    if (outFile.size < input.size * 0.5) {
      // حتى لو لم يصل الهدف — إن قلّص الحجم للنصف فعلاً فهو أفضل من لا شيء
      return { file: outFile, originalSize: input.size, compressedSize: outFile.size, skipped: false }
    }
    return skippedResult('not_smaller_enough')
  } catch (e: any) {
    cleanup()
    return skippedResult('exception')
  }
}
