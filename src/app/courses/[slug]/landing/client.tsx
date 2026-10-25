'use client'

/**
 * ============================================================================
 * 👑 v10.6 — صفحة الهبوط الملكية للدورة (رابط مشاركة مستقل)
 * ============================================================================
 * تصميم سينمائي بالهوية الكاملة (كحلي × ذهبي):
 *   • Hero بطول الشاشة: الغلاف بخلفية عائمة + شارة الفئة + السعر والعرض
 *   • شريط إحصائيات: الدروس / الساعات / المستوى / التقييم
 *   • المنهج: وحدات الدورة بقائمة أنيقة (عناوين الوحدات وعدد دروسها)
 *   • بطاقة المدرب + بطاقة الشهادة
 *   • عداد العرض المحدود (LuxOfferCountdown) عند وجود عرض سارٍ
 *   • أزرار مشاركة أصلية: واتساب / تيليجرام / نسخ الرابط — بختم الملكية
 *   • CTA تسجيل يقود لصفحة الدورة الرئيسية (بوابة الدفع كاملة هناك)
 * ============================================================================
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Star, Clock, BookOpen, BarChart3, Award, GraduationCap, CheckCircle2,
  Share2, Copy, Send, ChevronLeft, Users, ShieldCheck, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { LuxOfferCountdown } from '@/components/fia/lux-experience'

interface Props {
  course: any
}

const LEVEL_AR: Record<string, string> = {
  beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', professional: 'احترافي',
}

export default function CourseLandingClient({ course }: Props) {
  const [modules, setModules] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [copied, setCopied] = useState(false)
  const [enrolledCount, setEnrolledCount] = useState<number>(Number(course.enrolled) || 0)

  const landingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/courses/${course.slug}/landing`
    : `https://fiaacademy.vercel.app/courses/${course.slug}/landing`

  useEffect(() => {
    fetch(`/api/modules?course_id=${course.id}`).then((r) => r.json()).then((d) => setModules(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/site-settings').then((r) => r.json()).then((d) => setSettings(d || {})).catch(() => {})
  }, [course.id])

  const isFree = course.price_type === 'free' || Number(course.price) === 0
  const hasOffer = !isFree && (course.offer_type === 'limited_time' || course.offer_type === 'featured') && Number(course.offer_price) > 0
  const currency = course.currency || 'ريال'

  const shareText = `🎓 دورة «${course.title}»\n${course.short_description || 'انضم الآن واحصل على شهادة معتمدة'}\n👑 أكاديمية المستقبل الدولية\n${landingUrl}`

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  const shareTelegram = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(landingUrl)}&text=${encodeURIComponent(`🎓 دورة «${course.title}» — أكاديمية المستقبل الدولية`)}`, '_blank')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(landingUrl)
      setCopied(true)
      toast.success('نُسخ رابط صفحة الهبوط — شاركه بفخامة')
      setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error('تعذّر النسخ — انسخ الرابط من شريط العنوان')
    }
  }

  const stats = [
    { icon: BookOpen, label: 'دروس', value: String(course.lessons_count || modules.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0) || '—') },
    { icon: Clock, label: 'ساعة تدريب', value: String(course.duration_hours || '—') },
    { icon: BarChart3, label: 'المستوى', value: LEVEL_AR[course.level] || 'متوسط' },
    { icon: Star, label: 'التقييم', value: course.rating ? String(course.rating) : 'جديد' },
  ]

  return (
    <main dir="rtl" className="min-h-screen bg-[#070d1c] text-white">
      {/* ═══ HERO سينمائي بطول الشاشة ═══ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* الغلاف كخلفية عائمة + طبقة تعتيم متدرجة */}
        {course.cover && (
          <div className="absolute inset-0 scale-110 blur-[2px]" style={{
            backgroundImage: `url(${course.cover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #070d1c 4%, rgba(7,13,28,0.86) 45%, rgba(7,13,28,0.55) 100%)' }} />
        {/* نقش ذهبي */}
        <div className="absolute inset-0 opacity-[0.13] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 12% 30%, #D4AF37 1.1px, transparent 1.1px), radial-gradient(circle at 86% 66%, #D4AF37 0.9px, transparent 0.9px)',
          backgroundSize: '32px 32px, 44px 44px',
        }} />
        <div className="absolute -top-24 right-1/4 w-[380px] h-[380px] bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 container mx-auto px-4 lg:px-6 py-20">
          <div className="max-w-3xl">
            {/* شارات */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {course.category && (
                <span className="text-[11px] font-black text-navy bg-gradient-to-l from-gold to-amber-400 rounded-full px-3 py-1 shadow-lg">{course.category}</span>
              )}
              {course.specialization && (
                <span className="text-[11px] font-bold text-gold border border-gold/40 bg-gold/10 rounded-full px-3 py-1">{course.specialization}</span>
              )}
              {hasOffer && (
                <span className="text-[11px] font-black text-white bg-gradient-to-l from-rose-600 to-red-500 rounded-full px-3 py-1 shadow-lg animate-pulse">⏰ عرض لمدة محدودة</span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.15] bg-gradient-to-l from-white via-gold to-white bg-clip-text text-transparent">
              {course.title}
            </h1>
            {course.short_description && (
              <p className="mt-5 text-white/80 text-base md:text-lg leading-9 max-w-2xl">{course.short_description}</p>
            )}

            {/* السعر + CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-2">
                {hasOffer ? (
                  <>
                    <span className="text-3xl font-black text-gold">{Number(course.offer_price).toLocaleString('en-US')} <span className="text-sm">{currency}</span></span>
                    <span className="text-lg text-white/45 line-through">{Number(course.price).toLocaleString('en-US')}</span>
                  </>
                ) : isFree ? (
                  <span className="text-3xl font-black text-gold">مجانية بالكامل</span>
                ) : (
                  <span className="text-3xl font-black text-gold">{Number(course.price).toLocaleString('en-US')} <span className="text-sm">{currency}</span></span>
                )}
              </div>
              <Link
                href={`/courses/${course.slug}`}
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-l from-gold to-amber-400 text-navy font-black text-sm shadow-[0_8px_30px_rgba(212,175,55,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                <GraduationCap className="w-5 h-5" />
                سجّل في الدورة الآن
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* عداد العرض المحدود */}
            {hasOffer && course.offer_type === 'limited_time' && settings.offer_ends_at && (
              <div className="mt-6">
                <LuxOfferCountdown dark endsAt={new Date(settings.offer_ends_at).toISOString()} title="ينتهي العرض قريباً — اغتنم الفرصة" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ شريط الإحصائيات ═══ */}
      <section className="relative -mt-10 z-20">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="rounded-2xl border border-gold/25 bg-navy/80 backdrop-blur-md p-4 text-center shadow-lg">
                  <Icon className="w-5 h-5 text-gold mx-auto mb-1.5" />
                  <div className="text-lg font-black text-gold">{s.value}</div>
                  <div className="text-[10px] text-white/60 font-bold mt-0.5">{s.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ المنهج + المدرب ═══ */}
      <section className="container mx-auto px-4 lg:px-6 py-14 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* المنهج */}
          <div className="rounded-3xl border border-gold/25 bg-navy/60 backdrop-blur-sm overflow-hidden">
            <div className="p-5 border-b border-gold/20 bg-gradient-to-l from-navy via-navy-light to-navy flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5 text-navy" />
              </div>
              <div>
                <h2 className="font-black text-gold">منهج الدورة</h2>
                <p className="text-white/60 text-[11px]">{modules.length} وحدة تدريبية — رحلة متكاملة من الصفر للاحتراف</p>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              {modules.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-6">تفاصيل المنهج تُنشر قريباً — سجّل الآن لتكون أول من يستلمها</p>
              ) : modules.map((m: any, idx: number) => (
                <div key={m.id || idx} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-gold/30 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 text-gold text-xs font-black flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{m.title}</div>
                    {m.description && <div className="text-[11px] text-white/50 truncate mt-0.5">{m.description}</div>}
                  </div>
                  <span className="text-[10px] font-bold text-gold/80 bg-gold/10 border border-gold/25 rounded-full px-2.5 py-1 flex-shrink-0">{m.lessons?.length || 0} دروس</span>
                </div>
              ))}
            </div>
          </div>

          {/* ماذا ستحصل عليه */}
          <div className="rounded-3xl border border-gold/25 bg-navy/60 backdrop-blur-sm p-5">
            <h2 className="font-black text-gold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" /> ماذا ستحصل عليه؟
            </h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {[
                'دروس مصوّرة بجودة عالية على منصة فاخرة',
                'شهادة معتمدة قابلة للتحقق برقم رسمي',
                'امتحان تفاعلي بعد الدورة مع إعادة محاولة',
                'دعم مباشر من المدرب طوال فترة الدراسة',
                'وصول مدى الحياة لمحتوى الدورة',
                'مجتمع متدربين لنقاش الخبرات والاستفسارات',
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-white/85 leading-6">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* العمود الجانبي: المدرب + الشهادة + المشاركة */}
        <div className="space-y-5">
          <div className="rounded-3xl border border-gold/25 bg-navy/60 backdrop-blur-sm p-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center mb-3">
              <Users className="w-8 h-8 text-gold" />
            </div>
            <div className="text-[11px] text-white/50 font-bold">يقود هذه الدورة</div>
            <div className="font-black text-white mt-1">نخبة مدربي الأكاديمية</div>
            {enrolledCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-gold bg-gold/10 border border-gold/25 rounded-full px-3 py-1">
                <Users className="w-3.5 h-3.5" /> {enrolledCount}+ متدرب انضموا فعلاً
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/10 via-navy to-navy p-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center mb-3 shadow-lg">
              <Award className="w-8 h-8 text-navy" />
            </div>
            <div className="font-black text-gold">شهادة معتمدة</div>
            <p className="text-[11px] text-white/60 mt-1.5 leading-6">قابلة للتحقق برقم رسمي من الأكاديمية — تُضاف لسجلك المهني بفخامة</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-white/70">
              <ShieldCheck className="w-3.5 h-3.5 text-gold" /> موثوقية كاملة
            </div>
          </div>

          {/* المشاركة الملكية */}
          <div className="rounded-3xl border border-gold/25 bg-navy/60 backdrop-blur-sm p-5">
            <h3 className="font-black text-gold text-sm mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" /> شارك الدورة مع من تحب
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={shareWhatsApp} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 hover:bg-emerald-500/25 transition-colors">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300">واتساب</span>
              </button>
              <button onClick={shareTelegram} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-sky-500/15 border border-sky-400/30 hover:bg-sky-500/25 transition-colors">
                <Send className="w-5 h-5 text-sky-400" />
                <span className="text-[10px] font-bold text-sky-300">تيليجرام</span>
              </button>
              <button onClick={copyLink} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gold/15 border border-gold/30 hover:bg-gold/25 transition-colors">
                {copied ? <CheckCircle2 className="w-5 h-5 text-gold" /> : <Copy className="w-5 h-5 text-gold" />}
                <span className="text-[10px] font-bold text-gold">{copied ? 'نُسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA الختامي ═══ */}
      <section className="relative overflow-hidden py-16 border-t border-gold/20">
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% 40%, #D4AF37 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px',
        }} />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-l from-white via-gold to-white bg-clip-text text-transparent">
            مقعدك في الدورة ينتظرك — ابدأ رحلتك اليوم
          </h2>
          <p className="text-white/60 text-sm mt-3">التسجيل لا يستغرق دقيقة — والدفع آمن 100% بكل الوسائل</p>
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-2 mt-7 px-9 py-4 rounded-2xl bg-gradient-to-l from-gold to-amber-400 text-navy font-black shadow-[0_10px_40px_rgba(212,175,55,0.4)] hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            <GraduationCap className="w-5 h-5" />
            انضم إلى الدورة الآن
          </Link>
          <p className="mt-8 text-[10px] tracking-[0.2em] text-gold/50 font-bold">أكاديمية المستقبل الدولية ✦ نحو مستقبل أفضل معاً</p>
        </div>
      </section>
    </main>
  )
}
