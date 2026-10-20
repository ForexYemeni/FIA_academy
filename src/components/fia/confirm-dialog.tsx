'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2, Trash2, CheckCircle2, XCircle, Info, Sparkles } from 'lucide-react'

export type ConfirmDialogVariant = 'danger' | 'info' | 'warning' | 'success'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message?: string
  itemName?: string
  itemLabel?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmDialogVariant
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

const VARIANT_CONFIG: Record<ConfirmDialogVariant, {
  icon: any
  headerIcon: any
  headerClass: string
  alertBg: string
  alertText: string
  confirmClass: string
  dotColor: string
}> = {
  danger: {
    icon: Trash2,
    headerIcon: AlertTriangle,
    headerClass: 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700',
    alertBg: 'bg-red-50 border border-red-200',
    alertText: 'text-red-600',
    confirmClass: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white',
    dotColor: '#D4AF37',
  },
  warning: {
    icon: AlertTriangle,
    headerIcon: AlertTriangle,
    headerClass: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600',
    alertBg: 'bg-orange-50 border border-orange-200',
    alertText: 'text-orange-600',
    confirmClass: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white',
    dotColor: '#D4AF37',
  },
  info: {
    icon: Info,
    headerIcon: Sparkles,
    headerClass: 'bg-gradient-to-br from-navy via-blue-700 to-navy-light',
    alertBg: 'bg-blue-50 border border-blue-200',
    alertText: 'text-blue-600',
    confirmClass: 'bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold',
    dotColor: '#D4AF37',
  },
  success: {
    icon: CheckCircle2,
    headerIcon: CheckCircle2,
    headerClass: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700',
    alertBg: 'bg-green-50 border border-green-200',
    alertText: 'text-green-600',
    confirmClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
    dotColor: '#D4AF37',
  },
}

/**
 * Professional confirmation dialog — matches the chat-delete dialog
 * design exactly. Uses a custom overlay (not Radix Dialog) so we have
 * full control over the visual appearance.
 *
 * Design:
 * - Fixed full-screen overlay with bg-black/50 backdrop-blur-sm
 * - White rounded-2xl card centered with max-w-sm
 * - Top: colored gradient header with icon circle + white title
 * - Body: centered text with item name + warning box
 * - Two side-by-side buttons (cancel + confirm)
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  itemName,
  itemLabel,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const cfg = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.danger
  const Icon = cfg.icon
  const HeaderIcon = cfg.headerIcon

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => { if (!loading) onOpenChange(false) }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top: magical gradient header with dot pattern + glow */}
        <div className={`relative ${cfg.headerClass} p-6 text-center overflow-hidden`}>
          {/* Gold dot pattern overlay */}
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: `radial-gradient(circle at 12% 50%, ${cfg.dotColor} 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)`,
            backgroundSize: '24px 24px, 18px 18px',
          }} />
          {/* Glow circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
          {/* White circle icon in header */}
          <div className="relative w-16 h-16 mx-auto rounded-full bg-white/95 flex items-center justify-center mb-2 shadow-lg ring-4 ring-white/20">
            <HeaderIcon className="w-8 h-8 text-navy" />
          </div>
          <h3 className="relative text-white text-lg font-bold drop-shadow">{title}</h3>
        </div>

        {/* Body */}
        <div className="bg-gradient-to-b from-gray-50/50 to-white p-6 text-center">
          {itemLabel && (
            <p className="text-sm text-gray-600 mb-1">{itemLabel}</p>
          )}
          {itemName && (
            <p className="font-bold text-navy text-base mb-3">{itemName}</p>
          )}
          {message && (
            <div className={`${cfg.alertBg} rounded-lg p-3 mb-4`}>
              <p className={`text-xs ${cfg.alertText} leading-relaxed`}>
                {message}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => { void onConfirm() }}
              disabled={loading}
              className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md active:scale-[0.97] ${cfg.confirmClass}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              {loading ? 'جاري...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
