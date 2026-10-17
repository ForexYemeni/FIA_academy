'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Search, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
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
      {/* Search form */}
      <Card className="p-8 bg-gradient-to-br from-white to-navy/5 border-gold/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-gold/15 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-gold" />
          </div>
          <h3 className="text-xl font-bold text-navy mb-2">أدخل رقم الشهادة</h3>
          <p className="text-sm text-muted-foreground">رقم الشهادة يبدأ بـ FIA- مثال: FIA-2026-12345</p>
        </div>

        <div className="space-y-4 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') verify() }}
              placeholder="FIA-2026-XXXXX"
              className="pr-10 h-12 text-center font-mono text-lg tracking-wider"
              dir="ltr"
            />
          </div>
          <Button
            onClick={verify}
            disabled={loading}
            className="w-full h-12 bg-navy hover:bg-navy-light text-base"
          >
            {loading ? <Loader2 className="w-5 h-5 ml-1 animate-spin" /> : <Search className="w-5 h-5 ml-1" />}
            {loading ? 'جاري البحث...' : 'تحقق الآن'}
          </Button>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="p-6 text-center border-red-500/30 bg-red-500/5">
          <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-2" />
          <p className="text-sm font-bold text-navy">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">تأكد من صحة رقم الشهادة أو تواصل مع الإدارة</p>
        </Card>
      )}

      {/* Found state */}
      {found && (
        <Card className="p-6 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-navy">شهادة صالحة ✓</h4>
              <p className="text-xs text-muted-foreground">تم العثور على الشهادة — اضغط لعرضها كاملة</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4 p-3 bg-white/50 rounded-lg">
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
            className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light text-white px-6 py-3 rounded-lg font-bold text-sm w-full justify-center"
          >
            عرض الشهادة كاملة <ArrowRight className="w-4 h-4" />
          </a>
        </Card>
      )}
    </div>
  )
}
