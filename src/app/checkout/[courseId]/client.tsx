'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import {
  Loader2, Tag, CheckCircle2, ArrowRight, CreditCard, Gift, Shield, Clock,
  Sparkles, BookOpen, Lock, Star,
} from 'lucide-react'

export default function CheckoutClient({ course, coupons }: { course: any; coupons: any[] }) {
  const user = useAuth((s) => s.user)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const originalPrice = course.price || 0
  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? (originalPrice * (appliedCoupon.discount_value || 0)) / 100
      : appliedCoupon.discount_value || 0
    : 0
  const finalPrice = Math.max(0, originalPrice - discount)
  const isFree = course.price_type === 'مجانية' || finalPrice === 0

  const getAffiliateCode = () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('fia_ref_code') || null
  }

  const verifyCoupon = async () => {
    if (!couponCode.trim()) { toast.error('أدخل كود الكوبون'); return }
    setVerifying(true)
    try {
      const res = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode.trim().toUpperCase())}`)
      const data = await res.json()
      if (!data.valid) { toast.error(data.message || 'كوبون غير صالح'); setAppliedCoupon(null); return }
      if (data.coupon.course_id && data.coupon.course_id !== course.id) {
        toast.error('هذا الكوبون غير صالح لهذه الدورة'); setAppliedCoupon(null); return
      }
      setAppliedCoupon(data.coupon)
      toast.success('تم تطبيق الكوبون!')
    } catch { toast.error('فشل التحقق من الكوبون') } finally { setVerifying(false) }
  }

  const proceedToPay = async () => {
    if (!user) { toast.error('سجّل الدخول أولاً'); window.location.href = '/'; return }
    setLoading(true)
    try {
      const affiliateCode = getAffiliateCode()
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id, user_id: user.id,
          coupon_code: appliedCoupon?.code || null, affiliate_code: affiliateCode,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل إنشاء طلب الدفع'); return }
      if (data.status === 'free') {
        toast.success('تم تسجيلك في الدورة مجاناً!')
        setTimeout(() => { window.location.href = data.redirect_url || '/?tab=courses' }, 800)
      } else if (data.redirect_url && data.redirect_url.startsWith('http')) {
        window.location.href = data.redirect_url
      } else if (data.status === 'manual') {
        toast.success('تم تسجيل طلب الدفع — اتبع تعليمات الدفع اليدوي')
        window.location.href = data.redirect_url || '/'
      } else {
        window.location.href = data.redirect_url || '/'
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* ⚡ Magical hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy text-white p-6 mb-8 shadow-xl">
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gold/10 rounded-full blur-2xl" />
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">إتمام التسجيل</span>
            </div>
            <h1 className="text-3xl font-extrabold mb-2 tracking-tight">
              <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
                تسجيل في دورة
              </span>
            </h1>
            <p className="text-white/80 text-sm">راجع تفاصيل الدورة وتابع إلى الدفع</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* ⚡ Left — course + coupon + affiliate */}
          <div className="md:col-span-2 space-y-4">
            {/* Course card — magical */}
            <Card className="overflow-hidden border-2 border-gold/30 shadow-md">
              {course.cover && (
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy">
                  <img src={course.cover} alt={course.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
                  {/* Level + price badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {course.level && (
                      <Badge className="bg-navy/80 text-gold border-gold/30 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 ml-1" /> {course.level}
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-gradient-to-r from-gold to-amber-500 text-navy border border-gold/40 backdrop-blur-sm">
                      <Star className="w-3 h-3 ml-1 fill-current" /> {course.price?.toLocaleString()} {course.currency || 'ر.ي'}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="relative p-5 bg-gradient-to-br from-white to-gold/5">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
                <h3 className="font-bold text-navy text-lg mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-gold" />
                  {course.title}
                </h3>
                {course.short_description && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{course.short_description}</p>}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-navy/5 rounded-lg px-2.5 py-1 text-navy">
                    <Clock className="w-3.5 h-3.5 text-gold" /> {course.duration_hours || 0} ساعة
                  </span>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 rounded-lg px-2.5 py-1 text-emerald-700 border border-emerald-200/40">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" /> شهادة معتمدة
                  </span>
                  {course.lessons_count && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 rounded-lg px-2.5 py-1 text-blue-700 border border-blue-200/40">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" /> {course.lessons_count} درس
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* ⚡ Coupon — magical card */}
            <Card className="relative p-5 border-2 border-gold/30 bg-gradient-to-br from-white to-gold/5 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <Label className="relative block mb-2 font-bold text-navy flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-gold" /> كوبون خصم
              </Label>
              {coupons.length > 0 && (
                <p className="relative text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-gold" /> {coupons.length} كوبون نشط متاح لهذه الدورة
                </p>
              )}
              <div className="relative flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="FIA-XXXXXX"
                  className="font-mono rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                  dir="ltr"
                />
                <Button variant="outline" onClick={verifyCoupon} disabled={verifying} className="rounded-xl border-gold/30 hover:border-gold hover:bg-gold/5">
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تطبيق'}
                </Button>
              </div>
              {appliedCoupon && (
                <div className="relative mt-3 p-3 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-2 border-emerald-500/30 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="text-xs flex-1">
                    <span className="font-bold text-emerald-700">{appliedCoupon.code}</span>
                    <span className="text-muted-foreground"> · {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} ر.ي`} خصم</span>
                  </div>
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode('') }} className="text-red-500 text-xs">إزالة</button>
                </div>
              )}
            </Card>

            {/* ⚡ Affiliate attribution — magical amber card */}
            {typeof window !== 'undefined' && localStorage.getItem('fia_ref_code') && (
              <Card className="relative p-3 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-500/30 overflow-hidden">
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-amber-500/15 rounded-full blur-xl" />
                <div className="relative flex items-center gap-2 text-xs text-amber-700">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <span>تسجيل الدورة عبر إحالة من: <span className="font-mono font-bold text-amber-800">{localStorage.getItem('fia_ref_code')}</span></span>
                </div>
              </Card>
            )}
          </div>

          {/* ⚡ Right — payment summary — magical sticky card */}
          <div>
            <Card className="relative p-5 sticky top-4 border-2 border-gold/30 shadow-md overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 20% 20%, #D4AF37 1px, transparent 1px)',
                backgroundSize: '14px 14px'
              }} />
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-gold/15 rounded-full blur-2xl" />
              <h3 className="relative font-bold text-navy mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
                ملخص الدفع
              </h3>
              <div className="relative space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">السعر الأصلي</span>
                  <span className="font-bold text-navy" dir="ltr">{originalPrice.toLocaleString()} {course.currency || 'ر.ي'}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between border-b border-border/40 pb-2 text-emerald-600">
                    <span>الخصم</span>
                    <span className="font-bold" dir="ltr">- {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-lg">
                  <span className="font-bold text-navy flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-gold" /> الإجمالي
                  </span>
                  <span className={`font-extrabold ${isFree ? 'text-emerald-600' : 'bg-gradient-to-r from-gold to-amber-500 bg-clip-text text-transparent'}`} dir="ltr">
                    {isFree ? 'مجاني' : `${finalPrice.toLocaleString()} ${course.currency || 'ر.ي'}`}
                  </span>
                </div>
              </div>

              <Button
                onClick={proceedToPay}
                disabled={loading || !user}
                className="relative w-full mt-4 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold h-12 rounded-xl shadow-md active:scale-[0.97] transition-all font-bold"
              >
                {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : isFree ? <Gift className="w-5 h-5 ml-1" /> : <CreditCard className="w-4 h-4 ml-1" />}
                {loading ? 'جاري المعالجة...' : isFree ? 'تسجيل مجاني ✨' : `${finalPrice.toLocaleString()} ${course.currency || 'ر.ي'} — تابع`}
              </Button>

              {!user && (
                <p className="relative text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> سجّل الدخول لإتمام التسجيل
                </p>
              )}

              <div className="relative mt-4 pt-4 border-t border-border/40 text-[10px] text-muted-foreground text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                  <Shield className="w-3.5 h-3.5" /> دفع آمن ومشفّر
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> استرداد كامل خلال 7 أيام حسب السياسة
                </div>
              </div>

              <a href={`/courses/${course.slug || course.id}`} className="relative block text-center mt-3 text-xs text-gold hover:underline flex items-center justify-center gap-1">
                <ArrowRight className="w-3 h-3" /> رجوع لصفحة الدورة
              </a>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
