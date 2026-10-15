'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/fia/header'
import { Footer } from '@/components/fia/footer'
import { PublicSite } from '@/components/fia/public-site'
import { LoginModal } from '@/components/fia/login-modal'
import { StudentDashboard } from '@/components/fia/dashboards/student'
import { TrainerDashboard } from '@/components/fia/dashboards/trainer'
import { AdminDashboard } from '@/components/fia/dashboards/admin'
import { VerifyPage } from '@/components/fia/verify-page'
import { useAuth } from '@/lib/auth-store'

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false)
  const user = useAuth((s) => s.user)
  const [verifyNumber, setVerifyNumber] = useState<string | null>(null)
  // Always render once mounted on client; auth store rehydrates from localStorage on first read.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if URL has verify param
    try {
      const url = new URL(window.location.href)
      const v = url.searchParams.get('verify')
      if (v && window.location.hash === '#verify') {
        setVerifyNumber(v)
      }
    } catch {}
  }, [])

  // Listen to hashchange events (in case user clicks a verify link while on the page)
  useEffect(() => {
    const handler = () => {
      try {
        const url = new URL(window.location.href)
        const v = url.searchParams.get('verify')
        if (v && window.location.hash === '#verify') {
          setVerifyNumber(v)
        } else if (!v) {
          setVerifyNumber(null)
        }
      } catch {}
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  if (!mounted) {
    return null
  }

  // If user is logged in, show their dashboard
  if (user) {
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'trainer') return <TrainerDashboard />
    return <StudentDashboard />
  }

  // If verify param is set, show the verify page (standalone)
  if (verifyNumber) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-gold/5 to-white">
        <Header onLoginClick={() => setAuthOpen(true)} />
        <main className="flex-1">
          <VerifyPage initialNumber={verifyNumber} />
        </main>
        <Footer />
        <LoginModal open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    )
  }

  // Otherwise show the public site
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onLoginClick={() => setAuthOpen(true)} />
      <PublicSite onLoginClick={() => setAuthOpen(true)} />
      <Footer />
      <LoginModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  )
}
