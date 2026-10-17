'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCircle2, Clock, MessageSquare, Star, CreditCard, Users, AlertCircle, Award, BookOpen, FileText, Mail, Newspaper, Trophy, GraduationCap, Volume2, VolumeX } from 'lucide-react'
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
  enrollment: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  review: 'bg-gold/15 text-gold border-gold/30',
  reply: 'bg-green-500/15 text-green-600 border-green-500/30',
  payment: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  affiliate: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  system: 'bg-red-500/15 text-red-600 border-red-500/30',
  message: 'bg-navy/15 text-navy border-navy/30',
  welcome: 'bg-green-500/15 text-green-600 border-green-500/30',
  certificate: 'bg-gold/15 text-gold border-gold/30',
  completion: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  contact: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  blog: 'bg-navy/15 text-navy border-navy/30',
  registration: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  forum: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
}

export function NotificationsBell() {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [muted, setMutedState] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Initialize muted state from localStorage
  useEffect(() => {
    setMutedState(isMuted())
    // Try to unlock audio on first user interaction (mobile requires
    // a user gesture before audio can play).
    const unlock = () => { unlockAudio(); document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock) }
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next) unlockAudio() // unlock audio when user un-mutes
  }

  const load = () => {
    if (!user?.id) return
    fetch(`/api/notifications?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  useEffect(() => {
    load()
    // Poll every 15s for new notifications — fast enough that the user
    // sees new notifications quickly even if Supabase Realtime isn't
    // reachable. (Realtime is also subscribed below for instant
    // delivery when it works.)
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Real-time subscription via Supabase Realtime (if enabled on the table)
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
            // Professional sound notification — each type has its own
            // distinct tone (payment = coin chime, certificate = fanfare,
            // enrollment = welcoming chord, etc.)
            playSoundForNotification(n.type)
            toast(n.title, { description: n.body })
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = items.filter((n) => !n.read_at)
  const unreadCount = unread.length

  const markAllRead = async () => {
    if (!user?.id || unreadCount === 0) return
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
  }

  if (!user) return null

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      {/* Mute toggle — lets the user silence all sound notifications */}
      <button
        onClick={toggleMute}
        className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        title={muted ? 'تفعيل الأصوات' : 'كتم الأصوات'}
      >
        {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-navy" />}
      </button>
      <button
        onClick={() => { setOpen(!open); if (!open) load() }}
        className="relative w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] bg-white border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border bg-navy text-white">
            <h4 className="font-bold text-sm">الإشعارات</h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-gold hover:underline">
                  تعليم الكل كمقروء
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">جاري التحميل...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">لا توجد إشعارات</p>
              </div>
            ) : (
              items.map((n) => {
                const Icon = TYPE_ICON[n.type] || AlertCircle
                const color = TYPE_COLOR[n.type] || 'bg-muted text-muted-foreground'
                const isUnread = !n.read_at
                return (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer ${isUnread ? 'bg-gold/5' : ''}`}
                    onClick={() => {
                      if (n.link) window.location.href = n.link
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-navy line-clamp-1 flex-1">{n.title}</h5>
                          {isUnread && <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0" />}
                        </div>
                        {n.body && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {n.created_at ? new Date(n.created_at).toLocaleDateString('ar-EG') : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
