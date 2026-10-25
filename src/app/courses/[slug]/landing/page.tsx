import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import CourseLandingClient from './client'

interface Props { params: Promise<{ slug }> }

// 👑 v10.6 — صفحة الهبوط الملكية لكل دورة — رابط مشاركة خاص مستقل:
//   fiaacademy.vercel.app/courses/<slug>/landing
// سينمائية بالكامل: hero بطول الشاشة بالغلاف + نبض ذهبي + المنهج + المدرب
// + السعر والعرض المحدود بعدّاده + أزرار مشاركة أصلية (واتساب/تيليجرام/نسخ)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('title, short_description, cover, price, currency')
    .eq('slug', slug)
    .maybeSingle()

  if (!course) {
    return { title: 'دورة غير موجودة | أكاديمية المستقبل الدولية' }
  }
  const title = `${course.title} — سجّل الآن | أكاديمية المستقبل الدولية`
  const description = course.short_description || `انضم إلى دورة ${course.title} في أكاديمية المستقبل الدولية — شهادة معتمدة قابلة للتحقق`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: course.cover ? [{ url: course.cover, width: 1200, height: 630 }] : undefined,
      siteName: 'أكاديمية المستقبل الدولية',
      locale: 'ar_YE',
    },
    twitter: { card: 'summary_large_image', title, description, images: course.cover ? [course.cover] : undefined },
    robots: { index: true, follow: true },
  }
}

export async function generateStaticParams() {
  try {
    const { data } = await supabaseAdmin.from('courses').select('slug').eq('status', 'published').limit(500)
    return (data || []).map((c: any) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

export default async function CourseLandingPage({ params }: Props) {
  const { slug } = await params
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!course) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center bg-navy text-white">
        <div className="text-center">
          <h1 className="text-2xl font-black text-gold mb-3">الدورة غير موجودة</h1>
          <p className="text-white/70 text-sm">ربما تغيّر رابطها أو أُوقفت — تصفح باقي الدورات من الرئيسية</p>
        </div>
      </main>
    )
  }

  return <CourseLandingClient course={course} />
}
