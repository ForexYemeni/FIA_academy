'use client'

// 👑👑👑 إنشاء حساب مدرب — أكاديمية المستقبل الدولية 👑👑👑
// الترتيب الجديد (v6.2): بيانات الدخول أولاً → الملف المهني → المؤهلات →
// المراجعة والإرسال → تسجيل دخول تلقائي فوري → إضافة الصورة الشخصية (وهو الآن مسجّل)

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import {
  Crown, GraduationCap, User, Briefcase, Target, CalendarDays, Globe2, Camera,
  FileText, Award, Trophy, Star, ShieldCheck, CheckCircle2, ArrowLeft, ArrowRight,
  Sparkles, Loader2, Lock, Trash2, Plus, BadgeCheck, ScrollText, PartyPopper,
  Mail, Phone,
} from 'lucide-react'

const COUNTRIES = [
  'اليمن', 'السعودية', 'الإمارات', 'عُمان', 'قطر', 'الكويت', 'البحرين', 'العراق',
  'مصر', 'الأردن', 'فلسطين', 'لبنان', 'سوريا', 'السودان', 'ليبيا', 'تونس',
  'الجزائر', 'المغرب', 'موريتانيا', 'الصومال', 'جزر القمر', 'دولة أخرى',
]

const inputCls =
  'h-11 rounded-xl border-[#C9A961]/35 bg-white/[0.06] text-white placeholder:text-white/35 focus-visible:border-[#C9A961] focus-visible:ring-[#C9A961]/25'
const areaCls =
  'min-h-[96px] rounded-xl border-[#C9A961]/35 bg-white/[0.06] text-white placeholder:text-white/35 focus-visible:border-[#C9A961] focus-visible:ring-[#C9A961]/25'
const labelCls = 'text-xs font-semibold text-[#E5C77E]/85'

type Qual = { title: string; institution: string; year: string }
type Achievement = { title: string; description: string; year: string }
type Experience = { position: string; organization: string; period: string; description: string }

const STEPS = [
  { id: 1, label: 'الحساب', icon: Lock },
  { id: 2, label: 'الملف المهني', icon: Briefcase },
  { id: 3, label: 'المؤهلات', icon: Award },
  { id: 4, label: 'المراجعة والإرسال', icon: CheckCircle2 },
]

export function TrainerRegistration() {
  const setAuth = useAuth((s) => s.setAuth)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  // الخطوة الأخيرة بعد التسجيل: إضافة الصورة الشخصية (الحساب مسجّل دخوله الآن)
  const [photoStage, setPhotoStage] = useState<{ name: string } | null>(null)
  const [done, setDone] = useState<{ name: string } | null>(null)

  // Step 1 — الحساب وبيانات الدخول (أولاً كما يليق بالرحلة)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Step 2 — الملف المهني
  const [title, setTitle] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [years, setYears] = useState('')
  const [country, setCountry] = useState('اليمن')
  const [bio, setBio] = useState('')

  // Step 3 — المؤهلات والإنجازات والخبرات
  const [quals, setQuals] = useState<Qual[]>([{ title: '', institution: '', year: '' }])
  const [achs, setAchs] = useState<Achievement[]>([{ title: '', description: '', year: '' }])
  const [exps, setExps] = useState<Experience[]>([{ position: '', organization: '', period: '', description: '' }])

  // الصورة الشخصية — بعد التسجيل التلقائي (الرفع يحتاج جلسة موقّعة)
  const [avatar, setAvatar] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)

  const activeQuals = useMemo(() => quals.filter((q) => q.title.trim()), [quals])
  const activeAchs = useMemo(() => achs.filter((a) => a.title.trim()), [achs])
  const activeExps = useMemo(() => exps.filter((e) => e.position.trim() || e.organization.trim()), [exps])

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (name.trim().length < 3) return 'اكتب اسمك الكامل (3 أحرف على الأقل)'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'بريد إلكتروني غير صالح'
      if (password.length < 6) return 'كلمة المرور 6 أحرف على الأقل'
      if (password !== confirm) return 'كلمتا المرور غير متطابقتين'
    }
    if (s === 2) {
      if (!title.trim()) return 'المسمى الوظيفي مطلوب'
      if (!specialization.trim()) return 'التخصص مطلوب'
      if (bio.trim().length < 20) return 'اكتب نبذة مهنية وافية (20 حرفاً على الأقل)'
    }
    if (s === 3) {
      if (activeQuals.length === 0) return 'أضف مؤهلاً علمياً واحداً على الأقل (العنوان)'
    }
    return null
  }

  const next = () => {
    const err = validateStep(step)
    if (err) { toast.error(err); return }
    setStep((s) => Math.min(4, s + 1))
  }
  const prev = () => setStep((s) => Math.max(1, s - 1))

  const uploadAvatar = async (file: File): Promise<string | null> => {
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'trainer-avatar')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.url) { toast.success('رُفعت صورتك بنجاح'); return data.url }
      toast.error(data?.error || 'تعذر رفع الصورة')
      return null
    } catch { toast.error('تعذر رفع الصورة'); return null }
    finally { setAvatarUploading(false) }
  }

  const pickPhoto = async (file: File) => {
    const url = await uploadAvatar(file)
    if (url) setAvatar(url)
  }

  const saveAvatar = async () => {
    if (!avatar) return
    setAvatarSaving(true)
    try {
      const res = await fetch('/api/trainers/self-profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d?.error || 'تعذر حفظ الصورة'); return }
      toast.success('صورتك الشخصية صارت جزءاً من ملفك')
      setPhotoStage(null)
      setDone((d) => d || { name: name.trim() })
    } catch { toast.error('تعذر الاتصال') }
    setAvatarSaving(false)
  }

  const submit = async () => {
    for (const s of [1, 2, 3]) {
      const err = validateStep(s)
      if (err) { setStep(s); toast.error(err); return }
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/register-trainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), email: email.trim().toLowerCase(), password,
          phone: phone.trim(), title: title.trim(), specialization: specialization.trim(),
          bio: bio.trim(), country,
          years_experience: Number(years) || 0,
          qualifications: activeQuals,
          achievements: activeAchs,
          experiences: activeExps,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error || 'تعذر إرسال الطلب'); return }
      // 🔑 تسجيل الدخول التلقائي — الحساب جاهز والجلسة موقّعة فوراً
      if (data?.token && data?.user) {
        setAuth(data.user, data.token)
      }
      toast.success('أُنشئ حسابك وسجّلنا دخولك تلقائياً')
      // الخطوة الأخيرة: الصورة الشخصية (الآن الرفع يعمل لأنه مسجّل)
      setPhotoStage({ name: name.trim() })
    } catch { toast.error('تعذر الاتصال — أعد المحاولة') }
    setSubmitting(false)
  }

  const finishToDashboard = () => { window.location.href = '/' }

  // ================= الخطوة الأخيرة: الصورة الشخصية (بعد الدخول التلقائي) =================
  if (photoStage) {
    return (
      <div className="fia-lux-fadeup relative overflow-hidden rounded-3xl border border-[#C9A961]/40 bg-gradient-to-br from-[#0A1F44] via-[#12294f] to-[#0A1F44] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 70%, white 1px, transparent 1px)', backgroundSize: '26px 26px, 20px 20px' }} />
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-[#C9A961]/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> تم إنشاء الحساب وتسجيل الدخول تلقائياً
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-white sm:text-3xl">
            خطوة أخيرة يا أستاذ <span className="bg-gradient-to-l from-[#C9A961] to-[#E5C77E] bg-clip-text text-transparent">{photoStage.name}</span>
          </h2>
          <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-white/70">
            أضف صورتك الشخصية الآن — تظهر في بطاقتك ضمن «مدربينا» وفي ملفك المهني، ويمكنك تغييرها لاحقاً من ملفك.
          </p>

          <div className="mx-auto mb-7 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-[#C9A961]/25 bg-white/[0.05] p-6">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="صورة المدرب" className="h-28 w-28 rounded-full border-4 border-[#C9A961]/50 object-cover shadow-[0_0_30px_rgba(201,169,97,0.3)]" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-[#C9A961]/40 bg-white/5 text-[#C9A961]/60">
                  <Camera className="h-10 w-10" />
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60"><Loader2 className="h-8 w-8 animate-spin text-[#E5C77E]" /></div>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-white/55">صورة واضحة بتأطير مناسب — يُفضّل أن يكون وجهك في المنتصف بخلفية بسيطة</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C9A961]/40 bg-[#C9A961]/10 px-5 py-2.5 text-xs font-bold text-[#E5C77E] transition-all hover:bg-[#C9A961]/20 active:scale-95">
              <Camera className="h-4 w-4" /> {avatar ? 'تغيير الصورة' : 'اختر صورتك'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(f) }} />
            </label>
          </div>

          <div className="mx-auto flex max-w-md items-center justify-center gap-3">
            <Button
              onClick={finishToDashboard}
              variant="outline"
              className="h-12 flex-1 rounded-xl border-white/15 bg-white/5 text-sm font-bold text-white hover:bg-white/10 active:scale-[0.98]"
            >
              لاحقاً — أدخل لوحتي
            </Button>
            {avatar && (
              <Button
                onClick={saveAvatar} disabled={avatarSaving}
                className="relative h-12 flex-1 overflow-hidden rounded-xl bg-gradient-to-l from-[#C9A961] to-[#E5C77E] text-sm font-extrabold text-[#0A1F44] shadow-[0_8px_24px_rgba(201,169,97,0.35)] active:scale-[0.98] disabled:opacity-60"
              >
                <span className="absolute inset-0 lux-shimmer" />
                {avatarSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-5 w-5" />} حفظ الصورة
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ================= شاشة الإتمام =================
  if (done) {
    return (
      <div className="fia-lux-fadeup relative overflow-hidden rounded-3xl border border-[#C9A961]/40 bg-gradient-to-br from-[#0A1F44] via-[#12294f] to-[#0A1F44] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 70%, white 1px, transparent 1px)', backgroundSize: '26px 26px, 20px 20px' }} />
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-[#C9A961]/20 blur-3xl" />
        <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-[#C9A961]/15 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#C9A961]/60 bg-gradient-to-br from-[#C9A961]/25 to-transparent shadow-[0_0_60px_rgba(201,169,97,0.35)]">
            <PartyPopper className="h-11 w-11 text-[#E5C77E]" />
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-white sm:text-3xl">
            حسابك جاهز في <span className="bg-gradient-to-l from-[#C9A961] to-[#E5C77E] bg-clip-text text-transparent">أكاديمية المستقبل الدولية</span>
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-white/70">
            يا أستاذ <span className="font-bold text-[#E5C77E]">{done.name}</span>، طلب الانضمام إلى نخبة المدربين قيد المراجعة الآن.
            فور موافقة الإدارة ستصل بطاقة الاتفاق بنسبة أرباحك لتصفحها وقبولها — وتُعرَف حينها رسمياً كمدرب معتمد يظهر اسمه في «مدربينا».
          </p>
          <div className="mx-auto mb-7 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: 'مراجعة دقيقة', d: 'الإدارة تفحص ملفك بالكامل' },
              { icon: ScrollText, t: 'اتفاق النسبة', d: 'نسبة أرباحك تصل لقبولها' },
              { icon: BadgeCheck, t: 'اعتماد رسمي', d: 'اسمك في نخبة المدربين' },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-[#C9A961]/25 bg-white/[0.05] p-4">
                <c.icon className="mx-auto mb-2 h-6 w-6 text-[#E5C77E]" />
                <p className="text-xs font-bold text-white">{c.t}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-white/55">{c.d}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={finishToDashboard}
            className="relative h-12 overflow-hidden rounded-xl bg-gradient-to-l from-[#C9A961] to-[#E5C77E] px-8 text-sm font-extrabold text-[#0A1F44] shadow-[0_8px_24px_rgba(201,169,97,0.35)] active:scale-[0.98]"
          >
            <span className="absolute inset-0 lux-shimmer" /> الدخول إلى لوحتي
          </Button>
        </div>
      </div>
    )
  }

  // ================= الرحلة =================
  return (
    <div className="fia-lux-fadeup relative overflow-hidden rounded-3xl border border-[#C9A961]/40 bg-gradient-to-br from-[#0A1F44] via-[#12294f] to-[#0A1F44] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      {/* الترويسة */}
      <div className="relative overflow-hidden px-6 pb-5 pt-7 text-center">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px, 18px 18px' }} />
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[#C9A961]/15 blur-2xl" />
        <div className="relative">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C9A961]/50 bg-gradient-to-br from-[#C9A961]/25 to-transparent shadow-[0_0_40px_rgba(201,169,97,0.3)]">
            <GraduationCap className="h-8 w-8 text-[#E5C77E]" />
          </div>
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">
            سجّل كمدرب في <span className="bg-gradient-to-l from-[#C9A961] to-[#E5C77E] bg-clip-text text-transparent">الأكاديمية</span>
          </h2>
          <p className="mt-1 text-xs text-white/60">حسابك أولاً — ثم ملفك المهني — ثم تسجيل دخول تلقائي وصورتك الشخصية</p>
        </div>
      </div>

      {/* شريط الخطوات */}
      <div className="relative z-10 mx-5 mb-6 flex items-center justify-between rounded-2xl border border-[#C9A961]/20 bg-white/[0.04] px-4 py-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = step === s.id
          const passed = step > s.id
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                  passed ? 'border-[#C9A961] bg-gradient-to-br from-[#C9A961] to-[#E5C77E] text-[#0A1F44]'
                  : active ? 'border-[#C9A961]/70 bg-[#C9A961]/15 text-[#E5C77E] shadow-[0_0_18px_rgba(201,169,97,0.35)]'
                  : 'border-white/15 bg-white/5 text-white/40'}`}>
                  {passed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4.5 w-4.5" />}
                </div>
                <span className={`hidden text-[9px] font-bold sm:block ${active ? 'text-[#E5C77E]' : passed ? 'text-[#C9A961]/80' : 'text-white/40'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-[2px] w-4 rounded sm:w-8 ${step > s.id ? 'bg-gradient-to-l from-[#C9A961] to-[#E5C77E]' : 'bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-4 px-5 pb-6">
        {/* ============ الخطوة 1: الحساب وبيانات الدخول ============ */}
        {step === 1 && (
          <div className="fia-lux-fadeup space-y-4">
            <div className="rounded-2xl border border-[#C9A961]/25 bg-white/[0.04] p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Lock className="h-4 w-4 text-[#E5C77E]" /> بيانات حسابك — البريد والرقم وكلمة المرور</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className={labelCls}><User className="ml-1 inline h-3.5 w-3.5" /> الاسم الكامل *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أ. محمد أحمد محمد صالح" className={inputCls} />
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-white/45"><Lock className="h-3 w-3 text-[#C9A961]" /> الاسم يُثبَّت نهائياً بعد التسجيل ولا يمكن تعديله — اكتبه بعناية</p>
                </div>
                <div>
                  <Label className={labelCls}><Mail className="ml-1 inline h-3.5 w-3.5" /> البريد الإلكتروني *</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" placeholder="trainer@fia.academy" className={inputCls} autoComplete="email" />
                </div>
                <div>
                  <Label className={labelCls}><Phone className="ml-1 inline h-3.5 w-3.5" /> رقم الهاتف (واتساب)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="+967 7XX XXX XXX" className={inputCls} autoComplete="tel" />
                </div>
                <div>
                  <Label className={labelCls}><Lock className="ml-1 inline h-3.5 w-3.5" /> كلمة المرور *</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" dir="ltr" placeholder="••••••••" className={inputCls} autoComplete="new-password" />
                </div>
                <div>
                  <Label className={labelCls}><Lock className="ml-1 inline h-3.5 w-3.5" /> تأكيد كلمة المرور *</Label>
                  <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" dir="ltr" placeholder="••••••••" className={inputCls} autoComplete="new-password" />
                </div>
              </div>
              <p className="mt-3 rounded-xl border border-[#C9A961]/20 bg-[#C9A961]/[0.07] px-3 py-2 text-[11px] leading-relaxed text-white/60">
                🔑 بعد إكمال الملف تُسجَّل دخولك تلقائياً — بلا أي خطوة إضافية — وتضيف صورتك الشخصية مباشرة.
              </p>
            </div>
          </div>
        )}

        {/* ============ الخطوة 2: الملف المهني ============ */}
        {step === 2 && (
          <div className="fia-lux-fadeup space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className={labelCls}><Briefcase className="ml-1 inline h-3.5 w-3.5" /> المسمى الوظيفي *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="استشاري / أستاذ مساعد / مدرب معتمد..." className={inputCls} />
              </div>
              <div>
                <Label className={labelCls}><Target className="ml-1 inline h-3.5 w-3.5" /> التخصص *</Label>
                <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="طب القلب / إدارة الأعمال / التسويق الرقمي..." className={inputCls} />
              </div>
              <div>
                <Label className={labelCls}><CalendarDays className="ml-1 inline h-3.5 w-3.5" /> سنوات الخبرة</Label>
                <Input value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="10" inputMode="numeric" className={inputCls} dir="ltr" />
              </div>
              <div>
                <Label className={labelCls}><Globe2 className="ml-1 inline h-3.5 w-3.5" /> بلد الإقامة</Label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={`${inputCls} w-full appearance-none px-3 text-sm`}>
                  {COUNTRIES.map((c) => <option key={c} value={c} className="bg-[#0A1F44] text-white">{c}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-white/45">تظهر طرق سحب الأرباح المتاحة بحسب بلدك</p>
              </div>
            </div>
            <div>
              <Label className={labelCls}><FileText className="ml-1 inline h-3.5 w-3.5" /> النبذة المهنية *</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="اكتب نبذة تلهم المتدربين: رحلتك، فلسفتك في التدريب، ما يميزك..." className={areaCls} rows={4} />
              <p className="mt-1 text-[10px] text-white/45">{bio.length} حرف — 20 على الأقل</p>
            </div>
          </div>
        )}

        {/* ============ الخطوة 3: المؤهلات والإنجازات والخبرات ============ */}
        {step === 3 && (
          <div className="fia-lux-fadeup space-y-4">
            <DynListSection
              title="المؤهلات العلمية" icon={Award} accent="from-emerald-500/20"
              items={quals} onItems={setQuals}
              renderRow={(q, set) => (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input value={q.title} onChange={(e) => set({ ...q, title: e.target.value })} placeholder="الدرجة / المؤهل — بكالوريوس طب..." className={inputCls} />
                  <Input value={q.institution} onChange={(e) => set({ ...q, institution: e.target.value })} placeholder="الجهة — جامعة القاهرة..." className={inputCls} />
                  <Input value={q.year} onChange={(e) => set({ ...q, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="السنة 2015" className={inputCls} dir="ltr" />
                </div>
              )}
              emptyRow={{ title: '', institution: '', year: '' }}
            />

            <DynListSection
              title="الإنجازات والجوائز" icon={Trophy} accent="from-amber-500/20"
              items={achs} onItems={setAchs}
              renderRow={(a, set) => (
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input value={a.title} onChange={(e) => set({ ...a, title: e.target.value })} placeholder="الإنجاز — جائزة أفضل مدرب..." className={`${inputCls} sm:col-span-2`} />
                  <Input value={a.description} onChange={(e) => set({ ...a, description: e.target.value })} placeholder="وصف مختصر" className={inputCls} />
                  <Input value={a.year} onChange={(e) => set({ ...a, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="2024" className={inputCls} dir="ltr" />
                </div>
              )}
              emptyRow={{ title: '', description: '', year: '' }}
            />

            <DynListSection
              title="الخبرات العملية" icon={Star} accent="from-sky-500/20"
              items={exps} onItems={setExps}
              renderRow={(x, set) => (
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input value={x.position} onChange={(e) => set({ ...x, position: e.target.value })} placeholder="المنصب — مدير تدريب..." className={inputCls} />
                  <Input value={x.organization} onChange={(e) => set({ ...x, organization: e.target.value })} placeholder="الجهة — مستشفى / شركة..." className={inputCls} />
                  <Input value={x.period} onChange={(e) => set({ ...x, period: e.target.value })} placeholder="الفترة 2018 — 2024" className={inputCls} />
                  <Input value={x.description} onChange={(e) => set({ ...x, description: e.target.value })} placeholder="أبرز المهام" className={inputCls} />
                </div>
              )}
              emptyRow={{ position: '', organization: '', period: '', description: '' }}
            />
          </div>
        )}

        {/* ============ الخطوة 4: المراجعة والإرسال ============ */}
        {step === 4 && (
          <div className="fia-lux-fadeup space-y-4">
            <div className="rounded-2xl border border-[#C9A961]/30 bg-gradient-to-br from-[#C9A961]/10 to-transparent p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[#E5C77E]"><Crown className="h-5 w-5" /> راجع بياناتك قبل إنشاء الحساب</p>
              <div className="space-y-3 text-xs">
                <ReviewRow label="الاسم" value={name} />
                <ReviewRow label="البريد" value={email} ltr />
                {phone && <ReviewRow label="الهاتف" value={phone} ltr />}
                <ReviewRow label="المسمى الوظيفي" value={title} />
                <ReviewRow label="التخصص" value={specialization} />
                {Number(years) > 0 && <ReviewRow label="سنوات الخبرة" value={`${years} سنة`} />}
                <ReviewRow label="بلد الإقامة" value={country} />
                <ReviewRow label="النبذة" value={bio.length > 120 ? bio.slice(0, 120) + '…' : bio} />
                <ReviewRow label="المؤهلات" value={activeQuals.map((q) => `${q.title}${q.institution ? ' — ' + q.institution : ''}`).join(' | ')} />
                {activeAchs.length > 0 && <ReviewRow label="الإنجازات" value={activeAchs.map((a) => a.title).join(' | ')} />}
                {activeExps.length > 0 && <ReviewRow label="الخبرات" value={activeExps.map((x) => `${x.position}${x.organization ? ' في ' + x.organization : ''}`).join(' | ')} />}
              </div>
            </div>
            <div className="rounded-2xl border border-[#C9A961]/25 bg-white/[0.04] p-4 text-[11px] leading-relaxed text-white/60">
              <p className="mb-2 flex items-center gap-1.5 font-bold text-[#E5C77E]"><Sparkles className="h-4 w-4" /> كيف تسير الأمور بعد الإرسال؟</p>
              <p>1️⃣ يُنشأ حسابك وتُسجَّل دخولك تلقائياً — ثم تضيف صورتك الشخصية مباشرة.</p>
              <p>2️⃣ تفحص الإدارة ملفك بعناية وسرية — ثم توافق أو ترفض مع إشعار رسمي لك.</p>
              <p>3️⃣ عند الموافقة تصلك بطاقة الاتفاق بنسبة أرباحك من الدورات — تقبلها أو تفاوض بحرية كاملة، وبعد توقيعك يُغلق الاتفاق نهائياً وتُفتح لك لوحتك كاملة.</p>
            </div>
          </div>
        )}

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 1 ? (
            <Button onClick={prev} variant="outline" className="h-11 flex-1 rounded-xl border-white/15 bg-white/5 text-sm font-bold text-white hover:bg-white/10">
              <ArrowRight className="h-4 w-4" /> السابق
            </Button>
          ) : <div className="flex-1" />}
          {step < 4 ? (
            <Button onClick={next} className="relative h-11 flex-1 overflow-hidden rounded-xl bg-gradient-to-l from-[#C9A961] to-[#E5C77E] text-sm font-extrabold text-[#0A1F44] shadow-[0_8px_24px_rgba(201,169,97,0.3)] active:scale-[0.98]">
              <span className="absolute inset-0 lux-shimmer" /> التالي <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} className="relative h-11 flex-1 overflow-hidden rounded-xl bg-gradient-to-l from-[#C9A961] to-[#E5C77E] text-sm font-extrabold text-[#0A1F44] shadow-[0_8px_24px_rgba(201,169,97,0.4)] active:scale-[0.98] disabled:opacity-60">
              {submitting ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ إنشاء حسابك...</> : <><Crown className="ml-2 h-4 w-4" /> إنشاء الحساب وتسجيل الدخول</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ مساعدات فاخرة ============

function ReviewRow({ label, value, ltr }: { label: string; value?: string; ltr?: boolean }) {
  if (!value || !value.trim()) return null
  return (
    <div className="flex items-start gap-2 border-b border-white/5 pb-2 last:border-0">
      <span className="min-w-[90px] shrink-0 font-bold text-white/45">{label}:</span>
      <span className="flex-1 text-white/85" dir={ltr ? 'ltr' : undefined} style={{ textAlign: ltr ? 'left' : undefined }}>{value}</span>
    </div>
  )
}

function DynListSection<T extends object>({ title, icon: Icon, accent, items, onItems, renderRow, emptyRow }: {
  title: string
  icon: any
  accent: string
  items: T[]
  onItems: (items: T[]) => void
  renderRow: (item: T, set: (v: T) => void) => React.ReactNode
  emptyRow: T
}) {
  return (
    <div className="rounded-2xl border border-[#C9A961]/25 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-white"><Icon className={`h-4 w-4 rounded bg-gradient-to-br ${accent} to-transparent p-[3px] text-[#E5C77E]`} /> {title}</p>
        <button
          onClick={() => onItems([...items, { ...emptyRow }])}
          className="flex items-center gap-1 rounded-lg border border-[#C9A961]/35 bg-[#C9A961]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#E5C77E] transition-all hover:bg-[#C9A961]/20 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> إضافة
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="relative rounded-xl border border-white/10 bg-white/[0.03] p-3">
            {renderRow(item, (v) => {
              const next = [...items]
              next[idx] = v
              onItems(next)
            })}
            {items.length > 1 && (
              <button
                onClick={() => onItems(items.filter((_, i) => i !== idx))}
                className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-red-400/30 bg-[#2a0d0d] text-red-400 transition-all hover:bg-red-900/40 active:scale-90"
                title="حذف"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
