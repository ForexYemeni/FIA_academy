'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock, Users, Star, BookOpen, CheckCircle2, ArrowRight,
  Sparkles, Gift, Lock, Layers, PlayCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { CourseReviews } from '@/components/fia/course-reviews'
import { LuxOfferCountdown } from '@/components/fia/lux-experience' // 👑 v10.3 — عدّاد تنازلي ملكي للعروض
import { Copy, X as GiftX, Crown as GiftCrown } from 'lucide-react'
import { toast } from 'sonner'

interface CourseDetailClientProps {
  course: any
}

export default function CourseDetailClient({ course }: CourseDetailClientProps) {
  const user = useAuth((s) => s.user)
  const router = useRouter()
  const [modules, setModules] = useState<any[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrollLoading, setEnrollLoading] = useState(false)
  // 👑 v10.3 — الغلاف ثلاثي الأبعاد: ميلان يتبع حركة المؤشر
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })
  // 👑 v10.3 — العدّاد التنازلي: نهاية العرض من إعدادات الموقع (خانة إضافية بلا ترحيل)
  const [offerEndsAt, setOfferEndsAt] = useState<string | null>(null)
  // 👑 v10.3 — وضع الهدية: بطاقة إهداء فاخرة تُشارك عبر واتساب/تيليجرام
  const [giftOpen, setGiftOpen] = useState(false)
  const [gift, setGift] = useState({ to: '', from: '', msg: 'تقبل هذه الهدية بكل حب — رحلتك نحو الاحتراف تبدأ اليوم!' })
  const [giftCopied, setGiftCopied] = useState(false)

  useEffect(() => {
    fetch('/api/site-settings').then((r) => r.json()).then((d) => {
      if (d?.offer_ends_at) setOfferEndsAt(String(d.offer_ends_at))
    }).catch(() => {})
  }, [])

  const onCoverMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setTilt({ rx: (0.5 - py) * 10, ry: (px - 0.5) * 12, gx: px * 100, gy: py * 100 })
  }

  const giftText = `🎁 هدية من ${gift.from || 'صديقك'} — اشتراك في دورة «${course.title}»\n👑 أكاديمية المستقبل الدولية (FIA)\n💬 «${gift.msg}»\n🎓 إلى: ${gift.to || 'عزيزي المتدرب'}\nابدأ الآن: ${typeof window !== 'undefined' ? window.location.origin : ''}/courses/${course.slug || ''}`

  useEffect(() => {
    fetch(`/api/modules?course_id=${course.id}`)
      .then((r) => r.json())
      .then((d) => setModules(Array.isArray(d) ? d : []))
      .catch(() => {})
    if (user) {
      fetch(`/api/enrollments?user_id=${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          const all = Array.isArray(d) ? d : []
          setEnrolled(all.some((e: any) => e.course_id === course.id))
        })
        .catch(() => {})
    }
  }, [course.id, user])

  const handleEnroll = () => {
    if (!user) {
      // Send to home for login
      window.location.href = '/'
      return
    }
    // 🔒 ROYAL GATE: paid courses MUST go through checkout — no free bypass
    if (!isFree) {
      router.push(`/checkout/${course.id}`)
      return
    }
    setEnrollLoading(true)
    fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, course_id: course.id }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('failed')
        return r.json()
      })
      .then((d) => {
        setEnrolled(true)
        // ⚡ نجاح واضح + دعوة ملكية لفتح الدورة — كان الزر يصمت تماماً
        if (typeof window !== 'undefined') {
          import('sonner').then(({ toast }) => {
            toast.success('🎉 تم تسجيلك في الدورة بنجاح!', {
              description: 'الدورة الآن داخل لوحتك — ابدأ التعلم من «دوراتي»',
              action: { label: 'افتح لوحتي', onClick: () => { window.location.href = '/#courses' } },
              duration: 8000,
            })
          })
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          import('sonner').then(({ toast }) => {
            toast.error('تعذر إتمام التسجيل — حاول مرة أخرى')
          })
        }
      })
      .finally(() => setEnrollLoading(false))
  }

  const isFree = course.price_type === 'مجانية' || course.price === 0
  const offerPrice = Number(course.offer_price) || 0
  const regularPrice = Number(course.price) || 0
  const originalPrice = Number(course.original_price) || 0
  const displayPrice = offerPrice > 0 ? offerPrice : regularPrice
  const strikePrice = Math.max(originalPrice, regularPrice, offerPrice)
  const hasDiscount = !isFree && strikePrice > displayPrice && displayPrice > 0
  const hasOffer = !isFree && (course.offer_type === 'limited_time' || course.offer_type === 'featured')
  const offerPct = hasDiscount ? Math.round((1 - displayPrice / strikePrice) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" dir="rtl">
      {/* ⚡ Magical Hero — navy gradient with gold dots + Sparkles */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy text-white py-16 lg:py-20">
        {/* Decorative dot pattern */}
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        {/* Glow circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gold/10 rounded-full blur-2xl" />

        <div className="container mx-auto px-4 lg:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Offer badge */}
              {hasOffer && (
                <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full shadow-lg ring-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white ring-white/30 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-extrabold">{course.offer_type === 'limited_time' ? '⏰ لمدة محدودة' : '⭐ مميزة'}</span>
                </div>
              )}
              {/* Level chip */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 backdrop-blur-sm mb-3 ml-2">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{course.level || 'متوسط'}</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
                <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
                  {course.title}
                </span>
              </h1>
              {course.short_description && (
                <p className="text-white/85 text-lg mb-6 leading-relaxed">{course.short_description}</p>
              )}

              {/* Stats row — magical chips */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                  <Clock className="w-4 h-4 text-gold" />
                  <span className="text-sm font-bold">{course.duration_hours || 0} ساعة</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                  <Users className="w-4 h-4 text-gold" />
                  <span className="text-sm font-bold">{course.enrolled || 0} متدرب</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                  <Star className="w-4 h-4 text-gold fill-current" />
                  <span className="text-sm font-bold">{course.rating || 0}</span>
                </div>
              </div>

              {/* Price + CTA */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-2">
                  {isFree ? (
                    <span className="text-4xl font-extrabold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">مجانية</span>
                  ) : (
                    <>
                      {hasDiscount && (
                        <span className="text-lg line-through text-white/50 font-bold" dir="ltr">
                          {strikePrice.toLocaleString()} {course.currency || 'ر.ي'}
                        </span>
                      )}
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-gold to-amber-300 bg-clip-text text-transparent" dir="ltr">
                        {displayPrice.toLocaleString()} {course.currency || 'ر.ي'}
                      </span>
                      {hasDiscount && (
                        <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md animate-pulse">
                          -{offerPct}%
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!enrolled ? (
                  <Button onClick={handleEnroll} disabled={enrollLoading} size="lg" className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-bold rounded-xl shadow-xl active:scale-[0.97] transition-all px-8 disabled:opacity-60">
                    <Sparkles className="w-5 h-5 ml-2" /> {enrollLoading ? 'جاري التسجيل...' : isFree ? 'اشترك الآن' : 'اشترك الآن — إتمام الدفع'}
                  </Button>
                ) : (
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-xl px-8">
                    <CheckCircle2 className="w-5 h-5 ml-2" /> مسجّل
                  </Button>
                )}
                {/* 👑 v10.3 — وضع الهدية: بطاقة إهداء ملكية */}
                <Button
                  onClick={() => setGiftOpen(true)}
                  size="lg"
                  variant="outline"
                  className="border-2 border-gold/50 text-gold hover:bg-gold/10 hover:border-gold rounded-xl font-bold px-5 shadow-md active:scale-[0.97] transition-all"
                >
                  <Gift className="w-5 h-5 ml-2" /> إهداء كهدية
                </Button>
              </div>
              {/* 👑 v10.3 — العدّاد التنازلي للعروض المحدودة */}
              {hasOffer && course.offer_type === 'limited_time' && offerEndsAt && (
                <div className="mt-5">
                  <LuxOfferCountdown dark endsAt={offerEndsAt} title="ينتهي العرض قريباً — اغتنم الفرصة" />
                </div>
              )}
            </div>
            {course.cover && (
              <div
                className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-2 ring-gold/30 fia-tilt-wrap"
                style={{ perspective: '1100px' }}
                onMouseMove={onCoverMove}
                onMouseLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })}
              >
                <div
                  className="relative w-full h-full transition-transform duration-200 ease-out will-change-transform"
                  style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transformStyle: 'preserve-3d' }}
                >
                  <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
                  {/* انعكاس ضوئي يتبع المؤشر */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity"
                    style={{
                      background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,244,200,0.28), transparent 55%)`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent" />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-gold/30 backdrop-blur-sm flex items-center justify-center shadow-2xl ring-2 ring-gold/60" style={{ transform: 'translateZ(45px)' }}>
                      <PlayCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom gradient transition */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* Body — description + modules */}
      <div className="container mx-auto px-4 lg:px-6 py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Description — magical gradient header */}
            {course.description && (
              <div>
                <h2 className="text-2xl font-bold text-navy mb-4 flex items-center gap-2">
                  <div className="w-1 h-7 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                  <BookOpen className="w-5 h-5 text-gold" />
                  نظرة عامة على الدورة
                </h2>
                <div className="bg-white rounded-2xl border border-gold/20 p-5 shadow-sm">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{course.description}</p>
                </div>
              </div>
            )}

            {/* Curriculum — magical module cards */}
            <div>
              <h2 className="text-2xl font-bold text-navy mb-4 flex items-center gap-2">
                <div className="w-1 h-7 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                <Layers className="w-5 h-5 text-gold" />
                منهج الدورة
              </h2>
              {modules.length === 0 ? (
                /* ⚡ Magical empty state */
                <div className="text-center py-12">
                  <div className="relative inline-block mb-3">
                    <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                      <Layers className="w-8 h-8 text-gold" />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-navy mb-1">سيتم تحديث المنهج قريباً</p>
                  <p className="text-xs text-muted-foreground">يتعيّن على المدرب إضافة الوحدات والدروس ✨</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((m, i) => (
                    <Card key={m.id} className="fia-card-hover p-4 border border-gold/20 hover:border-gold/40 cursor-default">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center text-gold font-bold shadow-md border border-gold/30">
                          {/* Magical small glow */}
                          <div className="absolute inset-0 rounded-xl bg-gold/15 blur-md" />
                          <span className="relative">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-navy">{m.title}</h3>
                          {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                        </div>
                        <Layers className="w-5 h-5 text-gold/40 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — magical info card */}
          <div>
            <Card className="p-6 sticky top-24 border-2 border-gold/30 shadow-lg relative overflow-hidden">
              {/* Magical pattern overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                backgroundSize: '14px 14px'
              }} />
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gold/10 rounded-full blur-2xl" />

              <div className="relative">
                <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                  معلومات الدورة
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-gold/60" /> المستوى</span>
                    <span className="font-bold text-navy">{course.level || 'متوسط'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gold/60" /> المدة</span>
                    <span className="font-bold text-navy">{course.duration_hours || 0} ساعة</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-gold/60" /> الوحدات</span>
                    <span className="font-bold text-navy">{course.modules_count || 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5 text-gold/60" /> الدروس</span>
                    <span className="font-bold text-navy">{course.lessons_count || 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gold/60" /> درجة النجاح</span>
                    <span className="font-bold text-navy">{course.pass_score || 60}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      {isFree ? <Gift className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-gold/60" />}
                      النوع
                    </span>
                    <span className={`font-bold ${isFree ? 'text-emerald-600' : 'text-gold'}`}>
                      {isFree ? 'مجانية' : 'مدفوعة'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Public reviews section */}
        <div className="mt-16">
          <CourseReviews courseId={course.id} allowAdd={!!user} />
        </div>
      </div>

      {/* 👑 v10.3 — بطاقة الإهداء الملكية: توليد + مشاركة واتساب/تيليجرام */}
      {giftOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setGiftOpen(false)} dir="rtl">
          <div className="absolute inset-0 bg-navy/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border-2 border-gold/50 bg-white fia-gift-pop max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* الترويسة */}
            <div className="relative bg-gradient-to-r from-navy via-navy-light to-navy px-5 py-4 text-white">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.2px, transparent 1.2px)', backgroundSize: '18px 18px' }} />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                  <GiftCrown className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <div className="font-black text-sm">بطاقة إهداء ملكية</div>
                  <div className="text-[10px] text-gold/80">أهدِ دورة لمن تحب ببطاقة فاخرة</div>
                </div>
                <button onClick={() => setGiftOpen(false)} className="mr-auto text-gold/70 hover:text-gold"><GiftX className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* المدخلات */}
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={gift.to} onChange={(e) => setGift({ ...gift, to: e.target.value })}
                  placeholder="اسم المُهدى إليه"
                  className="h-11 rounded-xl border border-gold/35 bg-white px-3.5 text-sm font-bold text-navy placeholder:text-muted-foreground/50 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
                <input
                  value={gift.from} onChange={(e) => setGift({ ...gift, from: e.target.value })}
                  placeholder="اسمك (المُهدِي)"
                  className="h-11 rounded-xl border border-gold/35 bg-white px-3.5 text-sm font-bold text-navy placeholder:text-muted-foreground/50 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>
              <textarea
                value={gift.msg} onChange={(e) => setGift({ ...gift, msg: e.target.value })}
                rows={2}
                placeholder="رسالة الهدية…"
                className="w-full rounded-xl border border-gold/35 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy placeholder:text-muted-foreground/50 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none resize-none"
              />

              {/* معاينة البطاقة الحية */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-gold/50 shadow-lg select-none">
                <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy p-5 text-white">
                  <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 30%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 90% 70%, white 1px, transparent 1px)', backgroundSize: '22px 22px, 18px 18px' }} />
                  <div className="absolute -top-10 -left-10 w-28 h-28 bg-gold/20 rounded-full blur-3xl" />
                  <div className="fia-card-shine pointer-events-none" />
                  <div className="relative flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                        <GiftCrown className="w-5 h-5 text-navy" />
                      </div>
                      <div className="text-[10px] text-gold/90 font-bold tracking-widest uppercase">FIA • بطاقة إهداء</div>
                    </div>
                    <span className="text-[9px] font-black text-navy bg-gradient-to-r from-gold to-amber-400 rounded-full px-2.5 py-1">هدية</span>
                  </div>
                  <div className="relative text-center py-2">
                    <div className="text-[11px] text-gold/80 font-bold mb-1">إلى {gift.to || 'عزيزي المتدرب'}</div>
                    <div className="text-base font-black leading-snug mb-2">دورة «{course.title}»</div>
                    <p className="text-[11px] text-white/75 leading-relaxed line-clamp-2">{gift.msg}</p>
                    <div className="text-[10px] text-gold/70 font-bold mt-2">— من {gift.from || 'صديقكم'} 🎁</div>
                  </div>
                  <div className="relative border-t border-gold/25 pt-2.5 text-center">
                    <span className="text-[9px] text-gold/70 font-bold">أكاديمية المستقبل الدولية — تعليم طبي معتمد</span>
                  </div>
                </div>
              </div>

              {/* أزرار المشاركة */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(giftText)}`}
                  target="_blank" rel="noreferrer"
                  className="h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black flex items-center justify-center shadow-md active:scale-[0.97] transition-all"
                >
                  واتساب
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/courses/${course.slug || ''}`)}&text=${encodeURIComponent(`🎁 هدية من ${gift.from || 'صديقك'} — دورة «${course.title}»`)}`}
                  target="_blank" rel="noreferrer"
                  className="h-11 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black flex items-center justify-center shadow-md active:scale-[0.97] transition-all"
                >
                  تيليجرام
                </a>
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(giftText); setGiftCopied(true); setTimeout(() => setGiftCopied(false), 2000) } catch { toast.error('تعذّر النسخ') }
                  }}
                  className="h-11 rounded-xl bg-gradient-to-r from-navy to-navy-light text-gold text-xs font-black flex items-center justify-center gap-1 shadow-md active:scale-[0.97] transition-all border border-gold/30"
                >
                  <Copy className="w-3.5 h-3.5" /> {giftCopied ? 'نُسخت ✓' : 'نسخ'}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                شارك البطاقة مع من تحب — ثم أكمل اشتراكه في الدورة من صفحة الدفع كأي تسجيل عادي.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .fia-gift-pop { animation: giftPop .45s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes giftPop { from { opacity: 0; transform: translateY(24px) scale(.93); } to { opacity: 1; transform: none; } }
        .fia-card-shine {
          position: absolute; top: 0; bottom: 0; width: 45%;
          right: -60%; transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          animation: giftShine 4.5s ease-in-out infinite;
        }
        @keyframes giftShine { 0%, 55% { right: -60%; } 85%, 100% { right: 115%; } }
      `}</style>
    </div>
  )
}
