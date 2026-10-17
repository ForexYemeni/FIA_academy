// Professional notification toast renderer.
// Renders a rich, type-aware toast notification via sonner — each
// notification type (payment, certificate, enrollment, etc.) has its
// own icon, color, and styling. Used by the notifications bell so
// that incoming notifications look distinct + professional.

import { toast } from 'sonner'
import {
  Bell, CheckCircle2, CreditCard, Award, Trophy, GraduationCap,
  Mail, Newspaper, MessageSquare, Star, Users, AlertCircle,
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

const TYPE_THEME: Record<ToastType, {
  iconBg: string
  iconColor: string
  border: string
  bg: string
  titleColor: string
}> = {
  enrollment: {
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
    border: 'border-blue-500/40',
    bg: 'bg-gradient-to-br from-blue-50 to-white',
    titleColor: 'text-blue-700',
  },
  payment: {
    iconBg: 'bg-emerald-500',
    iconColor: 'text-white',
    border: 'border-emerald-500/40',
    bg: 'bg-gradient-to-br from-emerald-50 to-white',
    titleColor: 'text-emerald-700',
  },
  certificate: {
    iconBg: 'bg-gold',
    iconColor: 'text-navy',
    border: 'border-gold/40',
    bg: 'bg-gradient-to-br from-gold/10 to-white',
    titleColor: 'text-navy',
  },
  completion: {
    iconBg: 'bg-emerald-600',
    iconColor: 'text-white',
    border: 'border-emerald-600/40',
    bg: 'bg-gradient-to-br from-emerald-50 to-white',
    titleColor: 'text-emerald-800',
  },
  welcome: {
    iconBg: 'bg-green-500',
    iconColor: 'text-white',
    border: 'border-green-500/40',
    bg: 'bg-gradient-to-br from-green-50 to-white',
    titleColor: 'text-green-700',
  },
  contact: {
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
    border: 'border-blue-500/40',
    bg: 'bg-gradient-to-br from-blue-50 to-white',
    titleColor: 'text-blue-700',
  },
  blog: {
    iconBg: 'bg-navy',
    iconColor: 'text-gold',
    border: 'border-navy/40',
    bg: 'bg-gradient-to-br from-navy/5 to-white',
    titleColor: 'text-navy',
  },
  registration: {
    iconBg: 'bg-purple-500',
    iconColor: 'text-white',
    border: 'border-purple-500/40',
    bg: 'bg-gradient-to-br from-purple-50 to-white',
    titleColor: 'text-purple-700',
  },
  forum: {
    iconBg: 'bg-indigo-500',
    iconColor: 'text-white',
    border: 'border-indigo-500/40',
    bg: 'bg-gradient-to-br from-indigo-50 to-white',
    titleColor: 'text-indigo-700',
  },
  review: {
    iconBg: 'bg-yellow-500',
    iconColor: 'text-white',
    border: 'border-yellow-500/40',
    bg: 'bg-gradient-to-br from-yellow-50 to-white',
    titleColor: 'text-yellow-700',
  },
  message: {
    iconBg: 'bg-navy',
    iconColor: 'text-white',
    border: 'border-navy/40',
    bg: 'bg-gradient-to-br from-navy/5 to-white',
    titleColor: 'text-navy',
  },
  reply: {
    iconBg: 'bg-green-500',
    iconColor: 'text-white',
    border: 'border-green-500/40',
    bg: 'bg-gradient-to-br from-green-50 to-white',
    titleColor: 'text-green-700',
  },
  affiliate: {
    iconBg: 'bg-orange-500',
    iconColor: 'text-white',
    border: 'border-orange-500/40',
    bg: 'bg-gradient-to-br from-orange-50 to-white',
    titleColor: 'text-orange-700',
  },
  system: {
    iconBg: 'bg-red-500',
    iconColor: 'text-white',
    border: 'border-red-500/40',
    bg: 'bg-gradient-to-br from-red-50 to-white',
    titleColor: 'text-red-700',
  },
  default: {
    iconBg: 'bg-navy',
    iconColor: 'text-gold',
    border: 'border-navy/40',
    bg: 'bg-gradient-to-br from-navy/5 to-white',
    titleColor: 'text-navy',
  },
}

/**
 * Renders a professional rich toast notification for the given
 * notification object. Includes:
 *   - Type-specific icon in a colored rounded badge
 *   - Type-specific gradient background + border
 *   - Bold colored title
 *   - Body text in muted gray
 *   - Optional CTA button if a link is provided
 */
export function showNotificationToast(n: { type?: string; title: string; body?: string | null; link?: string | null }) {
  const type = (n.type || 'default') as ToastType
  const Icon = TYPE_ICON[type] || TYPE_ICON.default
  const theme = TYPE_THEME[type] || TYPE_THEME.default

  toast.custom(
    (t) => (
      <div
        className={`${theme.bg} ${theme.border} border-2 rounded-2xl shadow-2xl p-3 max-w-sm w-[340px] flex items-start gap-3 relative cursor-pointer`}
        onClick={() => {
          if (n.link) window.location.href = n.link
          toast.dismiss(t)
        }}
      >
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); toast.dismiss(t) }}
          className="absolute top-2 left-2 text-muted-foreground hover:text-navy w-5 h-5 rounded flex items-center justify-center"
        >
          ×
        </button>
        {/* Icon */}
        <div className={`${theme.iconBg} ${theme.iconColor} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
          <Icon className="w-5 h-5" />
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-xs font-bold ${theme.titleColor} line-clamp-1 mb-0.5`}>{n.title}</p>
          {n.body && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{n.body}</p>}
          {n.link && (
            <span className="text-[10px] text-blue-600 font-bold mt-1 inline-block">
              اضغط للمتابعة ←
            </span>
          )}
        </div>
      </div>
    ),
    { duration: 6000 }
  )
}
