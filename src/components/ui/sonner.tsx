"use client"

/**
 * 👑✨ Sonner الملكي — v10.11
 * كل توستات sonner تصبح بطاقات ملكية وسط الشاشة (نفس هوية نظام التوست).
 * التوستات المخصصة (toast.custom) تُعطَّل خلفيتها عبر .fia-notif-toast
 * لتظهر بتصميمها الخاص فوق الستارة المعتمة مباشرة.
 */

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "fia-sonner-toast",
          title: "fia-sonner-title",
          description: "fia-sonner-desc",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
