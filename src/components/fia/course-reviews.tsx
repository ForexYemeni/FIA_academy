'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Star, Plus, Loader2, Send, MessageSquare, AlertCircle, CheckCircle2,
  Sparkles, X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'

interface Review {
  id: string
  course_id: string
  user_id: string
  rating: number
  title?: string
  body?: string
  status?: string
  helpful_count?: number
  created_at?: string
  author?: {
    name?: string
    avatar?: string
    role?: string
    title?: string
  }
}

function roleBadge(role?: string) {
  if (!role) return null
  const map: Record<string, { label: string; cls: string }> = {
    admin: { label: '🔐 مدير', cls: 'bg-red-500/15 text-red-600 border-red-500/30' },
    trainer: { label: '🎓 مدرب', cls: 'bg-green-500/15 text-green-600 border-green-500/30' },
    student: { label: '📚 متدرب', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
    founder: { label: '👑 المؤسس', cls: 'bg-gold/15 text-gold border-gold/30' },
    leader: { label: '🛡️ قائد', cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
    team: { label: '🤝 فريق', cls: 'bg-gray-500/15 text-gray-600 border-gray-500/30' },
  }
  const cfg = map[role]
  if (!cfg) return null
  return <Badge className={`text-[10px] ${cfg.cls}`}>{cfg.label}</Badge>
}

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((s) => {
        const active = (hover || value) >= s
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(s)}
            className="p-1 disabled:cursor-not-allowed transition-transform active:scale-90"
          >
            <Star
              className={`w-8 h-8 transition-all ${
                active
                  ? 'fill-gold text-gold drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]'
                  : 'text-gray-300 hover:text-gold/60 hover:fill-gold/20'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

function StarDisplay({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= value ? 'fill-gold text-gold drop-shadow-[0_0_3px_rgba(212,175,55,0.4)]' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export function CourseReviews({ courseId, allowAdd = true }: { courseId: string; allowAdd?: boolean }) {
  const user = useAuth((s) => s.user)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [form, setForm] = useState({ rating: 5, title: '', body: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/reviews?course_id=${courseId}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : []
        setReviews(arr)
        if (user) {
          const mine = arr.find((r: Review) => r.user_id === user.id)
          if (mine) {
            setMyReview(mine)
            setForm({ rating: mine.rating, title: mine.title || '', body: mine.body || '' })
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [courseId, user?.id])

  const submit = async () => {
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول لتقييم الدورة')
      return
    }
    if (!form.rating || form.rating < 1 || form.rating > 5) {
      toast.error('اختر تقييماً من 1 إلى 5 نجوم')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          user_id: user.id,
          rating: form.rating,
          title: form.title || null,
          body: form.body || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل إرسال التقييم')
        return
      }
      toast.success(myReview ? 'تم تحديث تقييمك' : 'شكراً لك! تم نشر تقييمك')
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  // Compute aggregate
  const total = reviews.length
  const avg = total > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / total) : 0
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header — summary + add button */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-navy mb-2 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gold" />
            تقييمات المتدربين
          </h3>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} تقييم · معدل ${avg.toFixed(1)} من 5` : 'لا توجد تقييمات بعد — كن أول من يقيّم هذه الدورة'}
          </p>
        </div>
        {allowAdd && (
          <Button
            className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/20"
            onClick={() => setOpen(true)}
            disabled={!user}
            title={!user ? 'سجّل الدخول لتقييم الدورة' : ''}
          >
            <Plus className="w-4 h-4 ml-1" /> {myReview ? 'تعديل تقييمك' : 'أضف تقييماً'}
          </Button>
        )}
      </div>

      {/* ⚡ Magical aggregate summary card with top gold strip */}
      {total > 0 && (
        <Card className="relative p-6 bg-gradient-to-br from-navy/5 to-gold/5 border-gold/30 overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative grid md:grid-cols-3 gap-6 items-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-fia-gradient mb-2">{avg.toFixed(1)}</div>
              <div className="flex justify-center mb-2">
                <StarDisplay value={Math.round(avg)} size="w-6 h-6" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{total} تقييم</p>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              {distribution.map((d) => {
                const pct = total > 0 ? (d.count / total) * 100 : 0
                return (
                  <div key={d.star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 flex items-center gap-1 text-navy font-medium">
                      {d.star} <Star className="w-3 h-3 fill-gold text-gold" />
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden border border-gold/20">
                      <div className="bg-gradient-to-l from-gold via-amber-400 to-gold h-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-left text-muted-foreground">{d.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="relative w-8 h-8 mx-auto animate-spin text-navy" />
          </div>
        </div>
      ) : total === 0 ? (
        // ⚡ Magical empty state — gold-glow MessageSquare icon in navy gradient box
        <Card className="relative p-12 text-center bg-gradient-to-br from-white to-gold/5 border-gold/30 overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-md border border-gold/30">
              <MessageSquare className="w-10 h-10 text-gold" />
            </div>
          </div>
          <p className="relative text-navy font-medium mb-2">لا توجد تقييمات بعد</p>
          <p className="relative text-xs text-muted-foreground">
            {allowAdd && user ? 'كن أول من يقيّم هذه الدورة!' : allowAdd ? 'سجّل الدخول ثم ارجع لتقييم الدورة' : ''}
          </p>
        </Card>
      ) : (
        <div className="space-y-3 fia-stagger">
          {reviews.map((r) => (
            <Card key={r.id} className="relative p-5 fia-card-hover overflow-hidden border-gold/20">
              {/* Top gold strip */}
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
              <div className="relative flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-gold/40 shadow-md">
                    <AvatarImage src={r.author?.avatar || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-navy to-navy-light text-gold text-sm font-bold">
                      {r.author?.name?.charAt(0) || '؟'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-navy text-sm">{r.author?.name || 'متدرب'}</span>
                      {roleBadge(r.author?.role)}
                      {r.user_id === user?.id && <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">تقييمك</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    </div>
                  </div>
                </div>
                <StarDisplay value={r.rating} />
              </div>
              {r.title && <h4 className="relative font-bold text-navy text-sm mb-1">{r.title}</h4>}
              {r.body && <p className="relative text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.body}</p>}
            </Card>
          ))}
        </div>
      )}

      {/* ⚡ Magical review dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm({ rating: myReview?.rating || 5, title: myReview?.title || '', body: myReview?.body || '' }) } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border-0" showCloseButton={false}>
          <div className="overflow-hidden rounded-lg">
            {/* Magical navy gradient header with gold dot pattern */}
            <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-5 py-4 overflow-hidden">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px'
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 left-3 w-9 h-9 rounded-lg bg-white/10 hover:bg-gold/20 flex items-center justify-center z-10 backdrop-blur-sm transition-all active:scale-95"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4 text-gold" />
              </button>
              <DialogHeader className="border-0 bg-transparent p-0">
                <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold" />
                  {myReview ? 'تعديل تقييمك' : 'أضف تقييماً للدورة'}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="p-5 space-y-4 bg-gradient-to-b from-navy/5 to-white">
              <div className="text-center">
                <Label className="block mb-2 text-navy font-medium flex items-center justify-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-gold" />
                  التقييم *
                </Label>
                <div className="flex justify-center">
                  <StarPicker
                    value={form.rating}
                    onChange={(v) => setForm({ ...form, rating: v })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {form.rating === 5 && 'ممتاز — أنصح به بشدة'}
                  {form.rating === 4 && 'جيد جداً'}
                  {form.rating === 3 && 'متوسط'}
                  {form.rating === 2 && 'ضعيف'}
                  {form.rating === 1 && 'سيء جداً'}
                </p>
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  عنوان قصير (اختياري)
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: دورة رائعة ومفيدة"
                  maxLength={120}
                  className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5 text-navy font-medium">
                  <MessageSquare className="w-3.5 h-3.5 text-gold" />
                  تفاصيل التقييم (اختياري)
                </Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={5}
                  placeholder="شاركنا تجربتك مع الدورة... ما الذي أعجبك؟ ما الذي يمكن تحسينه؟"
                  maxLength={2000}
                  className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
                <p className="text-[10px] text-muted-foreground mt-1">{form.body.length}/2000 حرف</p>
              </div>
              {myReview && (
                <div className="relative text-xs text-navy bg-gold/10 p-3 rounded-xl border border-gold/30 overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-0.5 bg-gold/50" />
                  <CheckCircle2 className="w-3 h-3 inline ml-1 text-emerald-600" />
                  سبق وأنشأت تقييماً لهذه الدورة. سيتم تحديثه بدلاً من إنشاء واحد جديد.
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-gold/15 bg-white">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-xl border-gold/30 text-navy hover:bg-gold/10 active:scale-[0.97] transition-all"
              >
                إلغاء
              </Button>
              <Button
                onClick={submit}
                disabled={saving || !form.rating}
                className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all border border-gold/20"
              >
                {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
                {saving ? 'جاري الحفظ...' : myReview ? 'تحديث التقييم' : 'نشر التقييم'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
