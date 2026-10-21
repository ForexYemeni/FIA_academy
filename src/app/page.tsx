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

  // === Luxury splash during initial mount (v2.7) ===
  // Before React hydration completes, we render a premium navy/gold
  // splash (SSR HTML → paints instantly, no white flash). It matches
  // the APK's native splash exactly → seamless hand-off, and replaces
  // the old blank navy rectangle that felt like "slow loading".
  if (!mounted) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0A1F44] via-[#0B2250] to-[#051429]"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#C9A961]/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#1B3A6B]/40 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, #C9A961 1px, transparent 1px), radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 1px)',
              backgroundSize: '40px 40px, 28px 28px',
            }}
          />
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-[#C9A961]/25 blur-2xl" />
          <div className="relative rounded-3xl bg-gradient-to-br from-[#C9A961] via-[#E5C77E] to-[#C9A961] p-[2px] shadow-2xl">
            <img
              src="/fia/logo-fia.png"
              alt="FIA"
              width={72}
              height={72}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-[22px] object-cover"
            />
          </div>
        </div>
        <h1 className="relative mt-4 text-lg font-extrabold text-white">
          أكاديمية المستقبل الدولية
        </h1>
        <p className="relative mt-1 text-[10px] font-bold tracking-[0.3em] text-[#C9A961]">
          FIA ACADEMY
        </p>
        <div className="relative mt-6 h-1 w-28 overflow-hidden rounded-full bg-white/10">
          <div className="fia-lux-loader h-full w-1/2 rounded-full bg-gradient-to-r from-[#C9A961] to-[#E5C77E]" />
        </div>
      </div>
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
