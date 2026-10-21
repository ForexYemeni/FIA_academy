'use client'

// ============================================================================
// SHARED FORUM — Royal v3 redesign — used by ALL account dashboards
// (student / trainer / team / leader / founder / admin)
// Professional display for every account type + luxurious topic browsing.
// Data logic & APIs unchanged from shared-community SharedForum.
// ============================================================================
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { supabasePublic } from '@/lib/supabase'
import {
  MessageSquare, Plus, ArrowRight, Eye, Reply, Ban, ChevronDown,
  Clock, Loader2, Send, ThumbsUp, ThumbsDown, Pin, Sparkles,
  LayoutGrid, Search, X, Users, TrendingUp, ShieldCheck,
} from 'lucide-react'
import {
  LuxSection, LuxSearch, LuxEmpty, LuxBadge, LuxField, luxInput,
} from './luxury'
import { roleIdentity } from './admin-forum-royal'

// ---------------------------------------------------------------------------
// Reactions (like / dislike) — same API contract as shared-community version
// ---------------------------------------------------------------------------
function ReactionButtonsRoyal({ type, targetId, userId, initialLikes, initialDislikes }: {
  type: 'topic' | 'post'
  targetId: string
  userId?: string
  initialLikes: number
  initialDislikes: number
}) {
  const [likes, setLikes] = useState(initialLikes)
  const [dislikes, setDislikes] = useState(initialDislikes)
  const [myReaction, setMyReaction] = useState<'like' | 'dislike' | null>(null)
  const [busy, setBusy] = useState(false)

  const react = async (reaction: 'like' | 'dislike') => {
    if (!userId || busy) return
    setBusy(true)
    try {
      const body: any = { user_id: userId, reaction }
      if (type === 'topic') body.topic_id = targetId
      else body.post_id = targetId

      const res = await fetch('/api/forum/react', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.action === 'added') {
        setMyReaction(reaction)
        if (reaction === 'like') setLikes((l: number) => l + 1)
        else setDislikes((d: number) => d + 1)
      } else if (data.action === 'removed') {
        setMyReaction(null)
        if (reaction === 'like') setLikes((l: number) => Math.max(0, l - 1))
        else setDislikes((d: number) => Math.max(0, d - 1))
      } else if (data.action === 'switched') {
        setMyReaction(reaction)
        if (reaction === 'like') {
          setLikes((l: number) => l + 1)
          setDislikes((d: number) => Math.max(0, d - 1))
        } else {
          setDislikes((d: number) => d + 1)
          setLikes((l: number) => Math.max(0, l - 1))
        }
      }
    } catch {} finally { setBusy(false) }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => react('like')}
        disabled={busy || !userId}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 border ${
          myReaction === 'like'
            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/35'
            : 'bg-muted/40 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 border-transparent'
        }`}
      >
        <ThumbsUp className={`w-3.5 h-3.5 ${myReaction === 'like' ? 'fill-emerald-500' : ''}`} />
        {likes > 0 && <span className="tabular-nums">{likes}</span>}
      </button>
      <button
        onClick={() => react('dislike')}
        disabled={busy || !userId}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 border ${
          myReaction === 'dislike'
            ? 'bg-rose-500/15 text-rose-600 border-rose-500/35'
            : 'bg-muted/40 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 border-transparent'
        }`}
      >
        <ThumbsDown className={`w-3.5 h-3.5 ${myReaction === 'dislike' ? 'fill-rose-500' : ''}`} />
        {dislikes > 0 && <span className="tabular-nums">{dislikes}</span>}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Author identity chip — royal, professional for ALL account types
// ---------------------------------------------------------------------------
function RoyalAuthorChip({ author, size = 'md' }: { author: any; size?: 'sm' | 'md' }) {
  const rid = roleIdentity(author?.role)
  const w = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  if (!author) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${w} rounded-xl bg-muted flex items-center justify-center`}><Users className="w-4 h-4 text-muted-foreground" /></div>
        <span className="text-xs text-muted-foreground">مستخدم محذوف</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="relative flex-shrink-0">
        <Avatar className={`${w} rounded-xl border-2 ${author.role === 'founder' ? 'border-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'border-gold/30'}`}>
          <AvatarImage src={author.avatar || ''} />
          <AvatarFallback className="text-xs font-extrabold bg-gradient-to-br from-navy to-navy-light text-gold rounded-xl">
            {author.name?.charAt(0) || '؟'}
          </AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${rid.dot}`} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-extrabold text-navy truncate flex items-center gap-1">
          {author.name || 'مستخدم'}
          {author.role === 'founder' && <Sparkles className="w-3 h-3 text-gold flex-shrink-0" />}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-bold ${rid.cls}`}>
          <span className={`w-1 h-1 rounded-full ${rid.dot}`} /> {rid.label}
        </span>
      </div>
    </div>
  )
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

// ============================================================================
// SHARED FORUM — ROYAL
// ============================================================================
export function SharedForumRoyal({ user }: { user: any }) {
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [topics, setTopics] = useState<any[]>([])
  const [viewingTopic, setViewingTopic] = useState<any | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [newTopicOpen, setNewTopicOpen] = useState(false)
  const [banInfo, setBanInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [banTarget, setBanTarget] = useState<any | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)
  const [search, setSearch] = useState('')
  const [loadingPosts, setLoadingPosts] = useState(false)

  const canBan = user && ['admin', 'trainer', 'founder', 'leader', 'team'].includes(user.role)

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/forum-categories')
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
    if (data.length > 0 && !activeCategory) setActiveCategory(data[0].id)
  }, [activeCategory])

  const loadTopics = useCallback(async () => {
    if (!activeCategory) return
    setLoading(true)
    const res = await fetch(`/api/forum-topics?category_id=${activeCategory}`)
    const data = await res.json()
    setTopics(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [activeCategory])

  const checkBan = useCallback(async () => {
    if (!user?.id) return
    const res = await fetch(`/api/forum-bans?user_id=${user.id}`)
    const data = await res.json()
    if (data.banned) setBanInfo(data.bans?.[0] || { reason: 'تم حظرك من المنتدى' })
  }, [user?.id])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadTopics() }, [loadTopics])
  useEffect(() => { checkBan() }, [checkBan])

  // ⚡ REAL-TIME: forum topics + posts — users see new content INSTANTLY
  useEffect(() => {
    let channel: any
    let debounceTimer: any
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => loadTopics(), 200)
    }
    try {
      channel = supabasePublic
        .channel('shared-forum-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_topics' }, (payload: any) => {
          debouncedRefresh()
          if (payload.new.user_id !== user?.id) {
            toast.info('💬 موضوع جديد في المنتدى')
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, (payload: any) => {
          setTopics((prev: any[]) => prev.map((t) =>
            t.id === payload.new.topic_id
              ? { ...t, replies_count: (t.replies_count || 0) + 1 }
              : t
          ))
          if (payload.new.user_id !== user?.id) {
            toast.info('💬 رد جديد في المنتدى')
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'forum_topics' }, (payload: any) => {
          setTopics((prev: any[]) => prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'forum_topics' }, (payload: any) => {
          setTopics((prev: any[]) => prev.filter((t) => t.id !== payload.old.id))
        })
        .subscribe()
    } catch {}
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      try { supabasePublic.removeChannel(channel) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loadTopics])

  const openTopic = async (t: any) => {
    setViewingTopic(t)
    setLoadingPosts(true)
    try {
      const res = await fetch(`/api/forum?topic_id=${t.id}`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } finally { setLoadingPosts(false) }
  }

  const submitReply = async () => {
    if (!replyText.trim() || !viewingTopic || !user?.id) return
    setReplying(true)
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: viewingTopic.id, user_id: user.id, body: replyText }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الإرسال'); return }
      const postsRes = await fetch(`/api/forum?topic_id=${viewingTopic.id}`)
      const postsData = await postsRes.json()
      setPosts(Array.isArray(postsData) ? postsData : [])
      setReplyText('')
      toast.success('تم نشر ردك')
    } finally { setReplying(false) }
  }

  const handleBan = async () => {
    if (!banTarget || !user?.id) return
    setBanning(true)
    try {
      const res = await fetch('/api/forum-bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banned_user_id: banTarget.userId,
          banned_by_user_id: user.id,
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

  // ── Ban info view ────────────────────────────────────────────────────────
  if (banInfo) {
    return (
      <LuxSection title="المنتدى" subtitle="تم حظرك من المشاركة" icon={Ban} themeKey="forum">
        <LuxEmpty
          icon={Ban}
          themeKey="forum"
          title="تم حظرك من المنتدى"
          hint={banInfo.reason || 'تواصل مع الإدارة لمعرفة السبب'}
        />
      </LuxSection>
    )
  }

  // ── Topic detail view ────────────────────────────────────────────────────
  if (viewingTopic) {
    return (
      <LuxSection
        title={viewingTopic.title}
        subtitle={`${posts.length} رد`}
        icon={MessageSquare}
        themeKey="forum"
        count={posts.length}
        actions={
          <Button variant="outline" onClick={() => setViewingTopic(null)} className="rounded-xl border-gold/40 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm">
            <ArrowRight className="w-4 h-4 ml-1" /> رجوع
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Original topic */}
          {viewingTopic.body && (
            <Card className="relative p-0 border-gold/35 bg-gradient-to-br from-gold/[0.07] to-white overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-80" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <RoyalAuthorChip author={viewingTopic.author} />
                  <div className="flex items-center gap-2">
                    {viewingTopic.pinned && <LuxBadge tone="gold"><Pin className="w-2.5 h-2.5" /> مثبت</LuxBadge>}
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gold/70" /> {timeAgo(viewingTopic.created_at)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{viewingTopic.body}</p>
                <div className="mt-3 pt-2.5 border-t border-gold/20">
                  <ReactionButtonsRoyal type="topic" targetId={viewingTopic.id} userId={user?.id} initialLikes={viewingTopic.likes_count || 0} initialDislikes={viewingTopic.dislikes_count || 0} />
                </div>
              </div>
            </Card>
          )}

          {/* Replies */}
          {loadingPosts ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-gold" />
              <span className="text-sm font-bold">جاري تحميل الردود...</span>
            </div>
          ) : posts.length === 0 ? (
            <LuxEmpty icon={Reply} themeKey="forum" title="لا توجد ردود بعد" hint="كن أول من يرد على هذا الموضوع" />
          ) : (
            posts.map((p) => (
              <Card key={p.id} className={`relative p-4 border overflow-hidden fia-card-hover ${p.is_solution ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : 'border-gold/20'}`}>
                {p.is_solution
                  ? <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-400 opacity-70" />
                  : <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold/50 via-amber-300/50 to-gold/50 opacity-40" />}
                <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap">
                  <RoyalAuthorChip author={p.author} size="sm" />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gold/70" /> {timeAgo(p.created_at)}
                    </span>
                    {p.is_solution && <LuxBadge tone="green"><ShieldCheck className="w-2.5 h-2.5" /> الحل المختار</LuxBadge>}
                    {canBan && p.user_id !== user?.id && p.author?.role !== 'admin' && (
                      <button
                        onClick={() => setBanTarget({ userId: p.user_id, name: p.author?.name || 'مستخدم' })}
                        className="text-[11px] text-rose-500 hover:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/25 flex items-center gap-1 transition-colors"
                        title="حظر من المنتدى"
                      >
                        <Ban className="w-3 h-3" /> حظر
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.body}</p>
                <div className="mt-3 pt-2.5 border-t border-gold/15">
                  <ReactionButtonsRoyal type="post" targetId={p.id} userId={user?.id} initialLikes={p.likes_count || 0} initialDislikes={p.dislikes_count || 0} />
                </div>
              </Card>
            ))
          )}

          {/* Reply box */}
          <Card className="relative p-4 bg-gradient-to-br from-white to-gold/[0.05] border border-gold/25 rounded-xl overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-70" />
            <Label className="mb-2 block text-xs font-extrabold text-navy flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center border border-gold/30">
                <Send className="w-3 h-3 text-gold" />
              </div>
              انضم إلى النقاش — أضف ردك
            </Label>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              placeholder="اكتب ردك هنا..."
              dir="rtl"
              disabled={replying}
              className="rounded-xl border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/25"
            />
            <div className="flex justify-end mt-2">
              <Button onClick={submitReply} disabled={replying || !replyText.trim()} className="bg-gradient-to-l from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all font-bold">
                {replying ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
                {replying ? 'جاري الإرسال...' : 'نشر الرد'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Ban dialog */}
        <Dialog open={!!banTarget} onOpenChange={(o) => { if (!o) { setBanTarget(null); setBanReason('') } }}>
          <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden">
            <div className="relative bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 p-5 pb-7">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px)',
                backgroundSize: '22px 22px',
              }} />
              <DialogTitle className="relative text-gold text-lg font-bold flex items-center gap-2">
                <Ban className="w-5 h-5 text-gold" /> حظر {banTarget?.name} من المنتدى
              </DialogTitle>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                سيتم منع هذا المستخدم من نشر المواضيع والردود في المنتدى. يمكن للإدارة رفع الحظر لاحقاً.
              </p>
              <LuxField label="سبب الحظر" icon={Ban} hint="اختياري">
                <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="مخالفة قواعد المنتدى" className={luxInput} />
              </LuxField>
            </div>
            <DialogFooter className="p-5 pt-0">
              <Button variant="outline" className="rounded-xl border-gold/30 hover:bg-gold/5" onClick={() => { setBanTarget(null); setBanReason('') }}>إلغاء</Button>
              <Button onClick={handleBan} disabled={banning} className="bg-gradient-to-l from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl shadow-md active:scale-[0.97] transition-all">
                {banning ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Ban className="w-4 h-4 ml-1" />}
                تأكيد الحظر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </LuxSection>
    )
  }

  // ── Main forum view ──────────────────────────────────────────────────────
  const filtered = topics.filter((t) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (t.title || '').toLowerCase().includes(q) || (t.body || '').toLowerCase().includes(q) || (t.author?.name || '').toLowerCase().includes(q)
  })
  const pinned = filtered.filter((t) => t.pinned)
  const normal = filtered.filter((t) => !t.pinned)
  const totalReplies = topics.reduce((a, t) => a + (t.replies_count || 0), 0)
  const activeCat = categories.find((c) => c.id === activeCategory)

  return (
    <LuxSection
      title="المنتدى"
      subtitle={activeCat ? `${activeCat.icon} ${activeCat.name}` : 'نقاشات مجتمع الأكاديمية'}
      icon={MessageSquare}
      themeKey="forum"
      count={filtered.length}
      actions={
        <Button
          className="relative bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-lg active:scale-[0.97] transition-all font-extrabold overflow-hidden"
          onClick={() => setNewTopicOpen(true)}
        >
          <span className="absolute inset-0 lux-shimmer" />
          <Plus className="w-4 h-4 ml-1 relative" /> موضوع جديد
        </Button>
      }
      toolbar={
        <>
          {/* Royal category pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((c) => {
              const isActive = activeCategory === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
                      : 'bg-white text-navy border-gold/20 hover:border-gold/45 hover:bg-gold/5'
                  }`}
                >
                  {isActive && <span className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 20% 25%, #D4AF37 1px, transparent 1px)', backgroundSize: '10px 10px' }} />}
                  <span className="relative text-sm">{c.icon}</span>
                  <span className="relative">{c.name}</span>
                </button>
              )
            })}
          </div>
          <LuxSearch value={search} onChange={setSearch} placeholder="ابحث في المواضيع أو أسماء الكتّاب..." />
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
          <span className="text-sm font-bold">جاري تحميل المواضيع...</span>
        </div>
      ) : filtered.length === 0 ? (
        <LuxEmpty
          icon={MessageSquare}
          themeKey="forum"
          title={search ? 'لا توجد نتائج مطابقة' : 'لا توجد مواضيع بعد'}
          hint={search ? 'جرّب كلمات بحث مختلفة' : 'كن أول من يبدأ النقاش في هذه الفئة — شارك سؤالك أو فكرتك مع مجتمع الأكاديمية'}
          action={!search ? (
            <Button className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md font-bold" onClick={() => setNewTopicOpen(true)}>
              <Plus className="w-4 h-4 ml-1" /> ابدأ أول نقاش
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3 fia-stagger">
          {pinned.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-[#8a6d1d] pt-1">
              <Pin className="w-3.5 h-3.5 text-gold" /> مواضيع مثبتة
              <div className="flex-1 h-px bg-gradient-to-l from-gold/30 to-transparent" />
            </div>
          )}
          {[...pinned, ...normal].map((t) => {
            const rid = roleIdentity(t.author?.role)
            return (
              <Card key={t.id} className="fia-card-hover p-0 border border-gold/20 hover:border-gold/45 cursor-pointer overflow-hidden relative">
                <div className={`absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b ${t.pinned ? 'from-gold via-amber-400 to-gold' : 'from-gold/40 via-amber-300/40 to-gold/40'}`} />
                <button onClick={() => openTopic(t)} className="w-full text-right">
                  <div className="p-4 pr-6">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        {t.pinned && (
                          <LuxBadge tone="gold" className="mb-1.5"><Pin className="w-2.5 h-2.5" /> مثبت</LuxBadge>
                        )}
                        <h4 className="font-extrabold text-navy text-base mb-1 line-clamp-1 flex items-center gap-1.5">
                          {t.title}
                          {t.author?.role === 'founder' && <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />}
                        </h4>
                        {t.body && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body}</p>}
                      </div>
                      <ChevronDown className="w-5 h-5 text-gold flex-shrink-0 rotate-[-90deg] mt-1" />
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gold/15 flex-wrap">
                      <RoyalAuthorChip author={t.author} size="sm" />
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-gold/70" /> {t.views || 0}</span>
                        <span className="flex items-center gap-1"><Reply className="w-3 h-3 text-gold/70" /> {t.replies_count || 0}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gold/70" /> {timeAgo(t.updated_at || t.created_at)}</span>
                        <span className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-bold ${rid.cls}`}>
                          <span className={`w-1 h-1 rounded-full ${rid.dot}`} /> {rid.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {/* New topic dialog — royal */}
      <NewTopicDialogRoyal
        open={newTopicOpen}
        onOpenChange={setNewTopicOpen}
        categoryId={activeCategory}
        userId={user?.id}
        onCreated={(newTopic: any) => {
          setNewTopicOpen(false)
          loadTopics()
          openTopic(newTopic)
        }}
      />
    </LuxSection>
  )
}

// ============================================================================
// NEW TOPIC DIALOG — royal
// ============================================================================
function NewTopicDialogRoyal({ open, onOpenChange, categoryId, userId, onCreated }: any) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) { toast.error('العنوان مطلوب'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/forum-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, user_id: userId, title, body }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل'); return }
      toast.success('تم نشر موضوعك')
      setTitle(''); setBody('')
      onCreated(data)
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto lux-scrollbar p-0 border-0">
        <div className="relative bg-gradient-to-br from-[#101a33] via-navy to-[#20325c] p-5 pb-7">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.2px, transparent 1.2px)',
            backgroundSize: '20px 20px',
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-3xl" />
          <button onClick={() => onOpenChange(false)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center z-10 transition-colors">
            <X className="w-4 h-4 text-white/90" />
          </button>
          <DialogTitle className="relative text-gold text-lg font-extrabold flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gold/20 backdrop-blur-md flex items-center justify-center border border-gold/40">
              <MessageSquare className="w-5 h-5 text-gold" />
            </div>
            <span>
              موضوع جديد
              <span className="block text-xs font-normal text-white/70 mt-0.5">شارك سؤالك أو فكرتك مع مجتمع الأكاديمية</span>
            </span>
          </DialogTitle>
        </div>
        <div className="space-y-4 p-5 bg-gradient-to-b from-gold/[0.04] to-white">
          <LuxField label="عنوان الموضوع" icon={MessageSquare} required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className={luxInput} placeholder="عنوان جذاب يلخص نقاشك" />
          </LuxField>
          <LuxField label="المحتوى" icon={Sparkles}>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="rounded-xl border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/25 lux-scrollbar" placeholder="اشرح موضوعك بالتفصيل..." />
          </LuxField>
        </div>
        <DialogFooter className="p-4 bg-muted/20 border-t border-gold/15">
          <Button variant="outline" className="rounded-xl border-gold/30 hover:bg-gold/5" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-to-l from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all font-bold">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
            {saving ? 'جاري النشر...' : 'نشر الموضوع'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
