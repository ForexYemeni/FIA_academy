'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2, Trash2, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'

export interface PasswordConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message?: string
  itemName?: string
  itemLabel?: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

/**
 * Professional password-confirmation dialog — premium SaaS design.
 *
 * Design matches the ConfirmDialog style (colored header + white body)
 * but adds a password field for destructive operations that require
 * extra authentication.
 *
 * Flow:
 * 1. User types their account password
 * 2. We verify it via /api/auth/verify-password
 * 3. On success, call onConfirm()
 * 4. On failure, show error + keep the dialog open
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
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [error, setError] = React.useState('')
  const user = useAuth((s) => s.user)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setPassword('')
      setShowPassword(false)
      setError('')
    }
  }, [open])

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('كلمة المرور مطلوبة')
      return
    }
    setVerifying(true)
    setError('')
    try {
      // Verify the password via the server
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setError(data.error || 'كلمة المرور غير صحيحة')
        return
      }
      // Password verified — call the onConfirm handler
      await onConfirm()
      // If onConfirm didn't throw, close the dialog
      setPassword('')
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setVerifying(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if ((loading || verifying) && !next) return
    onOpenChange(next)
  }

  const isBusy = loading || verifying

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" showCloseButton={!isBusy}>
        {/* === Colored header (navy for password = security theme) === */}
        <div className="bg-gradient-to-br from-navy to-navy-light px-6 pt-6 pb-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center mb-3">
            <Shield className="w-8 h-8 text-gold" />
          </div>
          <h2 className="text-lg font-bold text-gold leading-tight">
            {title}
          </h2>
        </div>

        {/* === White body section === */}
        <div className="px-6 py-5 space-y-4">
          {/* Item name */}
          {(itemName || itemLabel) && (
            <div className="bg-navy/5 border border-navy/10 rounded-xl p-3 text-center">
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
            <p className="text-xs text-muted-foreground text-center leading-relaxed whitespace-pre-line">
              {message}
            </p>
          )}

          {/* Password field */}
          <div>
            <Label className="text-navy font-bold text-sm flex items-center gap-1 mb-1.5">
              <Lock className="w-3.5 h-3.5" />
              كلمة المرور — تأكيد الهوية
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isBusy) handleConfirm() }}
                placeholder="••••••••"
                dir="ltr"
                className="h-12 pr-10 text-base rounded-xl"
                disabled={isBusy}
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-500 font-bold mt-1.5 text-center">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* === Buttons === */}
        <div className="px-6 pb-6 pt-2 flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isBusy}
            className="flex-1 h-11 text-sm font-semibold rounded-xl"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isBusy || !password.trim()}
            className="flex-1 h-11 text-sm font-bold rounded-xl bg-navy hover:bg-navy-light text-gold"
          >
            {isBusy ? (
              <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</>
            ) : (
              <><Trash2 className="w-4 h-4 ml-1" /> {confirmLabel}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PasswordConfirmDialog
