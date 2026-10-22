'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell, CheckCircle2, Clock, MessageSquare, Star, CreditCard, Users,
  AlertCircle, Award, Mail, Newspaper, Trophy, GraduationCap,
  Volume2, VolumeX, X, BellRing, Trash2, Play, Loader2, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { supabasePublic } from '@/lib/supabase'
import { publishNotifications } from '@/lib/notification-counts'
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
  // ⚡ ROYAL v4.4 — عرض تفصيلي فاخر: كل إشعار "يفتح" دائماً عند الضغط عليه —
  // إشعار بلا رابط يُعرض كاملاً في بطاقة ملكية بدل لا شيء.
  const [detail, setDetail] = useState<any>(null)
  const ref = useRef<HTMLDivElement>(null)
  // ⚡ Track recently announced notification IDs to prevent duplicates.
  // Both the Realtime subscription AND the polling fallback call
  // announceNotification(). Without dedup, the same notification would
  // fire TWO browser notifications + TWO toasts + TWO sounds.
  // We use a ref (not state) so it doesn't trigger re-renders.
  const recentlyAnnouncedRef = useRef<Set<string>>(new Set())

  // ⚡ v6.6 — عدادات القائمة الجانبية الملكية: نشر حالة الإشعارات إلى
  // المخزن المشترك (notification-counts) عند كل تغيير — جلب أولي،
  // Realtime (INSERT/UPDATE/DELETE)، التحديثات التفاؤلية عند الفتح/التعليم،
  // والحذف. بلا أي طلب شبكي إضافي — القائمة الجانبية تقرأ من هنا.
  useEffect(() => {
    publishNotifications(items)
  }, [items])
  // ⚡ Ref for the initialFallback timer so the subscribe() callback
  // can cancel it when Realtime connects. Without this, polling would
  // restart 5s after mount even though Realtime is working, causing
  // duplicate notifications + wasted API calls.
  const initialFallbackRef = useRef<any>(null)

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

  // Helper — fire external notification for a new notification object.
  // ⚡ USER REQUESTED: NO in-app toasts. ONLY external native OS
  // notifications (shown in the notification shade, even when the app
  // is fully closed). No sound, no in-app toast — only the native
  // notification via the APK bridge + Service Worker.
  //
  // In the FIA APK, the NotificationPollService (Kotlin foreground
  // service) polls the backend and fires native OS notifications on
  // every new item. So we DON'T need to fire a duplicate notification
  // from the web side here — that would cause duplicates.
  //
  // For regular browsers (no APK), we still fire a browser
  // notification via the Service Worker. This is shown in the OS
  // notification shade (Windows) or banner (macOS) — not as an in-app
  // toast.
  const announceNotification = (n: any) => {
    // ⚡ NO in-app toast — user explicitly requested.
    // ⚡ NO sound — user explicitly requested.
    // ⚡ ONLY external browser notification via Service Worker (for
    // regular browsers, NOT APK — APK uses NotificationPollService).
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
            // ⚡ Dedup: skip notifications that were already announced by
            // the Realtime subscription. We track announced IDs in a ref.
            for (const n of fresh) {
              if (!recentlyAnnouncedRef.current.has(n.id)) {
                recentlyAnnouncedRef.current.add(n.id)
                // Cleanup: keep only the last 100 IDs to avoid unbounded growth
                // (raised from 50 to 100 to reduce the risk of losing
                // announcements if 50+ notifications arrive in quick succession)
                if (recentlyAnnouncedRef.current.size > 100) {
                  const arr = Array.from(recentlyAnnouncedRef.current)
                  recentlyAnnouncedRef.current = new Set(arr.slice(-100))
                }
                announceNotification(n)
              }
            }
          } else {
            // ⚡ First load (prev was empty). Mark ALL existing items as
            // already announced so we DON'T fire popups for old notifications
            // the user has already seen. This prevents a flood of popups
            // when the user re-opens the app after being away.
            // But if there are notifications newer than the last time the
            // user visited (tracked via localStorage 'lastNotifSeen'),
            // we DO announce those — BUT ONLY THE MOST RECENT ONE to avoid
            // a barrage of sounds/vibrations/toasts when multiple unread
            // notifications accumulated while the user was away.
            const lastSeen = (() => {
              try { return localStorage.getItem('fia-last-notif-seen') || '' } catch { return '' }
            })()
            let lastSeenDate = 0
            try { lastSeenDate = lastSeen ? new Date(lastSeen).getTime() : 0 } catch {}
            let newestToAnnounce: any = null
            for (const n of newItems) {
              recentlyAnnouncedRef.current.add(n.id)
              // Track the MOST RECENT notification newer than lastSeen
              const nDate = n.created_at ? new Date(n.created_at).getTime() : 0
              if (nDate > lastSeenDate && lastSeenDate > 0) {
                if (!newestToAnnounce || nDate > (newestToAnnounce.created_at ? new Date(newestToAnnounce.created_at).getTime() : 0)) {
                  newestToAnnounce = n
                }
              }
            }
            // Announce ONLY the most recent new notification (not all of them)
            if (newestToAnnounce) {
              announceNotification(newestToAnnounce)
            }
            // Cleanup
            if (recentlyAnnouncedRef.current.size > 100) {
              const arr = Array.from(recentlyAnnouncedRef.current)
              recentlyAnnouncedRef.current = new Set(arr.slice(-100))
            }
            // Save the most recent notification's created_at as lastSeen
            const mostRecent = newItems[0]  // newest first (sorted by API)
            if (mostRecent?.created_at) {
              try { localStorage.setItem('fia-last-notif-seen', mostRecent.created_at) } catch {}
            }
          }
          return newItems
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  // ⚡ INSTANT REAL-TIME: Subscribe to notifications for this user.
  // Polling is now a FALLBACK that only kicks in if Realtime fails.
  // This eliminates the 15s delay between new notification and UI update.
  useEffect(() => {
    if (!user?.id) return
    let interval: any
    let channel: any
    let retryCount = 0

    // Initial load
    load()

    const startPolling = () => {
      if (interval) return
      // Poll only when Realtime is broken (less frequently: every 30s)
      interval = setInterval(load, 30000)
    }

    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null }
    }

    try {
      channel = supabasePublic
        .channel('notifications:' + user.id)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            const n = payload.new
            setItems((prev) => [n, ...prev].slice(0, 50))
            // ⚡ Dedup: skip if this notification was already announced
            // (e.g. by the polling fallback that ran 50ms earlier).
            if (recentlyAnnouncedRef.current.has(n.id)) return
            recentlyAnnouncedRef.current.add(n.id)
            // Cleanup: keep only the last 100 IDs (raised from 50)
            if (recentlyAnnouncedRef.current.size > 100) {
              const arr = Array.from(recentlyAnnouncedRef.current)
              recentlyAnnouncedRef.current = new Set(arr.slice(-100))
            }
            // Update lastSeen in localStorage so the polling fallback
            // doesn't re-announce this notification on the next load()
            if (n.created_at) {
              try { localStorage.setItem('fia-last-notif-seen', n.created_at) } catch {}
            }
            announceNotification(n)
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            setItems((prev) => prev.map((n) => n.id === payload.new.id ? { ...n, ...payload.new } : n))
          }
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            setItems((prev) => prev.filter((n) => n.id !== payload.old.id))
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            // ⚡ Realtime is working — STOP polling AND cancel the
            // initialFallback timeout. Without canceling the fallback,
            // polling would restart after 5s even though Realtime is
            // connected, causing duplicate notifications + slowness.
            stopPolling()
            if (initialFallbackRef.current) {
              clearTimeout(initialFallbackRef.current)
              initialFallbackRef.current = null
            }
            retryCount = 0
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Realtime failed — start polling as fallback
            startPolling()
            retryCount++
          }
        })
    } catch {
      // If subscribe throws, use polling
      startPolling()
    }

    // ⚡ Initial safety: start polling after 5s ONLY if Realtime hasn't
    // confirmed yet. We store the timer in a ref so the subscribe()
    // callback can cancel it when Realtime connects.
    initialFallbackRef.current = setTimeout(() => {
      // Only start polling if we're not already polling AND Realtime
      // hasn't connected (interval is null means Realtime stopped it
      // OR it was never started).
      if (!interval) {
        interval = setInterval(load, 60000)
      }
    }, 5000)

    return () => {
      try { supabasePublic.removeChannel(channel) } catch {}
      stopPolling()
      if (initialFallbackRef.current) {
        clearTimeout(initialFallbackRef.current)
        initialFallbackRef.current = null
      }
    }
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

  // ⚡ ROYAL v4.4 — عند إغلاق اللوحة نعود دائماً من العرض التفصيلي للقائمة
  useEffect(() => {
    if (!open) setDetail(null)
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

  // ⚡ ROYAL v4.4 — فتح إشعار: كل ضغطة تفتح شيئاً دائماً:
  //  • إشعار له رابط → يُعلّم مقروءاً + ينتقل فوراً (ويُغلق اللوحة)
  //  • إشعار بلا رابط → يُعلّم مقروءاً + يُعرض كاملاً في بطاقة تفصيلية ملكية
  //  (لا يبقى أي إشعار "لا يفتح" أبداً — والتحديث للحالة محلي فوري)
  const openNotification = (n: any) => {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      }).catch(() => {})
    }
    if (n.link) {
      setDetail(null)
      setOpen(false)
      navigateToLink(n.link)
    } else {
      setDetail(n)
    }
  }

  if (!user) return null

  const latestId = items[0]?.id || 'none'

  return (
    <div className="relative flex-shrink-0 notifications-bell-container" ref={ref}>
      {/* ⚡ ROYAL v4.4 — جرس ملكي: توهّج ذهبي ناعم يتنفس + هزّة ترحيب راقية محدودة
          (تهتز مرات قليلة عند وصول إشعار جديد ثم ترتاح — لا اهتزاز دائم مزعج) */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load() }}
        aria-expanded={open}
        aria-label="الإشعارات"
        title="الإشعارات"
        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 hover:bg-gold/10"
      >
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-xl bg-gold/30 fia-bell-glow" />
        )}
        <Bell
          key={latestId}
          className={`relative w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-gold fia-bell-swing drop-shadow-[0_0_6px_rgba(212,175,55,0.45)]' : 'text-muted-foreground'}`}
        />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ⚡ ROYAL v4.4 — لوحة الإشعارات الملكية */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-[350px] max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl z-50 overflow-hidden border border-gold/40"
          style={{ animation: 'fiaBellSlide 0.2s ease-out', boxShadow: '0 24px 70px rgba(11, 22, 53, 0.3), 0 0 50px -12px rgba(212, 175, 55, 0.35), inset 0 1px 0 rgba(212,175,55,0.25)' }}
        >
          {/* شريط ذهبي علوي */}
          <div className="h-1 bg-gradient-to-l from-gold via-amber-300 to-gold" />

          {/* ⚡ الهيدر الملكي */}
          <div className="relative flex items-center justify-between p-3 bg-gradient-to-l from-navy via-navy-light to-navy text-white overflow-hidden">
            <div className="absolute inset-0 opacity-25" style={{
              backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
              backgroundSize: '24px 24px, 18px 18px'
            }} />
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-gold/15 rounded-full blur-2xl" />
            <div className="relative flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md flex-shrink-0 relative">
                <Bell className="w-4 h-4 text-navy" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-navy" />}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm leading-tight">{detail ? 'تفاصيل الإشعار' : 'مركز الإشعارات'}</h4>
                <p className="text-[9px] text-gold/70 font-bold">
                  {detail ? 'القاعة الملكية' : unreadCount > 0 ? `${unreadCount} غير مقروء من ${items.length}` : 'كل شيء مقروء ✓'}
                </p>
              </div>
            </div>
            <div className="relative flex items-center gap-0.5 flex-shrink-0">
              {/* Mute toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
                title={muted ? 'تفعيل الأصوات' : 'كتم الأصوات'}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5 text-white/60" /> : <Volume2 className="w-3.5 h-3.5 text-gold" />}
              </button>
              {/* Mark all as read */}
              {unreadCount > 0 && !detail && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="تعليم الكل كمقروء"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                </button>
              )}
              {/* Close */}
              <button
                type="button"
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
          {!isAndroidWebView() && notifPerm !== 'granted' && !detail && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); requestNotificationPermission() }}
              className="w-full p-3 bg-gradient-to-r from-gold/10 to-gold/5 border-b border-gold/20 hover:bg-gold/15 transition-colors flex items-center gap-3 text-right"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold to-yellow-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <BellRing className="w-4 h-4 text-navy fia-bell-swing" />
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
          {isAndroidWebView() && !detail && (
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
          {!audioUnlocked && !detail && (
            <div className="px-3 py-1.5 bg-blue-500/5 border-b border-blue-500/10 text-[10px] text-blue-600 text-center">
              💡 الصوت سيعمل عند أول نقرة في الصفحة
            </div>
          )}

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto lux-scrollbar">
            {detail ? (
              /* ⚡ ROYAL v4.4 — العرض التفصيلي الملكي: كل إشعار يُفتح كاملاً */
              <div className="fia-detail-in">
                <div className="p-3 border-b border-gold/15 bg-gradient-to-l from-gold/[0.06] to-transparent">
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-gold hover:text-navy transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> عودة لقائمة الإشعارات
                  </button>
                </div>
                <div className="p-5 text-center">
                  {(() => {
                    const Icon = TYPE_ICON[detail.type] || AlertCircle
                    const color = TYPE_COLOR[detail.type] || 'bg-muted text-muted-foreground'
                    const label = TYPE_LABEL[detail.type] || 'إشعار'
                    return (
                      <>
                        <div className="relative inline-block mb-3">
                          <div className="absolute inset-0 bg-gold/25 rounded-full blur-2xl animate-pulse" />
                          <div className={`relative w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg border-2 border-gold/40 ${color}`}>
                            <Icon className="w-8 h-8" />
                          </div>
                        </div>
                        <span className="inline-block text-[9px] font-extrabold rounded-full bg-gold/15 border border-gold/40 text-[#8a6d1d] px-2.5 py-0.5 mb-3">{label}</span>
                        <h5 className="text-sm font-extrabold text-navy leading-relaxed mb-2">{detail.title}</h5>
                        {detail.body && (
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-xl border border-border p-3 text-right">
                            {detail.body}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(detail.created_at).toLocaleString('ar-EG')}
                        </p>
                        {detail.link && (
                          <Button
                            size="sm"
                            onClick={() => { setDetail(null); setOpen(false); navigateToLink(detail.link) }}
                            className="mt-3 bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold rounded-xl"
                          >
                            فتح الهدف ←
                          </Button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                جاري تحميل الإشعارات...
              </div>
            ) : items.length === 0 ? (
              /* ⚡ العميل الفارغ الفاخر */
              <div className="p-10 text-center">
                <div className="relative inline-block mb-3">
                  <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                    <Bell className="w-8 h-8 text-gold" />
                  </div>
                </div>
                <p className="text-sm font-bold text-navy mb-1">لا توجد إشعارات</p>
                <p className="text-xs text-muted-foreground">ستظهر هنا التنبيهات الجديدة فور وصولها ✨</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((n, idx) => {
                  const Icon = TYPE_ICON[n.type] || AlertCircle
                  const color = TYPE_COLOR[n.type] || 'bg-muted text-muted-foreground'
                  const label = TYPE_LABEL[n.type] || 'إشعار'
                  const isUnread = !n.read_at
                  return (
                    <div
                      key={n.id}
                      className={`group relative w-full text-right p-3 pl-10 hover:bg-gold/[0.04] transition-colors flex items-start gap-3 cursor-pointer fia-item-in ${isUnread ? 'bg-gold/[0.06]' : ''}`}
                      style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
                      onClick={() => openNotification(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotification(n) } }}
                    >
                      {/* شريط ذهبي للإشعار غير المقروء */}
                      {isUnread && <span className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold to-amber-500" />}
                      {/* Delete button — appears on hover */}
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(e, n)}
                        className="absolute top-2 left-2 w-6 h-6 rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-500/10 transition-opacity flex items-center justify-center"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${color} ${isUnread ? 'border-gold/40 shadow-sm' : 'border-transparent opacity-80'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-extrabold text-gold/90 bg-gold/10 rounded-full px-1.5 py-0.5">{label}</span>
                          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {fmtRelative(n.created_at)}
                          </span>
                          {isUnread && <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mr-auto shadow-[0_0_6px_rgba(212,175,55,0.6)]" title="غير مقروء" />}
                        </div>
                        <h5 className="text-xs font-extrabold text-navy line-clamp-1 leading-snug mb-0.5">{n.title}</h5>
                        {n.body && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{n.body}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer — mark all read + delete all */}
          {items.length > 0 && !detail && (
            <div className="flex border-t border-gray-100 bg-gradient-to-l from-gold/[0.03] to-transparent">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex-1 p-2.5 text-center text-xs text-navy font-bold hover:bg-gold/10 transition-colors"
                >
                  ✓ تعليم الكل كمقروء
                </button>
              )}
              <button
                type="button"
                onClick={deleteAllNotifications}
                className="flex-1 p-2.5 text-center text-xs text-red-500 font-bold hover:bg-red-500/10 transition-colors border-r border-gray-100"
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
          {!detail && (
            <div className="flex gap-2 p-2 border-t border-gray-100 bg-gradient-to-r from-navy/5 to-gold/5">
              <button
                type="button"
                onClick={testSoundOnly}
                className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-navy py-2 px-2 rounded-lg bg-white border border-navy/20 hover:bg-navy/5 transition-colors"
                title="اختبر الصوت فقط"
              >
                <Volume2 className="w-3.5 h-3.5" /> اختبار الصوت
              </button>
              <button
                type="button"
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
          )}
        </div>
      )}
    </div>
  )
}
