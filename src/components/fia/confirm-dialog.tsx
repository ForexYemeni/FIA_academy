'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2, Trash2, CheckCircle2, XCircle, Info } from 'lucide-react'

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
  headerClass: string
  alertBg: string
  alertText: string
  confirmClass: string
}> = {
  danger: {
    icon: Trash2,
    headerClass: 'bg-gradient-to-br from-red-500 to-red-600',
    alertBg: 'bg-red-50 border border-red-200',
    alertText: 'text-red-600',
    confirmClass: 'bg-red-500 hover:bg-red-600 text-white',
  },
  warning: {
    icon: AlertTriangle,
    headerClass: 'bg-gradient-to-br from-orange-500 to-amber-600',
    alertBg: 'bg-orange-50 border border-orange-200',
    alertText: 'text-orange-600',
    confirmClass: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  info: {
    icon: Info,
    headerClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
    alertBg: 'bg-blue-50 border border-blue-200',
    alertText: 'text-blue-600',
    confirmClass: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  success: {
    icon: CheckCircle2,
    headerClass: 'bg-gradient-to-br from-green-500 to-green-600',
    alertBg: 'bg-green-50 border border-green-200',
    alertText: 'text-green-600',
    confirmClass: 'bg-green-500 hover:bg-green-600 text-white',
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => { if (!loading) onOpenChange(false) }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top: colored gradient with icon */}
        <div className={`${cfg.headerClass} p-6 text-center`}>
          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-lg font-bold">{title}</h3>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
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
              className="flex-1 h-11 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => { void onConfirm() }}
              disabled={loading}
              className={`flex-1 h-11 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${cfg.confirmClass}`}
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
