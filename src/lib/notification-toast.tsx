// Professional notification toast renderer — Ultra Premium iOS/Telegram style.
// Renders a rich, type-aware toast notification via sonner with:
//   - Glassmorphism effect (backdrop-blur)
//   - Gradient icon background with glow
//   - Clearer typography hierarchy
//   - Subtle slide-in animation
//   - FIA-themed colors (navy/gold)
//   - Action button "عرض"
//
// Used by the notifications bell so that incoming notifications look
// distinct + professional like iOS Telegram / WhatsApp notifications.

import { toast } from 'sonner'
import {
  Bell, CheckCircle2, CreditCard, Award, Trophy, GraduationCap,
  Mail, Newspaper, MessageSquare, Star, Users, AlertCircle,
  Sparkles,
} from 'lucide-react'
import * as React from 'react'

type ToastType =
  | 'enrollment' | 'payment' | 'certificate' | 'completion'
  | 'welcome' | 'contact' | 'blog' | 'registration' | 'forum'
  | 'review' | 'message' | 'reply' | 'affiliate' | 'system'
  | 'default'

const TYPE_ICON: Record<ToastType, any> = {
  enrollment: Users,
  payment: CreditCard,
  certificate: Award,
  completion: Trophy,
  welcome: GraduationCap,
  contact: Mail,
  blog: Newspaper,
  registration: Users,
  forum: MessageSquare,
  review: Star,
  message: MessageSquare,
  reply: MessageSquare,
  affiliate: Users,
  system: AlertCircle,
  default: Bell,
}

// ⚡ Premium gradient for each type — used for the icon background
// AND a subtle border-top accent. The icon itself gets a soft glow
// in the same color family.
const TYPE_THEME: Record<ToastType, {
  gradient: string
  glow: string
  accent: string
  badgeBg: string
  badgeText: string
}> = {
  enrollment: {
    gradient: 'from-blue-500 via-indigo-500 to-blue-600',
    glow: 'shadow-[0_0_24px_rgba(59,130,246,0.45)]',
    accent: 'bg-blue-500',
    badgeBg: 'bg-blue-500',
    badgeText: 'text-white',
  },
  payment: {
    gradient: 'from-emerald-500 via-green-500 to-teal-600',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.45)]',
    accent: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
  },
  certificate: {
    gradient: 'from-gold via-amber-500 to-yellow-500',
    glow: 'shadow-[0_0_24px_rgba(212,175,55,0.55)]',
    accent: 'bg-gold',
    badgeBg: 'bg-gradient-to-r from-gold to-amber-500',
    badgeText: 'text-navy',
  },
  completion: {
    gradient: 'from-emerald-600 via-green-600 to-emerald-700',
    glow: 'shadow-[0_0_24px_rgba(5,150,105,0.45)]',
    accent: 'bg-emerald-600',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
  },
  welcome: {
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.45)]',
    accent: 'bg-green-500',
    badgeBg: 'bg-green-500',
    badgeText: 'text-white',
  },
  contact: {
    gradient: 'from-blue-500 via-sky-500 to-cyan-500',
    glow: 'shadow-[0_0_24px_rgba(14,165,233,0.45)]',
    accent: 'bg-blue-500',
    badgeBg: 'bg-blue-500',
    badgeText: 'text-white',
  },
  blog: {
    gradient: 'from-navy via-navy-light to-indigo-900',
    glow: 'shadow-[0_0_24px_rgba(10,31,68,0.5)]',
    accent: 'bg-navy',
    badgeBg: 'bg-navy',
    badgeText: 'text-gold',
  },
  registration: {
    gradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
    glow: 'shadow-[0_0_24px_rgba(168,85,247,0.45)]',
    accent: 'bg-purple-500',
    badgeBg: 'bg-purple-500',
    badgeText: 'text-white',
  },
  forum: {
    gradient: 'from-indigo-500 via-purple-500 to-violet-600',
    glow: 'shadow-[0_0_24px_rgba(99,102,241,0.45)]',
    accent: 'bg-indigo-500',
    badgeBg: 'bg-indigo-500',
    badgeText: 'text-white',
  },
  review: {
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
    glow: 'shadow-[0_0_24px_rgba(250,204,21,0.45)]',
    accent: 'bg-yellow-400',
    badgeBg: 'bg-yellow-400',
    badgeText: 'text-yellow-900',
  },
  message: {
    gradient: 'from-navy via-blue-800 to-indigo-900',
    glow: 'shadow-[0_0_24px_rgba(10,31,68,0.5)]',
    accent: 'bg-navy',
    badgeBg: 'bg-navy',
    badgeText: 'text-white',
  },
  reply: {
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.45)]',
    accent: 'bg-green-500',
    badgeBg: 'bg-green-500',
    badgeText: 'text-white',
  },
  affiliate: {
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    glow: 'shadow-[0_0_24px_rgba(249,115,22,0.45)]',
    accent: 'bg-orange-500',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
  },
  system: {
    gradient: 'from-red-500 via-rose-500 to-red-600',
    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.45)]',
    accent: 'bg-red-500',
    badgeBg: 'bg-red-500',
    badgeText: 'text-white',
  },
  default: {
    gradient: 'from-navy via-navy-light to-navy',
    glow: 'shadow-[0_0_24px_rgba(10,31,68,0.5)]',
    accent: 'bg-navy',
    badgeBg: 'bg-navy',
    badgeText: 'text-gold',
  },
}

// ⚡ Labels for each type — shown as a small badge above the title
// to make the notification type instantly clear (e.g. "دفع", "شهادة",
// "تسجيل"). This matches the pattern Telegram uses for chat types.
const TYPE_LABEL: Record<ToastType, string> = {
  enrollment: 'تسجيل',
  payment: 'دفع',
  certificate: 'شهادة',
  completion: 'إكمال',
  welcome: 'ترحيب',
  contact: 'رسالة',
  blog: 'مدونة',
  registration: 'حساب',
  forum: 'منتدى',
  review: 'تقييم',
  message: 'رسالة',
  reply: 'رد',
  affiliate: 'تسويق',
  system: 'نظام',
  default: 'إشعار',
}

/**
 * Renders an ultra-premium rich toast notification for the given
 * notification object. Inspired by iOS Telegram / WhatsApp design:
 *
 *   - Glassmorphism container (backdrop-blur, semi-transparent white)
 *   - Large gradient icon (44x44) with soft glow shadow
 *   - Type label badge (e.g. "دفع") at the top
 *   - Bold dark title
 *   - Body text in muted gray (2-line max)
 *   - "عرض ←" CTA button (gradient navy/gold) when a link is provided
 *   - "الآن" timestamp badge
 *   - Subtle slide-in + fade animation via sonner
 *   - Close (×) button in the top-left corner
 */
export function showNotificationToast(n: { type?: string; title: string; body?: string | null; link?: string | null }) {
  const type = (n.type || 'default') as ToastType
  const Icon = TYPE_ICON[type] || TYPE_ICON.default
  const theme = TYPE_THEME[type] || TYPE_THEME.default
  const label = TYPE_LABEL[type] || TYPE_LABEL.default

  toast.custom(
    (t) => (
      <div
        className={`relative bg-white/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden w-[360px] max-w-[calc(100vw-24px)] cursor-pointer group`}
        style={{ animation: 'fia-notif-slidein 0.35s cubic-bezier(0.22,1,0.36,1)' }}
        onClick={() => {
          if (n.link) window.location.href = n.link
          toast.dismiss(t)
        }}
      >
        {/* ⚡ Top accent line (type color) */}
        <div className={`absolute top-0 right-0 left-0 h-1 ${theme.accent}`} />

        {/* ⚡ Glow background (subtle radial) */}
        <div className={`absolute -top-12 -right-12 w-32 h-32 ${theme.accent} opacity-10 rounded-full blur-3xl pointer-events-none`} />
        <div className={`absolute -bottom-12 -left-12 w-24 h-24 ${theme.accent} opacity-10 rounded-full blur-2xl pointer-events-none`} />

        {/* ⚡ Close button (top-left) */}
        <button
          onClick={(e) => { e.stopPropagation(); toast.dismiss(t) }}
          className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-muted-foreground hover:text-navy transition-all z-10"
          aria-label="إغلاق"
        >
          <span className="text-lg leading-none">×</span>
        </button>

        {/* ⚡ Main content — flex row */}
        <div className="relative p-3.5 pl-11 flex items-start gap-3">
          {/* Icon with gradient + glow */}
          <div className={`relative flex-shrink-0`}>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-md ${theme.glow} ring-1 ring-white/30`}>
              <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            {/* Small label dot under the icon (badge) */}
            <div className={`absolute -bottom-1 -left-1 px-1.5 py-0.5 ${theme.badgeBg} ${theme.badgeText} text-[9px] font-bold rounded-md border border-white shadow-sm`}>
              {label}
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-bold text-navy line-clamp-1 flex-1">{n.title}</p>
              <span className="text-[10px] text-muted-foreground/70 font-medium flex-shrink-0">الآن</span>
            </div>
            {n.body && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.body}</p>
            )}
            {/* ⚡ CTA button */}
            {n.link && (
              <button
                onClick={(e) => { e.stopPropagation(); if (n.link) window.location.href = n.link; toast.dismiss(t) }}
                className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-lg text-[11px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <Sparkles className="w-3 h-3" />
                عرض
              </button>
            )}
          </div>
        </div>

        {/* ⚡ Inline style for the slide-in animation */}
        <style jsx>{`
          @keyframes fia-notif-slidein {
            from {
              opacity: 0;
              transform: translateX(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }
        `}</style>
      </div>
    ),
    { duration: 6000, position: 'top-center' as any }
  )
}
