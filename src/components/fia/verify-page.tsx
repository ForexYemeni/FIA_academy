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
    <div className="rounded-3xl p-3 md:p-4" style={{ backgroundColor: '#0B1D3A' }}>
      {/* Outer sage green border — thicker for prominent frame */}
      <div className="rounded-2xl p-2" style={{ border: '3px solid #0B1D3A' }}>
        {/* Inner certificate card */}
        <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#FDFBF7', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          {/* Gold frame (outer thick line) — thicker for more prominence */}
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: '4px solid #C5A059' }} />
          {/* Gold frame (inner thin line) */}
          <div className="absolute inset-2 rounded-lg pointer-events-none" style={{ border: '1.5px solid #C5A059' }} />
          {/* Triple-frame thin inner accent line */}
          <div className="absolute inset-3.5 rounded-md pointer-events-none" style={{ border: '0.5px solid #E5C77E' }} />

          {/* Corner ornaments (simplified leaf-like flourishes) */}
          {[
            { top: '12px', right: 'auto', bottom: 'auto', left: '12px' },
            { top: '12px', right: '12px', bottom: 'auto', left: 'auto' },
            { top: 'auto', right: 'auto', bottom: '12px', left: '12px' },
            { top: 'auto', right: '12px', bottom: '12px', left: 'auto' },
          ].map((style, i) => (
            <svg key={i} className="absolute w-7 h-7 pointer-events-none" style={style} viewBox="0 0 30 30">
              <path d="M 0 30 C 0 9, 9 0, 30 0" stroke="#C5A059" strokeWidth="2" fill="none" />
              <path d="M 6 24 C 9 12, 15 7, 24 6" stroke="#E5C77E" strokeWidth="1" fill="none" />
              <circle cx="4.5" cy="25.5" r="2" fill="#C5A059" />
            </svg>
          ))}

          <div className="relative p-6 md:p-10">
            {/* Logo top-right — official FIA logo */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6">
              <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #C5A059', padding: '5px' }}>
                <img src="/fia/logo-official.png" alt="FIA Logo" className="h-14 w-14 md:h-16 md:w-16 object-contain" />
              </div>
            </div>

            {/* English subtitle (gold) */}
            <div className="text-center mb-2 mt-2 md:mt-4 pr-16 md:pr-20">
              <div className="text-[11px] md:text-[13px] font-bold tracking-widest" style={{ color: '#C5A059' }}>
                CERTIFICATE OF COMPLETION
              </div>
            </div>

            {/* Academy name Arabic (large navy) */}
            <div className="text-center mb-1 pr-16 md:pr-20">
              <h1 className="text-2xl md:text-[36px] font-bold" style={{ color: '#0F2B5C' }}>
                {result.issued_by || 'أكاديمية المستقبل الدولية'}
              </h1>
              <div className="text-[11px] md:text-[13px] mt-1 font-bold" style={{ color: '#C5A059' }}>
                FUTURE INTERNATIONAL ACADEMY
              </div>
            </div>

            {/* Divider with center diamond */}
            <div className="flex items-center justify-center my-3 md:my-5 pr-16 md:pr-20">
              <div className="h-[1.5px] w-16 md:w-24" style={{ backgroundColor: '#C5A059' }} />
              <div className="w-2.5 h-2.5 rotate-45 mx-2" style={{ backgroundColor: '#C5A059' }} />
              <div className="h-[1.5px] w-16 md:w-24" style={{ backgroundColor: '#C5A059' }} />
            </div>

            {/* Award statement (bold) */}
            <div className="text-center text-xs md:text-[15px] font-bold mb-1 pr-16 md:pr-20" style={{ color: '#1F2937' }}>
              تشهد أكاديمية المستقبل الدولية بأن
            </div>

            {/* Student name (LARGEST) */}
            <div className="text-center my-2 md:my-3 pr-16 md:pr-20">
              <h2 className="text-3xl md:text-[42px] font-extrabold" style={{ color: '#0F2B5C' }}>
                {result.student_name}
              </h2>
            </div>

            {/* Completion statement */}
            <div className="text-center text-xs md:text-[15px] font-bold mb-3 pr-16 md:pr-20" style={{ color: '#1F2937' }}>
              قد أتم بنجاح دراسة متطلبات دورة
            </div>

            {/* Course ribbon (navy with gold border, pointed ends) */}
            <div className="flex justify-center my-4 md:my-5 pr-16 md:pr-20">
              <div className="relative inline-block">
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 30"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute' }}
                >
                  <polygon
                    points="6,2 94,2 100,15 94,28 6,28 0,15"
                    fill="#0A1929"
                    stroke="#C5A059"
                    strokeWidth="2"
                  />
                  <polygon
                    points="8,4 92,4 97,15 92,26 8,26 3,15"
                    fill="none"
                    stroke="#E5C77E"
                    strokeWidth="0.5"
                  />
                </svg>
                <h3 className="relative text-base md:text-[22px] font-bold px-12 py-2.5" style={{ color: '#C5A059' }}>
                  {result.course_title || 'دورة معتمدة'}
                </h3>
              </div>
            </div>

            {/* 3 info cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-5 pr-0 md:pr-0">
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#F5EBD5', border: '1.2px solid #C5A059' }}>
                <div className="text-[11px] md:text-xs font-bold mb-1" style={{ color: '#8B6428' }}>تاريخ الإصدار</div>
                <div className="text-sm md:text-[14px] font-bold" style={{ color: '#0F2B5C' }}>{issueDate}</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#F5EBD5', border: '1.2px solid #C5A059' }}>
                <div className="text-[11px] md:text-xs font-bold mb-1" style={{ color: '#8B6428' }}>الجهة المصدرة</div>
                <div className="text-sm md:text-[14px] font-bold" style={{ color: '#0F2B5C' }}>أكاديمية المستقبل الدولية</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#F5EBD5', border: '1.2px solid #C5A059' }}>
                <div className="text-[11px] md:text-xs font-bold mb-1" style={{ color: '#8B6428' }}>الحالة</div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs md:text-[14px] font-bold"
                  style={{ backgroundColor: '#D1FAE5', color: '#10B981', border: '1.2px solid #10B981' }}>
                  ● {result.status}
                </div>
              </div>
            </div>

            {/* Bottom: QR + Cert number + signature (3-column footer) */}
            <div className="flex items-end justify-between gap-2 mt-4 md:mt-5 pt-3 border-t" style={{ borderTop: '2px solid #C5A059' }}>
              {/* QR (left) */}
              <div className="text-center">
                <img
                  src={`/api/qr-code?text=${encodeURIComponent(`https://fiaacademy.vercel.app/?verify=${result.certificate_number}#verify`)}&size=200`}
                  alt="QR"
                  className="w-14 h-14 md:w-16 md:h-16 rounded"
                  style={{ border: '1.5px solid #C5A059', padding: '4px', backgroundColor: '#FFFFFF' }}
                />
                <div className="text-[9px] md:text-[11px] mt-1 font-bold" style={{ color: '#8B6428' }}>امسح للتحقق</div>
              </div>
              {/* Barcode + Cert number (center) */}
              <div className="text-center flex-1 mx-2">
                <div className="inline-block rounded-md px-4 py-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #C5A059' }}>
                  <div className="text-[9px] md:text-[11px] mb-1 font-bold" style={{ color: '#8B6428' }}>رقم الشهادة</div>
                  <div className="text-sm md:text-[16px] font-bold font-mono tracking-wide" style={{ color: '#0F2B5C' }} dir="ltr">{result.certificate_number}</div>
                  <div className="text-[9px] md:text-[11px] mt-0.5 font-bold" style={{ color: '#8B6428' }}>CERTIFICATE ID</div>
                </div>
              </div>
              {/* Signature block (right) — with large royal blue gel-pen signature */}
              <div className="text-center">
                <div className="rounded-lg p-3" style={{ backgroundColor: '#F5EBD5', border: '1.5px solid #C5A059' }}>
                  <div className="text-[9px] md:text-[11px] mb-2 font-bold" style={{ color: '#8B6428' }}>توقيع الجهة المانوحة</div>
                  {/* Large gel-pen style signature in royal blue */}
                  <svg
                    width="130"
                    height="45"
                    viewBox="0 0 130 45"
                    className="mx-auto mb-1"
                  >
                    {/* Main signature flourish — variable width via multiple paths */}
                    <path
                      d="M 10 22 Q 20 6, 28 22 T 46 22 Q 56 8, 64 28 Q 78 6, 88 24 Q 100 12, 120 22"
                      stroke="#1E40AF"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Thicker downstrokes overlay */}
                    <path
                      d="M 14 18 Q 18 10, 24 18 M 60 18 Q 64 10, 70 20 M 84 16 Q 90 8, 96 16"
                      stroke="#1E40AF"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Left initial flourish */}
                    <path
                      d="M 2 10 Q -2 -2, 12 -3 Q 18 0, 14 12"
                      stroke="#1E40AF"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Right end flourish */}
                    <path
                      d="M 120 22 Q 132 12, 130 30 Q 122 35, 118 25"
                      stroke="#1E40AF"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Underscore (long sweep) */}
                    <path
                      d="M 5 35 Q 65 33, 128 36"
                      stroke="#1E40AF"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Initial dot */}
                    <circle cx="2" cy="14" r="1.5" fill="#1E40AF" />
                  </svg>
                  <div className="text-sm md:text-base font-bold" style={{ color: '#0F2B5C' }}>د. هاني الشافعي</div>
                  <div className="text-[10px] md:text-xs mt-1 font-bold" style={{ color: '#8B6428' }}>المدير التنفيذي</div>
                </div>
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
