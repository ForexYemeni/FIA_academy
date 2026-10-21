import { Metadata } from 'next'
import DownloadClient from './client'

export const metadata: Metadata = {
  title: 'تحميل تطبيق الأكاديمية | أكاديمية المستقبل الدولية',
  description:
    'حمّل تطبيق أكاديمية المستقبل الدولية لأندرويد — إشعارات فورية، شهادات معتمدة، دورات طبية وامتحانات تفاعلية في جيبك.',
  alternates: { canonical: 'https://fiaacademy.vercel.app/download' },
  openGraph: {
    title: 'حمّل تطبيق أكاديمية المستقبل الدولية',
    description: 'الأكاديمية كاملة في جيبك — إشعارات فورية، شهادات، دورات وامتحانات.',
    type: 'website',
    siteName: 'أكاديمية المستقبل الدولية',
    locale: 'ar_YE',
  },
}

export default function DownloadPage() {
  return <DownloadClient />
}
