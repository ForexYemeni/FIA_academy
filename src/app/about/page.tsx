import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import AboutClient from './client'

export const metadata: Metadata = {
  title: 'من نحن | أكاديمية المستقبل الدولية',
  description: 'تعرّف على رؤيتنا ورسالتنا وقيمننا في أكاديمية المستقبل الدولية للتعليم الطبي المعتمد في اليمن.',
  alternates: { canonical: 'https://fiaacademy.vercel.app/about' },
  openGraph: {
    title: 'من نحن | أكاديمية المستقبل الدولية',
    description: 'منصة التعليم الطبي المعتمدة في اليمن — رؤيتنا، رسالتنا، قيمنا، وفريقنا.',
    type: 'website', siteName: 'أكاديمية المستقبل الدولية', locale: 'ar_YE',
  },
}

export const revalidate = 60

export default async function Page() {
  let settings: any = {}
  try {
    const res = await fetch(`https://fiaacademy.vercel.app/api/site-settings`, { cache: 'no-store' })
    if (res.ok) settings = await res.json()
  } catch {}

  // Fetch founder + team data
  let founder: any = null
  let team: any[] = []
  try {
    const { data: founderData } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .like('password', '__TEAM_MEMBER__:%')
      .limit(20)
    const all = founderData || []
    // Parse role from password marker
    for (const t of all) {
      if (!t.password?.startsWith('__TEAM_MEMBER__:')) continue
      const after = t.password.substring('__TEAM_MEMBER__:'.length)
      const sep = after.indexOf('__')
      const role = sep !== -1 ? after.substring(0, sep) : 'team'
      const extraRaw = sep !== -1 ? after.substring(sep + 2) : ''
      // Parse bio for extra fields (qualifications, achievements, vision, etc.)
      const BIO_SEP = '\n\n===FIA_EXTRA===\n'
      const idx = (t.bio || '').indexOf(BIO_SEP)
      const bioText = idx === -1 ? (t.bio || '') : (t.bio || '').substring(0, idx)
      let extra: any = {}
      if (idx !== -1) {
        try { extra = JSON.parse((t.bio || '').substring(idx + BIO_SEP.length)) } catch {}
      }
      const member = { ...t, role, bio: bioText, ...extra, password: undefined }
      if (role === 'founder') founder = member
      else team.push(member)
    }
    // Founder first, then leaders, then team — most recent first
    team.sort((a, b) => {
      const order: Record<string, number> = { leader: 0, team: 1 }
      return (order[a.role] || 2) - (order[b.role] || 2)
    })
  } catch {}

  return <AboutClient settings={settings} founder={founder} team={team} />
}
