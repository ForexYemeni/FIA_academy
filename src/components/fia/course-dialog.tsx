'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2, FileUp, X, BookOpen, Tag, DollarSign, Settings, Image as ImageIcon,
  GraduationCap, Layers,
} from 'lucide-react'

const CATEGORIES = [
  // طبية
  'الطب الباطني', 'طب الطوارئ', 'الجراحة العامة', 'التخدير والإنعاش',
  'أمراض القلب', 'الأمراض الصدرية', 'أمراض الكلى', 'أمراض الجهاز الهضمي',
  'الطب النفسي', 'طب الأطفال', 'النساء والولادة', 'الجلدية',
  'العيون', 'أنف وأذن وحنجرة', 'الأشعة', 'المخبرات الطبية',
  'التمريض', 'الإنعاش القلبي الرئوي (BLS/ACLS)',
  'مكافحة العدوى', 'صحة الأم والطفل', 'الصيدلة السريرية',
  'التغذية العلاجية', 'العلاج الطبيعي', 'الأسنان',
  'الأمراض المزمنة', 'الصحة العامة', 'الطب الشرعي',
  'إدارة المنشآت الصحية', 'التعليم الطبي المستمر',
  // فنية
  'المختبرات الطبية', 'التشريح المرضي', 'بنك الدم',
  'الأجهزة الطبية', 'تقنية المعلومات الصحية',
  'السجلات الطبية الإلكترونية', 'ترميز الفواتير الطبية',
  // مهنية وتقنية
  'إدارة الأعمال', 'إدارة المشاريع', 'التسويق', 'المبيعات',
  'الموارد البشرية', 'المحاسبة', 'الخدمات المالية',
  'تقنية المعلومات (IT)', 'الأمن السيبراني', 'تحليل البيانات',
  'البرمجة', 'تصميم المواقع', 'التصميم الجرافيكي',
  'إدارة الجودة', 'السلامة المهنية', 'الصحة والسلامة المهنية',
  'التدريب والتطوير', 'اللغات', 'اللغة الإنجليزية',
  'القيادة والإدارة', 'خدمة العملاء', 'الإنتاج الصناعي',
  'الميكانيكا', 'الكهرباء', 'السباكة', 'التبريد والتكييف',
  'اللحام', 'السيارات', 'الزراعة', 'التصوير الفوتوغرافي',
  'الطبخ وإدارة المطاعم', 'السياحة والفندقة',
  // عام
  'تخصصات أخرى',
]

const LEVELS = [
  { value: 'مبتدئ', label: 'مبتدئ', desc: 'للمبتدئين بدون خبرة سابقة' },
  { value: 'متوسط', label: 'متوسط', desc: 'يتطلب معرفة أساسية' },
  { value: 'متقدم', label: 'متقدم', desc: 'للممارسين ذوي الخبرة' },
]

const CURRENCIES = ['ر.ي', 'ر.س', '$', '€']

export function CourseDialog({ open, onOpenChange, course, trainerId, onSaved }: any) {
  const [form, setForm] = useState<any>(
    course || {
      title: '', short_description: '', description: '', category: '', specialization: '',
      level: 'متوسط', price_type: 'مجانية', price: 0, currency: 'ر.ي',
      duration_hours: 0, pass_score: 60, cover: '', status: 'منشورة',
    }
  )
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  useEffect(() => {
    setForm(course || {
      title: '', short_description: '', description: '', category: '', specialization: '',
      level: 'متوسط', price_type: 'مجانية', price: 0, currency: 'ر.ي',
      duration_hours: 0, pass_score: 60, cover: '', status: 'منشورة',
    })
  }, [course, open])

  const handleUploadCover = async (file: File) => {
    setUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'courses')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        setForm((prev: any) => ({ ...prev, cover: data.url }))
        toast.success('تم رفع صورة الغلاف')
      } else {
        toast.error('فشل رفع الصورة')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setUploadingCover(false)
    }
  }

  const save = async () => {
    if (!form.title) { toast.error('أدخل عنوان الدورة'); return }
    setSaving(true)
    try {
      const slug = form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\u0600-\u06FFa-z0-9-]/g, '').slice(0, 80) || 'course-' + Date.now()
      const body: any = {
        title: form.title,
        short_description: form.short_description ?? '',
        description: form.description ?? '',
        category: form.category || null,
        specialization: form.specialization || null,
        level: form.level,
        price_type: form.price_type,
        price: Number(form.price) || 0,
        currency: form.currency || 'ر.ي',
        duration_hours: Number(form.duration_hours) || 0,
        pass_score: Number(form.pass_score) || 60,
        status: form.status || 'منشورة',
        cover: form.cover ?? null,
        slug,
        trainer_id: trainerId,
        modules_count: 0,
        lessons_count: 0,
      }
      const res = await fetch('/api/courses', {
        method: course ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course ? { id: course.id, ...body } : body),
      })
      if (res.ok) {
        toast.success(course ? 'تم تحديث الدورة' : 'تم إنشاء الدورة')
        onSaved()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشل الحفظ')
      }
    } catch {
      toast.error('خطأ')
    } finally {
      setSaving(false)
    }
  }

  // Custom select component — professional looking
  const Select = ({ label, value, onChange, options, icon: Icon }: any) => (
    <div>
      <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gold" />}
        {label}
      </Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 pl-3 pr-9 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 appearance-none cursor-pointer transition-all"
        >
          {options.map((o: any) => (
            <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
          ))}
        </select>
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-gold" />
            </div>
            {course ? 'تعديل الدورة' : 'دورة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* === Section 1: Basic Info === */}
          <div className="space-y-3 p-4 bg-gradient-to-br from-navy/5 to-gold/5 rounded-xl border border-gold/10">
            <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wide">
              <BookOpen className="w-3.5 h-3.5 text-gold" /> المعلومات الأساسية
            </div>
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">عنوان الدورة *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-10 text-sm" placeholder="مثال: أساسيات علم الأدوية" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">وصف مختصر</Label>
              <Input value={form.short_description || ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                className="h-10 text-sm" placeholder="جملة واحدة تلخص الدورة" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">الوصف الكامل</Label>
              <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} className="text-sm resize-none" placeholder="وصف تفصيلي لمحتوى الدورة..." />
            </div>
          </div>

          {/* === Section 2: Category & Level === */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="التخصص"
              value={form.category || ''}
              onChange={(v: string) => setForm({ ...form, category: v })}
              options={[{ value: '', label: '— اختر التخصص —' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
              icon={Tag}
            />
            <Select
              label="المستوى"
              value={form.level}
              onChange={(v: string) => setForm({ ...form, level: v })}
              options={LEVELS.map(l => ({ value: l.value, label: `${l.label} — ${l.desc}` }))}
              icon={Layers}
            />
          </div>

          {/* === Section 3: Pricing === */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wide">
              <DollarSign className="w-3.5 h-3.5 text-gold" /> التسعير
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="النوع"
                value={form.price_type}
                onChange={(v: string) => setForm({ ...form, price_type: v })}
                options={[{ value: 'مجانية', label: 'مجانية' }, { value: 'مدفوعة', label: 'مدفوعة' }]}
              />
              <Select
                label="العملة"
                value={form.currency || 'ر.ي'}
                onChange={(v: string) => setForm({ ...form, currency: v })}
                options={CURRENCIES.map(c => ({ value: c, label: c }))}
              />
            </div>
            {form.price_type === 'مدفوعة' && (
              <div>
                <Label className="text-xs font-bold text-navy mb-1.5 block">المبلغ</Label>
                <Input type="number" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                  className="h-10 text-sm" dir="ltr" placeholder="0" />
              </div>
            )}
          </div>

          {/* === Section 4: Settings === */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wide">
              <Settings className="w-3.5 h-3.5 text-gold" /> الإعدادات
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-navy mb-1.5 block">عدد الساعات</Label>
                <Input type="number" value={form.duration_hours || ''} onChange={(e) => setForm({ ...form, duration_hours: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                  className="h-10 text-sm" dir="ltr" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs font-bold text-navy mb-1.5 block">درجة النجاح (%)</Label>
                <Input type="number" value={form.pass_score || ''} onChange={(e) => setForm({ ...form, pass_score: e.target.value === '' ? 60 : parseInt(e.target.value) || 60 })}
                  className="h-10 text-sm" dir="ltr" placeholder="60" />
              </div>
            </div>
            <Select
              label="الحالة"
              value={form.status || 'منشورة'}
              onChange={(v: string) => setForm({ ...form, status: v })}
              options={[{ value: 'منشورة', label: 'منشورة' }, { value: 'مسودة', label: 'مسودة' }]}
            />
          </div>

          {/* === Section 5: Cover Image === */}
          <div>
            <Label className="text-xs font-bold text-navy mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-gold" /> صورة الغلاف
            </Label>
            <div className="flex items-center gap-3">
              {form.cover ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gold/20 flex-shrink-0">
                  <img src={form.cover} alt="cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm({ ...form, cover: '' })}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 flex-shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" id="cover-upload-pro"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f) }} />
              <Button variant="outline" type="button" disabled={uploadingCover}
                onClick={() => document.getElementById('cover-upload-pro')?.click()}
                className="h-9 text-xs">
                {uploadingCover ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <FileUp className="w-3.5 h-3.5 ml-1" />}
                {uploadingCover ? 'جاري...' : form.cover ? 'تغيير' : 'رفع صورة'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
            {saving ? 'جاري الحفظ...' : course ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
