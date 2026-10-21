'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'

// Base navigation links (always shown).
// "الشركاء" and "التراخيص" are injected dynamically based on the admin's
// site_settings visibility toggles (show_partners / show_licenses).
const BASE_NAV_LINKS = [
  { href: '#courses', label: 'دوراتنا' },
  { href: '#trainers', label: 'مدربونا' },
  { href: '#team', label: 'المؤسس والفريق' },
  { href: '/forum', label: 'المنتدى' },
  { href: '/blog', label: 'المدونة' },
  { href: '/verify', label: 'تحقق من شهادة' },
  { href: '#about', label: 'من نحن' },
  { href: '#privacy', label: 'سياسة الخصوصية' },
  { href: '#terms', label: 'شروط الاستخدام' },
  { href: '#refund', label: 'سياسة الاسترداد' },
  { href: '#support', label: 'الدعم والمساعدة' },
  { href: '#social', label: 'تابعنا' },
]

interface HeaderProps {
  onLoginClick?: () => void
}

export function Header({ onLoginClick }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<any>({})
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)

  // Pull site settings so the nav reflects the admin's visibility toggles
  // for partners & licenses in real time.
  useEffect(() => {
    let cancelled = false
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setSettings(d || {}) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Build the final nav link list: insert "شركاؤنا" and "التراخيص" right
  // after "المؤسس والفريق" so they sit in a sensible visual position.
  const navLinks = useMemo(() => {
    const links = [...BASE_NAV_LINKS]
    const inserts: { href: string; label: string }[] = []
    if (settings.show_partners === true) {
      inserts.push({ href: '#partners', label: 'شركاؤنا' })
    }
    if (settings.show_licenses === true) {
      inserts.push({ href: '#licenses', label: 'التراخيص' })
    }
    if (inserts.length > 0) {
      const teamIdx = links.findIndex((l) => l.href === '#team')
      const insertAt = teamIdx === -1 ? links.length : teamIdx + 1
      links.splice(insertAt, 0, ...inserts)
    }
    return links
  }, [settings.show_partners, settings.show_licenses])

  const goDashboard = () => {
    // Just trigger a re-render by scrolling to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAuthClick = () => {
    if (onLoginClick) {
      onLoginClick()
    }
  }

  return (
    <header
      className="sticky top-0 z-40 bg-navy/95 backdrop-blur-md border-b border-gold/20"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <a href="#home" className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src="/fia/logo-fia.png"
              alt="FIA"
              width={32}
              height={32}
              loading="eager"
              className="h-8 w-8 sm:h-9 sm:w-9 object-cover rounded-lg flex-shrink-0"
            />
            <div className="hidden sm:block min-w-0 flex-shrink">
              <div className="text-white font-bold text-sm sm:text-base leading-tight truncate">أكاديمية المستقبل الدولية</div>
              <div className="text-gold text-[10px] sm:text-xs font-semibold tracking-wider truncate">FIA — Future International Academy</div>
            </div>
            {/* Mobile-only compact name (replaces the long subtitle on phones) */}
            <div className="sm:hidden min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">أكاديمية المستقبل</div>
              <div className="text-gold text-[9px] font-semibold tracking-wider truncate">FIA ACADEMY</div>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-white/80 hover:text-gold hover:bg-white/5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <>
                <Button
                  onClick={goDashboard}
                  className="hidden sm:inline-flex bg-gold hover:bg-gold-light text-navy font-semibold"
                >
                  لوحة التحكم
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    logout()
                    toast.success('تم تسجيل الخروج')
                  }}
                  className="hidden sm:inline-flex border-gold/30 text-gold hover:bg-gold/10 hover:text-gold-light bg-transparent"
                >
                  خروج
                </Button>
              </>
            ) : (
              <Button
                onClick={handleAuthClick}
                className="bg-gold hover:bg-gold-light text-navy font-semibold"
              >
                دخول / تسجيل
              </Button>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-navy border-gold/20 w-72 p-0">
                <SheetTitle className="text-white px-4 pt-4">القائمة</SheetTitle>
                <nav className="flex flex-col gap-1 p-4">
                  {navLinks.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="text-white/80 hover:text-gold hover:bg-white/5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {l.label}
                    </a>
                  ))}
                </nav>
                {user && (
                  <div className="p-4 mt-auto border-t border-gold/20">
                    <div className="text-white/70 text-sm mb-2" dir="ltr">{user.email}</div>
                    <Button onClick={goDashboard} className="w-full bg-gold text-navy mb-2">لوحة التحكم</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        logout()
                        setOpen(false)
                        toast.success('تم تسجيل الخروج')
                      }}
                      className="w-full border-gold/30 text-gold"
                    >
                      خروج
                    </Button>
                  </div>
                )}
                {!user && (
                  <div className="p-4 mt-auto border-t border-gold/20">
                    <Button onClick={() => { setOpen(false); handleAuthClick() }} className="w-full bg-gold text-navy">دخول / تسجيل</Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
