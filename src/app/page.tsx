'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/fia/header'
import { LoginModal } from '@/components/fia/login-modal'
import { LandingAuth } from '@/components/fia/landing-auth'
import { QuickLinkCard } from '@/components/fia/quick-link-card'
import { StudentDashboard } from '@/components/fia/dashboards/student'
import { TrainerDashboard } from '@/components/fia/dashboards/trainer'
import { AdminDashboard } from '@/components/fia/dashboards/admin'
import { useAuth } from '@/lib/auth-store'

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false)
  const user = useAuth((s) => s.user)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/site-settings').then((r) => r.json()).then(setSettings).catch(() => {})

    const checkHash = () => {
      const h = window.location.hash.replace('#', '')
      if (['about', 'privacy', 'terms', 'refund', 'support', 'social'].includes(h)) {
        setActiveCard(h)
      } else {
        setActiveCard(null)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  const closeCard = () => {
    setActiveCard(null)
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname)
    }
  }

  if (!mounted) return null

  // If user is logged in, show their dashboard
  if (user) {
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'trainer') return <TrainerDashboard />
    return <StudentDashboard />
  }

  // Landing page — NO footer (quick links handle everything)
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onLoginClick={() => setAuthOpen(true)} />
      <main className="flex-1">
        <LandingAuth onLoginClick={() => setAuthOpen(true)} />
      </main>
      <LoginModal open={authOpen} onOpenChange={setAuthOpen} />
      {/* Quick Link Dialog Cards — triggered by sidebar or quick links */}
      <QuickLinkCard cardId={activeCard} onClose={closeCard} settings={settings} />
    </div>
  )
}
