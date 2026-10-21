// Public forum page — visible to EVERYONE (guests included) — ROYAL v4.2
import { Metadata } from 'next'
import ForumPublicClient from './client'

export const metadata: Metadata = {
  title: 'المنتدى | أكاديمية المستقبل الدولية',
  description: 'منتدى أكاديمية المستقبل الدولية — نقاشات طبية وتدريبية بين المدربين والمتدربين، متاح للجميع.',
  openGraph: {
    title: 'المنتدى | أكاديمية المستقبل الدولية',
    description: 'منتدى الأكاديمية — نقاشات ومجتمع طبي متاح للجميع.',
    type: 'website',
    siteName: 'أكاديمية المستقبل الدولية',
    locale: 'ar_YE',
  },
  alternates: { canonical: 'https://fiaacademy.vercel.app/forum' },
}

export default function Page() {
  return <ForumPublicClient />
}
