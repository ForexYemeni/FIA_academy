'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { Loader2, Tag, CheckCircle2, ArrowRight, CreditCard, Gift, Shield, Clock } from 'lucide-react'

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

  // Read affiliate code from localStorage (set on home page visit via ?ref=)
  const getAffiliateCode = () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('fia_ref_code') || null
  }

  const verifyCoupon = async () => {
    if (!couponCode.trim()) { toast.error('أدخل كود الكوبون'); return }
    setVerifying(true)
    try {
      // Look up the coupon directly
      const res = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode.trim().toUpperCase())}`)
      const data = await res.json()
      if (!data.valid) {
        toast.error(data.message || 'كوبون غير صالح')
        setAppliedCoupon(null)
        return
      }
      // Check if course-specific
      if (data.coupon.course_id && data.coupon.course_id !== course.id) {
        toast.error('هذا الكوبون غير صالح لهذه الدورة')
        setAppliedCoupon(null)
        return
      }
      setAppliedCoupon(data.coupon)
      toast.success('تم تطبيق الكوبون!')
    } catch {
      toast.error('فشل التحقق من الكوبون')
    } finally {
      setVerifying(false)
    }
  }

  const proceedToPay = async () => {
    if (!user) {
      toast.error('سجّل الدخول أولاً')
      window.location.href = '/'
      return
    }
    setLoading(true)
    try {
      const affiliateCode = getAffiliateCode()
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          user_id: user.id,
          coupon_code: appliedCoupon?.code || null,
          affiliate_code: affiliateCode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل إنشاء طلب الدفع')
        return
      }

      if (data.status === 'free') {
        toast.success('تم تسجيلك في الدورة مجاناً!')
        setTimeout(() => { window.location.href = data.redirect_url || '/?tab=courses' }, 800)
      } else if (data.redirect_url && data.redirect_url.startsWith('http')) {
        // External gateway — redirect
        window.location.href = data.redirect_url
      } else if (data.status === 'manual') {
        // Manual payment — instructions
        toast.success('تم تسجيل طلب الدفع — اتبع تعليمات الدفع اليدوي')
        window.location.href = data.redirect_url || '/'
      } else {
        window.location.href = data.redirect_url || '/'
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">إتمام التسجيل</Badge>
          <h1 className="text-3xl font-bold text-navy mb-2">تسجيل في دورة</h1>
          <p className="text-sm text-muted-foreground">راجع تفاصيل الدورة وتابع إلى الدفع</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left — course + coupon + payment summary */}
          <div className="md:col-span-2 space-y-4">
            {/* Course card */}
            <Card className="overflow-hidden">
              {course.cover && (
                <div className="aspect-video overflow-hidden bg-navy">
                  <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5">
                <h3 className="font-bold text-navy text-lg mb-2">{course.title}</h3>
                {course.short_description && <p className="text-sm text-muted-foreground mb-3">{course.short_description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span><Clock className="w-3.5 h-3.5 inline ml-1" /> {course.duration_hours || 0} ساعة</span>
                  <span><Shield className="w-3.5 h-3.5 inline ml-1" /> شهادة معتمدة</span>
                </div>
              </div>
            </Card>

            {/* Coupon */}
            <Card className="p-5">
              <Label className="block mb-2 flex items-center gap-1"><Tag className="w-4 h-4 text-gold" /> كوبون خصم</Label>
              {coupons.length > 0 && (
                <p className="text-[10px] text-muted-foreground mb-2">{coupons.length} كوبون نشط متاح لهذه الدورة</p>
              )}
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="FIA-XXXXXX"
                  className="font-mono"
                  dir="ltr"
                />
                <Button variant="outline" onClick={verifyCoupon} disabled={verifying}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تطبيق'}
                </Button>
              </div>
              {appliedCoupon && (
                <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <div className="text-xs">
                    <span className="font-bold text-green-700">{appliedCoupon.code}</span>
                    <span className="text-muted-foreground"> · {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} ر.ي`} خصم</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Affiliate attribution notice */}
            {typeof window !== 'undefined' && localStorage.getItem('fia_ref_code') && (
              <Card className="p-3 bg-orange-500/5 border-orange-500/20">
                <div className="flex items-center gap-2 text-xs text-orange-700">
                  <Gift className="w-4 h-4" />
                  <span>تسجيل الدورة عبر إحالة من: <span className="font-mono font-bold">{localStorage.getItem('fia_ref_code')}</span></span>
                </div>
              </Card>
            )}
          </div>

          {/* Right — payment summary */}
          <div>
            <Card className="p-5 sticky top-4">
              <h3 className="font-bold text-navy mb-4">ملخص الدفع</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">السعر الأصلي</span>
                  <span className="font-bold text-navy">{originalPrice.toLocaleString()} {course.currency || 'ر.ي'}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between border-b border-border pb-2 text-green-600">
                    <span>الخصم</span>
                    <span className="font-bold">- {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-lg">
                  <span className="font-bold text-navy">الإجمالي</span>
                  <span className="font-bold text-gold">{isFree ? 'مجاني' : `${finalPrice.toLocaleString()} ${course.currency || 'ر.ي'}`}</span>
                </div>
              </div>

              <Button
                onClick={proceedToPay}
                disabled={loading || !user}
                className="w-full mt-4 bg-navy hover:bg-navy-light h-12"
              >
                {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <CreditCard className="w-4 h-4 ml-1" />}
                {loading ? 'جاري المعالجة...' : isFree ? 'تسجيل مجاني' : `${finalPrice.toLocaleString()} ${course.currency || 'ر.ي'} — تابع`}
              </Button>

              {!user && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">سجّل الدخول لإتمام التسجيل</p>
              )}

              <div className="mt-4 pt-4 border-t border-border text-[10px] text-muted-foreground text-center space-y-1">
                <div className="flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> دفع آمن ومشفّر</div>
                <div>استرداد كامل خلال 7 أيام حسب السياسة</div>
              </div>

              <a href={`/courses/${course.slug || course.id}`} className="block text-center mt-3 text-xs text-gold hover:underline">
                <ArrowRight className="w-3 h-3 inline ml-1" /> رجوع لصفحة الدورة
              </a>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
