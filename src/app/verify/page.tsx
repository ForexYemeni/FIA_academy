import { Metadata } from 'next'
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
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-20">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <span className="inline-block bg-gold/15 text-gold border border-gold/30 px-4 py-1 rounded-full text-sm font-bold mb-4">تحقق من الشهادة</span>
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
