'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, XCircle, Download, Calendar, Award, Shield,
  Sparkles, Globe, User, FileText, ExternalLink,
} from 'lucide-react'

export default function VerifyClient({ certificate }: { certificate: any }) {
  const [showActions, setShowActions] = useState(false)

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 px-4" dir="rtl">
        <Card className="p-10 text-center max-w-md border-red-500/30 shadow-xl">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">الشهادة غير موجودة</h1>
          <p className="text-sm text-muted-foreground mb-6">
            لم نتمكن من العثور على شهادة بهذا الرقم في قاعدة بياناتنا. تأكد من صحة الرقم أو تواصل مع الإدارة.
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
      <div className="max-w-4xl mx-auto">
        {/* Verified banner */}
        <div className={`text-center mb-8 ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${isVerified ? 'bg-green-100' : 'bg-red-100'} shadow-md`}>
            {isVerified ? <CheckCircle2 className="w-12 h-12 text-green-600" /> : <XCircle className="w-12 h-12 text-red-500" />}
          </div>
          <h1 className="text-3xl font-bold text-navy mb-1">
            {isVerified ? '✓ شهادة معتمدة' : '✗ شهادة ملغاة'}
          </h1>
          <p className="text-sm text-muted-foreground">
            تم التحقق من صحة هذه الشهادة في {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Certificate — modern artistic design */}
        <div className="relative" onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
          {/* Glow effects */}
          <div className="absolute -inset-2 bg-gradient-to-r from-gold/20 via-navy/10 to-gold/20 rounded-2xl blur-2xl opacity-50" />

          <Card className="relative overflow-hidden border-2 border-gold/40 shadow-2xl">
            {/* Decorative top border */}
            <div className="h-3 bg-gradient-to-r from-gold via-gold-light to-gold flex items-center justify-center">
              <div className="w-full h-px bg-gold/30" />
            </div>

            {/* Background pattern + content */}
            <div className="relative bg-gradient-to-br from-white via-navy/[0.02] to-gold/[0.03]">
              {/* Corner ornaments */}
              <div className="absolute top-0 right-0 w-32 h-32 border-l-2 border-b-2 border-gold/20 rounded-bl-3xl" />
              <div className="absolute top-0 left-0 w-32 h-32 border-r-2 border-b-2 border-gold/20 rounded-br-3xl" />
              <div className="absolute bottom-0 right-0 w-32 h-32 border-l-2 border-t-2 border-gold/20 rounded-tl-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 border-r-2 border-t-2 border-gold/20 rounded-tr-3xl" />

              {/* Subtle shimmer pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(10, 31, 68, 0.5) 20px, rgba(10, 31, 68, 0.5) 21px)'
              }} />

              <div className="relative p-8 md:p-12">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-lg">
                      <Sparkles className="w-7 h-7 text-gold" />
                    </div>
                  </div>
                  <div className="text-xs font-bold text-gold uppercase tracking-[0.3em] mb-1">Future International Academy</div>
                  <h1 className="text-2xl md:text-3xl font-bold text-navy">أكاديمية المستقبل الدولية</h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-12 h-px bg-gold/40" />
                    <Award className="w-4 h-4 text-gold" />
                    <div className="w-12 h-px bg-gold/40" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 uppercase tracking-widest">شهادة إكمال معتمدة</p>
                </div>

                {/* Body — student name + course */}
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">تشهد أكاديمية المستقبل الدولية بأن</p>
                  <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4 leading-tight">{certificate.student_name}</h2>
                  <p className="text-sm text-muted-foreground mb-3">قد أتمّ بنجاح جميع متطلبات دورة</p>
                  <h3 className="text-xl md:text-2xl font-bold text-gold mb-4 leading-tight">{certificate.course_title || 'دورة معتمدة'}</h3>

                  {certificate.has_external_accreditation && certificate.external_accreditation_body && (
                    <div className="inline-flex items-center gap-2 bg-navy/5 border border-gold/20 rounded-full px-4 py-2 mb-4">
                      <Award className="w-4 h-4 text-gold" />
                      <span className="text-xs font-medium text-navy">معتمدة من: {certificate.external_accreditation_body}</span>
                    </div>
                  )}
                </div>

                {/* Divider with ornament */}
                <div className="flex items-center justify-center gap-3 my-6">
                  <div className="flex-1 h-px bg-gradient-to-l from-gold/40 to-transparent" />
                  <Sparkles className="w-5 h-5 text-gold/50" />
                  <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
                </div>

                {/* Footer — info grid */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy/5 mb-2">
                      <FileText className="w-4 h-4 text-navy" />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">رقم الشهادة</div>
                    <div className="font-mono font-bold text-navy text-xs mt-1" dir="ltr">{certificate.certificate_number}</div>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy/5 mb-2">
                      <Calendar className="w-4 h-4 text-navy" />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">تاريخ الإصدار</div>
                    <div className="font-bold text-navy text-xs mt-1">
                      {issuedAt ? issuedAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy/5 mb-2">
                      <Shield className="w-4 h-4 text-navy" />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">الحالة</div>
                    <div className={`font-bold text-xs mt-1 ${isVerified ? 'text-green-600' : 'text-red-500'}`}>
                      {certificate.status}
                    </div>
                  </div>
                </div>

                {/* Issuer line */}
                <div className="text-center mt-10 pt-6 border-t border-gold/20">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">صادر عن</div>
                  <div className="font-bold text-navy text-sm">{certificate.issued_by || 'أكاديمية المستقبل الدولية'}</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-gold">
                    <Globe className="w-3 h-3" />
                    <span dir="ltr">fiaacademy.vercel.app</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom border */}
            <div className="h-3 bg-gradient-to-r from-gold via-gold-light to-gold" />
          </Card>

          {/* Hover actions */}
          {showActions && (
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-10 h-10 rounded-full bg-navy hover:bg-navy-light text-gold shadow-lg flex items-center justify-center transition-all"
                title="طباعة / حفظ PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Verify URL */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">يمكن التحقق من صحة هذه الشهادة في أي وقت عبر الرابط:</p>
          <p className="font-mono text-sm text-navy mt-1" dir="ltr">
            fiaacademy.vercel.app/verify/{certificate.certificate_number}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <a href="/" className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light text-white px-6 py-3 rounded-lg font-bold text-sm shadow-md transition-all">
            <User className="w-4 h-4" /> انضم إلى دوراتنا
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-gold/30 text-gold hover:bg-gold/10 px-6 py-3 rounded-lg font-bold text-sm transition-all"
          >
            <Download className="w-4 h-4" /> طباعة / حفظ PDF
          </button>
        </div>
      </div>
    </div>
  )
}
