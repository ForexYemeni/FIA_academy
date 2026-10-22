'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2, Trash2, Lock, Eye, EyeOff, Shield, Sparkles } from 'lucide-react'
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
  /**
   * يُستدعى بعد التحقق المحلي من كلمة المرور — ويستلم كلمة المرور نفسها
   * حتى يرسلها المكوّن الأب إلى الخادم للتحقق الملكي النهائي (bcrypt/نصي)
   * في مسارات منطقة الخطر. الاستخدامات القديمة () => void ما زالت تعمل.
   */
  onConfirm: (password: string) => void | Promise<void>
  loading?: boolean
}

/**
 * Professional password-confirmation dialog — matches the chat-delete
 * dialog design but adds a password field. Uses a custom overlay
 * (not Radix Dialog) for full visual control.
 *
 * Design:
 * - Fixed full-screen overlay with bg-black/50 backdrop-blur-sm
 * - White rounded-2xl card centered with max-w-sm
 * - Top: navy/gold gradient header with Shield icon + gold title
 * - Body: item name + warning + password field
 * - Two side-by-side buttons
 */
export function PasswordConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  itemName,
  itemLabel,
  confirmLabel = 'حذف نهائي',
  onConfirm,
  loading = false,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [error, setError] = React.useState('')
  const user = useAuth((s) => s.user)

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
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setError(data.error || data.message || 'كلمة المرور غير صحيحة')
        return
      }
      await onConfirm(password)
      setPassword('')
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setVerifying(false)
    }
  }

  const isBusy = loading || verifying

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => { if (!isBusy) onOpenChange(false) }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top: magical red gradient header with gold dot pattern + glow */}
        <div className="relative bg-gradient-to-br from-red-600 via-rose-700 to-red-800 p-6 text-center overflow-hidden">
          {/* Gold dot pattern overlay (white dots on red) */}
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px',
          }} />
          {/* Glow circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
          {/* White circle icon in header */}
          <div className="relative w-16 h-16 mx-auto rounded-full bg-white/95 flex items-center justify-center mb-2 shadow-lg ring-4 ring-white/20">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="relative text-white text-lg font-bold drop-shadow flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-gold" />
            {title}
          </h3>
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
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-orange-600 leading-relaxed text-left">
                {message}
              </p>
            </div>
          )}

          {/* Password field */}
          <div className="mb-4 text-right">
            <Label className="text-navy font-bold text-sm flex items-center gap-1 mb-1.5 justify-right">
              <Lock className="w-3.5 h-3.5 text-gold" />
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
                className="h-12 pr-10 text-base rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                disabled={isBusy}
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-500 font-bold mt-1.5">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              disabled={isBusy || !password.trim()}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md active:scale-[0.97]"
            >
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isBusy ? 'جاري...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PasswordConfirmDialog
