import { Metadata } from 'next'
import ContactClient from './client'

export const metadata: Metadata = {
  title: 'تواصل معنا | أكاديمية المستقبل الدولية',
  description: 'تواصل مع فريق أكاديمية المستقبل الدولية للتعليم الطبي.',
  alternates: { canonical: 'https://fiaacademy.vercel.app/contact' },
}

export const revalidate = 60

export default async function Page() {
  let settings: any = {}
  try {
    const res = await fetch(`https://fiaacademy.vercel.app/api/site-settings`, { cache: 'no-store' })
    if (res.ok) settings = await res.json()
  } catch {}
  return <ContactClient settings={settings} />
}
