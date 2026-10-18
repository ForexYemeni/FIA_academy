'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Bell, Volume2, CheckCircle2, X, BellRing,
} from 'lucide-react'
import { toast } from 'sonner'
import { unlockAudio, setMuted, isMuted } from '@/lib/sounds'
import { isAndroidWebView } from '@/lib/certificate-download'

const STORAGE_KEY = 'fia-notifications-opted-in'
// We show the prompt after a short delay so the user isn't bombarded
// the moment they land — they've had time to see the app.
const PROMPT_DELAY_MS = 4000

/**
 * One-time prompt that asks the user to enable sound + browser
 * notifications. Shown on first visit (or until the user explicitly
 * approves/dismisses). When approved, requests Notification.permission,
 * unlocks audio, and saves the preference so the prompt doesn't show
 * again. The actual notification delivery still happens via the
 * NotificationsBell component (which uses Supabase Realtime + polling).
 *
 * IMPORTANT: In the FIA Android APK (WebView), the browser Notification
 * API is NOT supported — `Notification.requestPermission()` returns
 * 'denied' or throws, and `new Notification(...)` silently fails. The
 * APK has its own native notification system (NotificationPollService +
 * OneSignal SDK). So we skip this prompt entirely inside the APK to
 * avoid asking for a permission that doesn't work and showing the user
 * an error. In regular browsers (Chrome / Firefox / Safari / Edge on
 * desktop), the prompt works as expected.
 */
export function NotificationOptInPrompt() {
  const [open, setOpen] = useState(false)

  // Show the prompt after a delay, but only if:
  //   - The user hasn't opted-in/dismissed previously
  //   - We're NOT running inside the FIA APK WebView (where the
  //     browser Notification API doesn't work anyway)
  useEffect(() => {
    // Skip entirely inside the APK — the APK has its own native
    // notification system (NotificationPollService + OneSignal) and
    // the browser Notification API just shows an error popup.
    if (isAndroidWebView()) return
    let opted = '0'
    try { opted = localStorage.getItem(STORAGE_KEY) || '0' } catch {}
    if (opted === '1') {
      // Already opted in — unlock audio just in case
      unlockAudio()
      return
    }
    const t = setTimeout(() => setOpen(true), PROMPT_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  // If the user previously opted in (in a regular browser), also try
  // to request Notification permission on first load (silently — if
  // already granted, this is a no-op). Skip this entirely inside the
  // APK WebView where the API doesn't work.
  useEffect(() => {
    if (isAndroidWebView()) return
    let opted = '0'
    try { opted = localStorage.getItem(STORAGE_KEY) || '0' } catch {}
    if (opted === '1' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { Notification.requestPermission() } catch {}
    }
  }, [])

  const handleApprove = async () => {
    // 1) Unlock audio (Web Audio API requires a user gesture on
    //    iOS Safari + most desktop browsers will resume a suspended
    //    AudioContext).
    unlockAudio()
    // 2) Un-mute sounds (in case the user previously muted).
    setMuted(false)
    // 3) Request browser notification permission. In a regular
    //    browser, this shows the native permission popup. Inside
    //    the APK WebView, this call is skipped because the prompt
    //    itself is never shown there.
    if (!isAndroidWebView() && typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          // Send a test notification to confirm it's working
          try {
            new Notification('تم تفعيل الإشعارات ✅', {
              body: 'ستصلك الإشعارات والنغمات الصوتية فور وصولها.',
              icon: '/fia/logo-fia.png',
            })
          } catch {}
        }
      } catch {}
    }
    // 4) Save the opt-in so we don't prompt again.
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setOpen(false)
    toast.success('تم تفعيل الإشعارات الصوتية والمنبثقة ✓')
  }

  const handleDismiss = () => {
    // Persist dismissal so we never bother the user again.
    try { localStorage.setItem(STORAGE_KEY, '0') } catch {}
    setOpen(false)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); else setOpen(o) }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy">
            <BellRing className="w-5 h-5 text-gold animate-swing" />
            تفعيل الإشعارات الصوتية والمنبثقة
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Hero icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-lg">
              <BellRing className="w-10 h-10 text-gold" />
            </div>
          </div>

          {/* Description */}
          <div className="text-center space-y-2">
            <p className="text-sm text-navy font-bold">
              ابقَ على اطلاع بكل تحدّث في المنصة
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              عند موافقتك، ستتلقى إشعارات منبثقة + نغمات صوتية مميزة عند:
              طلبات الدفع، طلبات الشهادات، تأكيدات الدفع، إكمال الدورات،
              التقييمات، المواضيع الجديدة، وأكثر.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 border border-gold/30 rounded-full">
              <Volume2 className="w-3 h-3 text-gold" />
              <span className="text-[10px] font-bold text-navy">نغمات احترافية</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
              <Bell className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-bold text-navy">إشعارات منبثقة</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span className="text-[10px] font-bold text-navy">توصيل فوري</span>
            </div>
          </div>

          {/* Privacy note */}
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            🔒 لن نرسل لك أي إعلانات أو رسائل ترويجية — فقط الإشعارات المتعلقة بنشاطك في الأكاديمية. يمكنك كتم الأصوات أو إيقاف الإشعارات في أي وقت من زر الجرس.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1"
          >
            ليس الآن
          </Button>
          <Button
            onClick={handleApprove}
            className="flex-1 bg-navy hover:bg-navy-light text-gold"
          >
            <Bell className="w-4 h-4 ml-1" /> تفعيل الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

