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
  GraduationCap, Layers, Briefcase, ChevronDown, ChevronUp, Gift,
} from 'lucide-react'

// Category groups — top-level dropdown
const CATEGORY_GROUPS = [
  { value: 'طبي', label: 'طبي', roles: ['طبيب عام', 'أخصائي بااطنة', 'جراح', 'طبيب طوارئ', 'طبيب تخدير', 'طبيب أطفال', 'طبيب نساء وولادة', 'طبيب جلدية', 'طبيب عيون', 'طبيب أنف وأذن وحنجرة', 'طبيب أشعة', 'طبيب نفسي', 'طبيب أسنان', 'طبيب شرعي'] },
  { value: 'تمريض', label: 'تمريض', roles: ['ممرض/ة عام', 'ممرض رعاية مركزة', 'ممرض طوارئ', 'ممرض عمليات', 'ممرض أطفال', 'ممرض نساء وولادة', 'ممرض صحة عامة', 'ممرض تمريض منزلي'] },
  { value: 'مختبرات', label: 'مختبرات', roles: ['فني مختبر', 'أخصائي تحاليل', 'فني تشريح مرضي', 'فني بنك دم', 'أخصائي ميكروبيولوجي'] },
  { value: 'صيدلة', label: 'صيدلة', roles: ['صيدلي', 'فني صيدلة', 'أخصائي صيدلة سريرية'] },
  { value: 'إنعاش وطوارئ', label: 'إنعاش وطوارئ', roles: ['فني إنعاش', 'مختص BLS', 'مختص ACLS', 'مسعف', 'فني إسعاف'] },
  { value: 'صحة عامة', label: 'صحة عامة', roles: ['أخصائي صحة عامة', 'مفتش صحي', 'أخصائي مكافحة عدوى', 'أخصائي التغذية', 'أخصائي صحة الأم والطفل'] },
  { value: 'علاج طبيعي', label: 'علاج طبيعي', roles: ['أخصائي علاج طبيعي', 'فني علاج طبيعي'] },
  { value: 'إدارة صحية', label: 'إدارة صحية', roles: ['مدير مستشفى', 'مدير مركز صحي', 'مسؤول جودة', 'مسؤول سجلات طبية', 'محاسب طبي'] },
  { value: 'أجهزة طبية', label: 'أجهزة طبية', roles: ['فني أشعة', 'فني تخطيط قلب', 'فني نظارات طبية', 'مهندس أجهزة طبية'] },
  { value: 'تعليم طبي', label: 'تعليم طبي مستمر', roles: ['محاضر', 'مدرب طبي', 'مقيّم'] },
  { value: 'إدارة الأعمال', label: 'إدارة الأعمال', roles: ['مدير عام', 'مدير مشاريع', 'مدير موارد بشرية', 'محاسب', 'محلل أعمال'] },
  { value: 'تقنية', label: 'تقنية', roles: ['مبرمج', 'محلل بيانات', 'مهندس شبكات', 'أخصائي أمن سيبراني', 'مصمم مواقع', 'مصمم جرافيك'] },
  { value: 'تسويق ومبيعات', label: 'تسويق ومبيعات', roles: ['أخصائي تسويق', 'مندوب مبيعات', 'مدير مبيعات', 'أخصائي علاقات عامة'] },
  { value: 'مهني وحرفي', label: 'مهني وحرفي', roles: ['فني كهرباء', 'فني ميكانيكا', 'فني تبريد', 'فني لحام', 'فني سباكة', 'فني سيارات', 'أخصائي سلامة مهنية'] },
  { value: 'خدمات', label: 'خدمات', roles: ['أخصائي خدمة عملاء', 'موظف استقبال', 'دليل سياحي', 'طاهٍ', 'مدير مطعم'] },
  { value: 'لغات', label: 'لغات', roles: ['مدرس إنجليزية', 'مدرس عربي', 'مترجم'] },
  { value: 'أخرى', label: 'أخرى', roles: ['عام'] },
]

const LEVELS = [
  { value: 'مبتدئ', label: 'مبتدئ — للمبتدئين بدون خبرة' },
  { value: 'متوسط', label: 'متوسط — يتطلب معرفة أساسية' },
  { value: 'متقدم', label: 'متقدم — للممارسين ذوي الخبرة' },
]

const CURRENCIES = ['ر.ي', 'ر.س', '$', '€']

export function CourseDialog({ open, onOpenChange, course, trainerId, onSaved }: any) {
  const [form, setForm] = useState<any>(
    course || {
      title: '', short_description: '', description: '',
      category: '', specialization: '',
      level: 'متوسط', price_type: 'مجانية', price: 0, original_price: 0, currency: 'ر.ي',
      auto_coupon_code: '',
      offer_type: 'none', offer_duration_value: 0, offer_duration_unit: 'days',
      offer_price: 0, offer_headline: '',
      duration_hours: 0, pass_score: 60, cover: '', status: 'منشورة',
    }
  )
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  // Collapsible description state — defaults to collapsed so the
  // dialog stays compact, expands when the user wants to write more.
  const [descExpanded, setDescExpanded] = useState(false)
  // Show the "create coupon inline" form when the trainer wants to
  // create a NEW coupon (vs. just typing an existing coupon code).
  const [showCreateCoupon, setShowCreateCoupon] = useState(false)
  const [newCouponDiscount, setNewCouponDiscount] = useState('10')

  useEffect(() => {
    // When loading a course for editing, strip any HTML tags from
    // the description/short_description fields — old courses may have
    // been saved with HTML from the previous SimpleDialog which
    // looked ugly in the textarea.
    const stripHtml = (html: string | null | undefined): string => {
      if (!html) return ''
      let text = html
      // Strip the legacy ===FIA_MODULES=== JSON that was stored in the
      // description field (old course format stored modules inline).
      const modulesIdx = text.indexOf('===FIA_MODULES===')
      if (modulesIdx !== -1) {
        text = text.substring(0, modulesIdx)
      }
      // Also strip the legacy ===FIA_EXTRA=== marker
      const extraIdx = text.indexOf('===FIA_EXTRA===')
      if (extraIdx !== -1) {
        text = text.substring(0, extraIdx)
      }
      // If it doesn't contain HTML tags, return as-is
      if (!/<[a-z][\s\S]*>/i.test(text)) return text.trim()
      // Strip HTML tags, decode common entities
      return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    setForm(course ? {
      ...course,
      description: stripHtml(course.description),
      short_description: stripHtml(course.short_description),
      // Keep numeric fields as strings so the input is fully editable
      // (no parseInt bouncing back to defaults while typing)
      pass_score: String(course.pass_score ?? 60),
      duration_hours: String(course.duration_hours ?? 0),
      price: String(course.price ?? 0),
      original_price: String(course.original_price ?? 0),
      auto_coupon_code: course.auto_coupon_code || '',
      offer_type: course.offer_type || 'none',
      offer_duration_value: String(course.offer_duration_value ?? 0),
      offer_duration_unit: course.offer_duration_unit || 'days',
      offer_price: String(course.offer_price ?? 0),
      offer_headline: course.offer_headline || '',
    } : {
      title: '', short_description: '', description: '',
      category: '', specialization: '',
      level: 'متوسط', price_type: 'مجانية', price: '0', original_price: '0', currency: 'ر.ي',
      auto_coupon_code: '',
      offer_type: 'none', offer_duration_value: '0', offer_duration_unit: 'days',
      offer_price: '0', offer_headline: '',
      duration_hours: '', pass_score: '', cover: '', status: 'منشورة',
    })
  }, [course, open])

  // Get roles for the currently selected category
  const currentRoles = CATEGORY_GROUPS.find(g => g.value === form.category)?.roles || []

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

  // Create a new coupon inline (when trainer wants to add a fresh
  // discount coupon for this course). Generates a FIA-XXXXXX code.
  const createCouponInline = async () => {
    const code = 'FIA-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const discount = Number(newCouponDiscount) || 10
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description: `كوبون تلقائي لدورة: ${form.title || ''}`,
          discount_type: 'percentage',
          discount_value: discount,
          // No max_uses — unlimited (but per-user restriction still
          // applies: each student can only use it once across all
          // courses).
          // No course_id — coupon can be entered manually too.
        }),
      })
      const data = await res.json()
      if (res.ok && data.code) {
        setForm((prev: any) => ({ ...prev, auto_coupon_code: data.code }))
        toast.success(`تم إنشاء الكوبون: ${data.code}`)
        setShowCreateCoupon(false)
      } else {
        toast.error(data.error || 'فشل إنشاء الكوبون')
      }
    } catch {
      toast.error('خطأ في إنشاء الكوبون')
    }
  }

  const save = async () => {
    if (!form.title) { toast.error('أدخل عنوان الدورة'); return }
    setSaving(true)
    try {
      // === SLUG GENERATION ===
      // Slugs MUST be ASCII-only (Arabic chars get URL-encoded by the
      // browser and break Next.js routing — see migration 006).
      // We strip everything that isn't a-z, 0-9, or hyphen. Then we
      // append a short timestamp suffix so two courses with similar
      // titles (e.g. "دورة طب" / "دورة طب ٢") don't collide on the
      // unique `slug` constraint.
      const asciiPart = form.title
        .toLowerCase()
        // Replace whitespace with hyphens
        .replace(/\s+/g, '-')
        // Strip anything that's NOT a-z, 0-9, or hyphen (Arabic chars
        // and all punctuation get removed)
        .replace(/[^a-z0-9-]/g, '')
        // Collapse multiple hyphens
        .replace(/-+/g, '-')
        // Trim leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)  // leave room for the suffix
      // Always append a short timestamp suffix to guarantee uniqueness.
      // Even if two courses have identical ASCII-transliterations,
      // the suffix differs.
      const slugSuffix = Date.now().toString(36).slice(-6).toUpperCase()
      const slug = asciiPart
        ? `${asciiPart}-${slugSuffix}`
        : `course-${slugSuffix}`

      const body: any = {
        title: form.title,
        short_description: form.short_description ?? '',
        description: form.description ?? '',
        category: form.category || null,
        specialization: form.specialization || form.category || null,
        level: form.level,
        price_type: form.price_type,
        // price = the ACTUAL selling price (required for paid courses).
        // If not entered, default to 0 — but this should only happen
        // for free courses.
        price: Number(form.price) || 0,
        // original_price = the "was" price shown struck through.
        // ONLY send if it's > 0 AND > price. If 0 or empty, send null
        // so no strikethrough is shown.
        original_price: (Number(form.original_price) || 0) > (Number(form.price) || 0)
          ? Number(form.original_price)
          : null,
        currency: form.currency || 'ر.ي',
        auto_coupon_code: form.auto_coupon_code?.trim() || null,
        // Promotional offer fields
        offer_type: form.offer_type || 'none',
        offer_duration_value: Number(form.offer_duration_value) || 0,
        offer_duration_unit: form.offer_duration_unit || 'days',
        // offer_price = optional promotional price. 0 = use regular price.
        offer_price: Number(form.offer_price) || 0,
        offer_headline: form.offer_headline?.trim() || null,
        duration_hours: Number(form.duration_hours) || 0,
        pass_score: Number(form.pass_score) || 60,
        status: form.status || 'منشورة',
        cover: form.cover ?? null,
        slug,
        trainer_id: trainerId,
        // NOTE: modules_count and lessons_count are NOT sent here. The
        // /api/courses PUT handler recomputes them from the inline
        // modules JSON stored in the description, so we never
        // accidentally zero them out when editing the course.
      }
      const res = await fetch('/api/courses', {
        method: course ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course ? { id: course.id, ...body } : body),
      })
      if (res.ok) {
        toast.success(course ? 'تم تحديث الدورة' : 'تم إنشاء الدورة')
        // Call onSaved first (refreshes the parent's data), then
        // close the dialog so the user doesn't have to scroll up
        // to find the close button.
        onSaved?.()
        onOpenChange(false)
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

  // Custom select — clean, professional, with chevron
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
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* ⚡ Professional gradient header — navy with gold accent */}
        <div className="relative bg-gradient-to-br from-navy via-navy to-navy-light p-5 pb-4 rounded-t-xl overflow-hidden">
          {/* Decorative dot pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, #C9A961 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
          {/* Content */}
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                {course ? 'تعديل الدورة' : 'دورة جديدة'}
              </DialogTitle>
              <p className="text-white/70 text-xs mt-0.5">أكاديمية المستقبل الدولية</p>
            </div>
          </div>
        </div>

        {/* ⚡ Content body — all sections in a scrollable container
            with subtle gradient background matching the FIA brand */}
        <div className="bg-gradient-to-b from-gray-50 to-white p-5 space-y-4">

          {/* === Section 1: Basic Info — professional card with left accent === */}
          <div className="space-y-3 p-4 bg-white rounded-2xl border border-gray-200/60 border-r-4 border-r-navy/40">
            <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wide">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-gold" />
              </div>
              المعلومات الأساسية
            </div>
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">عنوان الدورة *</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-10 text-sm border-gray-200/60 focus:border-gold focus:ring-gold/20" placeholder="مثال: أساسيات علم الأدوية" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy mb-1.5 block">وصف مختصر</Label>
              <Input value={form.short_description || ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                className="h-10 text-sm border-gray-200/60 focus:border-gold focus:ring-gold/20" placeholder="جملة واحدة تلخص الدورة" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-navy block">الوصف الكامل</Label>
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="text-[10px] text-navy hover:text-gold flex items-center gap-1 transition-colors font-semibold"
                >
                  {descExpanded ? (
                    <><ChevronUp className="w-3 h-3" /> طي</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> توسيع</>
                  )}
                </button>
              </div>
              {descExpanded ? (
                <>
                  <Textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={8}
                    className="text-sm resize-y border-gray-200/60 focus:border-gold focus:ring-gold/20"
                    placeholder="وصف تفصيلي لمحتوى الدورة..."
                  />
                  {form.description && (
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                      <span>{form.description.length} حرف</span>
                      <button type="button" onClick={() => setDescExpanded(false)} className="text-navy hover:text-gold font-semibold">✓ تم — اطوِ</button>
                    </div>
                  )}
                </>
              ) : (
                <button type="button" onClick={() => setDescExpanded(true)}
                  className="w-full text-right p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 hover:bg-gold/5 hover:border-gold/30 transition-all text-xs text-muted-foreground min-h-[42px] flex items-center justify-between">
                  <span>{form.description ? (form.description.length > 60 ? `${form.description.substring(0, 60)}… (${form.description.length} حرف)` : form.description) : 'لا يوجد وصف بعد — اضغط للتوسيع والكتابة'}</span>
                  <ChevronDown className="w-3 h-3 text-gold flex-shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* === Section 2: Category + Specialization === */}
          <div className="grid grid-cols-2 gap-3">
            <Select label="التخصص" value={form.category || ''} onChange={(v: string) => setForm({ ...form, category: v, specialization: '' })}
              options={[{ value: '', label: '— اختر التخصص —' }, ...CATEGORY_GROUPS.map(g => ({ value: g.value, label: g.label }))]} icon={Tag} />
            <Select label="المسمى الوظيفي" value={form.specialization || ''} onChange={(v: string) => setForm({ ...form, specialization: v })}
              options={currentRoles.length > 0 ? [{ value: '', label: '— اختر المسمى —' }, ...currentRoles.map(r => ({ value: r, label: r }))] : [{ value: '', label: '— اختر التخصص أولاً —' }]} icon={Briefcase} />
          </div>

          {/* === Section 3: Level === */}
          <Select label="المستوى" value={form.level || 'متوسط'} onChange={(v: string) => setForm({ ...form, level: v })}
            options={LEVELS.map(l => ({ value: l.value, label: l.label }))} icon={Layers} />

          {/* === Section 4: Pricing — professional card with green accent === */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200/60 border-r-4 border-r-emerald-500/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wide">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-white" />
              </div>
              التسعير
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="النوع" value={form.price_type || 'مجانية'} onChange={(v: string) => setForm({ ...form, price_type: v })}
                options={[{ value: 'مجانية', label: 'مجانية' }, { value: 'مدفوعة', label: 'مدفوعة' }]} />
              <Select label="العملة" value={form.currency || 'ر.ي'} onChange={(v: string) => setForm({ ...form, currency: v })}
                options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            </div>
            {form.price_type === 'مدفوعة' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-navy mb-1.5 block flex items-center gap-1.5">
                      <span className="line-through text-red-500">السعر الرسمي</span>
                    </Label>
                    <Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                      className="h-10 text-sm border-gray-200/60 focus:border-gold focus:ring-gold/20" dir="ltr" placeholder="100" />
                    <p className="text-[10px] text-muted-foreground mt-1">يظهر مشطوباً بالأحمر للمتدرب</p>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-emerald-600 mb-1.5 block">السعر بعد الخصم</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="h-10 text-sm border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/20" dir="ltr" placeholder="50" />
                    <p className="text-[10px] text-muted-foreground mt-1">السعر النهائي للمتدرب</p>
                  </div>
                </div>
                {Number(form.original_price) > Number(form.price) && Number(form.price) > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/40 rounded-lg px-3 py-2">
                    <span className="text-xs text-muted-foreground">معاينة:</span>
                    <span className="text-sm line-through text-red-500" dir="ltr">{Number(form.original_price).toLocaleString()} {form.currency || 'ر.ي'}</span>
                    <span className="text-base font-extrabold text-emerald-600" dir="ltr">{Number(form.price).toLocaleString()} {form.currency || 'ر.ي'}</span>
                  </div>
                )}
                {/* Auto-applied coupon */}
                <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 space-y-2">
                  <Label className="text-xs font-bold text-navy mb-1.5 block">كوبون خصم تلقائي (اختياري)</Label>
                  <div className="flex gap-2">
                    <Input value={form.auto_coupon_code || ''} onChange={(e) => setForm({ ...form, auto_coupon_code: e.target.value.toUpperCase() })}
                      placeholder="FIA-XXXXXX" dir="ltr" className="font-mono text-sm h-9 flex-1 border-gold/20 focus:border-gold focus:ring-gold/20" />
                    {form.auto_coupon_code && (
                      <Button type="button" variant="outline" size="sm" className="text-red-500 border-red-500/30 hover:bg-red-500/5" onClick={() => setForm({ ...form, auto_coupon_code: '' })}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">سيتم تطبيقه تلقائياً عند محاولة المتدرب الاشتراك — يرى السعر بعد الخصم مباشرة.</p>
                  {!form.auto_coupon_code && (
                    <>
                      {!showCreateCoupon ? (
                        <button type="button" onClick={() => setShowCreateCoupon(true)} className="text-[10px] text-navy hover:text-gold flex items-center gap-1 font-semibold">+ إنشاء كوبون جديد بنقرة واحدة</button>
                      ) : (
                        <div className="bg-white border border-gold/30 rounded-lg p-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">نسبة الخصم %:</Label>
                            <Input type="number" value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(e.target.value)} className="h-8 text-sm w-20" dir="ltr" placeholder="10" />
                            <Button type="button" size="sm" className="bg-navy hover:bg-navy-light text-gold h-8 text-xs" onClick={createCouponInline}>إنشاء</Button>
                            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowCreateCoupon(false)}>إلغاء</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* === Section 4b: Promotional Offer — gold accent card === */}
          <div className="p-4 bg-white rounded-2xl border-2 border-gold/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wide">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                <Gift className="w-3.5 h-3.5 text-white" />
              </div>
              عرض ترويجي (اختياري)
            </div>
            <p className="text-[10px] text-muted-foreground">اجعل دورتك مميزة — تظهر بشارة احترافية للمتدربين في صفحة الاستكشاف.</p>
            <Select label="نوع العرض" value={form.offer_type || 'none'} onChange={(v: string) => setForm({ ...form, offer_type: v })}
              options={[{ value: 'none', label: '— لا عرض —' }, { value: 'limited_time', label: '⏰ لمدة محدودة' }, { value: 'featured', label: '⭐ دورة مميزة' }]} />
            {form.offer_type && form.offer_type !== 'none' && (
              <>
                <div>
                  <Label className="text-xs font-bold text-navy mb-1.5 block">عنوان جذّاب للعرض</Label>
                  <Input value={form.offer_headline || ''} onChange={(e) => setForm({ ...form, offer_headline: e.target.value })}
                    placeholder="مثال: عرض خاص لمدة محدودة — سجّل الآن!" className="h-10 text-sm border-gray-200/60 focus:border-gold focus:ring-gold/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-navy mb-1.5 block">مدة العرض</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={form.offer_duration_value} onChange={(e) => setForm({ ...form, offer_duration_value: e.target.value })}
                        className="h-10 text-sm w-20" dir="ltr" placeholder="5" />
                      <select value={form.offer_duration_unit || 'days'} onChange={(e) => setForm({ ...form, offer_duration_unit: e.target.value })}
                        className="flex-1 h-10 px-3 text-sm border border-gray-200/60 rounded-lg bg-gray-50 focus:border-gold focus:ring-gold/20">
                        <option value="hours">ساعات</option>
                        <option value="days">أيام</option>
                        <option value="weeks">أسابيع</option>
                        <option value="months">أشهر</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-navy mb-1.5 block">سعر العرض الترويجي</Label>
                    <Input type="number" value={form.offer_price} onChange={(e) => setForm({ ...form, offer_price: e.target.value })}
                      className="h-10 text-sm border-gray-200/60 focus:border-gold focus:ring-gold/20" dir="ltr" placeholder="0 = السعر الافتراضي" />
                    <p className="text-[10px] text-muted-foreground mt-1">اترك 0 لاستخدام السعر الافتراضي</p>
                  </div>
                </div>
                {/* Live preview */}
                {form.offer_headline && (
                  <div className="bg-gradient-to-l from-navy to-navy-light text-white p-3 rounded-xl flex items-center gap-2 shadow-md">
                    {form.offer_type === 'limited_time' ? '⏰' : '⭐'}
                    <div className="flex-1">
                      <div className="text-xs text-gold font-bold">عرض خاص</div>
                      <div className="text-sm">{form.offer_headline}</div>
                    </div>
                    {Number(form.offer_duration_value) > 0 && (
                      <div className="text-xs bg-gold/20 px-2 py-1 rounded-md" dir="ltr">{form.offer_duration_value} {form.offer_duration_unit === 'hours' ? 'ساعة' : form.offer_duration_unit === 'days' ? 'يوم' : form.offer_duration_unit === 'weeks' ? 'أسبوع' : 'شهر'}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* === Section 5: Settings — gray accent card === */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200/60 border-r-4 border-r-slate-400/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wide">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-white" />
              </div>
              الإعدادات
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-navy mb-1.5 block">عدد الساعات</Label>
                <Input type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                  className="h-10 text-sm border-gray-200/60 focus:border-gold focus:ring-gold/20" dir="ltr" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs font-bold text-navy mb-1.5 block">درجة النجاح (%)</Label>
                <Input type="number" value={form.pass_score} onChange={(e) => setForm({ ...form, pass_score: e.target.value })}
                  className="h-10 text-sm border-gray-200/60 focus:border-gold focus:ring-gold/20" dir="ltr" placeholder="60" />
              </div>
            </div>
            <Select label="الحالة" value={form.status || 'منشورة'} onChange={(v: string) => setForm({ ...form, status: v })}
              options={[{ value: 'منشورة', label: 'منشورة' }, { value: 'مسودة', label: 'مسودة' }]} />
          </div>

          {/* === Section 6: Cover Image — professional upload === */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200/60 border-r-4 border-r-blue-500/40 space-y-2">
            <Label className="text-xs font-bold text-navy mb-1.5 flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <ImageIcon className="w-3.5 h-3.5 text-white" />
              </div>
              صورة الغلاف
            </Label>
            <div className="flex items-center gap-3">
              {form.cover ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gold/20 flex-shrink-0 shadow-sm">
                  <img src={form.cover} alt="cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm({ ...form, cover: '' })}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-1 hover:bg-red-600 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 flex-shrink-0 hover:border-gold/40 hover:bg-gold/5 transition-all">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" id="cover-upload-pro"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f) }} />
              <Button variant="outline" type="button" disabled={uploadingCover}
                onClick={() => document.getElementById('cover-upload-pro')?.click()}
                className="h-9 text-xs border-gray-200/60 hover:border-gold hover:bg-gold/5">
                {uploadingCover ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <FileUp className="w-3.5 h-3.5 ml-1" />}
                {uploadingCover ? 'جاري...' : form.cover ? 'تغيير الصورة' : 'رفع صورة'}
              </Button>
            </div>
          </div>
        </div>

        {/* ⚡ Professional footer with gradient save button */}
        <div className="flex items-center justify-end gap-2 p-4 bg-white border-t border-gray-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
          <Button onClick={save} disabled={saving}
            className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-white rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />}
            {saving ? 'جاري الحفظ...' : course ? 'تحديث الدورة' : 'إنشاء الدورة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
