'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2, Trash2, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'

export interface PasswordConfirmDialogProps {
  /** Controls dialog visibility */
  open: boolean
  /** Called when dialog open state should change (close) */
  onOpenChange: (open: boolean) => void
  /** Title shown in the dialog header */
  title: string
  /** Descriptive message under the item box */
  message?: string
  /** Optional name/details of the item being deleted */
  itemName?: string
  /** Optional small label above the item name */
  itemLabel?: string
  /** Confirm button label */
  confirmLabel?: string
  /** Called when the user types correct password and clicks Confirm */
  onConfirm: () => void | Promise<void>
  /** Shows spinner + disables buttons while true */
  loading?: boolean
}

/**
 * Password-confirmation dialog for destructive operations.
 *
 * The user MUST type their account password to confirm. We verify
 * the password via /api/auth/verify-password before calling onConfirm.
 *
 * Use this for: deleting courses, students, trainers, team members —
 * anywhere a misclick could cause irreversible data loss.
 */
export function PasswordConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  itemName,
  itemLabel,
  confirmLabel = 'تأكيد الحذف',
  onConfirm,
  loading = false,
}: PasswordConfirmDialogProps) {
  const { user } = useAuth()
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [error, setError] = React.useState('')

  // Reset state whenever the dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setPassword('')
      setShowPassword(false)
      setError('')
    }
  }, [open])

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('أدخل كلمة المرور للتأكيد')
      return
    }
    if (!user?.id) {
      setError('المستخدم غير مسجّل')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.valid) {
        setError('كلمة المرور غير صحيحة')
        setVerifying(false)
        return
      }
    } catch {
      setError('فشل التحقق من كلمة المرور — تحقق من الاتصال')
      setVerifying(false)
      return
    }
    setVerifying(false)
    // Password verified — call the destructive action.
    try {
      await onConfirm()
    } catch (e: any) {
      setError(e?.message || 'فشل تنفيذ العملية')
    }
  }

  const handleOpenChange = (next: boolean) => {
    if ((loading || verifying) && !next) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!loading && !verifying}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {(itemName || itemLabel) && (
            <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <Trash2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div className="min-w-0">
                {itemLabel && (
                  <div className="text-xs text-muted-foreground mb-1">{itemLabel}</div>
                )}
                {itemName && (
                  <div className="font-bold text-navy line-clamp-3 break-words whitespace-pre-line">
                    {itemName}
                  </div>
                )}
              </div>
            </div>
          )}
          {message && (
            <p className="text-sm text-muted-foreground text-center whitespace-pre-line">
              {message}
            </p>
          )}

          {/* Password input — this is what makes the dialog "password-confirmed" */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd" className="text-xs font-bold text-navy flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-red-500" />
              كلمة مرورك للتأكيد
            </Label>
            <div className="relative">
              <Input
                id="confirm-pwd"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading && !verifying) handleConfirm() }}
                placeholder="••••••••"
                dir="ltr"
                className="pr-9"
                disabled={loading || verifying}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-500 font-semibold">{error}</p>}
            <p className="text-[10px] text-muted-foreground">
              لإتمام هذا الإجراء، يجب إدخال كلمة مرور حسابك. هذا يحمي من الحذف العرضي.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading || verifying}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || verifying || !password.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading || verifying ? (
              <>
                <Loader2 className="w-4 h-4 ml-1 animate-spin" /> {verifying ? 'جاري التحقق...' : 'جاري...'}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 ml-1" /> {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PasswordConfirmDialog
