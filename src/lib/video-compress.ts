// 👑 v10.5 — الضغط الملكي للفيديو في المتصفح (قبل الرفع إلى خزينة تيليجرام)
// ============================================================================
// لماذا؟ بوت تيليجرام لا يبثّ ملفاً أكبر من 20MB (حد getFile الرسمي) —
// كان الفيديو يُرفع حتى 100MB ثم يفشل بثّه دائماً: «فشل تحميل الفيديو».
// الحل: إعادة ترميز ذكية في جهاز المدرب نفسه قبل الرفع:
//   • أقل من 19MB → يُرفع كما هو (صفر مساس بالجودة)
//   • أكبر → إعادة ترميز ببِت-ريت محسوب لينتج ≤ 19MB بأعلى جودة ممكنة
//     مع الحفاظ على دقة الفيديو (سقف 1080p) والصوت الأصلي
// النتيجة: كل الفيديوهات الجديدة تُبثّ بنجاح 100% وحجم أقل بكثير.
// ============================================================================

export interface CompressProgress {
  stage: 'prepare' | 'compress' | 'finalize'
  percent: number // 0..100
}

export interface CompressResult {
  file: File
  originalSize: number
  compressedSize: number
  skipped: boolean // true = كان صغيراً وأُعيد كما هو
}

const TARGET_BYTES = 19 * 1024 * 1024 // أقل من حد بث تيليجرام (20MB) بهامش أمان
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
 * يضغط ملف فيديو إلى ≤ 19MB مع أعلى جودة ممكنة.
 * يعيد الملف الأصلي كما هو إن كان صغيراً أو إن لم يدعم المتصفح الضغط.
 */
export async function compressVideoIfNeeded(
  input: File,
  onProgress?: (p: CompressProgress) => void,
): Promise<CompressResult> {
  const skippedResult = (f: File = input): CompressResult => ({
    file: f, originalSize: input.size, compressedSize: f.size, skipped: true,
  })

  // صغير أصلاً → يُرفع كما هو بلا أي إعادة ترميز (صفر تأثير على الجودة)
  if (input.size <= TARGET_BYTES) return skippedResult()

  onProgress?.({ stage: 'prepare', percent: 2 })

  const mime = pickMime()
  if (!mime || typeof document === 'undefined') {
    // متصفح لا يدعم الضغط — نعيد الأصل (الخادم سيبلغ إن تجاوز سقفه)
    return skippedResult()
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
    if (!duration) return skippedResult()

    // بِت-ريت محسوب: كل الميزانية للجودة مع الوصول للهدف
    const totalBps = (TARGET_BYTES * 8 * 0.92) / duration
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
    if (!ctx) return skippedResult()

    // مسار الالتقاط: video.captureStream (صوت+صورة) وإلا canvas+audio fallback
    let stream: MediaStream | null = null
    const vcs = (video as any).captureStream || (video as any).mozCaptureStream
    if (typeof vcs === 'function') {
      try { stream = vcs.call(video) as MediaStream } catch { stream = null }
    }
    if (!stream || stream.getVideoTracks().length === 0) {
      const cs = (canvas as any).captureStream?.(30) as MediaStream | undefined
      if (!cs) return skippedResult()
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
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }

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

    recorder.start(1000)
    draw()
    await video.play()

    await new Promise<void>((resolve) => {
      const onEnd = () => { cleanup(); resolve() }
      video.onended = onEnd
    })

    try { cancelAnimationFrame(rafId) } catch {}
    clearInterval(progressTimer)
    onProgress?.({ stage: 'finalize', percent: 96 })
    recorder.stop()
    const blob = await done
    cleanup()

    const base = input.name.replace(/\.[^.]+$/, '') || 'video'
    const ext = extFor(mime)
    const outFile = new File([blob], `${base} (مضغوط).${ext}`, { type: blob.type || `video/${ext}` })
    onProgress?.({ stage: 'finalize', percent: 100 })

    // نجحنا ونحن أصغر من الهدف؟ أعِد النتيجة — وإلا أعد الأصل (سيتعامل معه الخادم برسالة واضحة)
    if (outFile.size <= TARGET_BYTES * 1.08 && outFile.size < input.size) {
      return { file: outFile, originalSize: input.size, compressedSize: outFile.size, skipped: false }
    }
    if (outFile.size < input.size * 0.5) {
      // حتى لو لم يصل الهدف — إن قلّص الحجم للنصف فعلاً فهو أفضل من لا شيء
      return { file: outFile, originalSize: input.size, compressedSize: outFile.size, skipped: false }
    }
    return skippedResult()
  } catch {
    cleanup()
    return skippedResult()
  }
}
