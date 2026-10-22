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

interface CourseDetailClientProps {
  course: any
}

export default function CourseDetailClient({ course }: CourseDetailClientProps) {
  const user = useAuth((s) => s.user)
  const router = useRouter()
  const [modules, setModules] = useState<any[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrollLoading, setEnrollLoading] = useState(false)

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
      .then(() => setEnrolled(true))
      .catch(() => {})
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
              </div>
            </div>
            {course.cover && (
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-2 ring-gold/30">
                <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent" />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-gold/30 backdrop-blur-sm flex items-center justify-center shadow-2xl ring-2 ring-gold/60">
                    <PlayCircle className="w-10 h-10 text-white" />
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
    </div>
  )
}
