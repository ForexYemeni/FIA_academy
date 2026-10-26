'use client'

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu, LogOut, Bell, Crown, Star, Sparkles, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { NotificationsBell } from '@/components/fia/notifications-bell'
import {
  subscribeNotificationCounts,
  getNotificationSnapshot,
  getNotificationServerSnapshot,
  countsByTab,
  unreadIdsForTab,
  markReadLocally,
} from '@/lib/notification-counts'
import { NotificationOptInPrompt } from '@/components/fia/notification-opt-in-prompt'
import { ChatWidget } from '@/components/fia/chat-widget'
import { LuxOfferBar } from '@/components/fia/lux-experience'

export interface NavItem {
  id: string
  label: string
  icon: any
  /** ⚡ v6.7 — عنوان المجموعة الملكية: الأقسام المتجاورة التي تشترك بنفس العنوان
      تُعرض تحت ترويسة ذهبية مزخرفة واحدة (ترتيب فاخر موحّد لكل الحسابات). */
  group?: string
  /** 🛡️ v6.9.3 — نبضة ذهبية نابضة: دعوة بصرية ملكية لفتح القسم فوراً
   *  (تُستخدم لبطاقة اتفاق تعديل العقد المعلّقة في «أرباحي») */
  pulse?: boolean
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

  // 🚫 v10.18 — «لا تحديث أثناء القائمة المفتوحة» داخل APK:
  // القائمة الجانبية مفتوحة → نُطفئ السحب-للتحديث الأصلي (SwipeRefreshLayout)
  // عبر جسر FIANativeBridge.setPullToRefreshEnabled — وعند الإغلاق يُعاد تشغيله.
  // آمن تماماً على المتصفح وعلى نسخ APK الأقدم (فحص وجود الدالة قبل النداء).
  useEffect(() => {
    try {
      const bridge = (window as any)?.FIANativeBridge
      if (bridge && typeof bridge.setPullToRefreshEnabled === 'function') {
        bridge.setPullToRefreshEnabled(!mobileOpen)
      }
    } catch {}
  }, [mobileOpen])

  // ⚡ v6.6 — عدادات القائمة الجانبية الملكية:
  // مصدر الحقيقة = إشعارات الجرس المنشورة (بلا أي طلب شبكي إضافي).
  // لكل قسم نحسب عدد الإشعارات غير المقروءة التي تشير إليه
  // (رابط «/#قسم» أولاً ثم نوع الإشعار كاحتياط) — ويظهر شارة ذهبية فاخرة.
  const navIds = useMemo(() => new Set(nav.map((n) => n.id)), [nav])
  const notifItems = useSyncExternalStore(
    subscribeNotificationCounts,
    getNotificationSnapshot,
    getNotificationServerSnapshot,
  )
  const notifCounts = useMemo(
    () => countsByTab(navIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifItems, navIds],
  )

  // ⚡ v6.6 — زيارة القسم تُسكّت عداده: كل إشعار غير مقروء يشير إلى القسم
  // المُفتوح الآن يُعلَّم مقروءاً (تفاؤلياً هنا + PUT للخادم بنفس عقد الجرس)
  // فينخفض العداد فوراً ويهتزّ جرس الإشعارات بالتزامن معه.
  useEffect(() => {
    if (!active || !user?.id) return
    const ids = unreadIdsForTab(active, navIds)
    if (!ids.length) return
    markReadLocally(ids)
    fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Override the role badge if the user is a team member (founder/leader/team).
  // The login route sets `user.team_role` from the trainers-table marker —
  // we read it directly here (no need to parse `user.password`, which is
  // always empty for security reasons).
  const derived = deriveRoleBadge(user?.team_role, user?.password)
  const effectiveLabel = derived?.label ?? roleLabel
  const effectiveColor = derived?.color ?? roleColor

  // ⚡ v6.7 — تجميع ملكي مرتّب: الأقسام المتجاورة ذات المجموعة نفسها تُعرض تحت
  // ترويسة ذهبية مزخرفة واحدة. الترتيب يتبع ترتيب التعريف في كل دور حرفياً،
  // والأقسام بلا مجموعة تُعرض كما هي (توافق خلفي آمن).
  const groupedNav = useMemo(() => {
    const groups: { name: string; items: NavItem[] }[] = []
    for (const item of nav) {
      const name = item.group || ''
      const last = groups[groups.length - 1]
      if (last && last.name === name) last.items.push(item)
      else groups.push({ name, items: [item] })
    }
    return groups
  }, [nav])

  const Sidebar = (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0A1F44] to-[#061229] relative">
      {/* ⚡ v6.7 — هالة ملكية عُلوية خافتة + نقش نقاط راقٍ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_70%)]" />

      {/* Logo header with subtle gradient border */}
      <div className="p-4 border-b border-gold/25 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #C9A961 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <img src="/fia/logo-fia.png" alt="FIA" className="h-12 w-12 object-cover rounded-2xl shadow-lg shadow-black/30" />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-gold/40" />
            <div className="absolute -inset-0.5 rounded-[20px] bg-gold/20 blur-md -z-10" />
          </div>
          <div>
            <div className="text-white font-bold text-[15px] tracking-tight leading-snug">أكاديمية المستقبل الدولية</div>
            <div className="text-gold text-xs flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3" /> FIA Dashboard
            </div>
          </div>
        </div>
      </div>

      {/* User profile section */}
      <div className="p-4 border-b border-gold/25 relative">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 shadow-lg bg-navy-light ${
              derived?.label === 'المؤسس'
                ? 'border-gold shadow-gold/40'
                : derived
                  ? 'border-gold/60'
                  : 'border-gold/40'
            }`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name || 'avatar'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gold font-bold text-xl">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0A1F44] shadow-[0_0_8px_rgba(34,197,94,0.7)]"></span>
            </div>
            {derived && (
              <span className="absolute -top-1 -left-1 z-10 w-5 h-5 rounded-full bg-gradient-to-br from-gold-light to-amber-600 flex items-center justify-center shadow-md ring-2 ring-[#0A1F44]">
                <Crown className="w-3 h-3 text-navy" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[15px] font-bold truncate flex items-center gap-1.5">
              {user?.name}
              {derived?.label === 'المؤسس' && <Crown className="w-4 h-4 text-gold flex-shrink-0" />}
            </div>
            <div className="text-white/55 text-xs truncate mt-0.5" dir="ltr">{user?.email}</div>
          </div>
        </div>
        <Badge className={`mt-3.5 ${effectiveColor} flex items-center gap-1.5 w-fit text-xs px-3 py-1.5 rounded-xl`}>
          {derived?.label === 'المؤسس' && <Crown className="w-3.5 h-3.5" />}
          {derived?.label === 'قائد' && <Star className="w-3.5 h-3.5" />}
          {effectiveLabel}
        </Badge>
      </div>

      {/* ⚡ v6.7 — Navigation ملكية: مجموعات مرتّبة بترويسات ذهبية مزخرفة
          وأزرار مكبّرة (شريحة أيقونة 40px + نص 15px) بتوهج ذهبي للقسم النشط */}
      <nav className="flex-1 px-3 pb-2 overflow-y-auto fia-scroll relative">
        {groupedNav.map((group, gi) => (
          <div key={group.name || `ungrouped-${gi}`}>
            {group.name && (
              <div className="flex items-center gap-2 px-1 pt-4 pb-2 first:pt-3">
                <span className="w-1.5 h-1.5 rotate-45 bg-gold/60 rounded-[1px] shadow-[0_0_6px_rgba(212,175,55,0.5)] flex-shrink-0" />
                <span className="text-[10.5px] font-extrabold tracking-[0.15em] text-gold/70 whitespace-nowrap">{group.name}</span>
                <span className="h-px flex-1 bg-gradient-to-l from-gold/25 via-gold/10 to-transparent" />
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id)
                    setMobileOpen(false)
                  }}
                  className={`group w-full flex items-center gap-3 ps-2 pe-2.5 py-2.5 rounded-2xl text-[15px] font-semibold transition-all duration-300 mb-1 relative ${
                    isActive
                      ? 'bg-gradient-to-l from-gold/25 via-gold/10 to-transparent text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.25)]'
                      : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {/* شريط القسم النشط — إبرة ذهبية متوهجة */}
                  {isActive && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-9 bg-gradient-to-b from-gold-light via-gold to-amber-600 rounded-l-full shadow-[0_0_14px_rgba(212,175,55,0.65)]" />
                  )}
                  {/* شريحة الأيقونة الملكية */}
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-br from-gold-light via-gold to-amber-600 text-navy shadow-[0_4px_16px_rgba(212,175,55,0.5)]'
                        : 'bg-white/[0.06] text-white/70 ring-1 ring-white/10 group-hover:bg-gold/15 group-hover:text-gold group-hover:ring-gold/35 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="flex-1 text-right leading-tight">{item.label}</span>
                  {/* 🛡️ v6.9.3 — النبضة الذهبية: نقطة ملكية نابضة تجذب العين لقسم
                      فيه قرار بانتظار صاحبه (اتفاق تعديل العقد) */}
                  {item.pulse && (
                    <span className="relative ms-auto flex w-3 h-3 flex-shrink-0" aria-hidden>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-br from-amber-200 via-gold to-amber-600 ring-1 ring-white/40 shadow-[0_0_10px_rgba(212,175,55,0.7)]" />
                    </span>
                  )}
                  {/* ⚡ v6.6 — العداد الملكي: شارة ذهبية متوهجة تظهر عند وصول إشعار جديد
                      لهذا القسم، وتنبض ثلاث نبضات راقية ثم تستقر — فاخرة جداً */}
                  {(() => {
                    const c = notifCounts[item.id] || 0
                    if (c <= 0) return null
                    return (
                      <span
                        key={`${item.id}:${c}`}
                        className="fia-nav-count relative ms-auto inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-gradient-to-br from-amber-200 via-gold to-amber-600 text-navy text-xs font-black leading-none tabular-nums ring-1 ring-white/50 shadow-[0_0_14px_rgba(212,175,55,0.55),0_2px_6px_rgba(11,22,53,0.35)]"
                      >
                        <span className="fia-count-halo absolute inset-0 rounded-full bg-gold/50" />
                        <span className="relative drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">{c > 99 ? '99+' : c}</span>
                      </span>
                    )
                  })()}
                </button>
              )
            })}
            {gi < groupedNav.length - 1 && group.name && groupedNav[gi + 1]?.name && (
              <div className="mx-3 my-1 h-px bg-white/[0.04]" />
            )}
          </div>
        ))}
      </nav>

      {/* Logout button */}
      <div className="p-3 border-t border-gold/25 relative">
        <Button
          onClick={() => {
            logout()
            toast.success('تم تسجيل الخروج')
          }}
          variant="ghost"
          className="w-full text-white/70 hover:text-red-400 hover:bg-red-500/10 justify-start rounded-2xl text-[15px] font-semibold py-3"
        >
          <LogOut className="w-5 h-5 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar — ⚡ v6.7 مُكبّرة: 280px لاحتضان الشرائح الذهبية والعدادات */}
      <aside className="hidden lg:block w-[280px] bg-navy flex-shrink-0 sticky top-0 h-screen">
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
        <SheetContent side="right" className="bg-navy p-0 w-[300px] max-w-[88vw]">
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
              {/* 👑 v10.16 — زر «التحديثات» الملكي: يفتح بطاقة التحديث الملكية المتحركة
                  على الطلب في كل اللوحات (تطبيق/متصفح) — حتى تكون الميزة مرئية ومجرّبة دائماً */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl border border-gold/35 bg-gold/[0.07] hover:bg-gold/15 hover:border-gold/60 text-navy font-extrabold px-2.5 sm:px-3 shadow-sm"
                title="بطاقة التحديث — فحص أحدث إصدار"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('fia-check-updates'))
                  toast('جاري الفحص الفعلي من خوادم الأكاديمية…', { description: 'الحقيقة الكاملة خلال لحظات: محدّث أم تحديث جديد بمميزاته' })
                }}
              >
                <RefreshCw className="w-4 h-4 text-gold sm:ml-1.5" />
                <span className="hidden sm:inline text-[12px]">التحديثات</span>
              </Button>
              <NotificationsBell />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {/* 👑 v10.6.1 — شريط العرض الفاخر: يظهر في كل الحسابات فور تفعيله من الإعدادات */}
          <LuxOfferBar />
          {children}
        </main>

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
