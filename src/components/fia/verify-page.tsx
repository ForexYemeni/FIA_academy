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
    <div className="rounded-3xl p-3 md:p-4" style={{ backgroundColor: '#0A1F44' }}>
      {/* Subtle background pattern */}
      <div className="relative rounded-2xl p-2" style={{ backgroundColor: '#051429' }}>
        {/* Inner ivory certificate card */}
        <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#FBF7EC', boxShadow: '0 12px 35px rgba(0,0,0,0.5)' }}>
          {/* Triple gold frame */}
          <div className="absolute inset-1.5 rounded-lg pointer-events-none" style={{ border: '2.5px solid #C9A961' }} />
          <div className="absolute inset-3 rounded-md pointer-events-none" style={{ border: '1px solid #E5C77E' }} />
          <div className="absolute inset-4 rounded pointer-events-none" style={{ border: '0.5px solid #C9A961' }} />

          {/* Corner ornaments — premium geometric filigree */}
          {[
            { top: '24px', right: 'auto', bottom: 'auto', left: '24px' },
            { top: '24px', right: '24px', bottom: 'auto', left: 'auto' },
            { top: 'auto', right: 'auto', bottom: '24px', left: '24px' },
            { top: 'auto', right: '24px', bottom: '24px', left: 'auto' },
          ].map((style, i) => {
            const isLeft = style.left !== 'auto'
            const isTop = style.top !== 'auto'
            const scaleX = isLeft ? 1 : -1
            const scaleY = isTop ? 1 : -1
            return (
              <svg key={i} className="absolute w-9 h-9 pointer-events-none" style={style} viewBox="0 0 36 36">
                <g transform={`scale(${scaleX}, ${scaleY})`}>
                  <path d="M 0 36 C 0 12, 12 0, 36 0" stroke="#C9A961" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M 6 30 C 6 16, 16 6, 30 6" stroke="#E5C77E" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <circle cx="2" cy="32" r="1.5" fill="#C9A961" />
                  <circle cx="10" cy="22" r="1.5" fill="#C9A961" />
                  <circle cx="22" cy="10" r="1.5" fill="#C9A961" />
                  <circle cx="32" cy="2" r="1.5" fill="#C9A961" />
                </g>
              </svg>
            )
          })}

          <div className="relative p-6 md:p-10">
            {/* FIA Seal (top-left) — premium academic seal */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#020A15', border: '2.5px solid #C9A961', boxShadow: 'inset 0 0 0 1px #E5C77E' }}>
                <span className="text-sm md:text-base font-bold" style={{ color: '#E5C77E' }}>FIA</span>
              </div>
            </div>

            {/* Logo top-right */}
            <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', border: '2px solid #C9A961', padding: '6px' }}>
                <img src="/fia/logo-official.png" alt="FIA Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain" />
              </div>
            </div>

            {/* HEADER: Institution name (large, navy) */}
            <div className="text-center mb-1 pr-20 md:pr-24 mt-2 md:mt-4">
              <h1 className="text-3xl md:text-[34px] font-bold" style={{ color: '#0A1F44' }}>
                {result.issued_by || 'أكاديمية المستقبل الدولية'}
              </h1>
              <div className="text-[11px] md:text-[12px] mt-1 font-bold tracking-[0.3em]" style={{ color: '#8B6F2C' }}>
                F U T U R E   I N T E R N A T I O N A L   A C A D E M Y
              </div>
            </div>

            {/* Premium ornamental divider (double-line + diamond) */}
            <div className="flex flex-col items-center justify-center my-3 md:my-4 pr-20 md:pr-24">
              <div className="flex items-center gap-1.5">
                <span className="h-px w-16 md:w-28" style={{ backgroundColor: '#C9A961' }} />
                <span className="w-1 h-1 rotate-45" style={{ backgroundColor: '#C9A961' }} />
                <span className="h-px w-3" style={{ backgroundColor: '#C9A961' }} />
              </div>
              <div className="my-1.5 w-3 h-3 rotate-45" style={{ backgroundColor: '#C9A961' }} />
              <div className="flex items-center gap-1.5">
                <span className="h-px w-3" style={{ backgroundColor: '#C9A961' }} />
                <span className="w-1 h-1 rotate-45" style={{ backgroundColor: '#C9A961' }} />
                <span className="h-px w-16 md:w-28" style={{ backgroundColor: '#C9A961' }} />
              </div>
            </div>

            {/* CERTIFICATE TITLE */}
            <div className="text-center mb-1 pr-20 md:pr-24">
              <h2 className="text-2xl md:text-[28px] font-bold" style={{ color: '#0A1F44' }}>
                شهادة إتمام
              </h2>
              <div className="text-[10px] md:text-[11px] mt-1 font-bold tracking-[0.25em]" style={{ color: '#8B6F2C' }}>
                C E R T I F I C A T E   O F   C O M P L E T I O N
              </div>
            </div>

            {/* Certification statement */}
            <div className="text-center text-xs md:text-sm mt-4 mb-2 pr-20 md:pr-24" style={{ color: '#2C2C2C' }}>
              تشهد أكاديمية المستقبل الدولية بأن
            </div>

            {/* RECIPIENT NAME — LARGEST (focal point) */}
            <div className="text-center my-3 pr-20 md:pr-24">
              <h2 className="text-3xl md:text-[38px] font-extrabold" style={{ color: '#0A1F44' }}>
                {result.student_name}
              </h2>
              {/* Gold underline + center diamond */}
              <div className="flex items-center justify-center mt-2 gap-2">
                <span className="h-px w-16 md:w-20" style={{ backgroundColor: '#C9A961' }} />
                <span className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: '#C9A961' }} />
                <span className="h-px w-16 md:w-20" style={{ backgroundColor: '#C9A961' }} />
              </div>
            </div>

            {/* Completion statement */}
            <div className="text-center text-xs md:text-sm mb-4 pr-20 md:pr-24" style={{ color: '#2C2C2C' }}>
              قد أتم بنجاح متطلبات دورة
            </div>

            {/* Course plaque (dark navy with gold borders) */}
            <div className="flex justify-center my-3 pr-20 md:pr-24">
              <div className="relative inline-block">
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 30"
                  preserveAspectRatio="none"
                >
                  <polygon points="6,0 94,0 100,15 94,30 6,30 0,15" fill="#020A15" stroke="#C9A961" strokeWidth="2.5" />
                  <polygon points="8,2 92,2 97,15 92,28 8,28 3,15" fill="none" stroke="#E5C77E" strokeWidth="0.6" />
                </svg>
                <h3 className="relative text-base md:text-xl font-bold px-12 py-2.5" style={{ color: '#E5C77E' }}>
                  {result.course_title || 'دورة معتمدة'}
                </h3>
              </div>
            </div>

            {/* 3 INFO BOXES (Date / Issuer / Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-5 pr-0 md:pr-0">
              {/* Card 1: Date */}
              <div className="rounded-lg p-2.5 md:p-3 flex items-center gap-3" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #C9A961' }}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0A1F44' }}>
                  <span className="text-xs md:text-sm">📅</span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] md:text-[11px]" style={{ color: '#6B6B6B' }}>تاريخ الإصدار</div>
                  <div className="text-xs md:text-sm font-bold" style={{ color: '#0A1F44' }}>{issueDate}</div>
                </div>
              </div>
              {/* Card 2: Issuer */}
              <div className="rounded-lg p-2.5 md:p-3 flex items-center gap-3" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #C9A961' }}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0A1F44' }}>
                  <span className="text-xs md:text-sm">🎓</span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] md:text-[11px]" style={{ color: '#6B6B6B' }}>الجهة المصدرة</div>
                  <div className="text-xs md:text-sm font-bold" style={{ color: '#0A1F44' }}>أكاديمية المستقبل الدولية</div>
                </div>
              </div>
              {/* Card 3: Status */}
              {(() => {
                const isRevoked = result.status === 'ملغاة' || result.status === 'ملغي'
                const statusColor = isRevoked ? '#A02424' : '#1B7E3A'
                const statusBgColor = isRevoked ? '#F8D7DA' : '#D4EDDA'
                const statusText = isRevoked ? 'ملغي' : 'صالح'
                return (
                  <div className="rounded-lg p-2.5 md:p-3 flex items-center gap-3"
                    style={{ backgroundColor: statusBgColor, border: `2px solid ${statusColor}` }}>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: statusColor }}>
                      <span className="text-white text-sm md:text-base font-bold">{isRevoked ? '✕' : '✓'}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-[10px] md:text-[11px]" style={{ color: '#6B6B6B' }}>الحالة</div>
                      <div className="text-xs md:text-sm font-bold" style={{ color: statusColor }}>{statusText}</div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Bottom row: QR (left) + Barcode (center) + Signature (right) */}
            <div className="flex items-end justify-between gap-2 mt-5 pt-3" style={{ borderTop: '1.5px solid #C9A961' }}>
              {/* QR (left) */}
              <div className="text-center flex-shrink-0">
                <img
                  src={`/api/qr-code?text=${encodeURIComponent(`https://fiaacademy.vercel.app/?verify=${result.certificate_number}#verify`)}&size=200`}
                  alt="QR"
                  className="w-12 h-12 md:w-14 md:h-14 rounded"
                  style={{ border: '1.5px solid #C9A961', padding: '3px', backgroundColor: '#FFFFFF' }}
                />
                <div className="text-[9px] md:text-[10px] mt-1 font-bold" style={{ color: '#0A1F44' }}>امسح للتحقق</div>
              </div>

              {/* Barcode (center) */}
              <div className="text-center flex-1 mx-1">
                <div className="inline-block rounded-md px-3 py-2" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #C9A961' }}>
                  <div className="text-[8px] md:text-[9px] mb-1 font-bold" style={{ color: '#6B6B6B' }}>رقم الشهادة</div>
                  <div className="text-xs md:text-sm font-bold font-mono tracking-wide" style={{ color: '#0A1F44' }} dir="ltr">{result.certificate_number}</div>
                  <div className="text-[8px] md:text-[9px] mt-0.5 font-bold" style={{ color: '#6B6B6B' }}>CERTIFICATE ID</div>
                </div>
              </div>

              {/* Signature (right) */}
              <div className="text-center flex-shrink-0">
                <div className="text-[9px] md:text-[10px] mb-1 font-bold" style={{ color: '#6B6B6B' }}>توقيع الجهة المانوحة</div>
                {/* Signature image */}
                <img
                  src="/fia/signature-hani.png"
                  alt="Signature"
                  className="mx-auto"
                  style={{ width: '100px', height: '30px' }}
                />
                {/* Thin gold signature line */}
                <div className="mx-auto mt-1 h-px w-24" style={{ backgroundColor: '#C9A961' }} />
                <div className="text-xs md:text-sm font-bold mt-1" style={{ color: '#0A1F44' }}>د. هاني الشافعي</div>
                <div className="text-[9px] md:text-[10px]" style={{ color: '#6B6B6B' }}>المدير التنفيذي</div>
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
