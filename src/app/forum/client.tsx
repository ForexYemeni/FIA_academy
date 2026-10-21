'use client'

// ============================================================================
// PUBLIC FORUM — ROYAL v4.2 — the ENTIRE forum visible to EVERYONE.
// Guests browse all categories + topics + replies luxuriously; a royal CTA
// invites them to join the academy to participate. Logged-in users get a
// direct link to the dashboard forum.
// ============================================================================
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  MessageSquare, Sparkles, Eye, Reply, Clock, Pin, Users,
  LayoutGrid, Search, Loader2, ArrowRight, Crown, ShieldCheck,
} from 'lucide-react'

function roleIdentity(role?: string) {
  const map: Record<string, { label: string; cls: string }> = {
    admin: { label: 'مدير النظام', cls: 'bg-rose-500/12 text-rose-600 border-rose-500/35' },
    trainer: { label: 'مدرب معتمد', cls: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/35' },
    student: { label: 'متدرب', cls: 'bg-blue-500/12 text-blue-700 border-blue-500/35' },
    founder: { label: 'المؤسس', cls: 'bg-gold/15 text-[#8a6d1d] border-gold/45' },
    leader: { label: 'قائد فريق', cls: 'bg-purple-500/12 text-purple-700 border-purple-500/35' },
    team: { label: 'فريق الإدارة', cls: 'bg-slate-500/12 text-slate-600 border-slate-500/35' },
  }
  return map[role || ''] || { label: 'عضو', cls: 'bg-muted text-muted-foreground border-border' }
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} يوم`
  return new Date(dateStr).toLocaleDateString('ar-EG')
}

export default function ForumPublicClient() {
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/forum-categories').then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : []
      setCategories(arr)
      if (arr.length > 0) setActiveCategory(arr[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeCategory) return
    setLoadingTopics(true)
    fetch(`/api/forum-topics?category_id=${activeCategory}`)
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : []))
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false))
  }, [activeCategory])

  const filtered = topics.filter((t) =>
    !query.trim() || (t.title || '').includes(query.trim()) || (t.body || '').includes(query.trim())
  )
  const totalTopics = topics.length
  const activeCat = categories.find((c: any) => c.id === activeCategory)

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white" dir="rtl">
      {/* ⚡ Magical hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy text-white py-16">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px, 18px 18px',
        }} />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gold/10 rounded-full blur-2xl" />
        <div className="container mx-auto px-4 lg:px-6 text-center relative">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold">منتدى الأكاديمية — متاح للجميع</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            <span className="bg-gradient-to-l from-white via-gold/90 to-white bg-clip-text text-transparent">
              مجتمع الأكاديمية النابض
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed mb-6">
            تصفح كل النقاشات الطبية والتدريبية بين نخبة المدربين والمتدربين — بحرية كاملة ودون تسجيل
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="/#forum">
              <Button className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold rounded-xl shadow-lg">
                <MessageSquare className="w-4 h-4 ml-1" /> شارك في النقاشات
              </Button>
            </a>
            <a href="/">
              <Button variant="outline" className="rounded-xl border-white/30 text-white hover:bg-white/10">
                <ArrowRight className="w-4 h-4 ml-1" /> العودة للرئيسية
              </Button>
            </a>
          </div>
          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-center">
              <div className="text-xl font-extrabold text-gold tabular-nums" dir="ltr">{categories.length}</div>
              <div className="text-[10px] text-white/70 font-bold">قسم نقاش</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-center">
              <div className="text-xl font-extrabold text-gold tabular-nums" dir="ltr">{totalTopics}</div>
              <div className="text-[10px] text-white/70 font-bold">موضوع في هذا القسم</div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-navy/5 to-transparent" />
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 lg:px-6">
          {/* Category chips */}
          <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
            ) : categories.map((c: any) => {
              const active = c.id === activeCategory
              return (
                <button key={c.id} onClick={() => setActiveCategory(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-gradient-to-br from-navy to-navy-light text-gold border-gold/40 shadow-md'
                      : 'bg-white text-muted-foreground border-border hover:border-gold/40 hover:text-navy'
                  }`}>
                  <LayoutGrid className="w-3.5 h-3.5" /> {c.name}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-8 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في مواضيع المنتدى..."
              className="w-full h-11 rounded-xl border border-gold/25 bg-white pr-10 pl-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gold/40" />
          </div>

          {/* Topics */}
          {loadingTopics ? (
            <div className="text-center py-16"><Loader2 className="w-8 h-8 mx-auto animate-spin text-gold" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-navy mb-1">لا توجد مواضيع في هذا القسم بعد</p>
              <p className="text-xs">كن أول من يفتح النقاش — سجّل دخولك من الرئيسية ✨</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3 fia-stagger">
              {filtered.map((t: any) => {
                const rid = roleIdentity(t.author?.role)
                return (
                  <Card key={t.id} className="fia-card-hover p-4 border border-gold/20 hover:border-gold/40">
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-navy to-navy-light border-2 border-gold/30 flex items-center justify-center overflow-hidden">
                          {t.author?.avatar ? (
                            <img src={t.author.avatar} alt={t.author?.name || ''} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="text-gold font-extrabold text-sm">{t.author?.name?.charAt(0) || '؟'}</span>
                          )}
                        </div>
                        {t.author?.role === 'founder' && (
                          <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-gradient-to-br from-gold to-amber-500 border-2 border-white flex items-center justify-center">
                            <Crown className="w-2.5 h-2.5 text-navy" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-extrabold text-navy text-sm">{t.title}</h3>
                          {t.pinned && (
                            <span className="text-[9px] font-extrabold text-amber-700 bg-gold/15 border border-gold/40 rounded-full px-2 py-0.5 flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" /> مثبّت
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[10px]">
                          <span className="font-bold text-navy">{t.author?.name || 'عضو'}</span>
                          <span className={`rounded-full px-2 py-0.5 border font-extrabold ${rid.cls}`}>{rid.label}</span>
                          <span className="text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" /> {timeAgo(t.created_at)}</span>
                        </div>
                        {t.body && <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 line-clamp-2">{t.body}</p>}
                      </div>
                      <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                        <span className="flex items-center gap-1"><Reply className="w-3.5 h-3.5" /> {t.replies_count || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {t.views || 0}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Royal CTA */}
          <div className="max-w-3xl mx-auto mt-10 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-l from-navy via-navy-light to-navy text-white shadow-xl ring-1 ring-gold/30 text-center">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #D4AF37 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
            <div className="relative">
              <ShieldCheck className="w-8 h-8 text-gold mx-auto mb-2" />
              <h3 className="text-lg font-extrabold mb-1">انضم لمجتمع الأكاديمية</h3>
              <p className="text-white/70 text-xs mb-4 max-w-md mx-auto">سجّل في الأكاديمية لتفتح مواضيعك، تردّ على النقاشات، وتتابع نخبة المدربين — كل ذلك بتجربة فاخرة</p>
              <a href="/#forum">
                <Button className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold rounded-xl shadow-lg">
                  <Users className="w-4 h-4 ml-1" /> ابدأ الآن
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
