'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, Search, Loader2, ArrowRight, Sparkles, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
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

      {/* ⚡ Royal status-aware found state — صالحة / ملغاة / أخرى */}
      {found && (() => {
        const isValid = found.status === 'صالحة' || !found.status
        const isRevoked = found.status === 'ملغاة'
        return (
        <Card className={`relative p-6 overflow-hidden ${isValid ? 'border-emerald-500/40 bg-emerald-500/5' : isRevoked ? 'border-rose-500/40 bg-rose-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
          <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l opacity-70 ${isValid ? 'from-emerald-500 via-teal-400 to-emerald-500' : isRevoked ? 'from-rose-500 via-red-400 to-rose-500' : 'from-amber-500 via-orange-400 to-amber-500'}`} />
          <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none ${isValid ? 'bg-emerald-500/15' : isRevoked ? 'bg-rose-500/15' : 'bg-amber-500/15'}`} />
          <div className="relative flex items-center gap-3 mb-4">
            <div className="relative flex-shrink-0">
              <div className={`absolute inset-0 rounded-2xl blur-md animate-pulse ${isValid ? 'bg-emerald-500/20' : isRevoked ? 'bg-rose-500/20' : 'bg-amber-500/20'}`} />
              <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-md border border-white/30 ${isValid ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : isRevoked ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}>
                {isValid ? <CheckCircle2 className="w-6 h-6 text-white" /> : isRevoked ? <XCircle className="w-6 h-6 text-white" /> : <AlertTriangle className="w-6 h-6 text-white" />}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-navy flex items-center gap-1.5">
                <Sparkles className={`w-4 h-4 ${isValid ? 'text-emerald-600' : isRevoked ? 'text-rose-600' : 'text-amber-600'}`} />
                {isValid ? 'شهادة صالحة ✓' : isRevoked ? 'شهادة ملغاة' : `حالة الشهادة: ${found.status}`}
              </h4>
              <p className="text-xs text-muted-foreground">{isValid ? 'تم العثور على الشهادة — اضغط لعرضها كاملة' : isRevoked ? 'هذه الشهادة أُلغيت من الإدارة — لا تُعتبر معتمدة' : 'تم العثور على الشهادة — تحقق من حالتها مع الإدارة'}</p>
            </div>
          </div>
          <div className={`relative grid grid-cols-2 gap-3 text-sm mb-4 p-3 bg-white/50 rounded-xl border ${isValid ? 'border-emerald-500/20' : isRevoked ? 'border-rose-500/20' : 'border-amber-500/20'}`}>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">المتدرب</div>
              <div className="font-bold text-navy">{found.student_name}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">الدورة</div>
              <div className="font-bold text-navy truncate">{found.course_title}</div>
            </div>
          </div>
          {isValid && (
          <a
            href={`/verify/${found.certificate_number}`}
            className="relative inline-flex items-center gap-2 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold px-6 py-3 rounded-xl font-bold text-sm w-full justify-center shadow-md active:scale-[0.97] transition-all"
          >
            عرض الشهادة كاملة <ArrowRight className="w-4 h-4" />
          </a>
          )}
        </Card>
        )
      })()}
    </div>
  )
}
