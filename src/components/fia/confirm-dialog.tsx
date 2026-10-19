'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2, Trash2, CheckCircle2 } from 'lucide-react'

export type ConfirmDialogVariant = 'danger' | 'info' | 'warning'

export interface ConfirmDialogProps {
  /** Controls dialog visibility */
  open: boolean
  /** Called when dialog open state should change (close) */
  onOpenChange: (open: boolean) => void
  /** Title shown in the dialog header */
  title: string
  /** Descriptive message under the item box */
  message?: string
  /** Optional name/details of the item being confirmed (shown in highlighted box) */
  itemName?: string
  /** Optional small label above the item name (e.g. "سيتم حذف الدورة التالية:") */
  itemLabel?: string
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Color theme: danger (red, delete), info (blue, save), warning (orange, reject) */
  variant?: ConfirmDialogVariant
  /** Called when user clicks the confirm button */
  onConfirm: () => void | Promise<void>
  /** Shows spinner + disables buttons while true */
  loading?: boolean
}

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  {
    icon: React.ComponentType<{ className?: string }>
    iconColor: string
    boxBg: string
    boxBorder: string
    titleColor: string
    confirmClass: string
  }
> = {
  danger: {
    icon: Trash2,
    iconColor: 'text-red-500',
    boxBg: 'bg-red-500/5 border-red-500/20',
    boxBorder: 'border-red-500/20',
    titleColor: 'text-red-600',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  info: {
    icon: CheckCircle2,
    iconColor: 'text-blue-500',
    boxBg: 'bg-blue-500/5 border-blue-500/20',
    boxBorder: 'border-blue-500/20',
    titleColor: 'text-blue-600',
    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    boxBg: 'bg-orange-500/5 border-orange-500/20',
    boxBorder: 'border-orange-500/20',
    titleColor: 'text-orange-600',
    confirmClass: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
}

/**
 * Reusable professional confirmation dialog.
 *
 * Variants:
 * - `danger` (red): used for destructive delete actions
 * - `info` (blue): used for save / approve / informational confirmations
 * - `warning` (orange): used for reject / caution confirmations
 *
 * The dialog includes a warning icon, configurable title/message,
 * optional item-name box, Cancel + Confirm buttons, and a loading state
 * with a spinner that disables both buttons while async work is running.
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
    // Prevent closing while a request is in-flight (avoids mid-action cancellation)
    if (loading && !next) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${cfg.titleColor}`}>
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {(itemName || itemLabel) && (
            <div
              className={`flex items-start gap-3 p-3 ${cfg.boxBg} border ${cfg.boxBorder} rounded-lg`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
              <div className="min-w-0">
                {itemLabel && (
                  <div className="text-xs text-white/60 mb-1">{itemLabel}</div>
                )}
                {itemName && (
                  <div className="font-bold text-white line-clamp-3 break-words whitespace-pre-line">
                    {itemName}
                  </div>
                )}
              </div>
            </div>
          )}
          {message && (
            <p className="text-sm text-white/60 text-center whitespace-pre-line">
              {message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={() => { void onConfirm() }}
            disabled={loading}
            className={cfg.confirmClass}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...
              </>
            ) : (
              <>
                <Icon className="w-4 h-4 ml-1" /> {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
