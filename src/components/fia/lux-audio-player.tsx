'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Loader2, AlertTriangle, Volume2 } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// 👑 LuxAudioPlayer — المشغّل الصوتي الملكي للدروس الصوتية
// ───────────────────────────────────────────────────────────────
// • البث يمر عبر بوابة محمية /api/lessons/audio-stream (تفحص
//   الصلاحيات لكل ثانية صوت — التوكن لا يغادر الخادم أبداً).
// • الإكمال بنمط الفيديو الرسمي: onEnded + نسخة احتياطية عند 95%
//   (الملفات المشفرة أحياناً لا تطلق onEnded) — مرة واحدة لكل جلسة.
// • تصميم ملكي: بطاقة كحلية، موجة ذهبية تتراقص أثناء التشغيل،
//   شريط تقدم ذهبي متوهج، سرعات تشغيل، إعادة، وحالة خطأ أنيقة.
// ═══════════════════════════════════════════════════════════════

const SPEEDS = [1, 1.25, 1.5, 2, 0.75]

function fmtTime(t: number): string {
  if (!isFinite(t) || t < 0) t = 0
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = Math.floor(t % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function LuxAudioPlayer({
  src,
  title,
  onComplete,
}: {
  src: string
  title?: string
  onComplete?: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const firedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)

  // Reset per source (lesson change) — same pattern as VideoPlayer
  useEffect(() => {
    firedRef.current = false
    setPlaying(false)
    setLoading(true)
    setError(null)
    setCurrent(0)
    setTotal(0)
    setSpeedIdx(0)
  }, [src])

  const fireComplete = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    try { onComplete?.() } catch {}
  }, [onComplete])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      a.play().catch(() => setError('تعذّر تشغيل الصوت — جرّب إعادة المحاولة'))
    } else {
      a.pause()
    }
  }

  const retry = () => {
    const a = audioRef.current
    if (!a) return
    setError(null)
    setLoading(true)
    a.load()
  }

  const changeSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !total) return
    const rect = e.currentTarget.getBoundingClientRect()
    // Seek bar is LTR (standard audio convention) even in RTL layouts
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    a.currentTime = ratio * total
    setCurrent(a.currentTime)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-[#0A1F44] via-[#0D244F] to-[#061229] shadow-[0_8px_30px_rgba(11,22,53,0.35)]">
      {/* نقش نقاط ملكي خافت */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, #D4AF37 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }} />
      {/* هالة ذهبية عُلوية */}
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.18),transparent_70%)] pointer-events-none" />

      {/* الموجة الذهبية المتزامنة */}
      <div className="relative flex items-end justify-center gap-[3px] h-14 pt-4 px-4" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className={`w-[4px] rounded-full bg-gradient-to-t from-amber-600 via-gold to-gold-light transition-all duration-300 ${playing ? 'lux-wave' : 'opacity-40'}`}
            style={{
              height: playing ? undefined : '8px',
              animationDelay: `${(i % 7) * 0.12}s`,
              animationDuration: `${0.8 + (i % 5) * 0.12}s`,
            }}
          />
        ))}
      </div>

      {/* شريط التحكم */}
      <div className="relative px-4 pb-4 pt-1">
        {/* شريط التقدم */}
        <div
          onClick={seek}
          className="group relative h-3 rounded-full bg-white/10 cursor-pointer overflow-hidden ring-1 ring-white/10 hover:ring-gold/40 transition-all"
          role="slider" aria-label="شريط التقدم" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(current)}
        >
          <div
            className="absolute inset-y-0 right-0 bg-gradient-to-l from-gold-light via-gold to-amber-600 shadow-[0_0_12px_rgba(212,175,55,0.55)] transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
          {/* مقبض ذهبي */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-gold-light to-amber-600 ring-2 ring-white/70 shadow-md transition-transform group-hover:scale-110"
            style={{ right: `calc(${pct}% - 8px)` }}
          />
        </div>

        <div className="flex items-center gap-3 mt-3">
          {/* زر التشغيل الملكي */}
          <button
            onClick={error ? retry : toggle}
            className="relative flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-gold-light via-gold to-amber-600 text-navy flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.5)] hover:scale-105 active:scale-95 transition-transform"
            aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {loading && !error ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : error ? (
              <RotateCcw className="w-5 h-5" />
            ) : playing ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 -me-0.5" fill="currentColor" />
            )}
            {/* نبضة عند التشغيل */}
            {playing && <span className="absolute inset-0 rounded-full bg-gold/40 animate-ping opacity-30" />}
          </button>

          {/* العنوان والوقت */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-gold text-xs font-bold truncate">
              <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{title || 'درس صوتي'}</span>
            </div>
            <div className="text-white/60 text-[11px] tabular-nums mt-0.5" dir="ltr">
              {fmtTime(current)} / {total > 0 ? fmtTime(total) : error ? '--:--' : '…'}
            </div>
          </div>

          {/* السرعة */}
          <button
            onClick={changeSpeed}
            disabled={!!error}
            className="flex-shrink-0 h-8 px-2.5 rounded-xl bg-white/10 text-white/80 text-xs font-bold tabular-nums ring-1 ring-white/15 hover:bg-gold/20 hover:text-gold hover:ring-gold/40 transition-all"
            aria-label="سرعة التشغيل"
          >
            {SPEEDS[speedIdx]}×
          </button>
        </div>

        {/* حالة الخطأ */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-300 bg-red-500/15 border border-red-400/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={retry} className="font-bold text-white hover:text-gold transition-colors">إعادة المحاولة</button>
          </div>
        )}
      </div>

      {/* عنصر الصوت الفعلي */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => {
          setTotal(e.currentTarget.duration || 0)
          setLoading(false)
          e.currentTarget.playbackRate = SPEEDS[speedIdx]
        }}
        onCanPlay={() => setLoading(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget
          setCurrent(a.currentTime)
          // نسخة احتياطية للإكمال عند 95% (نفس منطق الفيديو)
          if (a.duration && a.currentTime / a.duration >= 0.95) fireComplete()
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={fireComplete}
        onError={() => { setLoading(false); setError('تعذّر تحميل الصوت — قد يكون الاتصال ضعيفاً أو انتهت صلاحية الرابط') }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
      />
    </div>
  )
}
