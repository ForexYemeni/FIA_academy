'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu, LogOut, Bell, Crown, Star, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { NotificationsBell } from '@/components/fia/notifications-bell'
import { NotificationOptInPrompt } from '@/components/fia/notification-opt-in-prompt'
import { ChatWidget } from '@/components/fia/chat-widget'

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

// Role markers stored in user.password for team members.
// Format: `__TEAM_MEMBER__:<role>__:<actual_password>` (or `__TEAM_MEMBER__:<role>__`).
// NOTE: This format lives ONLY in the trainers table password column on the
// server. The login route reads that marker and exposes it as `user.team_role`
// (a clean string like 'founder' / 'leader' / 'team') on the client — never
// the raw password itself. We use `user.team_role` below to render the
// correct badge.
const TEAM_MARKER_PREFIX = '__TEAM_MEMBER__:'

interface RoleBadge {
  label: string
  color: string
}

// Derive the role badge from `user.team_role` (set at login time by
// reading the trainers-table marker). Falls back to null for regular
// admin/trainer/student accounts (no team membership), in which case
// the caller falls back to the passed roleLabel/roleColor.
//
// For backwards-compat with any cached auth state that still has a
// raw password marker, we also accept the legacy `password` form —
// but the login route never exposes the password, so this branch is
// only hit if a developer manually populates the field.
function deriveRoleBadge(teamRole?: string | null, password?: string | null): RoleBadge | null {
  // New path: clean team_role string from the login route
  if (teamRole && typeof teamRole === 'string' && !teamRole.startsWith(TEAM_MARKER_PREFIX)) {
    switch (teamRole) {
      case 'founder':
        return { label: 'المؤسس', color: 'bg-gold/20 text-gold border-gold/40' }
      case 'leader':
        return { label: 'قائد', color: 'bg-blue-500/20 text-blue-600 border-blue-500/40' }
      case 'team':
        return { label: 'فريق', color: 'bg-gray-500/20 text-gray-600 border-gray-500/40' }
      default:
        return null
    }
  }
  // Legacy path: parse the marker from the raw password (only if some
  // older auth cache exposes it). The login route returns password=''
  // so this branch is effectively dead under normal operation, but we
  // keep it for safety.
  if (password && password.startsWith(TEAM_MARKER_PREFIX)) {
    const afterPrefix = password.substring(TEAM_MARKER_PREFIX.length)
    const roleEnd = afterPrefix.indexOf('__')
    const role = roleEnd === -1 ? 'team' : (afterPrefix.substring(0, roleEnd) || 'team')
    switch (role) {
      case 'founder':
        return { label: 'المؤسس', color: 'bg-gold/20 text-gold border-gold/40' }
      case 'leader':
        return { label: 'قائد', color: 'bg-blue-500/20 text-blue-600 border-blue-500/40' }
      case 'team':
        return { label: 'فريق', color: 'bg-gray-500/20 text-gray-600 border-gray-500/40' }
      default:
        return null
    }
  }
  return null
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

  // Override the role badge if the user is a team member (founder/leader/team).
  // The login route sets `user.team_role` from the trainers-table marker —
  // we read it directly here (no need to parse `user.password`, which is
  // always empty for security reasons).
  const derived = deriveRoleBadge(user?.team_role, user?.password)
  const effectiveLabel = derived?.label ?? roleLabel
  const effectiveColor = derived?.color ?? roleColor

  const Sidebar = (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0A1F44] to-[#061229]">
      {/* Logo header with subtle gradient border */}
      <div className="p-4 border-b border-gold/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #C9A961 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <img src="/fia/logo-fia.png" alt="FIA" className="h-10 w-10 object-cover rounded-xl shadow-md" />
            <div className="absolute inset-0 rounded-xl ring-1 ring-gold/30" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight">أكاديمية المستقبل الدولية</div>
            <div className="text-gold text-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> FIA Dashboard
            </div>
          </div>
        </div>
      </div>

      {/* User profile section */}
      <div className="p-4 border-b border-gold/20">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 shadow-md bg-navy-light ${
              derived?.label === 'المؤسس'
                ? 'border-gold shadow-gold/30'
                : derived
                  ? 'border-gold/60'
                  : 'border-gold/40'
            }`}>
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
            {derived && (
              <span className="absolute -top-1 -left-1 z-10 w-5 h-5 rounded-full bg-gold flex items-center justify-center shadow-md ring-2 ring-navy">
                <Crown className="w-3 h-3 text-navy" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate flex items-center gap-1.5">
              {user?.name}
              {derived?.label === 'المؤسس' && <Crown className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
            </div>
            <div className="text-white/60 text-xs truncate" dir="ltr">{user?.email}</div>
          </div>
        </div>
        <Badge className={`mt-3 ${effectiveColor} flex items-center gap-1 w-fit`}>
          {derived?.label === 'المؤسس' && <Crown className="w-3 h-3" />}
          {derived?.label === 'قائد' && <Star className="w-3 h-3" />}
          {effectiveLabel}
        </Badge>
      </div>

      {/* Navigation — professional buttons with hover effects */}
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
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 relative ${
                isActive
                  ? 'bg-gradient-to-l from-gold/20 to-gold/5 text-gold sidebar-active shadow-sm'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold rounded-l-full" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Logout button */}
      <div className="p-3 border-t border-gold/20">
        <Button
          onClick={() => {
            logout()
            toast.success('تم تسجيل الخروج')
          }}
          variant="ghost"
          className="w-full text-white/70 hover:text-red-400 hover:bg-red-500/10 justify-start rounded-xl"
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
              <NotificationsBell />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>

        {/* Floating chat widget — available in every dashboard */}
        <ChatWidget />

        {/* One-time opt-in prompt for sound + browser notifications.
            Shown on first dashboard load only (skipped if the user
            previously approved or dismissed). */}
        <NotificationOptInPrompt />
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
  const colorMap: Record<string, { bg: string; gradient: string; ring: string; shadow: string }> = {
    navy:  { bg: 'bg-navy text-gold',           gradient: 'from-[#0A1F44] to-[#102a63]', ring: 'ring-gold/30',     shadow: 'shadow-navy/20'   },
    gold:  { bg: 'bg-gold text-navy',           gradient: 'from-amber-500 to-yellow-600', ring: 'ring-amber-400/40', shadow: 'shadow-amber-500/20' },
    green: { bg: 'bg-green-500 text-white',     gradient: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-400/40', shadow: 'shadow-emerald-500/20' },
    red:   { bg: 'bg-red-500 text-white',       gradient: 'from-red-500 to-rose-600',     ring: 'ring-red-400/40',  shadow: 'shadow-red-500/20'   },
    blue:  { bg: 'bg-blue-500 text-white',      gradient: 'from-blue-500 to-indigo-600', ring: 'ring-blue-400/40',  shadow: 'shadow-blue-500/20'  },
  }
  return (
    <div className={`fia-course-card stat-card p-5 group relative overflow-hidden ring-1 ${colorMap[color].ring} ${colorMap[color].shadow}`}>
      {/* ⚡ Subtle pattern overlay — magical dots */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(212, 175, 55, 0.4) 1px, transparent 1px)',
        backgroundSize: '14px 14px'
      }} />
      {/* Top-right glow */}
      <div className="absolute -top-6 -right-6 w-16 h-16 bg-gold/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color].gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
          <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
        </div>
        {trend && <Badge variant="outline" className="text-xs">{trend}</Badge>}
      </div>
      <div className="relative text-2xl font-extrabold text-navy">{value}</div>
      <div className="relative text-xs text-muted-foreground mt-1">{label}</div>
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
    <div className="bg-white rounded-2xl border border-border p-5 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-bold text-navy text-lg flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-gold to-amber-600 rounded-full" />
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
