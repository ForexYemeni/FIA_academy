'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu, LogOut, Bell } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'

export interface NavItem {
  id: string
  label: string
  icon: any
}

interface DashboardShellProps {
  nav: NavItem[]
  active: string
  onNavigate: (id: string) => void
  roleLabel: string
  roleColor: string
  children: React.ReactNode
}

export function DashboardShell({
  nav,
  active,
  onNavigate,
  roleLabel,
  roleColor,
  children,
}: DashboardShellProps) {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const [mobileOpen, setMobileOpen] = useState(false)

  const Sidebar = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gold/20">
        <div className="flex items-center gap-2">
          <img src="/fia/logo-fia.png" alt="FIA" className="h-10 w-10 object-cover rounded-lg" />
          <div>
            <div className="text-white font-bold text-sm">أكاديمية المستقبل الدولية</div>
            <div className="text-gold text-xs">FIA Dashboard</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gold/20">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gold/40 shadow-md flex-shrink-0 bg-navy-light">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name || 'avatar'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gold font-bold text-lg">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-navy-light"></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">{user?.name}</div>
            <div className="text-white/60 text-xs truncate" dir="ltr">{user?.email}</div>
          </div>
        </div>
        <Badge className={`mt-3 ${roleColor}`}>{roleLabel}</Badge>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto fia-scroll">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id)
                setMobileOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 ${
                isActive
                  ? 'bg-gold/15 text-gold sidebar-active'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gold/20">
        <Button
          onClick={() => {
            logout()
            toast.success('تم تسجيل الخروج')
          }}
          variant="ghost"
          className="w-full text-white/70 hover:text-red-400 hover:bg-red-500/10 justify-start"
        >
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-navy flex-shrink-0 sticky top-0 h-screen">
        {Sidebar}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 right-4 z-50 bg-navy text-white"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="bg-navy p-0 w-72">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          {Sidebar}
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="lg:hidden w-10"></div>
            <div>
              <h1 className="font-bold text-navy text-lg">
                {nav.find((n) => n.id === active)?.label || 'لوحة التحكم'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-navy" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'navy',
}: {
  icon: any
  label: string
  value: string | number
  trend?: string
  color?: 'navy' | 'gold' | 'green' | 'red' | 'blue'
}) {
  const colorMap: Record<string, string> = {
    navy: 'bg-navy text-gold',
    gold: 'bg-gold text-navy',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
  }
  return (
    <div className="stat-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && <Badge variant="outline" className="text-xs">{trend}</Badge>}
      </div>
      <div className="text-2xl font-extrabold text-navy">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 lg:p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-bold text-navy text-lg">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
