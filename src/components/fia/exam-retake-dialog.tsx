'use client'

// ============================================================================
// EXAM RETAKE DIALOG — Royal paid-retake flow (FIA Royal design language)
// Shared by: student dashboard (اختباراتي cards) + exam results page.
// Shows the retake fee, payment methods (from /api/payment-methods), the
// selected method's details with copy buttons, a payment-reference input and
// a proof-of-payment upload (compressed client-side). On submit it creates a
// payments row via /api/exam-retake with status 'قيد الانتظار' — the admin
// approves it from the payments inbox, unlocking exactly ONE new attempt.
// ============================================================================
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  RefreshCw, CheckCircle2, Loader2, Copy, Upload, X, CreditCard,
  ShieldCheck, Sparkles, Banknote, Clock,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LuxDialog, LuxField, LuxSaveBar, LuxBadge } from './dashboards/luxury'

export function ExamRetakeDialog({ open, onOpenChange, course, userId, onRequested }: any) {
  const [methods, setMethods] = useState<any[]>([])
  const [selectedMethod, setSelectedMethod] = useState<any>(null)
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const fee = Number(course?.retake_fee) || 0
  const currency = course?.currency || 'ر.ي'

  // Load payment methods when opened
  useEffect(() => {
    if (!open) return
    setDone(false)
    setProofUrl(null)
    setReference('')
    fetch('/api/payment-methods')
      .then((r) => r.json())
      .then((d) => {
        const arr = (Array.isArray(d) ? d : []).filter((p: any) => p.enabled)
        setMethods(arr)
        if (arr.length > 0) setSelectedMethod(arr[0])
      })
      .catch(() => setMethods([]))
  }, [open])

  const copyText = (t: string, msg: string) => {
    navigator.clipboard?.writeText(t)
    toast.success(msg)
  }

  // Proof upload — client-side compression (same pattern as the enrollment dialog)
  const handleProofUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة لإثبات الدفع')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (حد أقصى 10 ميجابايت)')
      return
    }
    setUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error('فشل قراءة الملف'))
        reader.readAsDataURL(file)
      })
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('فشل تحميل الصورة'))
        img.src = dataUrl
      })
      const blob = await new Promise<Blob | null>((resolve) => {
        const maxW = 1024, maxH = 1024
        let { width, height } = img
        if (width > maxW) { height = (height * maxW) / width; width = maxW }
        if (height > maxH) { width = (width * maxH) / height; height = maxH }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(resolve, 'image/jpeg', 0.85)
      })
      if (!blob) { toast.error('فشل معالجة الصورة'); return }
      const fd = new FormData()
      fd.append('file', new File([blob], 'retake-proof.jpg', { type: 'image/jpeg' }))
      fd.append('folder', 'payment-proofs')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        setProofUrl(data.url)
        toast.success('تم رفع إثبات الدفع')
      } else {
        toast.error(data.error || 'فشل رفع الصورة')
      }
    } catch {
      toast.error('خطأ في الرفع')
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!selectedMethod) { toast.error('اختر طريقة الدفع أولاً'); return }
    if (!proofUrl) { toast.error('ارفع صورة إثبات الدفع'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/exam-retake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          course_id: course.id,
          method: selectedMethod?.name || 'إعادة اختبار',
          reference: reference || '',
          proof_url: proofUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل إرسال الطلب'); return }
      setDone(true)
      toast.success('تم إرسال طلب الإعادة — بانتظار موافقة الإدارة')
      onRequested?.(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title="إعادة الاختبار — رسوم الإعادة"
      subtitle={course?.title ? `دورة: ${course.title}` : 'طلب إعادة محاولة الاختبار'}
      icon={RefreshCw}
      gradient="from-[#1b1035] via-purple-900 to-fuchsia-900"
      maxWidth="sm:max-w-lg"
      footer={
        done ? undefined : (
          <LuxSaveBar
            onCancel={() => onOpenChange(false)}
            onSave={submit}
            saving={submitting}
            saveLabel="إرسال طلب الإعادة"
            icon={RefreshCw}
            gradient="from-gold to-amber-500"
            text="text-navy"
          />
        )
      }
    >
      {done ? (
        <div className="text-center py-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h3 className="font-extrabold text-navy text-lg mb-1.5">تم إرسال طلب الإعادة بنجاح</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            طلبك الآن في صندوق مدفوعات الإدارة — بعد اعتماد الدفع سيتم تفعيل محاولتك الجديدة تلقائياً في قسم «اختباراتي»
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Fee card — royal gold */}
          <div className="relative overflow-hidden rounded-xl border-2 border-gold/40 bg-gradient-to-br from-gold/10 via-amber-50/60 to-transparent p-4">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                  <Banknote className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold">رسوم إعادة الاختبار</p>
                  <p className="text-[10px] text-muted-foreground">محاولة واحدة إضافية بعد اعتماد الدفع</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-2xl font-extrabold text-gold" dir="ltr">{fee.toLocaleString()} <span className="text-xs">{currency}</span></p>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <LuxField label="اختر طريقة الدفع" icon={CreditCard} required>
            <div className="grid grid-cols-1 gap-2">
              {methods.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">لا توجد طرق دفع مفعّلة حالياً — تواصل مع الإدارة</p>
              ) : methods.map((m: any) => {
                const isCrypto = m.payment_category === 'crypto'
                const active = selectedMethod?.id === m.id
                return (
                  <button key={m.id} type="button" onClick={() => setSelectedMethod(m)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border-2 text-right transition-all ${active ? 'border-gold bg-gold/[0.07] shadow-md' : 'border-border/60 bg-white hover:border-gold/40'}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${isCrypto ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}`}>
                      {isCrypto ? (m.crypto_coin?.charAt(0) || '₿') : (m.icon || '💳')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy text-xs">{m.name}</div>
                      {isCrypto ? (
                        <div className="text-[9px] text-amber-600 font-mono" dir="ltr">{m.crypto_coin} • {m.crypto_network}</div>
                      ) : (
                        (m.account_number || m.wallet_id) && <div className="text-[9px] text-emerald-600 font-mono" dir="ltr">{m.account_number || m.wallet_id}</div>
                      )}
                    </div>
                    {active && <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </LuxField>

          {/* Selected method details */}
          {selectedMethod && (
            <div className={`rounded-xl border p-3 space-y-2 ${selectedMethod.payment_category === 'crypto' ? 'bg-amber-50/50 border-amber-200/50' : 'bg-emerald-50/50 border-emerald-200/50'}`}>
              {selectedMethod.payment_category === 'crypto' ? (
                <>
                  {selectedMethod.crypto_coin && (
                    <div className="flex items-center justify-between bg-white/70 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-muted-foreground">العملة / الشبكة:</span>
                      <span className="text-[11px] font-bold text-amber-700" dir="ltr">{selectedMethod.crypto_coin} • {selectedMethod.crypto_network}</span>
                    </div>
                  )}
                  {selectedMethod.wallet_address && (
                    <div className="bg-white/70 rounded-lg px-2.5 py-2 flex items-center gap-2">
                      <code className="text-[10px] font-mono font-bold text-navy break-all flex-1" dir="ltr">{selectedMethod.wallet_address}</code>
                      <button type="button" onClick={() => copyText(selectedMethod.wallet_address, 'تم نسخ العنوان ✓')} className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 flex items-center justify-center flex-shrink-0">
                        <Copy className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                  {selectedMethod.binance_pay_id && (
                    <div className="bg-white/70 rounded-lg px-2.5 py-2 flex items-center gap-2">
                      <code className="text-[10px] font-mono font-bold text-amber-700 flex-1" dir="ltr">Binance Pay: {selectedMethod.binance_pay_id}</code>
                      <button type="button" onClick={() => copyText(selectedMethod.binance_pay_id, 'تم نسخ المعرف ✓')} className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 flex items-center justify-center flex-shrink-0">
                        <Copy className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(selectedMethod.account_number || selectedMethod.wallet_id) && (
                    <div className="bg-white/70 rounded-lg px-2.5 py-2 flex items-center gap-2">
                      <code className="text-[11px] font-mono font-bold text-emerald-700 flex-1 break-all" dir="ltr">{selectedMethod.account_number || selectedMethod.wallet_id}</code>
                      <button type="button" onClick={() => copyText(selectedMethod.account_number || selectedMethod.wallet_id, 'تم نسخ رقم الحساب ✓')} className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Copy className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                  {selectedMethod.account_holder && (
                    <div className="flex items-center justify-between bg-white/70 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-muted-foreground">صاحب الحساب:</span>
                      <span className="text-[11px] font-bold text-emerald-700">{selectedMethod.account_holder}</span>
                    </div>
                  )}
                </>
              )}
              {selectedMethod.instructions && (
                <p className="text-[10px] text-muted-foreground leading-relaxed bg-white/60 rounded-lg px-2.5 py-1.5">{selectedMethod.instructions}</p>
              )}
            </div>
          )}

          {/* Reference */}
          <LuxField label="رقم الحوالة / المرجع (إن وجد)" icon={Sparkles} hint="اختياري">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="مثال: JB-123456" className="font-mono text-sm" dir="ltr" />
          </LuxField>

          {/* Proof upload */}
          <LuxField label="صورة إثبات الدفع (الإيصال)" icon={Upload} required>
            <input type="file" accept="image/*" className="hidden" id="retake-proof-upload" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProofUpload(f) }} />
            {proofUrl ? (
              <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-2.5">
                <img src={proofUrl} alt="proof" className="w-14 h-14 object-cover rounded-lg border-2 border-emerald-500/30" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> تم رفع الإثبات</p>
                  <button type="button" onClick={() => document.getElementById('retake-proof-upload')?.click()} className="text-[10px] text-muted-foreground underline mt-0.5">تغيير الصورة</button>
                </div>
                <button type="button" onClick={() => setProofUrl(null)} className="w-7 h-7 rounded-lg hover:bg-rose-500/10 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            ) : (
              <button type="button" disabled={uploading} onClick={() => document.getElementById('retake-proof-upload')?.click()}
                className="w-full py-6 rounded-xl border-2 border-dashed border-gold/40 hover:border-gold hover:bg-gold/[0.04] flex flex-col items-center gap-1.5 transition-all">
                {uploading ? <Loader2 className="w-6 h-6 text-gold animate-spin" /> : <Upload className="w-6 h-6 text-gold" />}
                <span className="text-xs font-bold text-navy">{uploading ? 'جاري الرفع...' : 'اضغط لرفع صورة الإيصال'}</span>
                <span className="text-[9px] text-muted-foreground">JPG / PNG — حد أقصى 10 ميجابايت</span>
              </button>
            )}
          </LuxField>

          {/* Trust note */}
          <div className="flex items-start gap-2 rounded-xl bg-navy/[0.04] border border-navy/10 p-2.5">
            <ShieldCheck className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              بعد الإرسال ينتقل طلبك إلى صندوق مدفوعات الإدارة للمراجعة. عند الاعتماد ستُفتح لك محاولة واحدة جديدة، ويمكنك متابعة الحالة من قسم «اختباراتي».
            </p>
          </div>
        </div>
      )}
    </LuxDialog>
  )
}
