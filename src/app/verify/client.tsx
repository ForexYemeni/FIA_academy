'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, Search, Loader2, ArrowRight, Sparkles, XCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function VerifySearchForm() {
  const [certNumber, setCertNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [found, setFound] = useState<any | null>(null)
  const [error, setError] = useState('')

  const verify = async () => {
    if (!certNumber.trim()) {
      toast.error('أدخل رقم الشهادة')
      return
    }
    setLoading(true)
    setError('')
    setFound(null)
    try {
      const res = await fetch(`/api/certificates?number=${encodeURIComponent(certNumber.trim().toUpperCase())}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'فشل البحث')
        return
      }
      if (Array.isArray(data) && data.length > 0) {
        setFound(data[0])
      } else {
        setError('لم يتم العثور على شهادة بهذا الرقم')
      }
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ⚡ Magical search form card */}
      <Card className="relative p-8 bg-gradient-to-br from-white to-gold/5 border-gold/30 overflow-hidden">
        {/* Top gold strip */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        {/* Magical glow */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative text-center mb-6">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <Shield className="w-8 h-8 text-gold" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-navy mb-2">أدخل رقم الشهادة</h3>
          <p className="text-sm text-muted-foreground">رقم الشهادة يبدأ بـ FIA- مثال: FIA-2026-12345</p>
        </div>

        <div className="relative space-y-4 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/70 pointer-events-none" />
            <Input
              type="text"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') verify() }}
              placeholder="FIA-2026-XXXXX"
              className="pr-10 h-12 text-center font-mono text-lg tracking-wider rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
              dir="ltr"
            />
          </div>
          <Button
            onClick={verify}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold text-base rounded-xl shadow-md active:scale-[0.97] transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 ml-1 animate-spin" /> : <Search className="w-5 h-5 ml-1" />}
            {loading ? 'جاري البحث...' : 'تحقق الآن'}
          </Button>
        </div>
      </Card>

      {/* ⚡ Magical error state (rose gradient) */}
      {error && (
        <Card className="relative p-6 text-center border-rose-500/40 bg-rose-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-rose-500 via-red-400 to-rose-500 opacity-70" />
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl" />
            <div className="relative w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md border border-white/30">
              <XCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="relative text-sm font-bold text-navy mb-1">{error}</p>
          <p className="relative text-xs text-muted-foreground">تأكد من صحة رقم الشهادة أو تواصل مع الإدارة</p>
        </Card>
      )}

      {/* ⚡ Magical found state (emerald gradient) */}
      {found && (
        <Card className="relative p-6 border-emerald-500/40 bg-emerald-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-emerald-500 opacity-70" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3 mb-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-md animate-pulse" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md border border-white/30">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-bold text-navy flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                شهادة صالحة ✓
              </h4>
              <p className="text-xs text-muted-foreground">تم العثور على الشهادة — اضغط لعرضها كاملة</p>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-3 text-sm mb-4 p-3 bg-white/50 rounded-xl border border-emerald-500/20">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">المتدرب</div>
              <div className="font-bold text-navy">{found.student_name}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">الدورة</div>
              <div className="font-bold text-navy truncate">{found.course_title}</div>
            </div>
          </div>
          <a
            href={`/verify/${found.certificate_number}`}
            className="relative inline-flex items-center gap-2 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-6 py-3 rounded-xl font-bold text-sm w-full justify-center shadow-md active:scale-[0.97] transition-all"
          >
            عرض الشهادة كاملة <ArrowRight className="w-4 h-4" />
          </a>
        </Card>
      )}
    </div>
  )
}
