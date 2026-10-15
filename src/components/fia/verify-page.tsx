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
    <div className="rounded-3xl p-3 md:p-4" style={{ backgroundColor: '#001F3F' }}>
      {/* Outer navy border */}
      <div className="rounded-2xl p-1.5" style={{ border: '3px solid #001F3F' }}>
        {/* Inner cream certificate card */}
        <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#FDFAF6', boxShadow: '0 12px 35px rgba(0,0,0,0.4)' }}>
          {/* Thin outer gold frame */}
          <div className="absolute inset-1.5 rounded-lg pointer-events-none" style={{ border: '1.5px solid #D4AF37' }} />
          {/* Thick inner gold frame */}
          <div className="absolute inset-4 rounded-md pointer-events-none" style={{ border: '3.5px solid #D4AF37' }} />

          {/* Corner ornaments — acanthus scrolls in 4 corners */}
          {[
            { top: '20px', right: 'auto', bottom: 'auto', left: '20px' },
            { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
            { top: 'auto', right: 'auto', bottom: '20px', left: '20px' },
            { top: 'auto', right: '20px', bottom: '20px', left: 'auto' },
          ].map((style, i) => {
            const isLeft = style.left !== 'auto'
            const isTop = style.top !== 'auto'
            const scaleX = isLeft ? 1 : -1
            const scaleY = isTop ? 1 : -1
            return (
              <svg key={i} className="absolute w-10 h-10 pointer-events-none" style={style} viewBox="0 0 40 40">
                <g transform={`scale(${scaleX}, ${scaleY})`}>
                  {/* Main outer scroll curve */}
                  <path d="M 0 40 C 0 15, 15 0, 40 0" stroke="#D4AF37" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  {/* Inner smaller scroll */}
                  <path d="M 8 32 C 8 18, 18 8, 32 8" stroke="#E5C77E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  {/* Scroll end curl */}
                  <path d="M 38 4 m 4 0 a 4 4 0 1 1 -8 0 a 4 4 0 1 1 8 0" stroke="#D4AF37" strokeWidth="2" fill="none" />
                  {/* Decorative dots */}
                  <circle cx="4" cy="36" r="2" fill="#D4AF37" />
                  <circle cx="12" cy="22" r="1.5" fill="#D4AF37" />
                  <circle cx="22" cy="12" r="1.5" fill="#D4AF37" />
                </g>
              </svg>
            )
          })}

          <div className="relative p-6 md:p-10">
            {/* Logo top-right */}
            <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #D4AF37', padding: '6px' }}>
                <img src="/fia/logo-official.png" alt="FIA Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain" />
              </div>
            </div>

            {/* Main title (large navy) */}
            <div className="text-center mb-1 pr-20 md:pr-24 mt-2 md:mt-4">
              <h1 className="text-3xl md:text-[38px] font-bold" style={{ color: '#001F3F' }}>
                {result.issued_by || 'أكاديمية المستقبل الدولية'}
              </h1>
              <div className="text-[11px] md:text-[13px] mt-1 font-bold tracking-[0.3em]" style={{ color: '#D4AF37' }}>
                FUTURE INTERNATIONAL ACADEMY
              </div>
            </div>

            {/* Gold divider with center diamond */}
            <div className="flex items-center justify-center my-3 md:my-5 pr-20 md:pr-24">
              <div className="h-[1.5px] w-16 md:w-28" style={{ backgroundColor: '#D4AF37' }} />
              <div className="w-3 h-3 rotate-45 mx-2" style={{ backgroundColor: '#D4AF37' }} />
              <div className="h-[1.5px] w-16 md:w-28" style={{ backgroundColor: '#D4AF37' }} />
            </div>

            {/* Certification statement (gray regular) */}
            <div className="text-center text-sm md:text-[15px] mb-1 pr-20 md:pr-24" style={{ color: '#333333' }}>
              تُشهد أكاديمية المستقبل الدولية بأن
            </div>

            {/* Student name (LARGEST — focal point) */}
            <div className="text-center my-3 md:my-4 pr-20 md:pr-24">
              <h2 className="text-3xl md:text-[44px] font-extrabold" style={{ color: '#001F3F' }}>
                {result.student_name}
              </h2>
            </div>

            {/* Completion phrase */}
            <div className="text-center text-sm md:text-[15px] mb-3 pr-20 md:pr-24" style={{ color: '#333333' }}>
              قد أتم بنجاح دورة
            </div>

            {/* Course banner — hexagonal pointed ends */}
            <div className="flex justify-center my-4 md:my-5 pr-20 md:pr-24">
              <div className="relative inline-block">
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 30"
                  preserveAspectRatio="none"
                >
                  {/* Navy fill */}
                  <polygon
                    points="6,0 94,0 100,15 94,30 6,30 0,15"
                    fill="#001F3F"
                    stroke="#D4AF37"
                    strokeWidth="2.5"
                  />
                  {/* Inner accent line */}
                  <polygon
                    points="8,2 92,2 97,15 92,28 8,28 3,15"
                    fill="none"
                    stroke="#E5C77E"
                    strokeWidth="0.6"
                  />
                  {/* Fleur-de-lis style ornaments at tips */}
                  <polygon points="2,13 5,15 2,17 5,15" fill="#D4AF37" />
                  <polygon points="98,13 95,15 98,17 95,15" fill="#D4AF37" />
                </svg>
                <h3 className="relative text-lg md:text-[22px] font-bold px-14 py-3" style={{ color: '#FFD700' }}>
                  {result.course_title || 'دورة معتمدة'}
                </h3>
              </div>
            </div>

            {/* Small gold diamond below ribbon */}
            <div className="flex justify-center my-2 pr-20 md:pr-24">
              <div className="w-2 h-2 rotate-45" style={{ backgroundColor: '#D4AF37' }} />
            </div>

            {/* 3 info cards with icons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-5 pr-0 md:pr-0">
              {/* Card 1: Issue Date */}
              <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #D4AF37' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4AF37' }}>
                  <span className="text-white text-lg">📅</span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[11px] md:text-xs" style={{ color: '#666666' }}>تاريخ الإصدار</div>
                  <div className="text-xs md:text-sm font-bold" style={{ color: '#001F3F' }}>{issueDate}</div>
                </div>
              </div>
              {/* Card 2: Issuer */}
              <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #D4AF37' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4AF37' }}>
                  <span className="text-white text-lg">🎓</span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[11px] md:text-xs" style={{ color: '#666666' }}>الجهة المصدرة</div>
                  <div className="text-xs md:text-sm font-bold" style={{ color: '#001F3F' }}>أكاديمية المستقبل الدولية</div>
                </div>
              </div>
              {/* Card 3: Status */}
              <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #D4AF37' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4AF37' }}>
                  <span className="text-white text-lg">✓</span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[11px] md:text-xs" style={{ color: '#666666' }}>الحالة</div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs md:text-sm font-bold"
                    style={{ backgroundColor: '#28A745', color: '#FFFFFF' }}>
                    ✓ {result.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: QR + Barcode + Signature (3-column) */}
            <div className="flex items-end justify-between gap-2 mt-4 md:mt-6 pt-3" style={{ borderTop: '1.5px solid #D4AF37' }}>
              {/* QR (left) */}
              <div className="text-center">
                <img
                  src={`/api/qr-code?text=${encodeURIComponent(`https://fiaacademy.vercel.app/?verify=${result.certificate_number}#verify`)}&size=200`}
                  alt="QR"
                  className="w-14 h-14 md:w-16 md:h-16 rounded"
                  style={{ border: '1.5px solid #D4AF37', padding: '4px', backgroundColor: '#FFFFFF' }}
                />
                <div className="text-[9px] md:text-[11px] mt-1 font-bold" style={{ color: '#001F3F' }}>امسح للتحقق</div>
              </div>

              {/* Barcode (center) with diamond flankers */}
              <div className="text-center flex-1 mx-2">
                <div className="inline-block rounded-md px-4 py-2" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #D4AF37' }}>
                  <div className="text-[9px] md:text-[11px] mb-1 font-bold" style={{ color: '#666666' }}>رقم الشهادة</div>
                  <div className="text-sm md:text-[16px] font-bold font-mono tracking-wide" style={{ color: '#001F3F' }} dir="ltr">{result.certificate_number}</div>
                  <div className="text-[9px] md:text-[11px] mt-0.5 font-bold" style={{ color: '#666666' }}>CERTIFICATE ID</div>
                </div>
                {/* Diamond flankers */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="h-px w-6" style={{ backgroundColor: '#D4AF37' }} />
                  <span className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: '#D4AF37' }} />
                  <span className="h-px w-6" style={{ backgroundColor: '#D4AF37' }} />
                </div>
              </div>

              {/* Signature block (right) — large royal blue gel-pen */}
              <div className="text-center">
                <div className="text-[9px] md:text-[11px] mb-1 font-bold" style={{ color: '#666666' }}>توقيع الجهة المانوحة</div>
                {/* Compact gel-pen signature SVG — smaller to fit within card */}
                <svg
                  width="120"
                  height="35"
                  viewBox="0 0 120 35"
                  className="mx-auto"
                >
                  {/* Main flourish with variable thickness */}
                  <path
                    d="M 10 18 Q 18 6, 26 18 T 42 18 Q 50 8, 58 22 Q 70 6, 80 20 Q 92 10, 110 18"
                    stroke="#0047AB"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Thicker downstrokes overlay */}
                  <path
                    d="M 14 14 Q 18 8, 24 14 M 56 14 Q 60 8, 66 16 M 78 12 Q 84 6, 90 12"
                    stroke="#0047AB"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Small left initial flourish */}
                  <path
                    d="M 4 8 Q 0 -2, 12 -3 Q 16 0, 12 10"
                    stroke="#0047AB"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Small right end flourish */}
                  <path
                    d="M 110 18 Q 118 10, 116 26 Q 110 30, 106 22"
                    stroke="#0047AB"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Underscore (medium sweep) */}
                  <path
                    d="M 5 30 Q 60 28, 116 30"
                    stroke="#0047AB"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Initial dot */}
                  <circle cx="2" cy="12" r="1.5" fill="#0047AB" />
                </svg>
                <div className="text-sm md:text-[15px] font-bold mt-2" style={{ color: '#001F3F' }}>د. هاني الشافعي</div>
                <div className="text-[10px] md:text-xs mt-2" style={{ color: '#001F3F' }}>المدير التنفيذي</div>
              </div>
            </div>

            {/* Footer text with horizontal gold flanking lines — only show on desktop to avoid crowding on mobile */}
            <div className="hidden md:flex items-center justify-center gap-2 mt-3 pr-0">
              <span className="h-px w-12 md:w-16" style={{ backgroundColor: '#D4AF37' }} />
              <span className="text-[10px] md:text-xs font-bold px-2" style={{ color: '#8B6428' }}>
                هذا مستند أصلي مُصدر إلكترونياً
              </span>
              <span className="h-px w-12 md:w-16" style={{ backgroundColor: '#D4AF37' }} />
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
