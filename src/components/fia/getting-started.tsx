'use client'

// ============================================================================
// 🌟 مركز «كيف تبدأ» الملكي — Royal Getting Started Center (v10)
// ----------------------------------------------------------------------------
// أربعة أدلة مصوّرة قصيرة بخطوات زمنية فاخرة، مبنية على التدفقات الحقيقية
// للمنصة حرفياً: التسجيل / الدفع والاشتراك / الشهادات / الانضمام مدرباً.
// الوضع الليلي: مغطى تلقائياً عبر royal-night.css (نفس مفردات الكلاسات
// المعتمدة في كل الصفحات العامة — bg-white/text-gray/amber-50...).
// ============================================================================

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Sparkles, Rocket, CreditCard, GraduationCap, Crown,
  MousePointerClick, PenLine, KeyRound, LayoutDashboard, Smartphone,
  BookOpen, Receipt, Send, Clock3, Award, ShieldCheck, FileCheck2,
  Download, ClipboardList, BadgeCheck, MailCheck, Handshake, FileSignature,
  HelpCircle, MessageCircle, ChevronDown, Timer, Layers, RefreshCw, Gem,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// بيانات الأدلة — خطوات حرفية من منظومة المنصة الفعلية
// ---------------------------------------------------------------------------

interface GuideStep {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  tip?: string
  action?: { label: string; href: string }
}

interface Guide {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  minutes: string
  steps: GuideStep[]
  ctas: { label: string; href: string; primary?: boolean }[]
}

const GUIDES: Guide[] = [
  {
    id: 'register',
    icon: Rocket,
    title: 'كيف أسجّل حسابي',
    desc: 'من زائر إلى متدرب رسمي خلال دقيقة واحدة — دون أي تعقيد',
    minutes: '~ دقيقة واحدة',
    steps: [
      {
        icon: MousePointerClick,
        title: 'افتح صفحة التسجيل',
        desc: 'من زر «إنشاء حساب» في أعلى الصفحة الرئيسية، أو من الزر أسفل هذا الدليل مباشرة.',
        action: { label: 'فتح صفحة التسجيل', href: '/register' },
      },
      {
        icon: PenLine,
        title: 'أدخل بياناتك الأساسية',
        desc: 'الاسم الكامل والبريد الإلكتروني ورقم الهاتف (اختياري) وكلمة المرور — حقول قليلة وواضحة فقط.',
        tip: 'اكتب اسمك بعناية فائقة — يُثبَّت نهائياً بعد التسجيل ويظهر على شهادتك الرسمية حرفياً كما كتبته.',
      },
      {
        icon: KeyRound,
        title: 'اختر كلمة مرور قوية',
        desc: 'ستة أحرف على الأقل — ويُفضَّل مزيج من الحروف والأرقام لحماية حسابك وشهاداتك.',
      },
      {
        icon: Sparkles,
        title: 'اضغط «إنشاء حساب المتدرب»',
        desc: 'تدخل لوحتك تلقائياً في نفس اللحظة — لا انتظار ولا تأكيد بريد ولا خطوات إضافية.',
      },
      {
        icon: LayoutDashboard,
        title: 'استكشف لوحتك الملكية',
        desc: 'دوراتك واختباراتك وشهاداتك وإشعاراتك — كلها من مكان واحد أنيق.',
        action: { label: 'الذهاب للرئيسية', href: '/' },
        tip: 'حمّل تطبيق أندرويد لتصلك الإشعارات الفورية عن كل جديد في دوراتك.',
        // action لتحميل التطبيق يُدار من صفحة التحميل
      },
      {
        icon: Smartphone,
        title: 'حمّل التطبيق (اختياري)',
        desc: 'صفحة التحميل توفر تطبيق أندرويد الرسمي — نفس حسابك وبنفس لوحتك مع إشعارات أصلية.',
        action: { label: 'صفحة التحميل', href: '/download' },
      },
    ],
    ctas: [
      { label: 'إنشاء حسابك الآن', href: '/register', primary: true },
      { label: 'تصفح الدورات', href: '/#courses' },
    ],
  },
  {
    id: 'payment',
    icon: CreditCard,
    title: 'كيف أدفع وأشترك',
    desc: 'طرق الدفع والتفعيل خطوة بخطوة — حتى تدخل دورتك',
    minutes: '~ دقيقتان',
    steps: [
      {
        icon: BookOpen,
        title: 'اختر دورتك',
        desc: 'تصفح الدورات المتاحة من الرئيسية واضغط «اشترك الآن» في الدورة التي تناسب أهدافك.',
        action: { label: 'تصفح الدورات', href: '/#courses' },
      },
      {
        icon: Receipt,
        title: 'راجع ملخص الدفع',
        desc: 'بطاقة دفع واضحة تعرض تفاصيل الدورة والسعر قبل أي شيء — لا رسوم خفية أبداً.',
        tip: 'لديك كود خصم؟ أدخله في خانة الكوبون قبل إتمام الدفع لينقص المبلغ فوراً.',
      },
      {
        icon: CreditCard,
        title: 'أكمل عملية الدفع',
        desc: 'إن كانت الدورة مجانية يُفعَّل اشتراكك فوراً وتدخل محتواها مباشرة — بلا أي خطوة إضافية.',
      },
      {
        icon: Send,
        title: 'للحوالة اليدوية: حوّل ثم أكّد',
        desc: 'ستظهر لك تفاصيل الحساب المعتمد (بنك أو محفظة) — حوّل المبلغ ثم أكّد طلبك وفق التعليمات المعروضة.',
      },
      {
        icon: Clock3,
        title: 'انتظر التفعيل الملكي',
        desc: 'تراجع الإدارة إشعارك وتُفعّل اشتراكك — يصلك إشعار فوري في اللحظة التي تُفعَّل فيها، وتظهر دورتك في لوحتك.',
        tip: 'التفعيل اليدوي يستغرق وقتاً قصيراً خلال ساعات العمل — وإن تأخر راسلنا وسننتصر لك فوراً.',
        action: { label: 'تواصل مع الدعم', href: '/contact' },
      },
    ],
    ctas: [
      { label: 'ابدأ من الدورات', href: '/#courses', primary: true },
      { label: 'تواصل مع الدعم', href: '/contact' },
    ],
  },
  {
    id: 'certificate',
    icon: GraduationCap,
    title: 'كيف أستلم شهادتي',
    desc: 'من إتمام الدورة إلى شهادة رسمية موثقة برقم تحقق',
    minutes: 'خطوات واضحة',
    steps: [
      {
        icon: BookOpen,
        title: 'أكمل كل دروس الدورة',
        desc: 'تابع تقدمك من صفحة الدورة درساً درساً حتى تبلغ نسبة الإنجاز 100% — شريط التقدم يُحدَّث لحظياً.',
      },
      {
        icon: FileCheck2,
        title: 'اجتَز الاختبار (إن وُجد)',
        desc: 'الدورات ذات الاختبار تفرض اجتيازه قبل طلب الشهادة — بوابة تضمن جدارة شهادتك.',
        tip: 'يُحسب أفضل محاولة لك تلقائياً — ويمكنك إعادة الاختبار وفق سياسة إعادة المحاولة المعتمدة.',
      },
      {
        icon: Award,
        title: 'اطلب شهادتك',
        desc: 'عند اكتمال التقدم يظهر زر «اطلب شهادتك» في صفحة الدورة — بضغطة واحدة يُسجَّل طلبك.',
      },
      {
        icon: BadgeCheck,
        title: 'المراجعة والاعتماد',
        desc: 'يراجع المدرب طلبك أولاً ثم تعتمده الإدارة وتُصدر الشهادة الرسمية — وتصلك إشعارات بكل مرحلة.',
      },
      {
        icon: Download,
        title: 'حمّل شهادتك وتحقق منها',
        desc: 'شهادة PDF رسمية باسمك ورقم تحقق فريد — تستطيع أي جهة التحقق من صحتها خلال ثوانٍ من صفحة التحقق.',
        action: { label: 'صفحة التحقق من الشهادات', href: '/verify' },
      },
    ],
    ctas: [
      { label: 'التحقق من شهادة', href: '/verify', primary: true },
      { label: 'تواصل معنا', href: '/contact' },
    ],
  },
  {
    id: 'trainer',
    icon: Crown,
    title: 'كيف أنضمّ مدرباً',
    desc: 'الانضمام إلى نخبة المدربين — من الاستمارة إلى الاعتماد الملكي',
    minutes: '~ 5 دقائق',
    steps: [
      {
        icon: ClipboardList,
        title: 'افتح استمارة المدربين',
        desc: 'من صفحة التسجيل اختر «مدرب» — استمارة احترافية مصممة لبرز ملفك بأبهى صورة.',
        action: { label: 'فتح استمارة المدربين', href: '/register?type=trainer' },
      },
      {
        icon: PenLine,
        title: 'املأ بياناتك المهنية',
        desc: 'المسمى الوظيفي والتخصص والنبذة المهنية (20 حرفاً على الأقل) وسنوات الخبرة وبلدك.',
      },
      {
        icon: GraduationCap,
        title: 'أضف مؤهلاتك وإنجازاتك',
        desc: 'مؤهلاً علمياً واحداً على الأقل مطلوب — ويمكنك إضافة الإنجازات والخبرات العملية لإغناء ملفك.',
        tip: 'نبذة غنية ومؤهلات موثقة وواضحة ترفع فرص القبول أسرع من أي شيء آخر.',
      },
      {
        icon: MailCheck,
        title: 'يصل طلبك للإدارة فوراً',
        desc: 'تُسجَّل دخولك لوحتك في نفس اللحظة وطلبك «قيد المراجعة» — مع إشعارات ثلاثية القنوات للإدارة.',
      },
      {
        icon: Handshake,
        title: 'استلم عرض اتفاق الأرباح',
        desc: 'تراجع الإدارة ملفك وترسل عرضاً لنسبة الأرباح من كل دورة — تستعرضه في محفظتك بكل حرية.',
      },
      {
        icon: FileSignature,
        title: 'وقّع الاتفاق ليُعتمد ملفك',
        desc: 'بعد توقيعك يُقفل الاتفاق ويظهر ملفك للجميع — وتبدأ رحلتك الرسمية مع دوراتك وطلابك.',
        tip: 'النسبة الموقعة محصّنة للطرفين — وأي تعديل لاحق يتم بعرض إعادة تفاوض توافق عليه أنت أيضاً.',
      },
    ],
    ctas: [
      { label: 'قدّم طلبك الآن', href: '/register?type=trainer', primary: true },
      { label: 'تواصل مع الإدارة', href: '/contact' },
    ],
  },
]

// شرائح مزايا المركز في الترويسة
const HERO_CHIPS = [
  { icon: Layers, label: '4 أدلة تفاعلية' },
  { icon: Timer, label: 'دقائق معدودة لكل دليل' },
  { icon: RefreshCw, label: 'محدَّث مع كل تطوير' },
  { icon: Gem, label: 'خطوات من الواقع حرفياً' },
]

// بطاقات المساعدة السريعة أسفل الصفحة
const HELP_CARDS = [
  { icon: HelpCircle, title: 'الأسئلة الشائعة', desc: 'إجابات سريعة لأكثر ما يُسأل عنه', href: '/faq' },
  { icon: MessageCircle, title: 'تواصل معنا', desc: 'فريق الدعم يرد عليك بأسرع وقت', href: '/contact' },
  { icon: ShieldCheck, title: 'تحقق من شهادة', desc: 'تحقق فوري بأي رقم شهادة صادر', href: '/verify' },
]

export function GettingStarted() {
  const [active, setActive] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const selectGuide = (idx: number) => {
    setActive(idx)
    // تمرير ناعم إلى لوحة الدليل بعد تبديل الحالة (على الموبايل خصوصاً)
    try {
      window.setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    } catch {}
  }

  const guide = GUIDES[active]

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white" dir="rtl">
      {/* ═══════════ الترويسة السحرية ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy text-white py-20">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px',
        }} />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gold/10 rounded-full blur-2xl" />
        <div className="container mx-auto px-4 lg:px-6 text-center relative">
          <div className="fia-lux-fadeup inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 backdrop-blur-sm">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-bold">مركز الإرشاد الملكي</span>
          </div>
          <h1 className="fia-lux-fadeup text-4xl md:text-5xl font-extrabold mb-4 tracking-tight" style={{ animationDelay: '60ms' }}>
            <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
              كيف تبدأ رحلتك معنا؟
            </span>
          </h1>
          <p className="fia-lux-fadeup text-white/70 text-lg max-w-2xl mx-auto leading-relaxed" style={{ animationDelay: '120ms' }}>
            أربعة أدلة قصيرة مصوّرة خطوة بخطوة — مبنية على منظومة المنصة الفعلية حرفياً، فما تقرأه هنا هو ما ستراه أمامك بالضبط
          </p>
          <div className="fia-lux-fadeup mt-7 flex flex-wrap items-center justify-center gap-2.5" style={{ animationDelay: '180ms' }}>
            {HERO_CHIPS.map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] text-white/75 text-xs font-semibold border border-white/10 backdrop-blur-sm">
                <chip.icon className="w-3.5 h-3.5 text-gold" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-navy/5 to-transparent" />
      </section>

      {/* ═══════════ بطاقات الأدلة الأربعة ═══════════ */}
      <section className="py-14">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {GUIDES.map((g, idx) => {
              const isActive = idx === active
              return (
                <button
                  key={g.id}
                  onClick={() => selectGuide(idx)}
                  className={`group relative overflow-hidden text-right rounded-3xl border p-6 transition-all duration-300 active:scale-[0.98] ${
                    isActive
                      ? 'border-gold/60 bg-gradient-to-br from-gold/[0.08] to-transparent shadow-[0_18px_50px_rgba(212,175,55,0.16)]'
                      : 'border-gray-100 bg-white hover:border-gold/40 hover:shadow-[0_14px_40px_rgba(11,22,53,0.08)] hover:-translate-y-1'
                  }`}
                >
                  {/* توهج زاوية للبطاقة النشطة */}
                  <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl transition-opacity ${isActive ? 'bg-gold/20 opacity-100' : 'bg-gold/10 opacity-0 group-hover:opacity-100'}`} />
                  <div className="relative flex items-start gap-4">
                    <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-br from-gold to-amber-500 text-navy shadow-[0_8px_24px_rgba(212,175,55,0.35)]'
                        : 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold border border-gold/20 group-hover:border-gold/40'
                    }`}>
                      <g.icon className="w-7 h-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-lg font-extrabold ${isActive ? 'text-navy' : 'text-gray-900'}`}>{g.title}</h3>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-[10px] font-bold text-amber-700 border border-gold/30">
                            <Sparkles className="w-3 h-3" /> معروض الآن
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{g.desc}</p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                          <Layers className="w-3 h-3 text-gold" /> {g.steps.length} خطوات
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                          <Timer className="w-3 h-3 text-gold" /> {g.minutes}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ لوحة الدليل النشط — الخط الزمني الملكي ═══════════ */}
      <section className="pb-16">
        <div className="container mx-auto px-4 lg:px-6" ref={panelRef}>
          <div key={guide.id} className="fia-lux-fadeup max-w-4xl mx-auto rounded-3xl bg-white border border-gray-100 shadow-[0_20px_60px_rgba(11,22,53,0.07)] overflow-hidden">
            {/* ترويسة اللوحة */}
            <div className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy text-white px-6 py-8 sm:px-10">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 18px 18px',
              }} />
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/15 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-500 text-navy flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.4)]">
                  <guide.icon className="w-8 h-8" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-extrabold">
                    <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">{guide.title}</span>
                  </h2>
                  <p className="mt-1 text-sm text-white/65">{guide.desc}</p>
                </div>
              </div>
            </div>

            {/* الخط الزمني للخطوات */}
            <div className="px-5 py-8 sm:px-10">
              <div className="relative">
                {/* الخيط الذهبي الرابط */}
                <div className="absolute top-3 bottom-10 right-6 sm:right-7 w-0.5 bg-gradient-to-b from-gold/60 via-gold/30 to-transparent rounded-full" />
                {guide.steps.map((step, i) => (
                  <div key={i} className="relative flex items-start gap-4 sm:gap-5 pb-9 last:pb-0">
                    {/* الميدالية المرقمة */}
                    <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-gold to-amber-500 text-navy flex items-center justify-center shadow-[0_8px_22px_rgba(212,175,55,0.35)] font-extrabold text-lg sm:text-xl z-10">
                      {i + 1}
                      <step.icon className="absolute -bottom-1.5 -left-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white text-navy border border-gold/40 p-0.5 shadow-sm" />
                    </div>
                    {/* نص الخطوة */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h4 className="text-base sm:text-lg font-extrabold text-gray-900 leading-snug">{step.title}</h4>
                      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                      {step.tip && (
                        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2.5">
                          <Gem className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-[13px] text-amber-800 leading-relaxed font-medium">{step.tip}</p>
                        </div>
                      )}
                      {step.action && (
                        <a
                          href={step.action.href}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy text-white text-xs font-bold border border-gold/30 hover:border-gold/60 hover:bg-navy-light transition-all active:scale-[0.97]"
                        >
                          <MousePointerClick className="w-3.5 h-3.5 text-gold" />
                          {step.action.label}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* أزرار الإجراء الختامية */}
              <div className="mt-10 pt-7 border-t border-gray-100 flex flex-wrap items-center gap-3">
                {guide.ctas.map((cta) => (
                  <a
                    key={cta.label}
                    href={cta.href}
                    className={cta.primary
                      ? 'inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-gold to-amber-500 text-navy text-sm font-extrabold shadow-[0_10px_28px_rgba(212,175,55,0.35)] hover:shadow-[0_14px_36px_rgba(212,175,55,0.45)] hover:-translate-y-0.5 transition-all active:scale-[0.97]'
                      : 'inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-navy text-sm font-bold border border-navy/15 hover:border-gold/50 hover:bg-amber-50 transition-all active:scale-[0.97]'}
                  >
                    {cta.primary && <Crown className="w-4 h-4" />}
                    {cta.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ المساعدة السريعة ═══════════ */}
      <section className="pb-20">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-extrabold text-gray-900">تحتاج مساعدة إضافية؟</h3>
            <p className="mt-2 text-gray-600">لديك ثلاثة أبواب ملكية — وكلها مفتوحة لك دائماً</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {HELP_CARDS.map((h) => (
              <a
                key={h.title}
                href={h.href}
                className="group rounded-3xl bg-white border border-gray-100 p-6 text-center transition-all duration-300 hover:border-gold/40 hover:shadow-[0_14px_40px_rgba(11,22,53,0.08)] hover:-translate-y-1 active:scale-[0.98]"
              >
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gold/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center border border-gold/25 shadow-lg group-hover:border-gold/50 transition-colors">
                    <h.icon className="w-7 h-7 text-gold" />
                  </div>
                </div>
                <h4 className="font-extrabold text-gray-900 group-hover:text-navy transition-colors">{h.title}</h4>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{h.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
