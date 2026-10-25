'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { CustomPdfViewer } from '@/components/fia/custom-pdf-viewer'

// ═══════════════════════════════════════════════════════════════════
// 👑 v10.7 — عارض المكتبة الداخلي (APK v2.9.2+) — الخصوصية أولاً
// ============================================================================
// سابقاً: الدرس المحفوظ يفتح بتطبيقات خارجية (مشغل فيديو/قارئ PDF خارجي)
// عبر FileProvider + ACTION_VIEW — فيظهر الدرس في سجل التطبيقات الأخرى
// ولا خصوصية. الآن: المكتبة تفتح هذا العارض داخل WebView التطبيق نفسه
// والملف يُبَثّ محلياً عبر مسار /__fia_local__/ الذي يعترضه التطبيق
// (shouldInterceptRequest) ويخدمه من مجلده الخاص — لا يخرج الملف من
// الجهاز ولا يظهر لأي تطبيق آخر إطلاقاً.
// على المتصفح العادي لا يوجد مُعترِض أصلي — تظهر بطاقة توضيحية لطيفة.
// ============================================================================

function detectKind(name: string): 'video' | 'audio' | 'pdf' | 'unknown' {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (['mp4', 'webm', 'mov', 'm4v', 'mkv'].includes(ext)) return 'video'
  if (['mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  return 'unknown'
}

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg',
  pdf: 'application/pdf',
}

function PrettyName(name: string): string {
  try {
    const noExt = name.replace(/\.[a-z0-9]{1,5}$/i, '')
    return noExt.replace(/[-_]+/g, ' ').trim() || 'درس محفوظ'
  } catch { return 'درس محفوظ' }
}

function OfflineViewerInner() {
  const [file, setFile] = useState<string | null>(null)
  const [inApp, setInApp] = useState<boolean | null>(null)
  const pdfFiredRef = useRef(false)

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('f')
      setFile(p ? p.slice(0, 200) : null)
    } catch { setFile(null) }
  }, [])

  // كشف البيئة: داخل التطبيق يوجد جسر FiaApp/FIANativeBridge — خارجه العارض بلا فائدة
  useEffect(() => {
    try {
      setInApp(!!(window as any).FiaApp || !!(window as any).FIANativeBridge)
    } catch { setInApp(false) }
  }, [])

  const kind = useMemo(() => (file ? detectKind(file) : 'unknown'), [file])
  const mime = useMemo(() => MIME_BY_EXT[(file || '').split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream', [file])
  const title = useMemo(() => PrettyName(file || ''), [file])
  const localUrl = file ? `/__fia_local__/${encodeURIComponent(file)}` : ''
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioRate, setAudioRate] = useState(1)

  if (inApp === false) {
    return (
      <main className="min-h-[100dvh] bg-gradient-to-br from-[#0A1F44] via-[#0d2547] to-[#0A1F44] flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full rounded-3xl border border-[#C9A961]/30 bg-white/5 backdrop-blur p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A961] to-[#a8854a] flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#0A1F44]" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <h1 className="text-xl font-black text-[#C9A961] mb-3">عارض المكتبة يعمل داخل التطبيق فقط</h1>
          <p className="text-sm leading-7 text-white/70">
            دروسك المحفوظة دون إنترنت تُقرأ من داخل تطبيق أكاديمية المستقبل الدولية مباشرة — لا تُفتح بأي تطبيق خارجي حفاظاً على خصوصيتك. افتح التطبيق ثم انتقل إلى «مكتبتي».
          </p>
        </div>
      </main>
    )
  }

  if (!file) {
    return (
      <main className="min-h-[100dvh] bg-[#0A1F44] flex items-center justify-center p-6" dir="rtl">
        <div className="text-center text-white/60 text-sm">لم يُحدد أي درس — افتح الدرس من «مكتبتي» داخل التطبيق.</div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-[#0A1F44] via-[#0c2144] to-[#081633]" dir="rtl">
      {/* الترويسة الفاخرة */}
      <header className="sticky top-0 z-20 bg-[#0A1F44]/95 backdrop-blur border-b border-[#C9A961]/25 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A961]/30 to-transparent border border-[#C9A961]/40 flex items-center justify-center flex-shrink-0">
            {kind === 'video' && <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C9A961]" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>}
            {kind === 'audio' && <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C9A961]" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}
            {kind === 'pdf' && <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C9A961]" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>}
            {kind === 'unknown' && <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C9A961]" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-[#C9A961]/70 tracking-wide">مكتبتي — مشاهدة دون إنترنت 🔒</div>
            <h1 className="text-[13px] md:text-sm font-black text-white truncate">{title}</h1>
          </div>
          <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-2.5 py-1 flex-shrink-0">خاص بجهازك</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 pb-16">
        {kind === 'video' && (
          <div className="rounded-2xl overflow-hidden border border-[#C9A961]/30 shadow-2xl bg-black">
            <video
              src={localUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full aspect-video bg-black"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}

        {kind === 'audio' && (
          <div className="rounded-3xl border border-[#C9A961]/30 bg-gradient-to-b from-white/10 to-white/[0.03] p-6 shadow-2xl">
            <div className="flex flex-col items-center gap-5">
              <button
                onClick={() => { const a = audioRef.current; if (!a) return; if (a.paused) { a.play().catch(() => {}) } else { a.pause() } }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C9A961] to-[#a8854a] shadow-[0_10px_40px_rgba(201,169,97,0.35)] flex items-center justify-center active:scale-95 transition-transform"
                aria-label={audioPlaying ? 'إيقاف' : 'تشغيل'}
              >
                {audioPlaying
                  ? <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#0A1F44]" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#0A1F44] ms-1" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
              </button>
              <audio
                ref={audioRef}
                src={localUrl}
                preload="metadata"
                controls
                className="w-full"
                onPlay={() => setAudioPlaying(true)}
                onPause={() => setAudioPlaying(false)}
                onEnded={() => setAudioPlaying(false)}
              />
              <div className="flex items-center gap-2 text-[11px] font-bold text-white/60">
                <span>السرعة:</span>
                {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <button
                    key={r}
                    onClick={() => { const a = audioRef.current; if (!a) return; a.playbackRate = r; setAudioRate(r) }}
                    className={`px-2.5 py-1 rounded-full border transition-all ${audioRate === r ? 'bg-[#C9A961] text-[#0A1F44] border-[#C9A961]' : 'border-white/20 text-white/70 hover:border-[#C9A961]/50'}`}
                  >{r}×</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {kind === 'pdf' && (
          <div className="rounded-2xl overflow-hidden border border-[#C9A961]/25 bg-white shadow-2xl">
            <CustomPdfViewer url={localUrl} filename={file} firedRef={pdfFiredRef} />
          </div>
        )}

        {kind === 'unknown' && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-center">
            <p className="text-sm font-bold text-amber-200 mb-1">صيغة غير مدعومة للعرض الداخلي</p>
            <p className="text-xs text-amber-200/60">({mime}) — يمكن فتح صيغ الفيديو والصوت وPDF من المكتبة.</p>
          </div>
        )}

        <p className="mt-6 text-center text-[10.5px] text-white/35 leading-5">
          هذا الدرس محفوظ داخل مساحة التطبيق الخاصة — لا يمكن لأي تطبيق آخر الوصول إليه، ولا يُفتح خارج الأكاديمية.
        </p>
      </div>
    </main>
  )
}

export default function OfflineViewerPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-[#0A1F44]" dir="rtl" />}>
      <OfflineViewerInner />
    </Suspense>
  )
}
