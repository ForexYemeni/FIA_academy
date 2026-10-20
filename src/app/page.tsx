'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/fia/error-boundary'
import { Header } from '@/components/fia/header'
import { LoginModal } from '@/components/fia/login-modal'
import { LandingAuth } from '@/components/fia/landing-auth'
import { QuickLinkCard } from '@/components/fia/quick-link-card'
import { useAuth } from '@/lib/auth-store'

// === CODE SPLITTING FOR PERFORMANCE ===
// The dashboards are huge files (student.tsx = 2300 lines, admin.tsx
// = 2900 lines). Loading them all on the homepage adds ~500KB to the
// initial JS bundle. By lazy-loading them, the homepage (for non-
// logged-in users) loads fast — the dashboards only load when the
// user is actually logged in.
//
// Pattern: React.lazy() returns a component that loads its JS chunk
// on-demand. We wrap with <Suspense fallback={...}> to show a
// spinner while loading.
const StudentDashboard = lazy(() => import('@/components/fia/dashboards/student').then(m => ({ default: m.StudentDashboard })))
const TrainerDashboard = lazy(() => import('@/components/fia/dashboards/trainer').then(m => ({ default: m.TrainerDashboard })))
const AdminDashboard = lazy(() => import('@/components/fia/dashboards/admin').then(m => ({ default: m.AdminDashboard })))

// Lightweight loading spinner shown while the dashboard chunk loads
function DashboardLoader() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-navy"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
      <p className="text-gold text-sm font-bold">جاري تحميل لوحة التحكم...</p>
    </div>
  )
}

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
      if (['about', 'privacy', 'terms', 'refund', 'support', 'social', 'courses', 'trainers', 'team', 'partners', 'licenses'].includes(h)) {
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

  // === Skeleton screen during initial mount ===
  // Before the React hydration completes, we show a simple navy
  // background so the user doesn't see a "blank white flash". This
  // matches the APK's loading screen color → seamless experience.
  if (!mounted) {
    return (
      <div
        className="min-h-screen bg-navy"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      />
    )
  }

  // === If user is logged in, lazy-load their dashboard ===
  if (user) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <ErrorBoundary>
          {user.role === 'admin' ? <AdminDashboard /> :
           user.role === 'trainer' ? <TrainerDashboard /> :
           <StudentDashboard />}
        </ErrorBoundary>
      </Suspense>
    )
  }

  // Landing page — NO footer (quick links handle everything)
  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
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
