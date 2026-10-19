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
const PROMPT_DELAY_MS = 4000

/**
 * One-time prompt that asks the user to enable sound + browser
 * notifications. Shown on first visit (or until the user explicitly
 * approves/dismisses). Professional design matching the rest of the
 * app's premium SaaS dialogs.
 *
 * Inside the FIA APK WebView, this prompt is SKIPPED entirely — the
 * APK has its own native notification system.
 */
export function NotificationOptInPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isAndroidWebView()) return
    let opted = '0'
    try { opted = localStorage.getItem(STORAGE_KEY) || '0' } catch {}
    if (opted === '1') {
      unlockAudio()
      return
    }
    const t = setTimeout(() => setOpen(true), PROMPT_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isAndroidWebView()) return
    let opted = '0'
    try { opted = localStorage.getItem(STORAGE_KEY) || '0' } catch {}
    if (opted === '1' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { Notification.requestPermission() } catch {}
    }
  }, [])

  const handleApprove = async () => {
    unlockAudio()
    setMuted(false)
    if (!isAndroidWebView() && typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          try {
            new Notification('تم تفعيل الإشعارات ✅', {
              body: 'ستصلك الإشعارات والنغمات الصوتية فور وصولها.',
              icon: '/fia/logo-fia.png',
            })
          } catch {}
        }
      } catch {}
    }
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setOpen(false)
    toast.success('تم تفعيل الإشعارات الصوتية والمنبثقة ✓')
  }

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '0') } catch {}
    setOpen(false)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); else setOpen(o) }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" showCloseButton={false}>
        {/* === Navy gradient header === */}
        <div className="bg-gradient-to-br from-navy to-navy-light px-6 pt-6 pb-5 text-center relative overflow-hidden">
          {/* Gold glow background */}
          <div className="absolute inset-0 opacity-20" style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(212,175,55,0.4) 0%, transparent 60%)'
          }} />
          {/* Icon */}
          <div className="relative w-16 h-16 mx-auto rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center mb-3">
            <BellRing className="w-8 h-8 text-gold animate-swing" />
          </div>
          {/* Title */}
          <h2 className="relative text-lg font-bold text-gold leading-tight mb-1">
            تفعيل الإشعارات الصوتية والمنبثقة
          </h2>
          <p className="relative text-xs text-white/60">
            ابقَ على اطلاع بكل تحدّث في المنصة
          </p>
        </div>

        {/* === White body === */}
        <div className="px-6 py-5 space-y-4">
          {/* Description */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            عند موافقتك، ستتلقى إشعارات منبثقة + نغمات صوتية مميزة عند:
            طلبات الدفع، طلبات الشهادات، تأكيدات الدفع، إكمال الدورات،
            التقييمات، المواضيع الجديدة، وأكثر.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-full">
              <Volume2 className="w-3 h-3 text-gold" />
              <span className="text-[10px] font-bold text-navy">نغمات احترافية</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full">
              <Bell className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-bold text-navy">إشعارات منبثقة</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span className="text-[10px] font-bold text-navy">توصيل فوري</span>
            </div>
          </div>

          {/* Privacy note */}
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            🔒 لن نرسل لك أي إعلانات أو رسائل ترويجية — فقط الإشعارات المتعلقة بنشاطك في الأكاديمية.
          </p>
        </div>

        {/* === Buttons === */}
        <div className="px-6 pb-6 pt-2 flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1 h-11 text-sm font-semibold rounded-xl"
          >
            ليس الآن
          </Button>
          <Button
            onClick={handleApprove}
            className="flex-1 h-11 text-sm font-bold rounded-xl bg-navy hover:bg-navy-light text-gold"
          >
            <Bell className="w-4 h-4 ml-1" /> تفعيل الآن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
