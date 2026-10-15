'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2, AlertTriangle, XCircle, Download, Share2, Copy,
  Calendar, Building2, Shield, Award, Hash, User, BookOpen, Loader2, FileText,
} from 'lucide-react'
import { toast } from 'sonner'

interface VerifyResult {
  id: string
  certificate_number: string
  student_name: string
  course_title?: string | null
  issued_by?: string | null
  issued_at?: string
  status: string
  has_external_accreditation?: boolean
  external_accreditation_body?: string | null
  not_found?: boolean
}

export function VerifyPage({ initialNumber }: { initialNumber?: string }) {
  const [certNum, setCertNum] = useState(initialNumber || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)

  useEffect(() => {
    if (initialNumber) {
      verify(initialNumber)
    }
  }, [initialNumber])

  const verify = async (number?: string) => {
    const num = (number || certNum).trim()
    if (!num) {
      toast.error('أدخل رقم الشهادة')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/certificates?number=${encodeURIComponent(num)}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setResult(data[0])
      } else {
        setResult({ not_found: true, certificate_number: num, status: 'غير موجودة', student_name: '' } as any)
      }
    } catch {
      setResult({ not_found: true, certificate_number: num, status: 'غير موجودة', student_name: '' } as any)
    } finally {
      setLoading(false)
    }
  }

  const copyCertNumber = () => {
    if (!result) return
    navigator.clipboard.writeText(result.certificate_number)
    toast.success('تم نسخ رقم الشهادة')
  }

  const shareLink = async () => {
    if (!result) return
    const url = `https://fiaacademy.vercel.app/?verify=${encodeURIComponent(result.certificate_number)}#verify`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'شهادة معتمدة - أكاديمية المستقبل الدولية',
          text: `تحقق من شهادة ${result.student_name} - ${result.course_title}`,
          url,
        })
      } catch {}
    } else {
      navigator.clipboard.writeText(url)
      toast.success('تم نسخ رابط التحقق')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Search box */}
      {!result && (
        <Card className="p-6 mb-6 bg-white shadow-lg">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-navy flex items-center justify-center mb-3">
              <Shield className="w-8 h-8 text-gold" />
            </div>
            <h2 className="text-2xl font-bold text-navy">التحقق من الشهادات</h2>
            <p className="text-muted-foreground text-sm mt-1">أدخل رقم الشهادة للتحقق من صحتها</p>
          </div>
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              value={certNum}
              onChange={(e) => setCertNum(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') verify() }}
              placeholder="FIA-2026-XXXXX"
              dir="ltr"
              className="text-center"
            />
            <Button onClick={() => verify()} disabled={loading} className="bg-navy hover:bg-navy-light">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تحقق'}
            </Button>
          </div>
        </Card>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-navy mb-3" />
          <p className="text-muted-foreground">جاري التحقق من الشهادة...</p>
        </div>
      )}

      {!loading && result && (
        <div className="space-y-6">
          <StatusCard result={result} onReset={() => { setResult(null); setCertNum('') }} />

          {result.status === 'صالحة' && !result.not_found && (
            <>
              <CertificateDisplay result={result} />

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                <a href={`/api/certificate-pdf?number=${encodeURIComponent(result.certificate_number)}&format=pdf`} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button className="w-full bg-navy hover:bg-navy-light">
                    <Download className="w-4 h-4 ml-1" /> تنزيل PDF
                  </Button>
                </a>
                <a href={`/api/certificate-pdf?number=${encodeURIComponent(result.certificate_number)}&format=png`} target="_blank" rel="noopener noreferrer" download className="flex-1">
                  <Button className="w-full bg-gold hover:bg-gold-light text-navy">
                    <Download className="w-4 h-4 ml-1" /> تنزيل صورة PNG
                  </Button>
                </a>
                <Button onClick={shareLink} variant="outline" className="flex-1 border-gold/30 text-navy hover:bg-gold/10">
                  <Share2 className="w-4 h-4 ml-1" /> مشاركة
                </Button>
              </div>

              <InfoCards result={result} onCopy={copyCertNumber} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatusCard({ result, onReset }: { result: VerifyResult; onReset: () => void }) {
  let icon = CheckCircle2
  let bgColor = 'bg-green-50'
  let borderColor = 'border-green-500/30'
  let iconBg = 'bg-green-500'
  let titleColor = 'text-green-700'
  let descColor = 'text-green-600'
  let title = 'شهادة صالحة'
  let desc = 'تم التحقق من صحة الشهادة بنجاح'

  if (result.not_found) {
    icon = AlertTriangle
    bgColor = 'bg-amber-50'
    borderColor = 'border-amber-500/30'
    iconBg = 'bg-amber-500'
    titleColor = 'text-amber-700'
    descColor = 'text-amber-600'
    title = 'شهادة غير موجودة'
    desc = 'تعذر العثور على شهادة بهذا الرقم'
  } else if (result.status === 'ملغاة') {
    icon = XCircle
    bgColor = 'bg-red-50'
    borderColor = 'border-red-500/30'
    iconBg = 'bg-red-500'
    titleColor = 'text-red-700'
    descColor = 'text-red-600'
    title = 'شهادة ملغاة'
    desc = 'هذه الشهادة غير صالحة حالياً'
  }

  const Icon = icon
  return (
    <Card className={`p-6 ${bgColor} ${borderColor} border-2`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <div className={`text-xl font-bold ${titleColor}`}>{title}</div>
          <div className={`text-sm ${descColor} mt-1`}>{desc}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
          تحقق من شهادة أخرى
        </Button>
      </div>
    </Card>
  )
}

function CertificateDisplay({ result }: { result: VerifyResult }) {
  const issueDate = result.issued_at
    ? new Date(result.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-EG')

  return (
    <div className="bg-cream rounded-3xl p-3 md:p-4" style={{ backgroundColor: '#FCF9F0' }}>
      {/* Outer sage green border — thicker for prominent frame */}
      <div className="rounded-2xl p-2" style={{ border: '3px solid #D4E8DC' }}>
        {/* Inner certificate card */}
        <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#FCF9F0' }}>
          {/* Gold frame (outer thick line) — thicker for more prominence */}
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: '5px solid #B58A3E' }} />
          {/* Gold frame (inner thin line) */}
          <div className="absolute inset-[7px] rounded-lg pointer-events-none" style={{ border: '1.2px solid #B58A3E' }} />
          {/* Triple-frame thin inner accent line */}
          <div className="absolute inset-[11px] rounded-md pointer-events-none" style={{ border: '0.5px solid #E5C158' }} />

          {/* Corner ornaments (L-shaped) — using darker gold */}
          {[
            { top: '14px', right: 'auto', bottom: 'auto', left: '14px', borderTop: '1.8px solid #8B6428', borderLeft: '1.8px solid #8B6428' },
            { top: '14px', right: '14px', bottom: 'auto', left: 'auto', borderTop: '1.8px solid #8B6428', borderRight: '1.8px solid #8B6428' },
            { top: 'auto', right: 'auto', bottom: '14px', left: '14px', borderBottom: '1.8px solid #8B6428', borderLeft: '1.8px solid #8B6428' },
            { top: 'auto', right: '14px', bottom: '14px', left: 'auto', borderBottom: '1.8px solid #8B6428', borderRight: '1.8px solid #8B6428' },
          ].map((style, i) => (
            <div key={i} className="absolute w-[18px] h-[18px] pointer-events-none" style={style} />
          ))}

          <div className="relative p-6 md:p-10">
            {/* Logo top-right — official FIA logo */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6">
              <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #B58A3E', padding: '4px' }}>
                <img src="/fia/logo-official.png" alt="FIA Logo" className="h-12 w-12 md:h-14 md:w-14 object-contain" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-2 mt-2 md:mt-4 pr-16 md:pr-20">
              <div className="text-[11px] md:text-[13px] font-bold tracking-widest" style={{ color: '#8B6428' }}>
                CERTIFICATE OF COMPLETION
              </div>
            </div>

            {/* Academy name Arabic */}
            <div className="text-center mb-1 pr-16 md:pr-20">
              <h1 className="text-2xl md:text-[34px] font-bold" style={{ color: '#050912' }}>
                {result.issued_by || 'أكاديمية المستقبل الدولية'}
              </h1>
              <div className="text-[11px] md:text-xs font-bold mt-1" style={{ color: '#8B6428' }}>
                FUTURE INTERNATIONAL ACADEMY
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center my-3 md:my-5 pr-16 md:pr-20">
              <div className="h-[1.5px] w-16 md:w-24" style={{ backgroundColor: '#B58A3E' }} />
              <div className="w-2.5 h-2.5 rotate-45 mx-2" style={{ backgroundColor: '#8B6428' }} />
              <div className="h-[1.5px] w-16 md:w-24" style={{ backgroundColor: '#B58A3E' }} />
            </div>

            {/* Award statement */}
            <div className="text-center text-xs md:text-sm font-bold mb-1 pr-16 md:pr-20" style={{ color: '#1F2937' }}>
              تشهد أكاديمية المستقبل الدولية بأن
            </div>

            {/* Student name (most prominent) */}
            <div className="text-center my-2 md:my-3 pr-16 md:pr-20">
              <h2 className="text-3xl md:text-[40px] font-extrabold" style={{ color: '#050912' }}>
                {result.student_name}
              </h2>
            </div>

            {/* Completion statement */}
            <div className="text-center text-xs md:text-sm font-bold mb-1 pr-16 md:pr-20" style={{ color: '#1F2937' }}>
              قد أتم بنجاح متطلبات دورة
            </div>

            {/* Course title */}
            <div className="text-center my-2 md:my-3 pr-16 md:pr-20">
              <h3 className="text-lg md:text-[22px] font-bold" style={{ color: '#8B6428' }}>
                {result.course_title || 'دورة معتمدة'}
              </h3>
            </div>

            {/* Accreditation pill banner */}
            <div className="flex justify-center my-3 md:my-4 pr-16 md:pr-20">
              <div className="inline-flex items-center gap-1 px-5 py-1.5 rounded-full text-xs md:text-[13px] font-bold"
                style={{ backgroundColor: '#F5E5B3', border: '1.5px solid #8B6428', color: '#050912' }}>
                ★  معتمدة من: {result.issued_by || 'أكاديمية المستقبل الدولية'}
              </div>
            </div>

            {/* 3 metadata columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-5 pr-0 md:pr-0">
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#F3F4F6', border: '0.8px solid #B58A3E' }}>
                <div className="text-[11px] md:text-xs font-bold mb-1" style={{ color: '#8B6428' }}>تاريخ الإصدار</div>
                <div className="text-sm md:text-[15px] font-bold" style={{ color: '#050912' }}>{issueDate}</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#F3F4F6', border: '0.8px solid #B58A3E' }}>
                <div className="text-[11px] md:text-xs font-bold mb-1" style={{ color: '#8B6428' }}>الجهة المصدرة</div>
                <div className="text-sm md:text-[15px] font-bold" style={{ color: '#050912' }}>أكاديمية المستقبل الدولية</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#F3F4F6', border: '0.8px solid #B58A3E' }}>
                <div className="text-[11px] md:text-xs font-bold mb-1" style={{ color: '#8B6428' }}>الحالة</div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs md:text-[15px] font-bold"
                  style={{ backgroundColor: '#D1FAE5', color: '#0F9D58', border: '1.2px solid #0F9D58' }}>
                  ● {result.status}
                </div>
              </div>
            </div>

            {/* Bottom: QR + Cert number + signature */}
            <div className="flex items-end justify-between gap-2 mt-4 md:mt-5 pt-3 border-t" style={{ borderTop: '1.5px solid #B58A3E' }}>
              <div className="text-center">
                <img
                  src={`/api/qr-code?text=${encodeURIComponent(`https://fiaacademy.vercel.app/?verify=${result.certificate_number}#verify`)}&size=200`}
                  alt="QR"
                  className="w-14 h-14 md:w-16 md:h-16 rounded"
                  style={{ border: '1.5px solid #B58A3E', padding: '4px', backgroundColor: '#FFFFFF' }}
                />
                <div className="text-[9px] md:text-[11px] mt-1 font-bold" style={{ color: '#8B6428' }}>امسح للتحقق</div>
              </div>
              <div className="text-center flex-1 mx-2">
                <div className="text-[9px] md:text-[11px] mb-1 font-bold" style={{ color: '#8B6428' }}>رقم الشهادة</div>
                <div className="text-sm md:text-[16px] font-bold font-mono tracking-wide" style={{ color: '#050912' }} dir="ltr">{result.certificate_number}</div>
                <div className="text-[9px] md:text-[11px] mt-0.5 font-bold" style={{ color: '#8B6428' }}>CERTIFICATE ID</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] md:text-[11px] mb-2 font-bold" style={{ color: '#8B6428' }}>توقيع الجهة المانوحة</div>
                {/* Script-like signature placeholder */}
                <svg
                  width="80"
                  height="28"
                  viewBox="0 0 80 28"
                  className="mx-auto mb-1"
                  style={{ color: '#050912' }}
                >
                  <path
                    d="M 5 14 Q 10 4, 18 14 T 35 14 Q 45 6, 55 18 T 75 14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="w-20 md:w-24 mx-auto mb-1" style={{ borderBottom: '1.2px solid #050912' }} />
                <div className="text-sm md:text-[15px] font-bold" style={{ color: '#050912' }}>د. هاني الشافعي</div>
                <div className="text-[9px] md:text-[11px] mt-0.5 font-bold" style={{ color: '#8B6428' }}>المدير التنفيذي</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCards({ result, onCopy }: { result: VerifyResult; onCopy: () => void }) {
  const issueDate = result.issued_at
    ? new Date(result.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'

  const cards = [
    { icon: Hash, label: 'رقم الشهادة', value: result.certificate_number, copyable: true, dir: 'ltr' },
    { icon: User, label: 'اسم المتدرب', value: result.student_name },
    { icon: BookOpen, label: 'اسم الدورة التدريبية', value: result.course_title || '-' },
    { icon: Calendar, label: 'تاريخ الإصدار', value: issueDate },
    { icon: Building2, label: 'الجهة المصدرة', value: result.issued_by || 'أكاديمية المستقبل الدولية' },
    { icon: Shield, label: 'حالة الشهادة', value: result.status, isStatus: true },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon
        const isCertNumber = c.copyable
        return (
          <Card
            key={i}
            className={`p-4 border transition-all hover:shadow-lg ${
              isCertNumber
                ? 'bg-gradient-to-br from-navy to-navy-light text-white border-gold/40 shadow-md'
                : 'bg-gray-50 border-border'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isCertNumber ? 'bg-gold' : ''
              }`} style={!isCertNumber ? { backgroundColor: '#0F172A' } : {}}>
                <Icon className={`w-4 h-4 ${isCertNumber ? 'text-navy' : ''}`} style={!isCertNumber ? { color: '#C5A059' } : {}} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs ${isCertNumber ? 'text-gold/80' : 'text-muted-foreground'}`}>{c.label}</div>
                <div
                  className={`text-sm font-semibold truncate ${
                    isCertNumber ? 'text-white font-mono text-base tracking-wide' : ''
                  } ${
                    c.isStatus && result.status === 'صالحة' ? 'text-green-600' : ''
                  }`}
                  style={!isCertNumber ? { color: '#0F172A' } : {}}
                  dir={(c as any).dir || 'rtl'}
                >
                  {c.value}
                </div>
              </div>
              {c.copyable && (
                <button
                  onClick={onCopy}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/20 hover:bg-gold/30 flex items-center justify-center transition-colors"
                  title="نسخ رقم الشهادة"
                >
                  <Copy className="w-3.5 h-3.5 text-gold" />
                </button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
