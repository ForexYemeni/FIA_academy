"use client"

/**
 * 👑✨ مُركّب التوست الملكي — v10.11
 * بطاقة وسط الشاشة: أيقونة ملكية كبيرة + حلقة تقدم ذهبية + تعتيم سينمائي خفيف
 */

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
  FIA_TOAST_DURATION,
} from "@/components/ui/toast"
import { Crown, AlertTriangle } from "lucide-react"

/** محيط حلقة التقدم (r=30) — يطابق keyframes في الأسفل */
const RING_CIRC = 2 * Math.PI * 30

export function Toaster() {
  const { toasts } = useToast()
  const hasToasts = toasts.length > 0

  return (
    <ToastProvider>
      {/* ستارة التعتيم الملكية — بلا أي عرقلة للمس (pointer-events-none) */}
      <div
        aria-hidden
        className={`fixed inset-0 z-[99] pointer-events-none bg-navy/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          hasToasts ? "opacity-100" : "opacity-0"
        }`}
      />
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive"
        return (
          <Toast key={id} variant={variant} {...props}>
            {/* الأيقونة الملكية + حلقة التقدم الذهبية */}
            <div className="relative -mt-9 mb-3 w-[68px] h-[68px] flex-shrink-0" aria-hidden>
              {/* حلقة التقدم */}
              <svg viewBox="0 0 68 68" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" />
                <circle
                  cx="34" cy="34" r="30" fill="none"
                  stroke={isDestructive ? "#f87171" : "#D4AF37"}
                  strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  className="fia-toast-ring"
                  style={{ animationDuration: `${FIA_TOAST_DURATION}ms` }}
                />
              </svg>
              {/* قرص الأيقونة */}
              <div
                className={`absolute inset-[6px] rounded-full flex items-center justify-center border-2 border-white/25 shadow-lg ${
                  isDestructive
                    ? "bg-gradient-to-br from-red-500 via-red-600 to-red-800 shadow-[0_0_28px_rgba(239,68,68,0.5)]"
                    : "bg-gradient-to-br from-gold via-amber-400 to-amber-600 shadow-[0_0_28px_rgba(212,175,55,0.55)]"
                }`}
              >
                {isDestructive
                  ? <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.4} />
                  : <Crown className="w-6 h-6 text-navy" strokeWidth={2.4} />}
              </div>
            </div>
            {/* النصوص */}
            <div className="grid gap-0.5 px-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            {/* خط ذهبي زخرفي أسفل البطاقة */}
            <div aria-hidden className="mt-3.5 h-px w-24 bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />

      <style jsx global>{`
        /* ✦ دخول البطاقة الملكية — انقلاب نابض سينمائي ✦ */
        .fia-toast {
          animation: fiaToastIn 0.5s cubic-bezier(0.2, 1.3, 0.3, 1) both;
          padding: 0 18px 18px;
          padding-top: 0;
        }
        @keyframes fiaToastIn {
          from { opacity: 0; transform: translateY(26px) scale(0.82); }
          60%  { opacity: 1; }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* ✦ خروج ناعم ✦ */
        .fia-toast[data-state="closed"] {
          animation: fiaToastOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
          pointer-events: none;
        }
        @keyframes fiaToastOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(16px) scale(0.9); }
        }
        /* ✦ حلقة التقدم الذهبية — تنضب خلال مدة البطاقة ✦ */
        .fia-toast-ring {
          animation-name: fiaToastRing;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes fiaToastRing {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: ${RING_CIRC}; }
        }
        /* ✦ أيقونة البطاقة تدخل بتأخير راقٍ ✦ */
        .fia-toast > div:first-child {
          animation: fiaToastIcon 0.55s cubic-bezier(0.2, 1.4, 0.3, 1) 0.08s both;
        }
        @keyframes fiaToastIcon {
          from { opacity: 0; transform: scale(0.5) rotate(-12deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </ToastProvider>
  )
}
