'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell, CheckCircle2, Clock, MessageSquare, Star, CreditCard, Users,
  AlertCircle, Award, Mail, Newspaper, Trophy, GraduationCap,
  Volume2, VolumeX, X, BellRing, Trash2, Play, Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { supabasePublic } from '@/lib/supabase'
import { playSoundForNotification, unlockAudio, isMuted, setMuted, tryUnlockAudio, isAudioReady } from '@/lib/sounds'
import { showNotificationToast } from '@/lib/notification-toast'
import { isAndroidWebView } from '@/lib/certificate-download'

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
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [notifPerm, setNotifPerm] = useState<string>('default')
  const ref = useRef<HTMLDivElement>(null)

  // Initialize muted state + audio unlock + notification permission
  useEffect(() => {
    // IMPORTANT: always reset the mute state on session start so the
    // user doesn't get stuck muted from a previous session.
    setMuted(false)
    setMutedState(false)
    if (typeof Notification !== 'undefined') {
      setNotifPerm(Notification.permission)
    }
    // Try to unlock audio on the FIRST user interaction — this is
    // critical for iOS Safari + most desktop browsers. We attach to
    // multiple events to be sure we catch a gesture.
    const unlock = () => {
      const ok = tryUnlockAudio()
      setAudioUnlocked(ok)
      // Remove all the gesture handlers once we've unlocked.
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('keydown', unlock)
    }
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  // Helper — fire sound + toast + browser notification for a new
  // notification object. Used by BOTH Realtime INSERT handler AND
  // the polling fallback, so the experience is identical.
  const announceNotification = (n: any) => {
    // 1) Sound — each type has a distinct professional tone.
    // Try to unlock audio first (in case it's still suspended).
    try {
      tryUnlockAudio()
      playSoundForNotification(n.type)
    } catch {}
    // 2) In-app professional toast with per-type styling.
    try { showNotificationToast(n) } catch {}
    // 3) External browser notification via Service Worker.
    //    Service Worker showNotification is MORE RELIABLE than
    //    new Notification() — it works on mobile Chrome, Android,
    //    desktop, and even when the tab is in the background. It
    //    also gives us proper click handling + vibration.
    try {
      const payload = { type: 'SHOW_NOTIFICATION', title: n.title, body: n.body, link: n.link, tag: n.id }
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Send to the active SW
        navigator.serviceWorker.controller.postMessage(payload)
      } else if ('serviceWorker' in navigator) {
        // SW registered but not controlling yet — register + send
        navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage(payload)
          // Also try direct registration.showNotification as a fallback
          try {
            reg.showNotification(n.title, {
              body: n.body || '',
              icon: '/fia/logo-fia.png',
              badge: '/fia/favicon.svg',
              tag: n.id,
              data: { link: n.link || '/' },
              dir: 'rtl',
              lang: 'ar',
            } as any)
          } catch {}
        })
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // Fallback: classic Notification API (works on desktop only)
        const notif = new Notification(n.title, {
          body: n.body || '',
          icon: '/fia/logo-fia.png',
          tag: n.id,
          dir: 'rtl',
          lang: 'ar',
        })
        notif.onclick = () => {
          window.focus()
          if (n.link) window.location.href = n.link
          notif.close()
        }
      }
    } catch {}
  }

  // === TEST NOTIFICATION BUTTON ===
  // Sends a test notification to the current user via the API. The
  // notification is inserted into the DB, which fires:
  //   - Supabase Realtime INSERT event (instant delivery)
  //   - Polling fallback detects the new ID (within 15s)
  // Either path triggers announceNotification() → sound + toast +
  // browser notification. This lets the user verify the entire
  // pipeline works end-to-end.
  const [testing, setTesting] = useState(false)
  const sendTestNotification = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً')
      return
    }
    setTesting(true)
    // Unlock audio right now (this click counts as a user gesture)
    tryUnlockAudio()
    setAudioUnlocked(true)

    // If browser notification permission isn't granted yet, request
    // it NOW. The user just clicked a button, which counts as an
    // "active user gesture" — exactly when browsers will accept a
    // Notification.requestPermission() call.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission()
        setNotifPerm(perm)
        if (perm === 'granted') {
          toast.success('تم منح إذن الإشعارات المنبثقة ✓')
        } else if (perm === 'denied') {
          toast.error('تم رفض الإذن — يمكنك تفعيله لاحقاً من إعدادات المتصفّح')
        }
      } catch {}
    }

    try {
      // 1) Send the test notification via API
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل إرسال الإشعار')
        return
      }
      // 2) Immediately fire the announcement locally (so the user
      //    doesn't have to wait for Realtime/polling). This proves
      //    that sound + toast + browser notification all work.
      const testNotif = {
        id: data.id || `test-${Date.now()}`,
        type: 'system',
        title: '🔔 اختبار الإشعارات',
        body: 'تم استلام هذا الإشعار بنجاح! إن كنت تراه + تسمع النغمة، فالنظام يعمل بشكل صحيح.',
        link: '/',
      }
      announceNotification(testNotif)
      // 3) Also reload notifications to pick up the new row
      setTimeout(load, 200)
      // 4) Show a status toast about browser notifications
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        toast.success('تم إرسال إشعار الاختبار — تحقق من الإشعار المنبثق الخارجي')
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        toast.warning('الإشعار المنبثق الخارجي مُعطّل — فعّله من إعدادات المتصفّح لرؤية الإشعارات خارج التطبيق')
      }
    } catch (err) {
      toast.error('خطأ في الاتصال')
    } finally {
      setTesting(false)
    }
  }

  // === TEST SOUND ONLY BUTTON ===
  // Just plays a tone — no DB write, no toast. Useful for isolating
  // whether sound works at all (vs. the rest of the pipeline).
  const testSoundOnly = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Force-unlock audio + try to play
    const unlocked = tryUnlockAudio()
    setAudioUnlocked(unlocked)
    // Use the 'default' chime
    import('@/lib/sounds').then(({ playSound }) => {
      const played = playSound('default')
      if (played) {
        toast.success('تم تشغيل الصوت ✓')
      } else {
        toast.error('لم يُشغّل الصوت — انقر في أي مكان بالصفحة أولاً ثم حاول مرة أخرى')
      }
    })
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next) {
      unlockAudio()
      setAudioUnlocked(true)
    }
    toast.success(next ? 'تم كتم الأصوات' : 'تم تفعيل الأصوات ✓')
  }

  // Re-trigger the browser notification permission request directly
  // from the bell dropdown (for users who dismissed the opt-in card).
  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('المتصفح لا يدعم الإشعارات المنبثقة')
      return
    }
    if (Notification.permission === 'granted') {
      toast.success('الإشعارات المنبثقة مُفعّلة ✓')
      setNotifPerm('granted')
      // Send a test notification
      try {
        new Notification('الإشعارات مُفعّلة', {
          body: 'ستصلك الإشعارات المنبثقة فور وصولها.',
          icon: '/fia/logo-fia.png',
        })
      } catch {}
      return
    }
    if (Notification.permission === 'denied') {
      toast.error('تم رفض الإذن مسبقاً من المتصفح — يرجى تفعيله من إعدادات الموقع')
      return
    }
    try {
      const perm = await Notification.requestPermission()
      setNotifPerm(perm)
      if (perm === 'granted') {
        toast.success('تم تفعيل الإشعارات المنبثقة ✓')
        try {
          new Notification('تم التفعيل بنجاح', {
            body: 'ستصلك الإشعارات والنغمات الصوتية فور وصولها.',
            icon: '/fia/logo-fia.png',
          })
        } catch {}
        // Also unlock audio + clear mute
        unlockAudio()
        setAudioUnlocked(true)
        setMuted(false)
        setMutedState(false)
      } else if (perm === 'denied') {
        toast.error('تم رفض الإذن — يمكنك تفعيله لاحقاً من إعدادات المتصفح')
      }
    } catch {
      toast.error('فشل طلب الإذن')
    }
  }

  const load = () => {
    if (!user?.id) return
    fetch(`/api/notifications?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        const newItems = Array.isArray(d) ? d : []
        // Detect new notifications by comparing prev IDs vs new IDs.
        // If new IDs appeared since last load, fire sound + toast +
        // browser notification. This is the FALLBACK for when Supabase
        // Realtime isn't reachable — guarantees delivery.
        setItems((prev) => {
          if (prev.length > 0) {
            const prevIds = new Set(prev.map(n => n.id))
            const fresh = newItems.filter(n => !prevIds.has(n.id))
            for (const n of fresh) announceNotification(n)
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

  // Real-time subscription for instant delivery (sub-second latency).
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
            announceNotification(n)
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

  // Delete a single notification
  const deleteNotification = async (e: React.MouseEvent, n: any) => {
    e.stopPropagation()
    setItems((prev) => prev.filter((x) => x.id !== n.id))
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      })
    } catch {}
  }

  // Delete ALL notifications
  const deleteAllNotifications = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!user?.id) return
    const ids = items.map((n) => n.id)
    setItems([])
    try {
      for (const id of ids) {
        await fetch('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
      }
    } catch {}
  }

  // Navigate to a notification link.
  // For same-path hash-only links like `/#courses`, setting
  // `window.location.href` correctly updates the URL bar and fires
  // `hashchange` (browsers special-case this — no reload happens if
  // only the hash differs). The dashboard's `useHashTab` hook listens
  // for that event and switches tabs.
  // For the edge case where the user clicks the same notification twice
  // (same hash → no `hashchange` fires), we manually dispatch one.
  const navigateToLink = (link?: string | null) => {
    if (!link) return
    try {
      const url = new URL(link, window.location.origin)
      const samePath = url.pathname === window.location.pathname
      const hasHash = url.hash && url.hash.length > 1
      if (samePath && hasHash && url.hash === window.location.hash) {
        // Same hash → browser won't fire `hashchange`. Force-fire.
        window.dispatchEvent(new HashChangeEvent('hashchange'))
        return
      }
      // Different path, different hash, or no hash — let the browser handle it
      window.location.href = link
    } catch {
      window.location.href = link
    }
  }

  const markOneRead = async (n: any) => {
    if (n.read_at) {
      // Already read — navigate if there's a link
      navigateToLink(n.link)
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
    navigateToLink(n.link)
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

          {/* === Enable-notifications banner (only if not yet granted AND
              we're NOT in the FIA APK WebView — inside the APK, the
              browser Notification API doesn't work, so we hide this
              banner entirely. The APK has its own native notification
              system (NotificationPollService + OneSignal) which is
              always active when the user installs the app.) === */}
          {!isAndroidWebView() && notifPerm !== 'granted' && (
            <button
              onClick={(e) => { e.stopPropagation(); requestNotificationPermission() }}
              className="w-full p-3 bg-gradient-to-r from-gold/10 to-gold/5 border-b border-gold/20 hover:bg-gold/15 transition-colors flex items-center gap-3 text-right"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold to-yellow-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <BellRing className="w-4 h-4 text-navy animate-swing" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-navy">فعّل الإشعارات الصوتية والمنبثقة</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">اضغط هنا لتفعيل التوصيل الفوري</p>
              </div>
              <span className="text-gold text-xs font-bold">تفعيل ←</span>
            </button>
          )}
          {/* === APK-specific banner — replaces the "enable browser
              notifications" banner inside the FIA APK. Tells the user
              that notifications are handled natively by the app. === */}
          {isAndroidWebView() && (
            <div className="w-full p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 border-b border-green-500/20 flex items-center gap-3 text-right">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <BellRing className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-navy">الإشعارات مُفعّلة ✓</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">يعمل التطبيق على توصيل الإشعارات تلقائياً عبر نظام الإشعارات الأصلي</p>
              </div>
            </div>
          )}

          {/* === Audio-unlocked indicator (subtle, only when not unlocked) === */}
          {!audioUnlocked && (
            <div className="px-3 py-1.5 bg-blue-500/5 border-b border-blue-500/10 text-[10px] text-blue-600 text-center">
              💡 الصوت سيعمل عند أول نقرة في الصفحة
            </div>
          )}

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
                    <div
                      key={n.id}
                      className={`group relative w-full text-right p-3 hover:bg-muted/40 transition-colors flex items-start gap-3 ${isUnread ? 'bg-gold/5' : ''}`}
                      onClick={() => markOneRead(n)}
                    >
                      {/* Delete button — appears on hover */}
                      <button
                        onClick={(e) => deleteNotification(e, n)}
                        className="absolute top-2 left-2 w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-opacity flex items-center justify-center"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer — mark all read + delete all */}
          {items.length > 0 && (
            <div className="flex border-t border-gray-100">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex-1 p-2.5 text-center text-xs text-navy font-semibold hover:bg-muted/40 transition-colors bg-muted/20"
                >
                  ✓ تعليم الكل كمقروء
                </button>
              )}
              <button
                onClick={deleteAllNotifications}
                className="flex-1 p-2.5 text-center text-xs text-red-500 font-semibold hover:bg-red-500/10 transition-colors border-r border-gray-100"
              >
                🗑 حذف الكل
              </button>
            </div>
          )}

          {/* === Diagnostic / Test buttons ===
              Lets the user verify that:
                1) The browser supports the Web Audio API (test sound)
                2) The full notification pipeline works end-to-end
                 (test notification — inserts to DB, fires Realtime +
                 polling, plays sound + toast + browser notif)
          */}
          <div className="flex gap-2 p-2 border-t border-gray-100 bg-gradient-to-r from-navy/5 to-gold/5">
            <button
              onClick={testSoundOnly}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-navy py-2 px-2 rounded-lg bg-white border border-navy/20 hover:bg-navy/5 transition-colors"
              title="اختبر الصوت فقط"
            >
              <Volume2 className="w-3.5 h-3.5" /> اختبار الصوت
            </button>
            <button
              onClick={sendTestNotification}
              disabled={testing}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white py-2 px-2 rounded-lg bg-gradient-to-r from-navy to-navy-light hover:opacity-90 transition-opacity disabled:opacity-50"
              title="اختبر الإشعار الكامل (صوت + toast + browser notification)"
            >
              {testing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري...</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> اختبار الإشعار</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
