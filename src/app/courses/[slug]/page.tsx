// Public course detail page — server-rendered with proper SEO metadata.
// This page is statically generated (SSG) at build time for each course
// slug, so each course has its own crawlable URL with full metadata.
import { Metadata, ResolvingMetadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import CourseDetailClient from './client'

interface Props { params: Promise<{ slug: string }> }

// Generate static metadata for SEO
export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('title, short_description, cover, level, duration_hours, price, currency, price_type')
    .eq('slug', slug)
    .maybeSingle()

  if (!course) {
    return {
      title: 'دورة غير موجودة | أكاديمية المستقبل الدولية',
      description: 'الدورة المطلوبة غير موجودة.',
    }
  }

  const title = `${course.title} | أكاديمية المستقبل الدولية`
  const description = course.short_description || `تعرف على دورة ${course.title} في أكاديمية المستقبل الدولية`

  return {
    title,
    description,
    keywords: [course.title, 'تعليم طبي', 'أكاديمية المستقبل الدولية', course.level || 'متوسط'],
    openGraph: {
      title,
      description,
      type: 'website',
      images: course.cover ? [{ url: course.cover, width: 1200, height: 630 }] : undefined,
      siteName: 'أكاديمية المستقبل الدولية',
      locale: 'ar_YE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: course.cover ? [course.cover] : undefined,
    },
    alternates: {
      canonical: `https://fiaacademy.vercel.app/courses/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

// SSG — generate static params for all courses at build time
export async function generateStaticParams() {
  try {
    const { data } = await supabaseAdmin
      .from('courses')
      .select('slug')
      .not('slug', 'is', null)
      .neq('status', 'مسودة')
    return (data || []).map((c: any) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

// Decode URL-encoded slug — Next.js 16 doesn't auto-decode path segments,
// so Arabic or special-char slugs arrive URL-encoded and the DB lookup fails.
function decodeSlug(raw: string): string {
  let s = raw || ''
  try {
    let decoded = decodeURIComponent(s)
    while (decoded !== decodeURIComponent(decoded) && decoded.length < 1000) {
      decoded = decodeURIComponent(decoded)
    }
    return decoded
  } catch {
    return s
  }
}

// ⚡ v10.23-CPU — قشرة client خالصة (صفر قراءة لـ cookies/headers/searchParams على السيرفر)
// ISR مخزّن على الحافة بدل إعادة تصيير serverless لكل زائر — خفض Fluid CPU جذري
// الدورات الجديدة تعمل فوراً بلا redeploy (ISR يصيّر أي slug جديد عند أول زيارة)
// وتعديلات الإدارة تظهر خلال 10 دقائق كحد أقصى
export const revalidate = 600

export default async function Page({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeSlug(rawSlug)
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .neq('status', 'مسودة')
    // 🛡️ دورات الإدارة السرية لا تُفتح من الرابط العام أبداً
    .neq('visibility', 'admin_only')
    .maybeSingle()

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">الدورة غير موجودة</h1>
          <p className="text-white/70 mb-6">عذراً، لم نتمكن من العثور على الدورة المطلوبة.</p>
          <a href="/" className="inline-block bg-gold text-navy px-6 py-3 rounded-lg font-bold">العودة للرئيسية</a>
        </div>
      </div>
    )
  }

  return <CourseDetailClient course={course} />
}
