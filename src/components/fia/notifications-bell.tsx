'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell, CheckCircle2, Clock, MessageSquare, Star, CreditCard, Users,
  AlertCircle, Award, Mail, Newspaper, Trophy, GraduationCap,
  Volume2, VolumeX, X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { supabasePublic } from '@/lib/supabase'
import { playSoundForNotification, unlockAudio, isMuted, setMuted } from '@/lib/sounds'

const TYPE_ICON: Record<string, any> = {
  enrollment: Users,
  review: Star,
  reply: MessageSquare,
  payment: CreditCard,
  affiliate: Users,
  system: AlertCircle,
  message: MessageSquare,
  welcome: GraduationCap,
  certificate: Award,
  completion: Trophy,
  contact: Mail,
  blog: Newspaper,
  registration: Users,
  forum: MessageSquare,
}

const TYPE_COLOR: Record<string, string> = {
  enrollment: 'bg-blue-500/15 text-blue-600',
  review: 'bg-gold/15 text-gold',
  reply: 'bg-green-500/15 text-green-600',
  payment: 'bg-purple-500/15 text-purple-600',
  affiliate: 'bg-orange-500/15 text-orange-600',
  system: 'bg-red-500/15 text-red-600',
  message: 'bg-navy/15 text-navy',
  welcome: 'bg-green-500/15 text-green-600',
  certificate: 'bg-gold/15 text-gold',
  completion: 'bg-emerald-500/15 text-emerald-600',
  contact: 'bg-blue-500/15 text-blue-600',
  blog: 'bg-navy/15 text-navy',
  registration: 'bg-blue-500/15 text-blue-600',
  forum: 'bg-purple-500/15 text-purple-600',
}

const TYPE_LABEL: Record<string, string> = {
  enrollment: 'تسجيل في دورة',
  review: 'تقييم جديد',
  reply: 'رد في المنتدى',
  payment: 'دفع',
  affiliate: 'تسويق بالعمولة',
  system: 'نظام',
  message: 'رسالة',
  welcome: 'ترحيب',
  certificate: 'شهادة',
  completion: 'إكمال دورة',
  contact: 'رسالة تواصل',
  blog: 'منشور جديد',
  registration: 'تسجيل مستخدم',
  forum: 'منتدى',
}

function fmtRelative(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return 'الآن'
    const min = Math.floor(sec / 60)
    if (min < 60) return `قبل ${min} دقيقة`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `قبل ${hr} ساعة`
    const day = Math.floor(hr / 24)
    if (day < 30) return `قبل ${day} يوم`
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
  } catch { return '' }
}

export function NotificationsBell() {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [muted, setMutedState] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Initialize muted state from localStorage + unlock audio on first
  // user interaction (mobile requires a gesture before audio plays).
  useEffect(() => {
    setMutedState(isMuted())
    const unlock = () => {
      unlockAudio()
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next) unlockAudio()
  }

  const load = () => {
    if (!user?.id) return
    fetch(`/api/notifications?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        const newItems = Array.isArray(d) ? d : []
        // Detect new notifications since the last load by comparing
        // unread counts. If unread went UP, that means a new
        // notification arrived — play sound + show toast + browser
        // notification. This is a fallback for when Supabase Realtime
        // isn't reachable.
        setItems((prev) => {
          const prevUnread = prev.filter(n => !n.read_at).length
          const newUnread = newItems.filter(n => !n.read_at).length
          if (newUnread > prevUnread && prev.length > 0) {
            // Find the newly-arrived notifications (those that aren't
            // in prev) and announce them.
            const prevIds = new Set(prev.map(n => n.id))
            const fresh = newItems.filter(n => !prevIds.has(n.id))
            for (const n of fresh) {
              playSoundForNotification(n.type)
              toast(n.title, { description: n.body, duration: 5000 })
              try {
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                  new Notification(n.title, {
                    body: n.body || '',
                    icon: '/fia/logo-fia.png',
                    tag: n.id,
                  })
                }
              } catch {}
            }
          }
          return newItems
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Poll every 15s as a fallback when Realtime isn't reachable.
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Real-time subscription for instant delivery
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    try {
      channel = supabasePublic
        .channel('notifications:' + user.id)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            const n = payload.new
            setItems((prev) => [n, ...prev].slice(0, 50))
            // Professional sound — each type has a distinct tone.
            playSoundForNotification(n.type)
            // Pop a toast notification too (uses the sonner library).
            toast(n.title, { description: n.body, duration: 5000 })
            // Browser native notification (if user granted permission)
            try {
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(n.title, {
                  body: n.body || '',
                  icon: '/fia/logo-fia.png',
                  tag: n.id,
                })
              }
            } catch {}
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id])

  // Close on outside click / Escape key
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', clickHandler)
      document.addEventListener('keydown', escHandler)
    }
    return () => {
      document.removeEventListener('mousedown', clickHandler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [open])

  const unread = items.filter((n) => !n.read_at)
  const unreadCount = unread.length

  const markAllRead = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!user?.id || unreadCount === 0) return
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
  }

  const markOneRead = async (n: any) => {
    if (n.read_at) {
      // Already read — navigate if there's a link
      if (n.link) window.location.href = n.link
      return
    }
    // Mark as read locally + via API
    setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      })
    } catch {}
    if (n.link) window.location.href = n.link
  }

  if (!user) return null

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      {/* Single bell button — mute toggle is inside the dropdown header */}
      <button
        onClick={() => { setOpen(!open); if (!open) load() }}
        className="relative w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        title="الإشعارات"
        aria-label="الإشعارات"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-navy' : 'text-muted-foreground'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — anchored to LEFT edge of bell so it extends
          RIGHT (toward screen center). Correct for RTL layouts where
          the bell sits on the left side of the navbar. */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-[340px] max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ animation: 'fiaBellSlide 0.18s ease-out' }}
        >
          {/* Header — navy gradient with title + actions */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-navy to-navy-light text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-gold flex-shrink-0" />
              <h4 className="font-bold text-sm">الإشعارات</h4>
              {unreadCount > 0 && (
                <span className="bg-gold text-navy text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Mute toggle */}
              <button
                onClick={toggleMute}
                className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
                title={muted ? 'تفعيل الأصوات' : 'كتم الأصوات'}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5 text-white/60" /> : <Volume2 className="w-3.5 h-3.5 text-gold" />}
              </button>
              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="تعليم الكل كمقروء"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                </button>
              )}
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
                title="إغلاق"
              >
                <X className="w-3.5 h-3.5 text-white/80" />
              </button>
            </div>
          </div>

          {/* Body — scrollable notifications list */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
                جاري تحميل الإشعارات...
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Bell className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-navy mb-1">لا توجد إشعارات</p>
                <p className="text-xs text-muted-foreground">ستظهر هنا التنبيهات الجديدة فور وصولها</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type] || AlertCircle
                  const color = TYPE_COLOR[n.type] || 'bg-muted text-muted-foreground'
                  const label = TYPE_LABEL[n.type] || 'إشعار'
                  const isUnread = !n.read_at
                  return (
                    <button
                      key={n.id}
                      onClick={() => markOneRead(n)}
                      className={`w-full text-right p-3 hover:bg-muted/40 transition-colors flex items-start gap-3 ${isUnread ? 'bg-gold/5' : ''}`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</span>
                          <span className="text-[10px] text-muted-foreground/70">•</span>
                          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {fmtRelative(n.created_at)}
                          </span>
                          {isUnread && <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mr-auto" title="غير مقروء" />}
                        </div>
                        <h5 className="text-xs font-bold text-navy line-clamp-1 leading-snug mb-0.5">{n.title}</h5>
                        {n.body && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{n.body}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer — link to mark all read */}
          {items.length > 0 && unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="w-full p-2.5 text-center text-xs text-navy font-semibold hover:bg-muted/40 transition-colors border-t border-gray-100 bg-muted/20"
            >
              ✓ تعليم الكل كمقروء
            </button>
          )}
        </div>
      )}
    </div>
  )
}
