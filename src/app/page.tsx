'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/fia/header'
import { Footer } from '@/components/fia/footer'
import { PublicSite } from '@/components/fia/public-site'
import { LoginModal } from '@/components/fia/login-modal'
import { StudentDashboard } from '@/components/fia/dashboards/student'
import { TrainerDashboard } from '@/components/fia/dashboards/trainer'
import { AdminDashboard } from '@/components/fia/dashboards/admin'
import { useAuth } from '@/lib/auth-store'

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false)
  const user = useAuth((s) => s.user)
  // Always render once mounted on client; auth store rehydrates from localStorage on first read.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
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
