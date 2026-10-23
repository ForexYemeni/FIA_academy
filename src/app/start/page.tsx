import type { Metadata } from 'next'
import { GettingStarted } from '@/components/fia/getting-started'

// 🌟 مركز «كيف تبدأ» الملكي — أربعة أدلة مصوّرة قصيرة خطوة بخطوة

export const metadata: Metadata = {
  title: 'كيف تبدأ — مركز الإرشاد الملكي | أكاديمية المستقبل الدولية',
  description:
    'أدلة قصيرة مصوّرة خطوة بخطوة: كيف تسجل حسابك، كيف تدفع وتشترك، كيف تستلم شهادتك الموثقة، وكيف تنضم مدرباً مع اتفاق أرباح — كلها مبنية على منظومة الأكاديمية الفعلية.',
  alternates: { canonical: '/start' },
}

export default function StartPage() {
  return <GettingStarted />
}
