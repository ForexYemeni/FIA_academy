'use client'

/**
 * ============================================================================
 * FIA ACADEMY — 🎓 لافتة الدليل الملكي (Royal Guide Banner)
 * ============================================================================
 * لافتة فاخرة سينمائية تُعرض داخل لوحة الإدارة ولوحة المدرب، تجلب دورة
 * «دليل الاستخدام» من قاعدة البيانات حسب الـ slug وتفتح دروسها داخل
 * نافذة المعاينة الملكية LessonPreviewModal — بلا أي تسجيل أو تتبّع.
 * • تجلب الدورة بـ /api/courses?slug=... ثم الوحدات بـ /api/modules
 * • إن لم توجد الدورة بعد → لا تُعرض اللافتة إطلاقاً (آمن تماماً)
 * ============================================================================
 */

import { useEffect, useState } from 'react'
import { GraduationCap, ChevronDown, PlayCircle, Layers, Clock, Sparkles, X } from 'lucide-react'
import { LessonPreviewModal } from '@/components/fia/lesson-preview-modal'

interface GuideLesson {
  id: string
  title: string
  lesson_type: string
  content?: string
  video_url?: string | null
  pdf_url?: string | null
  duration_minutes?: number
  position?: number
  module_id?: string
}

interface GuideModule {
  id: string
  title: string
  description?: string
  position?: number
  lessons: GuideLesson[]
}

interface RoyalGuideBannerProps {
  slug: string
  title: string
  subtitle: string
}

export function RoyalGuideBanner({ slug, title, subtitle }: RoyalGuideBannerProps) {
  const [course, setCourse] = useState<any | null>(null)
  const [modules, setModules] = useState<GuideModule[]>([])
  const [open, setOpen] = useState(false)
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [previewLesson, setPreviewLesson] = useState<GuideLesson | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/courses?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no course'))))
      .then((c) => {
        if (!alive || !c || !c.id) return
        setCourse(c)
        return fetch(`/api/modules?course_id=${c.id}`)
          .then((r) => r.json())
          .then((m) => {
            if (alive && Array.isArray(m)) setModules(m)
          })
          .catch(() => {})
      })
      .catch(() => {})
    return () => { alive = false }
  }, [slug])

  // لا شيء يُعرض إن لم توجد الدورة بعد
  if (!course) return null

  const lessonsTotal = modules.reduce((a, m) => a + ((m.lessons as any[]) || []).length, 0)
  const minutesTotal = modules.reduce(
    (a, m) => a + ((m.lessons as any[]) || []).reduce((b, l) => b + (l.duration_minutes || 0), 0),
    0
  )

  const typeLabel: Record<string, string> = {
    video: '🎬 فيديو',
    audio: '🎙️ صوتي',
    text: '📖 نص فاخر',
    pdf: '📕 ملف',
    exam: '🧪 اختبار',
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-gold/40 shadow-lg mb-6"
      style={{ background: 'linear-gradient(135deg, #0B1635 0%, #122650 55%, #0B1635 100%)' }}
    >
      {/* زخرفة نقطية ذهبية + هالات */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 25%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 70%, #ffffff 1px, transparent 1px)',
          backgroundSize: '26px 26px, 20px 20px',
        }}
      />
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-8 w-44 h-44 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      {/* شريط ذهبي علوي */}
      <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-l from-transparent via-gold to-transparent opacity-80" />

      {/* رأس اللافتة */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-full flex items-center gap-4 p-5 text-right"
      >
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gold/30 rounded-2xl blur-lg animate-pulse" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-gold via-amber-300 to-gold flex items-center justify-center shadow-xl border border-white/30">
            <GraduationCap className="w-7 h-7 text-navy" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-[0.25em] text-gold/90 mb-1">FIA ROYAL GUIDE</p>
          <h3 className="text-lg font-extrabold text-white leading-snug">{title}</h3>
          <p className="text-sm text-white/70 mt-1 leading-relaxed">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold bg-gold/10 border border-gold/30 rounded-full px-2.5 py-0.5">
              <Layers className="w-3 h-3" /> {modules.length} وحدة · {lessonsTotal} درساً
            </span>
            {minutesTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/80 bg-white/10 border border-white/20 rounded-full px-2.5 py-0.5">
                <Clock className="w-3 h-3" /> ~{Math.max(1, Math.round(minutesTotal / 60))} ساعة
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-2.5 py-0.5">
              <Sparkles className="w-3 h-3" /> تفاعلي — افتح أي درس الآن
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-6 h-6 text-gold flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* قائمة الوحدات والدروس */}
      {open && (
        <div className="relative border-t border-gold/25 bg-navy/60 backdrop-blur-sm p-4 max-h-[420px] overflow-y-auto">
          {modules.length === 0 ? (
            <p className="text-center text-sm text-white/60 py-6">جاري تحميل الوحدات الملكية...</p>
          ) : (
            <div className="space-y-3">
              {modules.map((m, mi) => (
                <div key={m.id} className="rounded-xl border border-gold/20 bg-white/5 overflow-hidden">
                  <button
                    onClick={() => setOpenModule(openModule === m.id ? null : m.id)}
                    className="w-full flex items-center gap-3 p-3 text-right hover:bg-gold/5 transition-colors"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gold to-amber-500 text-navy text-sm font-extrabold flex items-center justify-center shadow">
                      {mi + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{m.title}</span>
                      {m.description && (
                        <span className="block text-[11px] text-white/50 truncate">{m.description}</span>
                      )}
                    </span>
                    <span className="text-[11px] text-gold/80 font-bold flex-shrink-0">
                      {((m.lessons as any[]) || []).length} دروس
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gold/70 flex-shrink-0 transition-transform ${openModule === m.id ? 'rotate-180' : ''}`} />
                  </button>
                  {openModule === m.id && (
                    <div className="border-t border-gold/15 bg-navy/40 divide-y divide-white/5">
                      {((m.lessons as any[]) || []).map((l, li) => (
                        <button
                          key={l.id}
                          onClick={() => setPreviewLesson(l)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-gold/10 transition-colors group"
                        >
                          <PlayCircle className="w-4 h-4 text-gold/70 group-hover:text-gold flex-shrink-0" />
                          <span className="flex-1 min-w-0 text-[13px] text-white/85 group-hover:text-white truncate">
                            {li + 1}. {l.title}
                          </span>
                          <span className="text-[10px] text-white/40 flex-shrink-0">
                            {typeLabel[l.lesson_type] || '📖 نص'}
                            {l.duration_minutes ? ` · ${l.duration_minutes}د` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setOpen(false)}
            className="mt-3 mx-auto flex items-center gap-1 text-[11px] text-white/50 hover:text-gold transition-colors"
          >
            <X className="w-3 h-3" /> إغلاق الدليل
          </button>
        </div>
      )}

      {/* نافذة المعاينة الملكية — نفس تجربة الدروس تماماً */}
      <LessonPreviewModal
        open={!!previewLesson}
        onOpenChange={(o) => { if (!o) setPreviewLesson(null) }}
        lesson={previewLesson as any}
        modules={modules as any}
      />
    </div>
  )
}
