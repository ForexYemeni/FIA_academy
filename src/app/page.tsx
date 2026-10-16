'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/fia/header'
import { Footer } from '@/components/fia/footer'
import { LoginModal } from '@/components/fia/login-modal'
import { LandingAuth } from '@/components/fia/landing-auth'
import { AboutPage } from '@/components/fia/about-page'
import { PolicyPage } from '@/components/fia/policy-page'
import { StudentDashboard } from '@/components/fia/dashboards/student'
import { TrainerDashboard } from '@/components/fia/dashboards/trainer'
import { AdminDashboard } from '@/components/fia/dashboards/admin'
import { useAuth } from '@/lib/auth-store'

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false)
  const user = useAuth((s) => s.user)
  const [view, setView] = useState<'home' | 'about' | 'privacy' | 'terms' | 'refund' | 'support'>('home')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Listen for hash changes for navigation
    const checkHash = () => {
      const h = window.location.hash.replace('#', '')
      if (['about', 'privacy', 'terms', 'refund', 'support'].includes(h)) {
        setView(h as any)
      } else {
        setView('home')
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  if (!mounted) return null

  // If user is logged in, show their dashboard
  if (user) {
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'trainer') return <TrainerDashboard />
    return <StudentDashboard />
  }

  // If a sub-page view is requested via hash, show that page
  if (view === 'about') {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header onLoginClick={() => setAuthOpen(true)} />
        <main className="flex-1"><AboutPage /></main>
        <Footer />
        <LoginModal open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    )
  }
  if (view !== 'home') {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header onLoginClick={() => setAuthOpen(true)} />
        <main className="flex-1"><PolicyPage policyType={view} /></main>
        <Footer />
        <LoginModal open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    )
  }

  // Default: show landing auth page (login/register + quick links)
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onLoginClick={() => setAuthOpen(true)} />
      <main className="flex-1">
        <LandingAuth onLoginClick={() => setAuthOpen(true)} />
      </main>
      <Footer />
      <LoginModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  )
}
