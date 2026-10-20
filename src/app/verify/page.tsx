import { Metadata } from 'next'
import { Shield } from 'lucide-react'
import VerifySearchForm from './client'

export const metadata: Metadata = {
  title: 'تحقق من شهادة | أكاديمية المستقبل الدولية',
  description: 'تحقق من صحة واعتماد أي شهادة صادرة من أكاديمية المستقبل الدولية عبر رقم الشهادة.',
  alternates: { canonical: 'https://fiaacademy.vercel.app/verify' },
  openGraph: {
    title: 'تحقق من شهادة | أكاديمية المستقبل الدولية',
    description: 'تحقق من صحة واعتماد أي شهادة صادرة من الأكاديمية.',
    type: 'website', siteName: 'أكاديمية المستقبل الدولية', locale: 'ar_YE',
  },
}

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white" dir="rtl">
      {/* ⚡ Magical hero header */}
      <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px'
        }} />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container relative mx-auto px-4 lg:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-4">
            <Shield className="w-3.5 h-3.5 text-gold" />
            <span className="text-[11px] font-bold text-gold">تحقق من الشهادة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">تحقق من صحة الشهادة</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">أدخل رقم الشهادة للتحقق من صحة الاعتماد</p>
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-2xl">
          <VerifySearchForm />
        </div>
      </section>
    </div>
  )
}
