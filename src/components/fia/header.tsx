'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'

const NAV_LINKS = [
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
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)

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
    <header className="sticky top-0 z-40 bg-navy/95 backdrop-blur-md border-b border-gold/20">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between">
          <a href="#home" className="flex items-center gap-2">
            <img src="/fia/logo-fia.png" alt="FIA" className="h-8 w-8 object-cover rounded-lg flex-shrink-0" />
            <div className="hidden sm:block">
              <div className="text-white font-bold text-base leading-tight">أكاديمية المستقبل الدولية</div>
              <div className="text-gold text-xs font-semibold tracking-wider">FIA — Future International Academy</div>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-white/80 hover:text-gold hover:bg-white/5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
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
                  {NAV_LINKS.map((l) => (
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
