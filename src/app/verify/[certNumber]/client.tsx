'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Shield, Award, Download, Calendar, User } from 'lucide-react'

export default function VerifyClient({ certificate }: { certificate: any }) {
  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white px-4" dir="rtl">
        <Card className="p-10 text-center max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">الشهادة غير موجودة</h1>
          <p className="text-sm text-muted-foreground mb-6">
            لم نتمكن من العثور على شهادة بهذا الرقم. تأكد من صحة الرقم أو تواصل مع الإدارة.
          </p>
          <a href="/" className="inline-block bg-navy text-white px-6 py-3 rounded-lg font-bold text-sm">العودة للرئيسية</a>
        </Card>
      </div>
    )
  }

  const issuedAt = certificate.issued_at ? new Date(certificate.issued_at) : null
  const isVerified = certificate.status === 'صالحة'

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy/5 via-white to-gold/5 py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Verified banner */}
        <div className={`text-center mb-8 ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-3 ${isVerified ? 'bg-green-100' : 'bg-red-100'}`}>
            {isVerified ? <CheckCircle2 className="w-16 h-16 text-green-600" /> : <XCircle className="w-16 h-16 text-red-500" />}
          </div>
          <h1 className="text-3xl font-bold text-navy mb-1">{isVerified ? '✓ شهادة معتمدة' : '✗ شهادة ملغاة'}</h1>
          <p className="text-sm text-muted-foreground">تم التحقق من صحة هذه الشهادة في {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {/* Certificate card */}
        <Card className="overflow-hidden border-2 border-gold/30 shadow-2xl">
          {/* Top bar */}
          <div className="bg-gradient-to-l from-navy to-navy-light p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/fia/logo-fia.png" alt="FIA" className="w-12 h-12 rounded-lg" />
                <div>
                  <div className="font-bold text-base">أكاديمية المستقبل الدولية</div>
                  <div className="text-gold text-xs">FUTURE INTERNATIONAL ACADEMY</div>
                </div>
              </div>
              <Shield className="w-10 h-10 text-gold" />
            </div>
          </div>

          {/* Body */}
          <div className="p-8 text-center">
            <Badge className="bg-gold/15 text-gold border-gold/30 mb-4">شهادة إكمال</Badge>
            <p className="text-sm text-muted-foreground mb-2">تشهد أكاديمية المستقبل الدولية بأن</p>
            <h2 className="text-3xl font-bold text-navy mb-4">{certificate.student_name}</h2>
            <p className="text-sm text-muted-foreground mb-2">قد أتمّ بنجاح متطلبات دورة</p>
            <h3 className="text-xl font-bold text-gold mb-6">{certificate.course_title || 'دورة معتمدة'}</h3>

            {certificate.has_external_accreditation && certificate.external_accreditation_body && (
              <div className="inline-flex items-center gap-2 bg-navy/5 border border-gold/20 rounded-full px-4 py-2 mb-6">
                <Award className="w-4 h-4 text-gold" />
                <span className="text-xs font-medium text-navy">معتمدة من: {certificate.external_accreditation_body}</span>
              </div>
            )}

            {/* Footer info */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">رقم الشهادة</div>
                <div className="font-mono font-bold text-navy text-sm" dir="ltr">{certificate.certificate_number}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">تاريخ الإصدار</div>
                <div className="font-bold text-navy text-sm">
                  {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">الحالة</div>
                <div className={`font-bold text-sm ${isVerified ? 'text-green-600' : 'text-red-500'}`}>
                  {certificate.status}
                </div>
              </div>
            </div>
          </div>

          {/* Issuer signature line */}
          <div className="px-8 pb-6 text-left">
            <div className="text-[10px] text-muted-foreground mb-1">صادر عن</div>
            <div className="font-bold text-navy text-sm">{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
            <div className="mt-2 italic text-gold text-[10px]">{certificate.issued_by || 'FIA Academy'} • Verified at fiaacademy.vercel.app</div>
          </div>
        </Card>

        {/* QR code for re-verification */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">يمكن التحقق من صحة هذه الشهادة في أي وقت عبر الرابط:</p>
          <p className="font-mono text-sm text-navy mt-1" dir="ltr">
            fiaacademy.vercel.app/verify/{certificate.certificate_number}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <a href="/" className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light text-white px-6 py-3 rounded-lg font-bold text-sm">
            <User className="w-4 h-4" /> انضم إلى دوراتنا
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-gold/30 text-gold hover:bg-gold/10 px-6 py-3 rounded-lg font-bold text-sm"
          >
            <Download className="w-4 h-4" /> طباعة / حفظ PDF
          </button>
        </div>
      </div>
    </div>
  )
}
