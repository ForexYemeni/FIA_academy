'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import {
  Gift, Users, DollarSign, Copy, Share2, Loader2, ExternalLink, Award,
  TrendingUp, Clock, CheckCircle2, Sparkles,
} from 'lucide-react'

export function AffiliateDashboard() {
  const user = useAuth((s) => s.user)
  const [affiliate, setAffiliate] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // Use the REST API (not supabasePublic client, which doesn't have
      // the anon key on the browser side and silently fails queries).
      const res = await fetch(`/api/affiliates?user_id=${user.id}`)
      if (!res.ok) {
        setAffiliate(null)
        setReferrals([])
        return
      }
      const data = await res.json()
      if (data.valid && data.affiliate) {
        setAffiliate(data.affiliate)
        // Fetch this affiliate's referrals
        const refsRes = await fetch(`/api/affiliate-referrals?affiliate_id=${data.affiliate.id}`)
        if (refsRes.ok) {
          const refs = await refsRes.json()
          setReferrals(Array.isArray(refs) ? refs : [])
        }
      } else {
        setAffiliate(null)
        setReferrals([])
      }
    } catch (e: any) {
      // silent — the user just doesn't have an affiliate record yet
      setAffiliate(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const joinAffiliate = async () => {
    if (!user) return
    setCreating(true)
    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          commission_percent: 10,
          status: 'نشط',
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل التسجيل'); return }
      toast.success('🎉 تم تسجيلك في برنامج المسوقين!')
      // Immediately reload to show the referral link
      await load()
    } finally { setCreating(false) }
  }

  const copyLink = async () => {
    if (!affiliate) return
    const url = `https://fiaacademy.vercel.app/?ref=${affiliate.unique_code}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ رابط الدعوة')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      toast.success('تم نسخ رابط الدعوة')
    }
  }

  const shareWhatsApp = () => {
    if (!affiliate) return
    const url = `https://fiaacademy.vercel.app/?ref=${affiliate.unique_code}`
    const text = `🎉 انضم إلى أكاديمية المستقبل الدولية للتعليم الطبي المعتمد! دورات احترافية معتمدة في مختلف التخصصات. سجّل عبر رابط الإحالة الخاص بي: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareTelegram = () => {
    if (!affiliate) return
    const url = `https://fiaacademy.vercel.app/?ref=${affiliate.unique_code}`
    const text = `انضم إلى أكاديمية المستقبل الدولية — دورات طبية معتمدة`
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" />
      </div>
    )
  }

  // Not yet an affiliate — show a beautiful join CTA
  if (!affiliate) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-gold/10 via-white to-navy/5 border-gold/30 overflow-hidden relative">
        <div className="absolute top-4 right-4 w-32 h-32 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-4 left-4 w-40 h-40 bg-navy/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mb-4 shadow-lg">
            <Gift className="w-8 h-8 text-navy" />
          </div>
          <h3 className="text-2xl font-bold text-navy mb-2">شارك أصدقاءك واكسب عمولة! 🎁</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            انضم إلى برنامج المسوقين بالعمولة واحصل على رابط دعوة خاص بك.
            كل متدرب يسجّل عبر رابطك ويلتحق بدورة مدفوعة — تكسب عمولة تلقائياً!
          </p>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mb-6 text-xs">
            <div className="p-2 bg-white/60 rounded-lg border border-gold/10">
              <Users className="w-4 h-4 mx-auto text-gold mb-1" />
              <div>شارك رابطك</div>
            </div>
            <div className="p-2 bg-white/60 rounded-lg border border-gold/10">
              <CheckCircle2 className="w-4 h-4 mx-auto text-gold mb-1" />
              <div>سجّل أصدقاءك</div>
            </div>
            <div className="p-2 bg-white/60 rounded-lg border border-gold/10">
              <DollarSign className="w-4 h-4 mx-auto text-gold mb-1" />
              <div>اكسب عمولة 10%</div>
            </div>
          </div>
          <Button onClick={joinAffiliate} disabled={creating} className="bg-navy hover:bg-navy-light" size="lg">
            {creating ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Gift className="w-4 h-4 ml-1" />}
            {creating ? 'جاري التسجيل...' : '🎉 سجّل في البرنامج الآن'}
          </Button>
        </div>
      </Card>
    )
  }

  const referralUrl = `https://fiaacademy.vercel.app/?ref=${affiliate.unique_code}`

  return (
    <div className="space-y-5">
      {/* Hero — referral link + share */}
      <Card className="p-6 bg-gradient-to-br from-navy to-navy-light text-white border-gold/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center shadow-lg">
              <Gift className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">برنامج المسوقين بالعمولة <Sparkles className="w-4 h-4 text-gold" /></h3>
              <p className="text-white/70 text-xs">شارك الرابط مع أصدقائك — كل تسجيل يكسبك {affiliate.commission_percent}% عمولة</p>
            </div>
          </div>

          {/* Referral link box */}
          <div className="bg-white/10 backdrop-blur border border-gold/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white/70">رابط الدعوة الخاص بك</div>
              <Badge className="bg-green-500/15 text-green-300 border-green-500/30 text-[10px]">● نشط</Badge>
            </div>
            <div className="font-mono text-sm text-gold break-all leading-relaxed" dir="ltr">{referralUrl}</div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={copyLink} className="bg-gold hover:bg-gold-light text-navy font-bold">
                <Copy className="w-3.5 h-3.5 ml-1" /> نسخ الرابط
              </Button>
              <Button size="sm" onClick={shareWhatsApp} className="bg-green-500 hover:bg-green-600 text-white">
                <Share2 className="w-3.5 h-3.5 ml-1" /> واتساب
              </Button>
              <Button size="sm" onClick={shareTelegram} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Share2 className="w-3.5 h-3.5 ml-1" /> تيليجرام
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-5 text-center hover:shadow-md transition-shadow">
          <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-navy">{affiliate.total_referrals || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">إحالات</div>
        </Card>
        <Card className="p-5 text-center hover:shadow-md transition-shadow">
          <div className="w-10 h-10 mx-auto rounded-xl bg-gold/15 flex items-center justify-center mb-2">
            <DollarSign className="w-5 h-5 text-gold" />
          </div>
          <div className="text-3xl font-bold text-navy">{(affiliate.total_earnings || 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">ر.ي أرباحك</div>
        </Card>
        <Card className="p-5 text-center hover:shadow-md transition-shadow">
          <div className="w-10 h-10 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-navy">{affiliate.commission_percent}%</div>
          <div className="text-xs text-muted-foreground mt-1">نسبة العمولة</div>
        </Card>
      </div>

      {/* Referrals list */}
      <Card className="p-5">
        <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-gold" /> المسجلون عبر رابطك ({referrals.length})
        </h3>
        {referrals.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا يوجد مسجلون بعد</p>
            <p className="text-xs mt-1">شارك رابطك مع أصدقائك لتبدأ بكسب العمولة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-sm font-bold text-navy">متدرب #{(r.student_id || '').substring(0, 8)}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3" /> {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : ''}
                    {r.amount ? <span>· مبلغ: {r.amount.toLocaleString()} ر.ي</span> : null}
                    {r.commission ? <span>· عمولتك: {r.commission.toLocaleString()} ر.ي</span> : null}
                  </div>
                </div>
                <Badge className={
                  r.status === 'مكتمل' ? 'bg-green-500/15 text-green-600 border-green-500/30' :
                  r.status === 'معلق' ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' :
                  'bg-muted text-muted-foreground'
                }>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
