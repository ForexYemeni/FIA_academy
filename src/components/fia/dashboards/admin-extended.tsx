'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SectionCard } from './shell'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { toast } from 'sonner'
import {
  Plus, Edit, Trash2, Tag, Users, FileText, Star, MessageSquare,
  Newspaper, Mail, HelpCircle, ExternalLink, Clock, CheckCircle2, X,
  Loader2, Gift, Award, Eye, Ban, Send, ArrowRight, Copy,
} from 'lucide-react'

// ============================================================================
// 1) COUPONS — Discount codes management
// ============================================================================
export function AdminCoupons() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => fetch('/api/coupons').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/coupons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف الكوبون')
      setDeleteTarget(null)
      load()
    } finally { setDeleting(false) }
  }

  const toggleStatus = async (c: any) => {
    const newStatus = c.status === 'نشط' ? 'متوقف' : 'نشط'
    await fetch('/api/coupons', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, status: newStatus }) })
    toast.success(newStatus === 'نشط' ? 'تم تنشيط الكوبون' : 'تم إيقاف الكوبون')
    load()
  }

  return (
    <SectionCard title="كوبونات الخصم" description={`${items.length} كوبون`} action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> كوبون جديد</Button>}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-navy text-lg font-mono" dir="ltr">{c.code}</div>
                <Badge className={c.status === 'نشط' ? 'bg-green-500/15 text-green-600 border-green-500/30 mt-1' : 'bg-red-500/15 text-red-600 border-red-500/30 mt-1'}>
                  {c.status === 'نشط' ? '● نشط' : '● متوقف'}
                </Badge>
              </div>
              <Tag className="w-5 h-5 text-gold" />
            </div>
            {c.description && <div className="text-xs text-muted-foreground mb-2">{c.description}</div>}
            <div className="text-sm mb-2">
              <span className="font-bold text-gold">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value} ر.ي`}</span>
              <span className="text-muted-foreground"> خصم</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mb-3">
              <div>الاستخدام: {c.used_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ' (غير محدود)'}</div>
              {c.expires_at && <div>ينتهي: {new Date(c.expires_at).toLocaleDateString('ar-EG')}</div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(c); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
              <Button size="sm" variant="outline" className={c.status === 'نشط' ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-green-500/30 text-green-600 hover:bg-green-500/10'} onClick={() => toggleStatus(c)}>
                {c.status === 'نشط' ? 'إيقاف' : 'تنشيط'}
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {open && <CouponDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف الكوبون"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف الكوبون التالي:"
        itemName={deleteTarget?.code}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

function CouponDialog({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || { code: '', description: '', discount_type: 'percentage', discount_value: 10, max_uses: '', expires_at: '', status: 'نشط' })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setForm(initial || { code: '', description: '', discount_type: 'percentage', discount_value: 10, max_uses: '', expires_at: '', status: 'نشط' })
  }, [initial])

  const save = async () => {
    if (!form.discount_value) { toast.error('قيمة الخصم مطلوبة'); return }
    setSaving(true)
    try {
      const payload = { ...form, max_uses: form.max_uses ? parseInt(form.max_uses) : null, expires_at: form.expires_at || null }
      const res = await fetch('/api/coupons', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...payload } : payload),
      })
      if (res.ok) {
        toast.success(initial ? 'تم التحديث' : 'تم إنشاء الكوبون')
        onSaved(); onOpenChange(false)
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'تعديل كوبون' : 'كوبون جديد'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>الكود (اتركه فارغاً للتوليد التلقائي)</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} dir="ltr" className="mt-1 font-mono" placeholder="FIA-XXXXXX" />
          </div>
          <div>
            <Label>الوصف</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نوع الخصم</Label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="percentage">نسبة مئوية %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>
            <div>
              <Label>القيمة</Label>
              <Input type="number" value={form.discount_value || ''} onChange={(e) => setForm({ ...form, discount_value: e.target.value === '' ? 0 : parseFloat(e.target.value) })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>حد الاستخدام</Label>
              <Input type="number" value={form.max_uses || ''} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className="mt-1" placeholder="فارغ = غير محدود" />
            </div>
            <div>
              <Label>تاريخ الانتهاء</Label>
              <Input type="date" value={form.expires_at ? form.expires_at.split('T')[0] : ''} onChange={(e) => setForm({ ...form, expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 2) AFFILIATES — Marketers & referral program
// ============================================================================
export function AdminAffiliates() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => fetch('/api/affiliates').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/affiliates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف المسوّق')
      setDeleteTarget(null)
      load()
    } finally { setDeleting(false) }
  }

  const toggleStatus = async (a: any) => {
    const newStatus = a.status === 'نشط' ? 'متوقف' : 'نشط'
    await fetch('/api/affiliates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, status: newStatus }) })
    toast.success(newStatus === 'نشط' ? 'تم تنشيط المسوّق' : 'تم إيقاف المسوّق')
    load()
  }

  return (
    <SectionCard title="المسوّقون بالعمولة" description={`${items.length} مسوّق`} action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> مسوّق جديد</Button>}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-navy">{a.name}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{a.email}</div>
                {a.phone && <div className="text-xs text-muted-foreground" dir="ltr">{a.phone}</div>}
              </div>
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div className="bg-gold/10 rounded-md p-3 mb-3 text-center border border-gold/20">
              <div className="text-[10px] text-muted-foreground mb-1">كود الإحالة</div>
              <div className="font-mono font-bold text-navy text-lg" dir="ltr">{a.unique_code}</div>
              <div className="mt-2 pt-2 border-t border-gold/20">
                <div className="text-[10px] text-muted-foreground mb-1">رابط الدعوة</div>
                <div className="font-mono text-[10px] text-navy/80 truncate" dir="ltr">
                  https://fiaacademy.vercel.app/?ref={a.unique_code}
                </div>
              </div>
              <button
                onClick={async () => {
                  const url = `https://fiaacademy.vercel.app/?ref=${a.unique_code}`
                  try {
                    await navigator.clipboard.writeText(url)
                    toast.success('تم نسخ رابط الدعوة')
                  } catch {
                    // Fallback — select the URL via a temporary input
                    const ta = document.createElement('textarea')
                    ta.value = url
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand('copy')
                    document.body.removeChild(ta)
                    toast.success('تم نسخ رابط الدعوة')
                  }
                }}
                className="mt-2 w-full bg-navy hover:bg-navy-light text-gold px-3 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1"
              >
                <Copy className="w-3 h-3" /> نسخ الرابط
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="font-bold text-navy text-lg">{a.total_referrals || 0}</div>
                <div className="text-muted-foreground">إحالات</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="font-bold text-gold text-lg">{(a.total_earnings || 0).toLocaleString()}</div>
                <div className="text-muted-foreground">ر.ي</div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">العمولة: <span className="font-bold text-navy">{a.commission_percent}%</span></span>
              <Badge className={a.status === 'نشط' ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-red-500/15 text-red-600 border-red-500/30'}>
                {a.status === 'نشط' ? '● نشط' : '● متوقف'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(a); setOpen(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
              <Button size="sm" variant="outline" className={a.status === 'نشط' ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-green-500/30 text-green-600 hover:bg-green-500/10'} onClick={() => toggleStatus(a)}>
                {a.status === 'نشط' ? 'إيقاف' : 'تنشيط'}
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(a)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {open && <AffiliateDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف المسوّق"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف المسوّق التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

function AffiliateDialog({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || { name: '', email: '', phone: '', unique_code: '', commission_percent: 10, status: 'نشط' })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setForm(initial || { name: '', email: '', phone: '', unique_code: '', commission_percent: 10, status: 'نشط' })
  }, [initial])

  const save = async () => {
    if (!form.name || !form.email) { toast.error('الاسم والبريد مطلوبان'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/affiliates', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...form } : form),
      })
      if (res.ok) {
        toast.success(initial ? 'تم التحديث' : 'تم إنشاء المسوّق')
        onSaved(); onOpenChange(false)
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'تعديل مسوّق' : 'مسوّق جديد'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
          <div><Label>البريد *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="mt-1" /></div>
          <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="mt-1" /></div>
          <div><Label>كود الإحالة (اتركه فارغاً للتوليد التلقائي)</Label><Input value={form.unique_code} onChange={(e) => setForm({ ...form, unique_code: e.target.value })} dir="ltr" className="mt-1 font-mono" /></div>
          <div><Label>نسبة العمولة (%)</Label><Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 3) EXAM QUESTIONS — Question bank
// ============================================================================
export function AdminExamQuestions() {
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : []
      setCourses(arr)
      if (arr.length > 0 && !selectedCourse) setSelectedCourse(arr[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetch(`/api/exam-questions?course_id=${selectedCourse}`).then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([]))
    } else {
      setItems([])
    }
  }, [selectedCourse])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/exam-questions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف السؤال')
      setDeleteTarget(null)
      if (selectedCourse) {
        fetch(`/api/exam-questions?course_id=${selectedCourse}`).then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
      }
    } finally { setDeleting(false) }
  }

  return (
    <SectionCard title="بنك الأسئلة" description={`${items.length} سؤال`} action={
      <div className="flex gap-2 items-center">
        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="px-3 py-2 border border-input rounded-md bg-background text-sm">
          <option value="">— اختر دورة —</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <Button className="bg-navy hover:bg-navy-light" disabled={!selectedCourse} onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> سؤال جديد</Button>
      </div>
    }>
      {!selectedCourse ? (
        <div className="text-center py-12 text-muted-foreground">اختر دورة لعرض أسئلتها أو إضافة سؤال جديد</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">لا توجد أسئلة في هذه الدورة بعد</div>
      ) : (
        <div className="space-y-3">
          {items.map((q, i) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {q.question_type === 'mcq' ? 'اختيارات' : q.question_type === 'truefalse' ? 'صح/خطأ' : q.question_type === 'matching' ? 'مطابقة' : 'إجابة قصيرة'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                    <span className="text-xs text-muted-foreground">{q.points} نقطة</span>
                  </div>
                  <p className="font-bold text-navy text-sm mb-2">{i + 1}. {q.prompt}</p>
                  {q.options && (
                    <div className="text-xs text-muted-foreground space-y-1 mb-2">
                      {Array.isArray(q.options) && q.options.map((o: any, idx: number) => (
                        <div key={idx} className={q.correct_answer === idx ? 'text-green-600 font-bold' : ''}>
                          {String.fromCharCode(65 + idx)}) {o}
                          {q.correct_answer === idx && <CheckCircle2 className="w-3 h-3 inline mr-2" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.explanation && <p className="text-xs text-muted-foreground italic mt-2">💡 {q.explanation}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(q); setOpen(true) }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(q)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <ExamQuestionDialog open={open} onOpenChange={setOpen} initial={editing} courseId={selectedCourse} onSaved={() => {
        setOpen(false)
        if (selectedCourse) {
          fetch(`/api/exam-questions?course_id=${selectedCourse}`).then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
        }
      }} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="تأكيد حذف السؤال"
        message="هل أنت متأكد من الحذف؟"
        itemLabel="سيتم حذف السؤال التالي:"
        itemName={deleteTarget?.prompt}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

function ExamQuestionDialog({ open, onOpenChange, initial, courseId, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || {
    course_id: courseId,
    question_type: 'mcq',
    prompt: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    difficulty: 'متوسط',
    points: 1,
  })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setForm(initial || {
      course_id: courseId,
      question_type: 'mcq',
      prompt: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: '',
      difficulty: 'متوسط',
      points: 1,
    })
  }, [initial, courseId])

  const save = async () => {
    if (!form.prompt) { toast.error('نص السؤال مطلوب'); return }
    setSaving(true)
    try {
      const payload = {
        course_id: form.course_id,
        question_type: form.question_type,
        prompt: form.prompt,
        options: form.question_type === 'mcq' ? form.options.filter((o: string) => o.trim()) : null,
        correct_answer: form.question_type === 'truefalse' ? form.correct_answer === 'true' : form.correct_answer,
        explanation: form.explanation || null,
        difficulty: form.difficulty,
        points: parseInt(form.points) || 1,
      }
      const res = await fetch('/api/exam-questions', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...payload } : payload),
      })
      if (res.ok) {
        toast.success(initial ? 'تم التحديث' : 'تم إضافة السؤال')
        onSaved()
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'تعديل سؤال' : 'سؤال جديد'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>نوع السؤال</Label>
              <select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="mcq">اختيارات متعددة</option>
                <option value="truefalse">صح / خطأ</option>
                <option value="short_answer">إجابة قصيرة</option>
              </select>
            </div>
            <div>
              <Label>الصعوبة</Label>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="سهل">سهل</option>
                <option value="متوسط">متوسط</option>
                <option value="صعب">صعب</option>
              </select>
            </div>
            <div>
              <Label>النقاط</Label>
              <Input type="number" value={form.points || ''} onChange={(e) => setForm({ ...form, points: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>نص السؤال *</Label>
            <Textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3} className="mt-1" />
          </div>
          {form.question_type === 'mcq' && (
            <div>
              <Label>الخيارات (اضغط على الخيار الصحيح)</Label>
              <div className="space-y-2 mt-1">
                {form.options.map((opt: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, correct_answer: idx })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${form.correct_answer === idx ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </button>
                    <Input value={opt} onChange={(e) => {
                      const newOpts = [...form.options]; newOpts[idx] = e.target.value; setForm({ ...form, options: newOpts })
                    }} dir="rtl" placeholder={`الخيار ${String.fromCharCode(65 + idx)}`} />
                    {form.options.length > 2 && (
                      <button onClick={() => setForm({ ...form, options: form.options.filter((_: any, i: number) => i !== idx) })}>
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
                {form.options.length < 6 && (
                  <Button size="sm" variant="outline" onClick={() => setForm({ ...form, options: [...form.options, ''] })}>
                    <Plus className="w-3.5 h-3.5 ml-1" /> إضافة خيار
                  </Button>
                )}
              </div>
            </div>
          )}
          {form.question_type === 'truefalse' && (
            <div>
              <Label>الإجابة الصحيحة</Label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setForm({ ...form, correct_answer: 'true' })} className={`flex-1 py-2 rounded-md border-2 ${form.correct_answer === 'true' ? 'border-green-500 bg-green-50 text-green-700' : 'border-input'}`}>صح ✓</button>
                <button type="button" onClick={() => setForm({ ...form, correct_answer: 'false' })} className={`flex-1 py-2 rounded-md border-2 ${form.correct_answer === 'false' ? 'border-red-500 bg-red-50 text-red-700' : 'border-input'}`}>خطأ ✗</button>
              </div>
            </div>
          )}
          {form.question_type === 'short_answer' && (
            <div>
              <Label>الإجابة الصحيحة (نصية — تتم مقارنتها بدون حساسية لحالة الأحرف)</Label>
              <Input value={typeof form.correct_answer === 'string' ? form.correct_answer : ''} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} className="mt-1" />
            </div>
          )}
          <div>
            <Label>الشرح (يظهر بعد الإجابة)</Label>
            <Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 4) REVIEWS — Read-only list of student reviews. NO moderation actions
//    are exposed to the admin — reviews cannot be deleted, hidden, or
//    suspended. This is by design: student feedback is sacred and must
//    flow unfiltered to the academy's leadership.
// ============================================================================
export function AdminReviews() {
  const [items, setItems] = useState<any[]>([])
  const [courseFilter, setCourseFilter] = useState<string>('')
  const [courses, setCourses] = useState<any[]>([])

  const load = () => {
    const url = courseFilter ? `/api/reviews?course_id=${courseFilter}` : '/api/reviews'
    fetch(url).then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {})
  }
  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [courseFilter])

  // Aggregate stats
  const total = items.length
  const avg = total > 0 ? (items.reduce((s, r) => s + (r.rating || 0), 0) / total) : 0
  const byStar = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: items.filter((r) => r.rating === star).length,
  }))

  return (
    <SectionCard title="تقييمات المتدربين" description={`${total} تقييم · معدل ${avg.toFixed(1)} من 5`} action={
      <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="px-3 py-2 border border-input rounded-md bg-background text-sm">
        <option value="">كل الدورات</option>
        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
    }>
      {/* Aggregate summary */}
      {total > 0 && (
        <Card className="p-5 mb-5 bg-gradient-to-br from-navy/5 to-gold/5 border-gold/20">
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-navy mb-1">{avg.toFixed(1)}</div>
              <div className="flex justify-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(avg) ? 'fill-gold text-gold' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{total} تقييم</p>
            </div>
            <div className="col-span-2 space-y-1.5">
              {byStar.map((d) => {
                const pct = total > 0 ? (d.count / total) * 100 : 0
                return (
                  <div key={d.star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 flex items-center gap-1">{d.star} <Star className="w-3 h-3 fill-gold text-gold" /></span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-gold h-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-left text-muted-foreground">{d.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {total === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p>لا توجد تقييمات بعد</p>
          <p className="text-xs mt-2">سيظهر هنا ما يقيّمه المتدربون عن دوراتهم تلقائياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Author avatar */}
                <Avatar className="w-10 h-10 border border-gold/20 flex-shrink-0">
                  <AvatarImage src={r.author?.avatar || ''} />
                  <AvatarFallback className="bg-navy text-gold text-sm">
                    {r.author?.name?.charAt(0) || '؟'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-navy text-sm">{r.author?.name || 'متدرب'}</span>
                    {r.author?.role === 'admin' && <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">🔐 مدير</Badge>}
                    {r.author?.role === 'trainer' && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">🎓 مدرب</Badge>}
                    {r.author?.role === 'student' && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">📚 متدرب</Badge>}
                    {r.author?.role === 'founder' && <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">👑 المؤسس</Badge>}
                    {r.author?.role === 'leader' && <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px]">🛡️ قائد</Badge>}
                    {r.author?.role === 'team' && <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/30 text-[10px]">🤝 فريق</Badge>}
                    <span className="text-[10px] text-muted-foreground">
                      · {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5" dir="ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'fill-gold text-gold' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>

                  {r.title && <h4 className="font-bold text-navy text-sm mb-1">{r.title}</h4>}
                  {r.body && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.body}</p>}

                  {/* Show course name when not filtered */}
                  {!courseFilter && (() => {
                    const course = courses.find((c) => c.id === r.course_id)
                    return course ? (
                      <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border">
                        📚 الدورة: <span className="text-navy font-medium">{course.title}</span>
                      </p>
                    ) : null
                  })()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================================
// 5) FORUM — Categories + Topics moderation
// ============================================================================
export function AdminForum() {
  const [tab, setTab] = useState<'categories' | 'topics'>('categories')
  const [cats, setCats] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  // NEW: topic viewing + reply + new topic creation
  const [viewingTopic, setViewingTopic] = useState<any | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [newTopicOpen, setNewTopicOpen] = useState(false)
  const [newTopicCat, setNewTopicCat] = useState<string>('')
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicBody, setNewTopicBody] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)
  // NEW: ban a user from inside the topic view
  const [banTarget, setBanTarget] = useState<any | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)

  const loadCats = () => fetch('/api/forum-categories').then((r) => r.json()).then((d) => setCats(Array.isArray(d) ? d : []))
  const loadTopics = () => fetch('/api/forum-topics').then((r) => r.json()).then((d) => setTopics(Array.isArray(d) ? d : []))
  useEffect(() => { loadCats(); loadTopics() }, [])

  const handleDeleteCat = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/forum-categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف الفئة')
      setDeleteTarget(null); loadCats()
    } finally { setDeleting(false) }
  }

  // NEW: open a topic to view its full body + all replies
  const openTopic = async (t: any) => {
    setViewingTopic(t)
    const res = await fetch(`/api/forum?topic_id=${t.id}`)
    const data = await res.json()
    setPosts(Array.isArray(data) ? data : [])
  }

  // NEW: post a reply as the admin (uses admin's user.id)
  const submitReply = async (adminUser: any) => {
    if (!replyText.trim() || !viewingTopic || !adminUser?.id) return
    setReplying(true)
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: viewingTopic.id, user_id: adminUser.id, body: replyText }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الإرسال'); return }
      // Refresh posts (with author profiles)
      const postsRes = await fetch(`/api/forum?topic_id=${viewingTopic.id}`)
      const postsData = await postsRes.json()
      setPosts(Array.isArray(postsData) ? postsData : [])
      setReplyText('')
      loadTopics()
      toast.success('تم نشر ردك')
    } finally { setReplying(false) }
  }

  // NEW: create a new topic (admin can post in any category)
  const submitNewTopic = async (adminUser: any) => {
    if (!newTopicTitle.trim() || !newTopicCat || !adminUser?.id) {
      toast.error('الفئة والعنوان مطلوبان'); return
    }
    setSavingTopic(true)
    try {
      const res = await fetch('/api/forum-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: newTopicCat,
          user_id: adminUser.id,
          title: newTopicTitle,
          body: newTopicBody,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل النشر'); return }
      toast.success('تم نشر الموضوع')
      setNewTopicOpen(false)
      setNewTopicTitle(''); setNewTopicBody('')
      loadTopics()
      openTopic(data)
    } finally { setSavingTopic(false) }
  }

  // NEW: ban a user from inside the topic view
  const handleBanUser = async (adminUser: any) => {
    if (!banTarget || !adminUser?.id) return
    setBanning(true)
    try {
      const res = await fetch('/api/forum-bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banned_user_id: banTarget.userId,
          banned_by_user_id: adminUser.id,
          reason: banReason || 'مخالفة قواعد المنتدى',
          scope: 'all',
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الحظر'); return }
      toast.success(`تم حظر ${banTarget.name} من المنتدى`)
      setBanTarget(null); setBanReason('')
    } finally { setBanning(false) }
  }

  const adminUser = (typeof window !== 'undefined') ? (window as any).__fia_auth_user : null
  // Better: pull admin user from the auth store via the localStorage value
  // We avoid importing useAuth here (already in admin.tsx); pass via window hack
  const getAdminUser = () => {
    try {
      const stored = localStorage.getItem('fia-auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed?.state?.user || null
      }
    } catch {}
    return null
  }
  const currentUser = getAdminUser()

  // NEW: topic detail view (full topic + all replies + reply box)
  if (viewingTopic) {
    return (
      <SectionCard
        title={viewingTopic.title}
        description={`${posts.length} رد · ${viewingTopic.replies_count || 0}`}
        action={
          <Button variant="outline" onClick={() => setViewingTopic(null)}>
            <ArrowRight className="w-4 h-4 ml-1" /> رجوع للقائمة
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Original topic body */}
          {viewingTopic.body && (
            <Card className="p-4 border-gold/30 bg-gold/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7 border border-gold/20">
                    <AvatarImage src={viewingTopic.author?.avatar || ''} />
                    <AvatarFallback className="bg-navy text-gold text-xs">
                      {viewingTopic.author?.name?.charAt(0) || '؟'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy">{viewingTopic.author?.name || 'مستخدم'}</span>
                    {viewingTopic.author?.role === 'admin' && <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">🔐 مدير</Badge>}
                    {viewingTopic.author?.role === 'trainer' && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">🎓 مدرب</Badge>}
                    {viewingTopic.author?.role === 'student' && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">📚 متدرب</Badge>}
                    {viewingTopic.author?.role === 'founder' && <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">👑 المؤسس</Badge>}
                    {viewingTopic.author?.role === 'leader' && <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px]">🛡️ قائد</Badge>}
                    {viewingTopic.author?.role === 'team' && <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/30 text-[10px]">🤝 فريق</Badge>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 inline" /> {new Date(viewingTopic.created_at).toLocaleDateString('ar-EG')}
                </span>
              </div>
              <p className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{viewingTopic.body}</p>
            </Card>
          )}

          {/* Replies */}
          {posts.map((p) => (
            <Card key={p.id} className={`p-4 ${p.is_solution ? 'border-green-500/40 bg-green-500/5' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7 border border-border">
                    <AvatarImage src={p.author?.avatar || ''} />
                    <AvatarFallback className="bg-navy text-gold text-xs">
                      {p.author?.name?.charAt(0) || '؟'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy">{p.author?.name || 'مستخدم'}</span>
                    {p.author?.role === 'admin' && <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">🔐 مدير</Badge>}
                    {p.author?.role === 'trainer' && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">🎓 مدرب</Badge>}
                    {p.author?.role === 'student' && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">📚 متدرب</Badge>}
                    {p.author?.role === 'founder' && <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">👑 المؤسس</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline" /> {new Date(p.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  {/* Ban button (not on self, not on admins) */}
                  {currentUser && p.user_id !== currentUser.id && p.author?.role !== 'admin' && (
                    <button
                      onClick={() => setBanTarget({ userId: p.user_id, name: p.author?.name || 'مستخدم' })}
                      className="text-xs text-red-500 hover:bg-red-500/10 px-2 py-1 rounded"
                      title="حظر من المنتدى"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {p.is_solution && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">✓ حل</Badge>}
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.body}</p>
            </Card>
          ))}

          {/* Reply box */}
          <Card className="p-4 bg-muted/30">
            <Label className="mb-2 block">أضف رداً (بصفتك مدير النظام)</Label>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              placeholder="اكتب ردك هنا..."
              dir="rtl"
              disabled={replying}
            />
            <div className="flex justify-end mt-2">
              <Button onClick={() => submitReply(currentUser)} disabled={replying || !replyText.trim()} className="bg-navy hover:bg-navy-light">
                {replying ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
                {replying ? 'جاري الإرسال...' : 'نشر الرد'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Ban confirmation dialog */}
        <Dialog open={!!banTarget} onOpenChange={(o) => { if (!o) { setBanTarget(null); setBanReason('') } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Ban className="w-5 h-5" /> حظر {banTarget?.name} من المنتدى
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                سيتم منع هذا المستخدم من نشر المواضيع والردود في المنتدى. يمكن رفع الحظر لاحقاً من شاشة "حظر المنتدى".
              </p>
              <div>
                <Label>السبب (اختياري)</Label>
                <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="مخالفة قواعد المنتدى" className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setBanTarget(null); setBanReason('') }}>إلغاء</Button>
              <Button onClick={() => handleBanUser(currentUser)} disabled={banning} className="bg-red-500 hover:bg-red-600">
                {banning ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Ban className="w-4 h-4 ml-1" />}
                تأكيد الحظر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="إدارة المنتدى" description={`${cats.length} فئة · ${topics.length} موضوع`} action={
      <div className="flex gap-2 items-center">
        <Button size="sm" variant={tab === 'categories' ? 'default' : 'outline'} onClick={() => setTab('categories')} className={tab === 'categories' ? 'bg-navy' : ''}>الفئات</Button>
        <Button size="sm" variant={tab === 'topics' ? 'default' : 'outline'} onClick={() => setTab('topics')} className={tab === 'topics' ? 'bg-navy' : ''}>المواضيع</Button>
        {tab === 'topics' && (
          <Button size="sm" className="bg-gold hover:bg-gold-light text-navy ml-2" onClick={() => {
            if (cats.length === 0) { toast.error('أضف فئة أولاً'); return }
            setNewTopicCat(cats[0].id)
            setNewTopicOpen(true)
          }}>
            <Plus className="w-3.5 h-3.5 ml-1" /> موضوع جديد
          </Button>
        )}
      </div>
    }>
      {tab === 'categories' ? (
        <>
          <div className="flex justify-end mb-3">
            <Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditingCat(null); setOpenCat(true) }}><Plus className="w-4 h-4 ml-1" /> فئة جديدة</Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cats.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{c.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-navy">{c.name}</div>
                    {c.description && <div className="text-xs text-muted-foreground mt-1">{c.description}</div>}
                    <div className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">{c.slug}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingCat(c); setOpenCat(true) }}><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </Card>
            ))}
          </div>
          {openCat && <CategoryDialog open={openCat} onOpenChange={setOpenCat} initial={editingCat} onSaved={() => { setOpenCat(false); loadCats() }} />}
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
            title="حذف الفئة"
            message="سيتم حذف الفئة وكل مواضيعها ومنشوراتها. متأكد؟"
            itemLabel="الفئة:"
            itemName={deleteTarget?.name}
            confirmLabel="حذف"
            cancelLabel="إلغاء"
            variant="danger"
            onConfirm={handleDeleteCat}
            loading={deleting}
          />
        </>
      ) : (
        <div className="space-y-3">
          {topics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد مواضيع بعد. اضغط "موضوع جديد" لإضافة أول موضوع.</p>
            </div>
          ) : topics.map((t) => (
            <Card key={t.id} className="p-4 hover:shadow-md transition-all">
              <button onClick={() => openTopic(t)} className="w-full text-right">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {t.pinned && <Badge className="bg-gold/15 text-gold border-gold/30 mb-1 text-[10px]">📌 مثبت</Badge>}
                    <h4 className="font-bold text-navy text-sm mb-1">{t.title}</h4>
                    {t.body && <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span><Eye className="w-3 h-3 inline" /> {t.views || 0}</span>
                      <span><MessageSquare className="w-3 h-3 inline" /> {t.replies_count || 0}</span>
                      <span><Clock className="w-3 h-3 inline" /> {t.created_at ? new Date(t.created_at).toLocaleDateString('ar-EG') : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openTopic(t) }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={async (e) => {
                      e.stopPropagation()
                      await fetch('/api/forum-topics', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, pinned: !t.pinned }) })
                      toast.success(t.pinned ? 'تم إلغاء التثبيت' : 'تم التثبيت'); loadTopics()
                    }}><Award className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={async (e) => {
                      e.stopPropagation()
                      await fetch('/api/forum-topics', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id }) })
                      toast.success('تم حذف الموضوع'); loadTopics()
                    }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* New topic dialog */}
      <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>موضوع جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>الفئة *</Label>
              <select value={newTopicCat} onChange={(e) => setNewTopicCat(e.target.value)} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="">— اختر فئة —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>العنوان *</Label>
              <Input value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} className="mt-1" placeholder="عنوان جذاب يلخص الموضوع" />
            </div>
            <div>
              <Label>المحتوى</Label>
              <Textarea value={newTopicBody} onChange={(e) => setNewTopicBody(e.target.value)} rows={8} className="mt-1" placeholder="اكتب محتوى الموضوع هنا..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTopicOpen(false)}>إلغاء</Button>
            <Button onClick={() => submitNewTopic(currentUser)} disabled={savingTopic} className="bg-navy hover:bg-navy-light">
              {savingTopic ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
              نشر الموضوع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}

function CategoryDialog({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || { name: '', description: '', slug: '', icon: '💬', display_order: 0 })
  const [saving, setSaving] = useState(false)
  useEffect(() => { setForm(initial || { name: '', description: '', slug: '', icon: '💬', display_order: 0 }) }, [initial])

  const save = async () => {
    if (!form.name) { toast.error('الاسم مطلوب'); return }
    if (!form.slug) form.slug = form.name.replace(/\s+/g, '-').toLowerCase()
    setSaving(true)
    try {
      const res = await fetch('/api/forum-categories', { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initial ? { id: initial.id, ...form } : form) })
      if (res.ok) { toast.success(initial ? 'تم التحديث' : 'تم الإنشاء'); onSaved() }
      else { const d = await res.json(); toast.error(d.error || 'فشل') }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{initial ? 'تعديل فئة' : 'فئة جديدة'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
          <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
          <div><Label>الـ slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" className="mt-1 font-mono" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الأيقونة</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="mt-1 text-center text-2xl" /></div>
            <div><Label>ترتيب العرض</Label><Input type="number" value={form.display_order || ''} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="mt-1" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">{saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null} حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 6) BLOG — Posts management
// ============================================================================
export function AdminBlog() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [viewingPost, setViewingPost] = useState<any | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => fetch('/api/blog').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/blog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف المقال')
      setDeleteTarget(null); load()
    } finally { setDeleting(false) }
  }

  // In-place article preview view
  if (viewingPost) {
    return (
      <SectionCard
        title={viewingPost.title}
        description={viewingPost.published_at ? new Date(viewingPost.published_at).toLocaleDateString('ar-EG') : ''}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(viewingPost); setOpen(true) }}>
              <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewingPost(null)}>
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع للقائمة
            </Button>
          </div>
        }
      >
        <article className="max-w-3xl mx-auto">
          {viewingPost.cover && (
            <div className="aspect-video rounded-2xl overflow-hidden shadow-xl mb-6">
              <img src={viewingPost.cover} alt={viewingPost.title} className="w-full h-full object-cover" />
            </div>
          )}
          {viewingPost.tags && (
            <div className="flex flex-wrap gap-2 mb-4">
              {viewingPost.tags.split(',').map((t: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{t.trim()}</Badge>
              ))}
            </div>
          )}
          {viewingPost.excerpt && (
            <p className="text-lg text-navy/80 leading-relaxed mb-6 border-r-4 border-gold pr-4">
              {viewingPost.excerpt}
            </p>
          )}
          <div className="prose prose-lg max-w-none text-navy/90 leading-loose whitespace-pre-wrap">
            {viewingPost.body}
          </div>
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {viewingPost.views || 0} قراءة
            </span>
            <a
              href={`/blog/${viewingPost.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gold hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> فتح الرابط العام
            </a>
          </div>
        </article>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="المدونة" description={`${items.length} مقال`} action={
      <Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}>
        <Plus className="w-4 h-4 ml-1" /> مقال جديد
      </Button>
    }>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد مقالات بعد. اضغط "مقال جديد" لنشر أول مقال.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => (
            <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-all group flex flex-col">
              {p.cover ? (
                <div className="aspect-video overflow-hidden bg-navy/10">
                  <img src={p.cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                  <Newspaper className="w-12 h-12 text-gold/40" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">{p.status || 'منشور'}</Badge>
                  {p.tags && <Badge variant="outline" className="text-[10px] text-gold border-gold/30">{p.tags.split(',')[0].trim()}</Badge>}
                </div>
                <h4 className="font-bold text-navy text-base mb-2 line-clamp-2">{p.title}</h4>
                {p.excerpt && <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{p.excerpt}</p>}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t border-border">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.published_at ? new Date(p.published_at).toLocaleDateString('ar-EG') : ''}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views || 0}</span>
                </div>
                <div className="flex gap-1.5 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewingPost(p)}>
                    <Eye className="w-3.5 h-3.5 ml-1" /> عرض
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true) }}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {open && <BlogPostDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={() => { setOpen(false); load() }} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="حذف المقال"
        message="هل أنت متأكد؟"
        itemLabel="المقال:"
        itemName={deleteTarget?.title}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

function BlogPostDialog({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || { title: '', excerpt: '', body: '', cover: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  useEffect(() => { setForm(initial || { title: '', excerpt: '', body: '', cover: '', tags: '' }) }, [initial])

  const save = async () => {
    if (!form.title || !form.body) { toast.error('العنوان والمحتوى مطلوبان'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/blog', { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initial ? { id: initial.id, ...form } : form) })
      if (res.ok) { toast.success(initial ? 'تم التحديث' : 'تم النشر'); onSaved() }
      else { const d = await res.json(); toast.error(d.error || 'فشل') }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{initial ? 'تعديل مقال' : 'مقال جديد'}</DialogTitle>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setPreview(false)}
                className={`px-3 py-1 text-xs font-bold rounded ${!preview ? 'bg-navy text-gold' : 'text-muted-foreground'}`}
              >تحرير</button>
              <button
                onClick={() => setPreview(true)}
                className={`px-3 py-1 text-xs font-bold rounded ${preview ? 'bg-navy text-gold' : 'text-muted-foreground'}`}
              >معاينة</button>
            </div>
          </div>
        </DialogHeader>

        {preview ? (
          /* Live preview — exactly what readers will see */
          <div className="overflow-y-auto py-4 max-h-[70vh]">
            <article>
              {form.cover && (
                <div className="aspect-video rounded-xl overflow-hidden shadow-md mb-4">
                  <img src={form.cover} alt={form.title} className="w-full h-full object-cover" />
                </div>
              )}
              {form.tags && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.tags.split(',').map((t: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{t.trim()}</Badge>
                  ))}
                </div>
              )}
              <h1 className="text-2xl font-bold text-navy mb-3">{form.title || 'العنوان غير مكتوب'}</h1>
              {form.excerpt && (
                <p className="text-base text-navy/80 leading-relaxed mb-4 border-r-4 border-gold pr-3">{form.excerpt}</p>
              )}
              <div className="text-navy/90 leading-loose whitespace-pre-wrap">
                {form.body || 'المحتوى فارغ'}
              </div>
            </article>
          </div>
        ) : (
          <div className="space-y-4 py-4 overflow-y-auto max-h-[70vh]">
            <div>
              <Label>العنوان *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="عنوان جذاب للمقال" />
            </div>
            <div>
              <Label>مقتطف (مقدمة قصيرة تظهر في قائمة المقالات)</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="mt-1" placeholder="جملة أو جملتان تلخصان المقال" />
            </div>
            <div>
              <Label>المحتوى *</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={12} className="mt-1 leading-relaxed" placeholder="اكتب محتوى المقال هنا... استخدم أسطر فارغة لفصل الفقرات." />
              <p className="text-[10px] text-muted-foreground mt-1">💡 استخدم أسطر فارغة لفصل الفقرات. سيتم الحفاظ على التنسيق عند العرض.</p>
            </div>
            <div>
              <Label>رابط صورة الغلاف</Label>
              <Input value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} dir="ltr" className="mt-1" placeholder="https://..." />
              {form.cover && (
                <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-border">
                  <img src={form.cover} alt="cover preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label>الوسوم (مفصولة بفاصلة)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="mt-1" placeholder="تعليم، طب، تدريب" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null} نشر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 7) CONTACT MESSAGES — Inbox
// ============================================================================
export function AdminContact() {
  const [items, setItems] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)

  const load = () => fetch('/api/contact').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const updateStatus = async (m: any, newStatus: string) => {
    await fetch('/api/contact', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, status: newStatus }) })
    load()
    if (selected?.id === m.id) setSelected({ ...m, status: newStatus })
  }

  return (
    <SectionCard title="صندوق الرسائل" description={`${items.filter(i => i.status === 'جديد').length} جديدة من ${items.length}`}>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد رسائل بعد</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m)
                  if (m.status === 'جديد') updateStatus(m, 'مقروء')
                }}
                className={`w-full text-right p-3 rounded-lg border transition-all ${selected?.id === m.id ? 'border-gold bg-gold/5' : 'border-border hover:bg-muted/50'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${m.status === 'جديد' ? 'text-navy' : 'text-muted-foreground'}`}>{m.name}</span>
                  <Badge className={
                    m.status === 'جديد' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' :
                    m.status === 'مقروء' ? 'bg-gray-500/15 text-gray-600 border-gray-500/30' :
                    m.status === 'مُجاب' ? 'bg-green-500/15 text-green-600 border-green-500/30' :
                    'bg-muted text-muted-foreground'
                  }>{m.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground" dir="ltr">{m.email}</div>
                {m.subject && <div className="text-xs text-muted-foreground mt-1 truncate">{m.subject}</div>}
                <div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleDateString('ar-EG')}</div>
              </button>
            ))}
          </div>
          {selected && (
            <Card className="p-4 sticky top-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-navy">{selected.name}</h4>
                  <a href={`mailto:${selected.email}`} className="text-xs text-gold" dir="ltr">{selected.email}</a>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}><X className="w-4 h-4" /></Button>
              </div>
              {selected.subject && <h5 className="font-bold text-navy text-sm mb-2">{selected.subject}</h5>}
              <div className="bg-muted/30 rounded p-3 text-sm text-gray-700 leading-relaxed mb-4">{selected.message}</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(selected, 'مُجاب')}><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تم الرد</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(selected, 'مغلق')}>إغلاق</Button>
                <a href={`mailto:${selected.email}?subject=رد: ${encodeURIComponent(selected.subject || '')}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-navy hover:bg-navy-light text-white text-sm">
                  <Mail className="w-3.5 h-3.5" /> رد عبر البريد
                </a>
              </div>
            </Card>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================================
// 8) FAQS — Frequently asked questions
// ============================================================================
export function AdminFaqs() {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => fetch('/api/faqs').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/faqs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف السؤال')
      setDeleteTarget(null); load()
    } finally { setDeleting(false) }
  }

  return (
    <SectionCard title="الأسئلة الشائعة" description={`${items.length} سؤال`} action={<Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="w-4 h-4 ml-1" /> سؤال جديد</Button>}>
      <div className="space-y-3">
        {items.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle className="w-4 h-4 text-gold flex-shrink-0" />
                  <h4 className="font-bold text-navy text-sm">{f.question}</h4>
                  <Badge variant="outline" className="text-xs">{f.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 pr-6">{f.answer}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { setEditing(f); setOpen(true) }}><Edit className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(f)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {open && <FaqDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={() => { setOpen(false); load() }} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="حذف السؤال"
        message="هل أنت متأكد؟"
        itemLabel="السؤال:"
        itemName={deleteTarget?.question}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </SectionCard>
  )
}

function FaqDialog({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || { question: '', answer: '', category: 'عام', display_order: 0 })
  const [saving, setSaving] = useState(false)
  useEffect(() => { setForm(initial || { question: '', answer: '', category: 'عام', display_order: 0 }) }, [initial])

  const save = async () => {
    if (!form.question || !form.answer) { toast.error('السؤال والإجابة مطلوبان'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/faqs', { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initial ? { id: initial.id, ...form } : form) })
      if (res.ok) { toast.success(initial ? 'تم التحديث' : 'تمت الإضافة'); onSaved() }
      else { const d = await res.json(); toast.error(d.error || 'فشل') }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'تعديل سؤال' : 'سؤال جديد'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>السؤال *</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="mt-1" /></div>
          <div><Label>الإجابة *</Label><Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1" /></div>
            <div><Label>ترتيب العرض</Label><Input type="number" value={form.display_order || ''} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="mt-1" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">{saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null} حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
