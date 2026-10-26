"use client"

/**
 * 👑✨ نظام التوست الملكي — v10.11
 * ============================================================================
 * توست وسط الشاشة على شكل بطاقة ملكية فاخرة:
 *   • خلفية كحلية متدرجة + إطار ذهبي + توهج ملكي
 *   • أيقونة دائرية كبيرة فوق البطاقة (تاج ذهبي / تحذير أحمر)
 *   • حلقة تقدم ذهبية تدور حول الأيقونة تنضب حتى الإخفاء التلقائي
 *   • ظهور بانقلاب نابض سينمائي + خروج ناعم
 *   • تعتيم خفيف للشاشة خلف البطاقة (يزول بلا أي عرقلة لللمس)
 *   • نفس الواجهة البرمجية القديمة 100% — لا يلزم تعديل أي مُستدعٍ
 * ============================================================================
 */

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, Crown, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

/** مدة البطاقة قبل الإخفاء التلقائي — تطابق حلقة التقدم في CSS */
export const FIA_TOAST_DURATION = 4200

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "fia-toast group pointer-events-auto relative flex w-full max-w-[380px] flex-col items-center overflow-visible rounded-3xl border text-center transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
  {
    variants: {
      variant: {
        default: "border-gold/45 bg-gradient-to-br from-navy via-[#122454] to-navy text-white shadow-[0_24px_70px_-18px_rgba(0,0,0,0.75),0_0_44px_-12px_rgba(212,175,55,0.4)]",
        destructive:
          "border-red-400/55 bg-gradient-to-br from-[#2a0a12] via-[#3d0f1a] to-[#1f060c] text-white shadow-[0_24px_70px_-18px_rgba(0,0,0,0.8),0_0_44px_-10px_rgba(239,68,68,0.45)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants>
>(({ className, variant, duration = FIA_TOAST_DURATION, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      duration={duration}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "mt-3 inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-gold/50 bg-gold/15 px-4 text-xs font-black text-gold transition-all hover:bg-gold/25 active:scale-95 focus:outline-none",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-white/10 p-1.5 text-white/60 transition-all hover:bg-white/20 hover:text-white active:scale-90 focus:outline-none",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("px-1 text-[15px] font-black leading-7 text-white [&+div]:mt-1", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("px-1 text-[13px] font-semibold leading-6 text-white/75", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  FIA_TOAST_DURATION,
}
