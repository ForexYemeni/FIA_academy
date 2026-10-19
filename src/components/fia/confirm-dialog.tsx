'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
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

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  {
    icon: React.ComponentType<{ className?: string }>
    headerBg: string
    iconBg: string
    titleColor: string
    alertBg: string
    alertText: string
    confirmClass: string
  }
> = {
  danger: {
    icon: Trash2,
    headerBg: 'bg-gradient-to-br from-red-500 to-red-600',
    iconBg: 'bg-white/20',
    titleColor: 'text-white',
    alertBg: 'bg-red-50 border border-red-200',
    alertText: 'text-red-700',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    headerBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
    iconBg: 'bg-white/20',
    titleColor: 'text-white',
    alertBg: 'bg-orange-50 border border-orange-200',
    alertText: 'text-orange-700',
    confirmClass: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
  info: {
    icon: Info,
    headerBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconBg: 'bg-white/20',
    titleColor: 'text-white',
    alertBg: 'bg-blue-50 border border-blue-200',
    alertText: 'text-blue-700',
    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  success: {
    icon: CheckCircle2,
    headerBg: 'bg-gradient-to-br from-green-500 to-green-600',
    iconBg: 'bg-white/20',
    titleColor: 'text-white',
    alertBg: 'bg-green-50 border border-green-200',
    alertText: 'text-green-700',
    confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
}

/**
 * Professional confirmation dialog — premium SaaS design.
 *
 * Design elements (inspired by the user's reference screenshot):
 * - Two-tone layout: colored header (40%) + white body (60%)
 * - Large circular icon in a translucent badge
 * - Clear title in bold white text on colored background
 * - Item name shown in a highlighted alert box
 * - Warning text about irreversibility
 * - Two clearly differentiated buttons: danger (filled) + cancel (outline)
 * - Generous spacing, rounded corners, blurred backdrop
 * - Fully responsive + mobile-friendly
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

  const handleOpenChange = (next: boolean) => {
    if (loading && !next) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" showCloseButton={!loading}>
        {/* === Colored header section === */}
        <div className={`${cfg.headerBg} px-6 pt-6 pb-5 text-center`}>
          {/* Icon in translucent circle */}
          <div className={`w-16 h-16 mx-auto rounded-full ${cfg.iconBg} flex items-center justify-center mb-3`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          {/* Title */}
          <h2 className={`text-lg font-bold ${cfg.titleColor} leading-tight`}>
            {title}
          </h2>
        </div>

        {/* === White body section === */}
        <div className="px-6 py-5 space-y-3">
          {/* Item name in alert box */}
          {(itemName || itemLabel) && (
            <div className={`${cfg.alertBg} rounded-xl p-3 text-center`}>
              {itemLabel && (
                <p className="text-[10px] text-muted-foreground mb-1">{itemLabel}</p>
              )}
              {itemName && (
                <p className="font-bold text-navy text-sm break-words whitespace-pre-line line-clamp-3">
                  {itemName}
                </p>
              )}
            </div>
          )}

          {/* Message */}
          {message && (
            <p className={`text-xs ${cfg.alertText} text-center leading-relaxed whitespace-pre-line`}>
              {message}
            </p>
          )}
        </div>

        {/* === Buttons === */}
        <div className="px-6 pb-6 pt-2 flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="flex-1 h-11 text-sm font-semibold rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={() => { void onConfirm() }}
            disabled={loading}
            className={`flex-1 h-11 text-sm font-bold rounded-xl ${cfg.confirmClass}`}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</>
            ) : (
              <><Icon className="w-4 h-4 ml-1" /> {confirmLabel}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
