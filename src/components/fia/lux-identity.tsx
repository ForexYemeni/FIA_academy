'use client'

/**
 * ============================================================================
 * 👑 lux-identity — وحدة الهوية الملكية للمتدرب (v10.3)
 * ============================================================================
 * مكونات عرض بصرية خالصة — صفر تعديل على قاعدة البيانات أو أي API:
 *   1) LuxRankBadge     — نظام رتب ملكي متدرّج يُحسب من تقدم المتدرب الحقيقي
 *   2) LuxAchievements  — أوسمة إنجاز بشرح عند اللمس/التمرير
 *   3) LuxMembershipCard— بطاقة عضوية رقمية فاخرة قابلة للمشاركة
 *   4) LuxAvatarFrame   — إطار ذهبي مزدوج يلمع عند التفاعل
 * كل الحسابات تتم محلياً من البيانات الموجودة أصلاً (enrollments/certificates).
 * ============================================================================
 */

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Crown, Medal, Award, Sparkles, BookOpen, BadgeCheck, Star,
  Share2, Copy, CheckCircle2, TrendingUp, GraduationCap, Loader2,
} from 'lucide-react'

// ═══════════════════════ نظام الرتب الملكي ═══════════════════════

export interface RoyalStats {
  enrolledCount: number
  completedCount: number
  certificatesCount: number
  avgProgress: number // 0..100
}

const RANKS = [
  {
    id: 'novice', title: 'متدرب جديد', icon: Sparkles,
    grad: 'from-slate-500 via-slate-400 to-slate-600', min: 0,
    hint: 'ابدأ أول دورة واكتب أول سطر في قصة نجاحك',
  },
  {
    id: 'active', title: 'متدرب نشط', icon: BookOpen,
    grad: 'from-sky-500 via-blue-500 to-indigo-600', min: 30,
    hint: 'واصل التقدم — المعرفة تُبنى درساً بعد درس',
  },
  {
    id: 'distinguished', title: 'متدرب متميز', icon: Medal,
    grad: 'from-emerald-500 via-teal-500 to-cyan-600', min: 80,
    hint: 'تميّزك واضح — أنت قدوة لزملائك في الأكاديمية',
  },
  {
    id: 'expert', title: 'خبير الأكاديمية', icon: Award,
    grad: 'from-amber-500 via-yellow-500 to-gold', min: 160,
    hint: 'خبرة تُحتذى — اقترب من قمة الأكاديمية',
  },
  {
    id: 'legend', title: 'أسطورة الأكاديمية', icon: Crown,
    grad: 'from-gold via-amber-400 to-gold-light', min: 260,
    hint: 'الرتبة العليا — اسمك محفور في قاعة المجد',
  },
] as const

// نقاط المكانة — تُحتسب من بيانات حقيقية موجودة أصلاً
export function computeRoyalPoints(s: RoyalStats): number {
  return Math.round(
    s.completedCount * 40 +
    s.certificatesCount * 30 +
    s.enrolledCount * 10 +
    (s.avgProgress || 0) * 0.3
  )
}

export function resolveRank(points: number) {
  let idx = 0
  for (let i = 0; i < RANKS.length; i++) if (points >= RANKS[i].min) idx = i
  const rank = RANKS[idx] as any
  const next = (RANKS[idx + 1] as any) || null
  const span = next ? next.min - rank.min : 1
  const into = next ? points - rank.min : 1
  return {
    rank, next: next as any, isMax: !next,
    progressToNext: next ? Math.min(100, Math.max(4, Math.round((into / span) * 100))) : 100,
    pointsToNext: next ? Math.max(0, next.min - points) : 0,
  }
}

// ═══════════════════════ شارة الرتب — نسخة البطل ═══════════════════════

export function LuxRankBadge({ stats, compact = false }: { stats: RoyalStats; compact?: boolean }) {
  const points = computeRoyalPoints(stats)
  const { rank, next, isMax, progressToNext, pointsToNext } = resolveRank(points)
  const RankIcon = rank.icon
  const NextIcon = next?.icon || Crown

  if (compact) {
    return (
      <span
        title={`رتبتك: ${rank.title} — ${points} نقطة مكانة`}
        className="inline-flex items-center gap-1.5 bg-white/10 border border-gold/40 backdrop-blur-sm rounded-full px-3 py-1.5"
      >
        <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${rank.grad} flex items-center justify-center shadow-md`}>
          <RankIcon className="w-3.5 h-3.5 text-navy" strokeWidth={2.4} />
        </span>
        <span className="text-xs font-extrabold text-gold">{rank.title}</span>
        <span className="text-[10px] text-gold/70 font-bold tabular-nums">{points}</span>
      </span>
    )
  }

  return (
    <div className="relative rounded-2xl border border-gold/40 bg-gradient-to-br from-navy/[0.04] via-white to-gold/[0.08] p-4 shadow-md overflow-hidden">
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-80" />
      <div className="absolute -top-8 -left-8 w-24 h-24 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4">
        {/* ختم الرتبة */}
        <div className="relative flex-shrink-0">
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${rank.grad} blur-lg opacity-50`} />
          <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${rank.grad} flex items-center justify-center shadow-lg border border-white/40`}>
            <RankIcon className="w-7 h-7 text-navy" strokeWidth={2.2} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-gold/80 uppercase tracking-widest">رتبتك الحالية</span>
            <span className="text-[10px] font-bold text-muted-foreground tabular-nums" dir="ltr">{points} نقطة</span>
          </div>
          <div className="text-lg font-black text-navy leading-tight">{rank.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{rank.hint}</div>
          {/* شريط الطريق للرتبة التالية */}
          {!isMax && next ? (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <NextIcon className="w-3 h-3 text-gold" />
                  نحو «{next.title}»
                </span>
                <span className="text-gold tabular-nums" dir="ltr">{pointsToNext} نقطة متبقية</span>
              </div>
              <div className="h-2 rounded-full bg-navy/10 overflow-hidden border border-gold/20">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-gold via-amber-400 to-gold shadow-[0_0_10px_rgba(212,175,55,0.6)] transition-all duration-700"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-black text-gold">
              <Crown className="w-3.5 h-3.5" /> وصلت إلى القمة — لا رتبة أعلى
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════ أوسمة الإنجاز ═══════════════════════

interface AchievementDef {
  id: string
  title: string
  desc: string
  icon: any
  earned: boolean
  grad: string
}

export function computeAchievements(enrollments: any[], certificates: any[]): AchievementDef[] {
  const enr = enrollments || []
  const certs = (certificates || []).filter((c: any) => c.status === 'صالحة')
  const maxProgress = enr.reduce((m: number, e: any) => Math.max(m, e.progress || 0), 0)
  const completed = enr.filter((e: any) => e.status === 'completed' || e.status === 'مكتمل').length
  return [
    {
      id: 'first-step', title: 'خطوة البداية', icon: Sparkles, earned: enr.length >= 1,
      desc: 'سجّلت أول دورة في الأكاديمية — رحلة الألف ميل تبدأ بخطوة', grad: 'from-sky-500 to-indigo-600',
    },
    {
      id: 'steady', title: 'خطى ثابتة', icon: TrendingUp, earned: maxProgress >= 25,
      desc: 'أكملت 25% أو أكثر في إحدى دوراتك — الاستمرار سرّ التميز', grad: 'from-teal-500 to-emerald-600',
    },
    {
      id: 'halfway', title: 'نصف الطريق', icon: BookOpen, earned: maxProgress >= 50,
      desc: 'تجاوزت 50% في دورة — العزيمة التي تصنع المحترفين', grad: 'from-cyan-500 to-blue-600',
    },
    {
      id: 'finisher', title: 'الإنجاز الكامل', icon: BadgeCheck, earned: maxProgress >= 100 || completed >= 1,
      desc: 'أكملت دورة بنسبة 100% — إنجاز يستحق الاعتزاز', grad: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'first-cert', title: 'شهادة أولى', icon: Award, earned: certs.length >= 1,
      desc: 'حصلت على أول شهادة معتمدة من الأكاديمية', grad: 'from-amber-500 to-yellow-600',
    },
    {
      id: 'shining', title: 'نجمة متألقة', icon: Star, earned: certs.length >= 3,
      desc: '3 شهادات أو أكثر — سجل حافل بالإنجازات الموثقة', grad: 'from-gold to-amber-500',
    },
    {
      id: 'versatile', title: 'متعدد المواهب', icon: GraduationCap, earned: enr.length >= 3,
      desc: 'مسجّل في 3 دورات أو أكثر — عقل فضولي لا يتوقف', grad: 'from-purple-500 to-fuchsia-600',
    },
    {
      id: 'crown', title: 'وسام التميز', icon: Crown, earned: certs.length >= 5 && completed >= 3,
      desc: '5 شهادات و3 دورات مكتملة — من أعظم خريجي الأكاديمية', grad: 'from-gold via-amber-400 to-gold-light',
    },
  ]
}

export function LuxAchievements({ enrollments, certificates }: { enrollments: any[]; certificates: any[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const items = computeAchievements(enrollments, certificates)
  const earnedCount = items.filter((a) => a.earned).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">اضغط على أي وسام لمعرفة شرطه</p>
        <span className="text-[11px] font-black text-gold bg-gold/10 border border-gold/30 rounded-full px-2.5 py-1" dir="ltr">
          {earnedCount} / {items.length}
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {items.map((a) => {
          const Icon = a.icon
          const open = openId === a.id
          return (
            <button
              key={a.id}
              onClick={() => setOpenId(open ? null : a.id)}
              className={`relative group rounded-xl p-2.5 flex flex-col items-center gap-1.5 border transition-all active:scale-95 ${
                a.earned
                  ? 'border-gold/40 bg-gradient-to-br from-gold/[0.12] to-transparent hover:from-gold/25 hover:shadow-[0_4px_18px_-4px_rgba(212,175,55,0.45)]'
                  : 'border-border/60 bg-muted/30 opacity-55 grayscale hover:opacity-80'
              }`}
            >
              {a.earned && (
                <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-gold to-amber-500 border border-white/60 shadow-sm" />
              )}
              <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-md ${a.earned ? '' : 'opacity-70'}`}>
                <Icon className="w-4.5 h-4.5 text-navy" strokeWidth={2.2} />
              </span>
              <span className="text-[9px] font-extrabold text-navy text-center leading-tight">{a.title}</span>
              {/* شرح عند اللمس/التمرير */}
              <span
                className={`absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 rounded-lg bg-navy text-gold text-[10px] font-bold leading-relaxed p-2 shadow-xl border border-gold/30 transition-all pointer-events-none ${
                  open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
                }`}
              >
                {a.desc}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════ بطاقة العضوية الرقمية ═══════════════════════

// 👑 v10.5 — رسم البطاقة على Canvas لمشاركتها **كصورة حقيقية** عبر مواقع التواصل
// (كانت المشاركة تنسخ نصاً فقط — الآن صورة فاخرة مطابقة للتصميم تنزل في واتساب/تيليجرام...)
async function drawMembershipCardImage(user: any): Promise<File | null> {
  try {
    const name = String(user?.name || 'متدرب الأكاديمية')
    const memberId = String(user?.id || '').slice(0, 8).toUpperCase() || 'FIA'
    const memberSince = (() => {
      try {
        if (!user?.created_at) return null
        const d = new Date(user.created_at)
        if (isNaN(d.getTime())) return null
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
      } catch { return null }
    })()

    const W = 1080, H = 640
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')
    if (!ctx) return null

    // الجسم الكحلي المتدرج
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0A1F44'); bg.addColorStop(0.5, '#12294f'); bg.addColorStop(1, '#0A1F44')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // توهجات ذهبية
    const glow1 = ctx.createRadialGradient(80, 60, 10, 80, 60, 260)
    glow1.addColorStop(0, 'rgba(212,175,55,0.22)'); glow1.addColorStop(1, 'rgba(212,175,55,0)')
    ctx.fillStyle = glow1; ctx.fillRect(0, 0, W, H)
    const glow2 = ctx.createRadialGradient(W - 100, H - 40, 10, W - 100, H - 40, 220)
    glow2.addColorStop(0, 'rgba(212,175,55,0.12)'); glow2.addColorStop(1, 'rgba(212,175,55,0)')
    ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H)

    // نقش النقاط الذهبي
    ctx.fillStyle = 'rgba(212,175,55,0.30)'
    for (let x = 22; x < W; x += 44) {
      for (let y = 22; y < H; y += 44) {
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    for (let x = 36; x < W; x += 36) {
      for (let y = 40; y < H; y += 36) {
        ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
      }
    }

    // الإطار الذهبي المزدوج
    ctx.strokeStyle = 'rgba(212,175,55,0.85)'; ctx.lineWidth = 5
    ctx.strokeRect(10, 10, W - 20, H - 20)
    ctx.strokeStyle = 'rgba(212,175,55,0.35)'; ctx.lineWidth = 1.5
    ctx.strokeRect(24, 24, W - 48, H - 48)

    const AR = (size: number, weight = '700') => `${weight} ${size}px Cairo, "Noto Sans Arabic", "Segoe UI", system-ui, sans-serif`

    // ═ الترويسة: تاج ذهبي + اسم الأكاديمية + شارة «متدرب معتمد» ═
    const hx = 70, hy = 92
    const gradGold = ctx.createLinearGradient(hx - 34, hy - 34, hx + 34, hy + 34)
    gradGold.addColorStop(0, '#D4AF37'); gradGold.addColorStop(1, '#F0C75E')
    ctx.fillStyle = gradGold
    ctx.beginPath(); ctx.roundRect(hx - 34, hy - 34, 68, 68, 16); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.roundRect(hx - 34, hy - 34, 68, 68, 16); ctx.stroke()
    // رسم تاج ملكي بسيط وأنيق
    ctx.fillStyle = '#0A1F44'
    ctx.beginPath()
    ctx.moveTo(hx - 22, hy + 14)
    ctx.lineTo(hx - 22, hy - 6)
    ctx.lineTo(hx - 11, hy + 4)
    ctx.lineTo(hx, hy - 14)
    ctx.lineTo(hx + 11, hy + 4)
    ctx.lineTo(hx + 22, hy - 6)
    ctx.lineTo(hx + 22, hy + 14)
    ctx.closePath(); ctx.fill()
    for (const dx of [-22, 0, 22]) {
      ctx.beginPath(); ctx.arc(hx + dx, hy + (dx === 0 ? -16 : -8), 3.4, 0, Math.PI * 2); ctx.fill()
    }

    ctx.textBaseline = 'middle'
    ctx.direction = 'rtl'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#D4AF37'
    ctx.font = AR(20, '800')
    ctx.fillText('F I A   A C A D E M Y', W - 70 - 0, hy - 16)
    ctx.fillStyle = 'rgba(255,255,255,0.78)'
    ctx.font = AR(21, '700')
    ctx.fillText('أكاديمية المستقبل الدولية', W - 70, hy + 14)

    // شارة متدرب معتمد (أعلى اليسار)
    ctx.textAlign = 'left'
    ctx.font = AR(18, '800')
    const pill = ctx.measureText('متدرب معتمد')
    const pw = pill.width + 36
    const pillGrad = ctx.createLinearGradient(60, 0, 60 + pw, 0)
    pillGrad.addColorStop(0, '#D4AF37'); pillGrad.addColorStop(1, '#F5C842')
    ctx.fillStyle = pillGrad
    ctx.beginPath(); ctx.roundRect(60, 64, pw, 40, 20); ctx.fill()
    ctx.fillStyle = '#0A1F44'
    ctx.fillText('متدرب معتمد', 78, 85)

    // ═ الصورة الشخصية بإطار ذهبي ═
    const cx = 118, cy = 305, r = 62
    let avatarDrawn = false
    if (user?.avatar) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image()
          im.crossOrigin = 'anonymous'
          const t = setTimeout(() => reject(new Error('timeout')), 3500)
          im.onload = () => { clearTimeout(t); resolve(im) }
          im.onerror = () => { clearTimeout(t); reject(new Error('img')) }
          im.src = user.avatar
        })
        // حلقة ذهبية
        const ring = ctx.createLinearGradient(cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6)
        ring.addColorStop(0, '#D4AF37'); ring.addColorStop(0.5, '#F5DC9A'); ring.addColorStop(1, '#B8860B')
        ctx.fillStyle = ring
        ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#0A1F44'
        ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill()
        ctx.save()
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
        ctx.restore()
        avatarDrawn = true
      } catch {}
    }
    if (!avatarDrawn) {
      const ring = ctx.createLinearGradient(cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6)
      ring.addColorStop(0, '#D4AF37'); ring.addColorStop(0.5, '#F5DC9A'); ring.addColorStop(1, '#B8860B')
      ctx.fillStyle = ring
      ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0A1F44'
      ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#D4AF37'
      ctx.font = AR(52, '900')
      ctx.textAlign = 'center'
      ctx.fillText(name.charAt(0), cx, cy + 4)
    }

    // الاسم + الصفة
    ctx.direction = 'rtl'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = AR(46, '900')
    const displayName = name.length > 24 ? name.slice(0, 24) + '…' : name
    ctx.fillText(displayName, W - 70, 278)
    ctx.fillStyle = 'rgba(212,175,55,0.9)'
    ctx.font = AR(23, '700')
    ctx.fillText('عضوية متدرب — تعليم طبي معتمد', W - 70, 326)
    if (memberSince) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = AR(20, '600')
      ctx.fillText(`عضو منذ ${memberSince}`, W - 70, 362)
    }

    // ═ التذييل: فاصل + رقم العضوية + رقائق ذهبية ═
    ctx.strokeStyle = 'rgba(212,175,55,0.3)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(60, 452); ctx.lineTo(W - 60, 452); ctx.stroke()

    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(212,175,55,0.75)'
    ctx.font = AR(19, '700')
    ctx.fillText('رقم العضوية', W - 60, 508)
    ctx.fillStyle = '#D4AF37'
    ctx.font = AR(28, '900')
    ctx.fillText(`FIA-${memberId}`, W - 60, 548)

    for (let i = 0; i < 3; i++) {
      const gx = 92 + i * 52
      const chip = ctx.createLinearGradient(gx, 0, gx + 40, 0)
      chip.addColorStop(0, 'rgba(212,175,55,0.85)'); chip.addColorStop(1, 'rgba(245,200,66,0.85)')
      ctx.fillStyle = chip
      ctx.beginPath(); ctx.roundRect(gx, 528, 40, 28, 5); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(gx, 528, 40, 28, 5); ctx.stroke()
    }

    const blob = await new Promise<Blob | null>((resolve) => cv.toBlob(resolve, 'image/png', 0.95))
    if (!blob) return null
    return new File([blob], 'بطاقة-عضوية-أكاديمية-المستقبل-الدولية.png', { type: 'image/png' })
  } catch { return null }
}

export function LuxMembershipCard({ user }: { user: any }) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const name = user?.name || 'متدرب الأكاديمية'
  const memberSince = (() => {
    try {
      if (!user?.created_at) return null
      const d = new Date(user.created_at)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
    } catch { return null }
  })()
  const memberId = String(user?.id || '').slice(0, 8).toUpperCase() || 'FIA'

  const share = async () => {
    const text = `👑 أنا ${name} — متدرب في أكاديمية المستقبل الدولية (FIA)\n🎓 تعليم طبي معتمد | بطاقة عضوية رقمية\n🆔 العضوية: FIA-${memberId}\nانضم إلينا وابدأ رحلتك نحو الاحتراف!`
    setSharing(true)
    try {
      // 👑 v10.5 — المشاركة الحقيقية: البطاقة تُرسَم كصورة PNG فاخرة وتُشارَك
      // كملف عبر مواقع التواصل (واتساب/تيليجرام/انستغرام...) — لا نص منسوخ
      const file = await drawMembershipCardImage(user)
      if (file && typeof navigator !== 'undefined') {
        const nav: any = navigator
        const canShareFiles = !!nav.share && !!nav.canShare && nav.canShare({ files: [file] })
        if (canShareFiles) {
          await nav.share({ files: [file], title: 'بطاقة عضوية — أكاديمية المستقبل الدولية', text })
          return
        }
        // لا دعم مشاركة ملفات → ننزل الصورة مباشرة + نفتح مشاركة نصية إن توفرت
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        try { toast.success('تم تحميل صورة بطاقتك — شاركها الآن عبر واتساب أو تيليجرام') } catch {}
        if (nav.share) {
          try { await nav.share({ title: 'بطاقة عضوية — أكاديمية المستقبل الدولية', text }) } catch {}
        }
        return
      }
      // أخطأنا الرسم — نرجع للمشاركة النصية القديمة
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'بطاقة عضوية — أكاديمية المستقبل الدولية', text })
        return
      }
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      } catch {}
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gold/40 select-none" dir="rtl">
        {/* الجسم الكحلي الملكي */}
        <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy p-5 text-white">
          {/* نقش النقاط الذهبي */}
          <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 10% 30%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 90% 70%, white 1px, transparent 1px)',
            backgroundSize: '22px 22px, 18px 18px',
          }} />
          {/* توهجات */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-gold/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-8 w-28 h-28 bg-gold/10 rounded-full blur-2xl" />
          {/* اللمعة الملكية المارة */}
          <div className="fia-card-shine pointer-events-none" />

          {/* الرأس: الشعار + الاسم */}
          <div className="relative flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg border border-white/30">
                <Crown className="w-6 h-6 text-navy" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[10px] text-gold/90 font-bold tracking-widest uppercase">FIA ACADEMY</div>
                <div className="text-[11px] text-white/75">أكاديمية المستقبل الدولية</div>
              </div>
            </div>
            <span className="text-[9px] font-black text-navy bg-gradient-to-r from-gold to-amber-400 rounded-full px-2.5 py-1 shadow-md">
              متدرب معتمد
            </span>
          </div>

          {/* الصورة + الاسم */}
          <div className="relative flex items-center gap-4 mb-4">
            <div className="p-1 rounded-full bg-gradient-to-br from-gold via-amber-300 to-gold shadow-lg">
              <div className="p-0.5 rounded-full bg-navy">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-navy-light to-navy flex items-center justify-center text-gold text-lg font-black">
                    {name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black truncate">{name}</div>
              <div className="text-[11px] text-gold/80 font-bold">عضوية متدرب — تعليم طبي معتمد</div>
              {memberSince && (
                <div className="text-[10px] text-white/60 mt-0.5">عضو منذ {memberSince}</div>
              )}
            </div>
          </div>

          {/* التذييل: الرقم + شريط ذهبي */}
          <div className="relative flex items-end justify-between border-t border-gold/25 pt-3">
            <div>
              <div className="text-[9px] text-gold/70 font-bold mb-0.5">رقم العضوية</div>
              <div className="text-xs font-black text-gold tracking-widest" dir="ltr">FIA-{memberId}</div>
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-6 h-4 rounded-sm bg-gradient-to-br from-gold/80 to-amber-500/80 border border-white/30" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* زر المشاركة */}
      <button
        onClick={share}
        disabled={sharing}
        className="mt-2.5 w-full h-10 rounded-xl bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-[0.97] transition-all border border-gold/30 disabled:opacity-70"
      >
        {sharing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري تجهيز بطاقتك كصورة…</>
          : copied
            ? <><CheckCircle2 className="w-4 h-4" /> تم نسخ بطاقتك — شاركها بفخر!</>
            : <><Share2 className="w-4 h-4" /> مشاركة بطاقة العضوية كصورة</>}
      </button>

      <style jsx global>{`
        .fia-card-shine {
          position: absolute; top: 0; bottom: 0; width: 45%;
          right: -60%; transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          animation: fiaCardShine 4.5s ease-in-out infinite;
        }
        @keyframes fiaCardShine {
          0%, 55% { right: -60%; }
          85%, 100% { right: 115%; }
        }
      `}</style>
    </div>
  )
}

// حلقة ذهبية دوّارة تُغلّف أي محتوى (مثل رافع الصورة) — النسخة الحلقية من الإطار
export function LuxAvatarRing({ children }: { children: React.ReactNode }) {
  return (
    <div className="fia-av-frame relative rounded-full p-[3px] bg-gradient-to-br from-gold via-amber-300 to-gold shadow-lg">
      <div className="relative rounded-full p-[2px] bg-navy">
        <div className="fia-av-ring absolute inset-0 rounded-full" />
        <div className="relative z-10 rounded-full overflow-hidden">{children}</div>
      </div>
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md border border-white/50 z-20">
        <Crown className="w-3.5 h-3.5 text-navy" strokeWidth={2.4} />
      </span>
    </div>
  )
}

// ═══════════════════════ الإطار الذهبي المزدوج للصورة ═══════════════════════

export function LuxAvatarFrame({ src, name, size = 88 }: { src?: string | null; name?: string; size?: number }) {
  return (
    <div className="fia-av-frame relative rounded-full p-[3px] bg-gradient-to-br from-gold via-amber-300 to-gold shadow-lg" style={{ width: size + 6, height: size + 6 }}>
      <div className="relative w-full h-full rounded-full p-[2px] bg-navy overflow-hidden">
        <div className="fia-av-ring absolute inset-0 rounded-full" />
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name || ''} className="w-full h-full rounded-full object-cover relative z-10" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-navy-light to-navy flex items-center justify-center text-gold font-black relative z-10" style={{ fontSize: size * 0.34 }}>
            {(name || '؟').charAt(0)}
          </div>
        )}
      </div>
      {/* تاج صغير أعلى الإطار */}
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md border border-white/50 z-20">
        <Crown className="w-3.5 h-3.5 text-navy" strokeWidth={2.4} />
      </span>
      <style jsx global>{`
        .fia-av-frame { transition: transform .35s ease, box-shadow .35s ease; }
        .fia-av-frame:hover {
          transform: scale(1.04) rotate(-1deg);
          box-shadow: 0 8px 28px -6px rgba(212,175,55,0.55);
        }
        .fia-av-ring {
          background: conic-gradient(from 0deg, #D4AF37, #fff7d6, #D4AF37, #8a6d1f, #D4AF37);
          opacity: .9;
          animation: fiaAvSpin 6s linear infinite;
        }
        @keyframes fiaAvSpin { to { transform: rotate(360deg); } }
        /* إطار البورتريه الذهبي — يلمع عند التمرير */
        .fia-portrait { transition: transform .35s ease, box-shadow .35s ease; position: relative; overflow: visible; }
        .fia-portrait::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 40%;
          right: -55%; transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          pointer-events: none; border-radius: 24px;
        }
        .fia-portrait:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 34px -8px rgba(212,175,55,0.6);
        }
        .fia-portrait:hover::after { animation: fiaPortraitShine 1.1s ease forwards; }
        @keyframes fiaPortraitShine { to { right: 115%; } }
      `}</style>
    </div>
  )
}
