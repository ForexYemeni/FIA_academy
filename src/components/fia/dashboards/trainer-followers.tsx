'use client'

// ============================================================================
// TRAINER FOLLOWERS MUSEUM — «متحف المتابعين» — قسم ملكي مستقل في حساب المدرب
// قاعة مجد كاملة لجمهور المدرب: هيرو ملكي بعداد حي، منصة أول المتابعين،
// إحصاءات دقيقة، بحث، وبطاقات متابعين بحلقات ذهبية — تحديث لحظي فوري.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import {
  HeartHandshake, Crown, Search, Calendar, Loader2, Sparkles, UserCheck,
  TrendingUp, Users, Medal, Trophy, Gem,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabasePublic } from '@/lib/supabase'

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
}

export function TrainerFollowersMuseum({ user }: { user: any }) {
  const [followers, setFollowers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  const load = useCallback(() => {
    if (!user?.id) { setLoading(false); return }
    fetch(`/api/trainer-follows?trainer_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => setFollowers(Array.isArray(d?.followers) ? d.followers : []))
      .catch(() => setFollowers([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // ⚡ REAL-TIME: متابع جديد يظهر فوراً مع تحية ملكية
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    try {
      channel = supabasePublic
        .channel(`followers-museum:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trainer_follows' }, (payload: any) => {
          if (payload?.new?.trainer_id && payload.new.trainer_id !== user.id) return
          load()
          toast.success('👑 متابع جديد دخل متحفك — أهلاً به بين نخبة جمهورك!')
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trainer_follows' }, () => load())
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id, load])

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-gold" />
        <p className="text-xs text-muted-foreground mt-3">جاري فتح أبواب المتحف الملكي...</p>
      </div>
    )
  }

  const total = followers.length
  const thisWeek = followers.filter((f: any) => Date.now() - new Date(f.created_at).getTime() < 7 * 864e5).length
  const today = followers.filter((f: any) => Date.now() - new Date(f.created_at).getTime() < 864e5).length
  const latest = total > 0 ? followers.reduce((a: any, f: any) => (new Date(f.created_at) > new Date(a.created_at) ? f : a), followers[0]) : null

  // منصة الشرف: أول 3 متابعين (الأقدم أولاً)
  const pioneers = [...followers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 3)
  const pioneerMedal = ['🥇', '🥈', '🥉']

  const query = q.trim().toLowerCase()
  let shown = query ? followers.filter((f: any) => (f.follower?.name || '').toLowerCase().includes(query)) : [...followers]
  shown.sort((a: any, b: any) => sort === 'newest'
    ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    : new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div className="space-y-6">
      {/* ── الهيرو الملكي للمتحف ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-navy via-navy-light to-navy p-6 lg:p-8 text-white shadow-xl ring-1 ring-gold/30">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px',
        }} />
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-gold/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-gold/10 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/50 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center shadow-2xl border-2 border-white/30">
              <Crown className="w-10 h-10 text-navy" strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-right">
            <p className="text-gold/80 text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> متحف المتابعين الملكي
            </p>
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-1">قاعة مجد جمهورك</h2>
            <p className="text-white/60 text-xs leading-relaxed max-w-md">كل من تابعك يدخل هذه القاعة للأبد — ويصل إشعاراً فورياً بكل دورة أو درس جديد تنشره. هذه نخبة جمهورك المخلص.</p>
          </div>
          <div className="relative flex flex-col items-center px-6 py-3 rounded-2xl bg-white/[0.06] border border-gold/40 backdrop-blur-sm">
            <div className="absolute inset-0 opacity-20 rounded-2xl" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
            <span className="relative text-4xl font-extrabold tabular-nums text-gold" dir="ltr">{total}</span>
            <span className="relative text-[10px] font-bold text-white/70 flex items-center gap-1"><Users className="w-3 h-3" /> متابع وفيّ</span>
          </div>
        </div>
      </div>

      {total === 0 ? (
        /* ── القاعة الفارغة الفاخرة ── */
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-white to-gold/5 p-14 text-center">
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px',
          }} />
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <HeartHandshake className="w-12 h-12 text-gold" />
            </div>
          </div>
          <h3 className="relative font-bold text-navy text-lg mb-1.5">المتحف ينتج أول معروضاته</h3>
          <p className="relative text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">عندما يتابعك أول متدرب ستضيء هذه القاعة فوراً باسمه ويدخل منصة الشرف — انشر دوراتك ليكتشفك الجمهور ✨</p>
        </div>
      ) : (
        <>
          {/* ── شريط الإحصاءات ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-navy via-navy-light to-navy p-3.5 text-white border border-gold/30">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
              <div className="relative">
                <HeartHandshake className="w-4 h-4 text-gold mb-1.5" />
                <p className="text-2xl font-extrabold tabular-nums" dir="ltr">{total}</p>
                <p className="text-[9px] text-gold/80 font-bold">إجمالي المتابعين</p>
              </div>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-white to-gold/5 p-3.5">
              <TrendingUp className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-2xl font-extrabold text-navy tabular-nums" dir="ltr">{thisWeek}</p>
              <p className="text-[9px] font-bold text-muted-foreground">متابعون هذا الأسبوع</p>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-white to-gold/5 p-3.5">
              <UserCheck className="w-4 h-4 text-amber-600 mb-1.5" />
              <p className="text-2xl font-extrabold text-navy tabular-nums" dir="ltr">{today}</p>
              <p className="text-[9px] font-bold text-muted-foreground">انضموا اليوم</p>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-white to-gold/5 p-3.5">
              <Gem className="w-4 h-4 text-gold mb-1.5" />
              <p className="text-sm font-extrabold text-navy tabular-nums pt-1">{latest ? fmtDate(latest.created_at) : '—'}</p>
              <p className="text-[9px] font-bold text-muted-foreground">آخر متابعة</p>
            </div>
          </div>

          {/* ── منصة الشرف — أول المتابعين ── */}
          <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-l from-gold/[0.08] via-white to-gold/[0.04] p-5">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-300 to-gold" />
            <h3 className="text-sm font-extrabold text-navy flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow"><Trophy className="w-4 h-4 text-navy" /></span>
              منصة الشرف — أوائل المتابعين
              <span className="text-[9px] font-bold text-muted-foreground font-normal">من آمنوا بك منذ البداية</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pioneers.map((f: any, i: number) => (
                <div key={f.id} className={`relative overflow-hidden rounded-xl border p-3.5 text-center transition-all hover:shadow-md ${i === 0 ? 'border-gold/60 bg-gradient-to-b from-gold/15 to-transparent' : i === 1 ? 'border-slate-300/70 bg-gradient-to-b from-slate-200/40 to-transparent' : 'border-amber-700/25 bg-gradient-to-b from-amber-700/10 to-transparent'}`}>
                  {i === 0 && <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' }} />}
                  <div className="relative">
                    <span className="text-2xl">{pioneerMedal[i]}</span>
                    <div className="relative inline-block mt-1.5">
                      <div className="absolute inset-0 bg-gold/40 blur-md rounded-full" />
                      <Avatar className="relative w-14 h-14 rounded-2xl border-2 border-gold/70 shadow-lg mx-auto">
                        <AvatarImage src={f.follower?.avatar || ''} />
                        <AvatarFallback className="text-base font-extrabold bg-gradient-to-br from-navy to-navy-light text-gold rounded-2xl">
                          {f.follower?.name?.charAt(0) || '؟'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <p className="mt-2 text-sm font-extrabold text-navy truncate">{f.follower?.name || 'متدرب'}</p>
                    <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                      <Calendar className="w-2.5 h-2.5" /> أول متابعة {fmtDate(f.created_at)}
                    </p>
                    {i === 0 && <span className="inline-block mt-1.5 text-[8px] font-extrabold rounded-full bg-gradient-to-l from-gold to-amber-500 text-navy px-2 py-0.5 shadow">الوصيف الأول ✦</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── سجل المتابعين الكامل ── */}
          <div className="rounded-2xl border border-border bg-white overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gold/15 bg-gradient-to-l from-gold/[0.05] to-transparent">
              <h3 className="text-sm font-extrabold text-navy flex items-center gap-2 flex-1 min-w-[140px]">
                <Medal className="w-4 h-4 text-gold" /> سجل النخبة الكامل
                <span className="text-[9px] font-bold text-muted-foreground font-normal">({total} متابع)</span>
              </h3>
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث عن متابع بالاسم..."
                  className="w-full rounded-xl border border-gold/25 bg-white py-2 pr-10 pl-3 text-xs focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold transition-all"
                />
              </div>
              <div className="flex items-center gap-1 bg-gold/5 border border-gold/20 rounded-xl p-1">
                <button type="button" onClick={() => setSort('newest')} className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all ${sort === 'newest' ? 'bg-gradient-to-l from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}>الأحدث</button>
                <button type="button" onClick={() => setSort('oldest')} className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all ${sort === 'oldest' ? 'bg-gradient-to-l from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}>الأقدم</button>
              </div>
            </div>
            <div className="p-4">
              {shown.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">لا توجد نتائج مطابقة للبحث</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {shown.map((f: any, idx: number) => {
                    const isNew = Date.now() - new Date(f.created_at).getTime() < 3 * 864e5
                    const isLatest = sort === 'newest' && !q && idx === 0
                    return (
                      <div key={f.id} className="group relative overflow-hidden rounded-xl border border-gold/20 bg-gradient-to-br from-white to-gold/5 p-4 text-center hover:border-gold/50 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-60" />
                        {isLatest && (
                          <span className="absolute top-1.5 left-1.5 rounded-full bg-gradient-to-l from-gold to-amber-500 text-navy text-[7px] font-extrabold px-1.5 py-0.5 shadow">الأحدث ✦</span>
                        )}
                        {isNew && !isLatest && (
                          <span className="absolute top-1.5 left-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 text-[7px] font-extrabold px-1.5 py-0.5">جديد</span>
                        )}
                        <div className="relative inline-block mb-2.5 mt-1">
                          <div className="absolute inset-0 bg-gold/40 blur-md rounded-full scale-90" />
                          <Avatar className="relative w-14 h-14 rounded-2xl border-2 border-gold/60 shadow-md">
                            <AvatarImage src={f.follower?.avatar || ''} />
                            <AvatarFallback className="text-base font-extrabold bg-gradient-to-br from-navy to-navy-light text-gold rounded-2xl">
                              {f.follower?.name?.charAt(0) || '؟'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <p className="text-xs font-extrabold text-navy truncate">{f.follower?.name || 'متدرب'}</p>
                        <p className="text-[9px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> متابعة منذ {fmtDate(f.created_at)}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/10 border border-gold/25 px-2 py-0.5">
                          <HeartHandshake className="w-2.5 h-2.5 text-gold" />
                          <span className="text-[8px] font-extrabold text-[#8a6d1d]">في قاعة المجد</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
