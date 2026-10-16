import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import FaqClient from './client'

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة | أكاديمية المستقبل الدولية',
  description: 'إجابات للأسئلة الأكثر شيوعاً حول الدورات والتسجيل والدفع والشهادات في أكاديمية المستقبل الدولية.',
  alternates: { canonical: 'https://fiaacademy.vercel.app/faq' },
}

export const revalidate = 60

export default async function Page() {
  const { data: faqs } = await supabaseAdmin
    .from('faqs')
    .select('*')
    .eq('status', 'نشط')
    .order('display_order', { ascending: true })
  return <FaqClient faqs={faqs || []} />
}
