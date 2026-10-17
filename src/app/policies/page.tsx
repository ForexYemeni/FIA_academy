import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import PoliciesClient from './client'

export const metadata: Metadata = {
  title: 'السياسات | أكاديمية المستقبل الدولية',
  description: 'سياسة الخصوصية وشروط الاستخدام وسياسة الاسترداد والدعم والمساعدة في أكاديمية المستقبل الدولية.',
  alternates: { canonical: 'https://fiaacademy.vercel.app/policies' },
}

export const revalidate = 60

export default async function Page() {
  let settings: any = {}
  try {
    const res = await fetch(`https://fiaacademy.vercel.app/api/site-settings`, { cache: 'no-store' })
    if (res.ok) settings = await res.json()
  } catch {}
  return <PoliciesClient settings={settings} />
}
