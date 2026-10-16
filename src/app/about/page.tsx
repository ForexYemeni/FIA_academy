import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import AboutClient from './client'

export const metadata: Metadata = {
  title: 'من نحن | أكاديمية المستقبل الدولية',
  description: 'تعرّف على رؤيتنا ورسالتنا وقيمننا في أكاديمية المستقبل الدولية للتعليم الطبي.',
  alternates: { canonical: 'https://fiaacademy.vercel.app/about' },
  openGraph: {
    title: 'من نحن | أكاديمية المستقبل الدولية',
    description: 'تعرّف على رؤيتنا ورسالتنا وقيمننا في أكاديمية المستقبل الدولية للتعليم الطبي.',
    type: 'website', siteName: 'أكاديمية المستقبل الدولية', locale: 'ar_YE',
  },
}

export const revalidate = 60

export default async function Page() {
  // Use the same JSON-encoded-extra pattern the admin uses
  let settings: any = {}
  try {
    // Fetch directly through the API which already parses the merged settings
    const res = await fetch(`https://fiaacademy.vercel.app/api/site-settings`, { cache: 'no-store' })
    if (res.ok) settings = await res.json()
  } catch {}

  return <AboutClient settings={settings} />
}
