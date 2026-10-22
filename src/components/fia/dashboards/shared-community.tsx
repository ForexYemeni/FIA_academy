'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { SectionCard } from './shell'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { supabasePublic } from '@/lib/supabase'
import {
  MessageSquare, Plus, ArrowRight, Eye, Reply, Pin, Trash2, Ban,
  Newspaper, HelpCircle, ChevronDown, Clock, Loader2, AlertTriangle,
  Send, Shield, CheckCircle2, Search, X, ThumbsUp, ThumbsDown, Heart, MessageCircle, Sparkles,
} from 'lucide-react'

// ============================================================================
// Reusable reaction buttons component (like / dislike)
// ============================================================================
function ReactionButtons({ type, targetId, userId, initialLikes, initialDislikes }: {
  type: 'topic' | 'post' | 'blog'
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
      const apiPath = type === 'blog' ? '/api/blog/react' : '/api/forum/react'
      const body: any = { user_id: userId, reaction }
      if (type === 'topic') body.topic_id = targetId
      else if (type === 'post') body.post_id = targetId
      else if (type === 'blog') body.blog_post_id = targetId

      const res = await fetch(apiPath, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.action === 'added') {
        setMyReaction(reaction)
        if (reaction === 'like') setLikes(l => l + 1)
        else setDislikes(d => d + 1)
      } else if (data.action === 'removed') {
        setMyReaction(null)
        if (reaction === 'like') setLikes(l => Math.max(0, l - 1))
        else setDislikes(d => Math.max(0, d - 1))
      } else if (data.action === 'switched') {
        setMyReaction(reaction)
        if (reaction === 'like') {
          setLikes(l => l + 1)
          setDislikes(d => Math.max(0, d - 1))
        } else {
          setDislikes(d => d + 1)
          setLikes(l => Math.max(0, l - 1))
        }
      }
    } catch {} finally { setBusy(false) }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => react('like')}
        disabled={busy || !userId}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
          myReaction === 'like'
            ? 'bg-green-500/15 text-green-600 border border-green-500/30'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
        }`}
      >
        {type === 'blog' ? <Heart className={`w-3.5 h-3.5 ${myReaction === 'like' ? 'fill-green-500 text-green-500' : ''}`} /> : <ThumbsUp className="w-3.5 h-3.5" />}
        {likes > 0 && <span>{likes}</span>}
      </button>
      <button
        onClick={() => react('dislike')}
        disabled={busy || !userId}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
          myReaction === 'dislike'
            ? 'bg-red-500/15 text-red-600 border border-red-500/30'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        {dislikes > 0 && <span>{dislikes}</span>}
      </button>
    </div>
  )
}

// ============================================================================
// Reusable blog comment component
// ============================================================================
function BlogCommentSection({ blogPostId, userId }: { blogPostId: string; userId?: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/blog/comments?blog_post_id=${blogPostId}`)
      const data = await res.json()
      setComments(Array.isArray(data) ? data : [])
    } catch {} finally { setLoading(false) }
  }, [blogPostId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!commentText.trim() || !userId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/blog/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_post_id: blogPostId, user_id: userId, body: commentText }),
      })
      const data = await res.json()
      if (res.ok) {
        setCommentText('')
        load()
        toast.success('تم نشر تعليقك')
      }
    } catch {} finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/blog/comments', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      load()
      toast.success('تم حذف التعليق')
    } catch {}
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-gold" /> التعليقات ({comments.length})
      </h3>

      {userId && (
        <div className="mb-6 bg-muted/30 rounded-lg p-3 border border-border">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            placeholder="أكتب تعليقك..."
            dir="rtl"
            disabled={submitting}
          />
          <div className="flex justify-end mt-2">
            <Button onClick={submit} disabled={submitting || !commentText.trim()} className="bg-navy hover:bg-navy-light text-xs">
              {submitting ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Send className="w-3.5 h-3.5 ml-1" />}
              {submitting ? 'جاري...' : 'نشر التعليق'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4"><Loader2 className="w-5 h-5 mx-auto animate-spin text-navy" /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد تعليقات بعد. كن أول من يعلّق!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-white border border-border rounded-lg p-3 flex gap-3 group">
              <Avatar className="w-8 h-8 border border-gold/20 flex-shrink-0">
                <AvatarImage src={c.author?.avatar || ''} />
                <AvatarFallback className="bg-navy text-gold text-xs">{c.author?.name?.charAt(0) || '؟'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-navy">{c.author?.name || 'مستخدم'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5 inline" /> {new Date(c.created_at).toLocaleDateString('ar-EG')}
                    </span>
                    {c.user_id === userId && (
                      <button onClick={() => handleDelete(c.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-opacity" title="حذف">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Role badge helper
// ============================================================================
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

function AuthorChip({ author }: { author: any }) {
  if (!author) return <span className="text-xs text-muted-foreground">مستخدم محذوف</span>
  return (
    <div className="flex items-center gap-2">
      <Avatar className="w-7 h-7 border border-gold/20">
        <AvatarImage src={author.avatar || ''} />
        <AvatarFallback className="bg-navy text-gold text-xs">{author.name?.charAt(0) || '؟'}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-navy">{author.name}</span>
        {roleBadge(author.role)}
      </div>
    </div>
  )
}

// ============================================================================
// SHARED FORUM — used by student / trainer / team dashboards
// ============================================================================
export function SharedForum({ user }: { user: any }) {
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
  const [banTarget, setBanTarget] = useState<any | null>(null) // {userId, name}
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)

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
          // New topic — refresh to include it
          debouncedRefresh()
          // Don't show toast for own topics (the user just created it)
          if (payload.new.user_id !== user?.id) {
            toast.info('💬 موضوع جديد في المنتدى')
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, (payload: any) => {
          // New reply — update the topic's replies_count
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

  // Auto-open a topic when arriving via a deep-link notification.
  // Notification link format: `/#forum?t=<topic-id>`. The useHashTab hook
  // in the dashboard shell sets the active tab to `forum`; then this
  // effect parses `?t=ID` from the hash and fetches the topic + posts.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const applyTopicDeepLink = async () => {
      const hash = window.location.hash.replace(/^#/, '')
      if (!hash) return
      const params = new URLSearchParams(hash.split('?')[1] || hash.split('&').slice(1).join('&'))
      const tId = params.get('t')
      if (!tId || !topics.length) return
      // Find the topic in the loaded list
      const topic = topics.find((x: any) => x.id === tId)
      if (topic) {
        await openTopic(topic)
        // Clean the hash so refresh doesn't reopen the topic
        try { history.replaceState(null, '', window.location.pathname + window.location.search) } catch {}
      } else {
        // Topic might be in another category — fetch directly
        try {
          const r = await fetch(`/api/forum-topics?topic_id=${tId}`)
          const d = await r.json()
          if (d && d.id) {
            await openTopic(d)
            try { history.replaceState(null, '', window.location.pathname + window.location.search) } catch {}
          }
        } catch {}
      }
    }
    applyTopicDeepLink()
    const handler = () => applyTopicDeepLink()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [topics])

  const openTopic = async (t: any) => {
    setViewingTopic(t)
    const res = await fetch(`/api/forum?topic_id=${t.id}`)
    const data = await res.json()
    setPosts(Array.isArray(data) ? data : [])
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
      if (!res.ok) {
        toast.error(data.error || 'فشل الإرسال')
        return
      }
      // Refresh posts (with author profiles)
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

  if (banInfo) {
    return (
      <SectionCard title="المنتدى" description="تم حظرك من المنتدى">
        <div className="text-center py-12 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <Ban className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-navy mb-2">تم حظرك من المنتدى</h3>
          <p className="text-sm text-muted-foreground mb-4">{banInfo.reason || 'لتواصلك مع الإدارة لمعرفة السبب'}</p>
          {banInfo.expires_at && (
            <p className="text-xs text-muted-foreground">ينتهي الحظر في: {new Date(banInfo.expires_at).toLocaleDateString('ar-EG')}</p>
          )}
        </div>
      </SectionCard>
    )
  }

  if (viewingTopic) {
    return (
      <SectionCard
        title={viewingTopic.title}
        description={`${posts.length} رد`}
        action={
          <Button variant="outline" onClick={() => setViewingTopic(null)}>
            <ArrowRight className="w-4 h-4 ml-1" /> رجوع للقائمة
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Original post (the topic body is the first "post") */}
          {viewingTopic.body && (
            <Card className="p-4 border-gold/30 bg-gold/5">
              <div className="flex items-center justify-between mb-3">
                <AuthorChip author={viewingTopic.author} />
                <span className="text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 inline" /> {new Date(viewingTopic.created_at).toLocaleDateString('ar-EG')}
                </span>
              </div>
              <p className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{viewingTopic.body}</p>
              {/* Reaction buttons for the topic itself */}
              <div className="mt-3 pt-2 border-t border-gold/20">
                <ReactionButtons type="topic" targetId={viewingTopic.id} userId={user?.id} initialLikes={viewingTopic.likes_count || 0} initialDislikes={viewingTopic.dislikes_count || 0} />
              </div>
            </Card>
          )}

          {posts.map((p) => (
            <Card key={p.id} className={`p-4 ${p.is_solution ? 'border-green-500/40 bg-green-500/5' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <AuthorChip author={p.author} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline" /> {new Date(p.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  {/* Ban button — only for trainers/admin/team, not for self */}
                  {canBan && p.user_id !== user?.id && p.author?.role !== 'admin' && (
                    <button
                      onClick={() => setBanTarget({ userId: p.user_id, name: p.author?.name || 'مستخدم' })}
                      className="text-xs text-red-500 hover:bg-red-500/10 px-2 py-1 rounded"
                      title="حظر من المنتدى"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {p.is_solution && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">✓ الحل المختار</Badge>}
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.body}</p>
              {/* Reaction buttons for forum posts */}
              <div className="mt-3 pt-2 border-t border-border">
                <ReactionButtons type="post" targetId={p.id} userId={user?.id} initialLikes={p.likes_count || 0} initialDislikes={p.dislikes_count || 0} />
              </div>
            </Card>
          ))}

          {/* Reply box */}
          <Card className="p-4 bg-muted/30">
            <Label className="mb-2 block">أضف رداً</Label>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              placeholder="اكتب ردك هنا..."
              dir="rtl"
              disabled={replying}
            />
            <div className="flex justify-end mt-2">
              <Button onClick={submitReply} disabled={replying || !replyText.trim()} className="bg-navy hover:bg-navy-light">
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
                سيتم منع هذا المستخدم من نشر المواضيع والردود في المنتدى بشكل دائم. يمكن للإدارة رفع الحظر لاحقاً.
              </p>
              <div>
                <Label>السبب (اختياري)</Label>
                <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="مخالفة قواعد المنتدى" className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setBanTarget(null); setBanReason('') }}>إلغاء</Button>
              <Button onClick={handleBan} disabled={banning} className="bg-red-500 hover:bg-red-600">
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
    <SectionCard
      title="المنتدى"
      description={`${topics.length} موضوع`}
      action={
        <Button className="bg-navy hover:bg-navy-light rounded-xl" onClick={() => setNewTopicOpen(true)}>
          <Plus className="w-4 h-4 ml-1" /> موضوع جديد
        </Button>
      }
    >
      {/* ⚡ Magical category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => {
          const isActive = activeCategory === c.id
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                isActive
                  ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border-gold/40'
                  : 'bg-white text-navy border-gold/20 hover:border-gold/40 hover:bg-gold/5'
              }`}
            >
              <span>{c.icon}</span> {c.name}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" />
        </div>
      ) : topics.length === 0 ? (
        /* ⚡ Magical empty state */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <MessageSquare className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا توجد مواضيع بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">كن أول من يبدأ النقاش في هذه الفئة ✨</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((t) => (
            <Card key={t.id} className="fia-card-hover p-4 border border-gold/20 hover:border-gold/40 cursor-pointer overflow-hidden relative">
              {/* Magical left strip */}
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-gold via-amber-400 to-gold opacity-70" />
              <button onClick={() => openTopic(t)} className="w-full text-right">
                <div className="flex items-start justify-between gap-3 mb-2 pr-2">
                  <div className="flex-1 min-w-0">
                    {t.pinned && (
                      <Badge className="bg-gradient-to-r from-gold/15 to-amber-500/15 text-gold border-gold/30 mb-1 text-[10px]">
                        📌 مثبت
                      </Badge>
                    )}
                    <h4 className="font-bold text-navy text-base mb-1 line-clamp-1">{t.title}</h4>
                    {t.body && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body}</p>}
                  </div>
                  <ChevronDown className="w-5 h-5 text-gold flex-shrink-0 rotate-[-90deg]" />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40 pr-2">
                  <AuthorChip author={t.author} />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-gold/60" /> {t.views || 0}</span>
                    <span className="flex items-center gap-1"><Reply className="w-3 h-3 text-gold/60" /> {t.replies_count || 0}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gold/60" /> {new Date(t.updated_at || t.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* New topic dialog */}
      <NewTopicDialog
        open={newTopicOpen}
        onOpenChange={setNewTopicOpen}
        categoryId={activeCategory}
        userId={user?.id}
        onCreated={(newTopic) => {
          setNewTopicOpen(false)
          loadTopics()
          openTopic(newTopic)
        }}
      />
    </SectionCard>
  )
}

function NewTopicDialog({ open, onOpenChange, categoryId, userId, onCreated }: any) {
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>موضوع جديد</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>العنوان *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="عنوان جذاب يلخص نقاشك" />
          </div>
          <div>
            <Label>المحتوى</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="mt-1" placeholder="اشرح موضوعك بالتفصيل..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
            نشر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// SHARED BLOG — readable by students/trainers/team — ROYAL v4.2:
// luxurious author chips (مدرب معتمد / المؤسس / الإدارة / فريق الإدارة) +
// trainers & admins can PUBLISH new topics with their name shining on them.
// ============================================================================

// Author identity for blog chips — role + team_role aware
function blogAuthorIdentity(author?: any): { label: string; cls: string; dot: string } {
  const role = author?.role || ''
  if (role === 'admin' && author?.team_role === 'founder')
    return { label: 'المؤسس', cls: 'bg-gold/15 text-[#8a6d1d] border-gold/45', dot: 'bg-gold' }
  if (role === 'trainer')
    return { label: 'مدرب معتمد', cls: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/35', dot: 'bg-emerald-500' }
  if (role === 'admin')
    return { label: 'الإدارة', cls: 'bg-rose-500/12 text-rose-600 border-rose-500/35', dot: 'bg-rose-500' }
  if (role === 'leader')
    return { label: 'قائد فريق', cls: 'bg-purple-500/12 text-purple-700 border-purple-500/35', dot: 'bg-purple-500' }
  if (role === 'team')
    return { label: 'فريق الإدارة', cls: 'bg-slate-500/12 text-slate-600 border-slate-500/35', dot: 'bg-slate-500' }
  return { label: 'عضو', cls: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' }
}

// Luxurious author chip — used on cards + inside the article view
function BlogAuthorChip({ author, compact }: { author?: any; compact?: boolean }) {
  if (!author) return null
  const rid = blogAuthorIdentity(author)
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative flex-shrink-0">
        <Avatar className={compact ? 'w-7 h-7 rounded-lg border-2 border-gold/40' : 'w-9 h-9 rounded-xl border-2 border-gold/40'}>
          <AvatarImage src={author.avatar || ''} />
          <AvatarFallback className="text-[10px] font-extrabold bg-gradient-to-br from-navy to-navy-light text-gold rounded-xl">
            {author.name?.charAt(0) || '؟'}
          </AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border border-white ${rid.dot}`} />
      </div>
      <div className="min-w-0">
        <div className={`font-extrabold text-navy truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>{author.name || 'كاتب'}</div>
        <span className={`inline-block text-[8px] font-extrabold rounded-full px-1.5 py-px border ${rid.cls}`}>{rid.label}</span>
      </div>
    </div>
  )
}

// ROYAL new-post dialog — trainers/admins publish topics that carry their name.
// v4.3 — نفس محرر الإدارة تماماً: رفع صورة الغلاف (وليس رابطاً) + معاينة حية.
function NewBlogPostDialog({ open, onOpenChange, user, onCreated }: any) {
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [cover, setCover] = useState('')
  const [saving, setSaving] = useState(false)
  // Cover image source: 'upload' (default — like the admin editor) or 'url'
  const [coverMode, setCoverMode] = useState<'upload' | 'url'>('upload')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [preview, setPreview] = useState(false)

  const reset = () => { setTitle(''); setExcerpt(''); setBody(''); setTags(''); setCover(''); setCoverMode('upload'); setPreview(false) }

  // Client-side cover compression — identical to the admin editor (fast on
  // slow mobile connections, keeps uploads under 1MB).
  const compressCoverImage = (file: File, maxW = 1600, maxH = 900, quality = 0.82): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          const scale = Math.min(maxW / width, maxH / height, 1)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('فشل ضغط الصورة')); return }
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = () => reject(new Error('فشل تحميل الصورة'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('فشل قراءة الملف'))
      reader.readAsDataURL(file)
    })
  }

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('الرجاء اختيار صورة (JPG / PNG / WebP)'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('حجم الصورة كبير جداً (حد أقصى 10 ميجابايت)'); return }
    setUploadingCover(true)
    try {
      const compressed = await compressCoverImage(file)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('folder', 'blog-covers')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل رفع الصورة'); return }
      setCover(data.url)
      toast.success('تم رفع صورة الغلاف')
    } catch (e: any) {
      toast.error(e?.message || 'خطأ في رفع الصورة')
    } finally {
      setUploadingCover(false)
    }
  }

  const save = async () => {
    if (!title.trim() || !body.trim()) { toast.error('العنوان والمحتوى مطلوبان'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, excerpt, body, tags, cover: cover || null, author_id: user?.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل النشر'); return }
      toast.success('📜 تم نشر موضوعك — اسمك يتألق الآن على المقال')
      reset()
      onCreated?.(data)
      onOpenChange(false)
    } finally { setSaving(false) }
  }

  const rid = blogAuthorIdentity(user)
  const inputCls = 'rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 border-0">
        {/* Royal header — same as the admin editor */}
        <div className="relative bg-gradient-to-br from-purple-700 via-purple-800 to-fuchsia-800 p-5 pb-6">
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px',
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
                <Newspaper className="w-5 h-5 text-gold" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-gold text-lg font-bold flex items-center gap-2 truncate">
                  <Sparkles className="w-4 h-4 text-gold flex-shrink-0" /> موضوع جديد في المدونة {rid.label === 'مدرب معتمد' ? '— باسمك كمدرب معتمد' : ''}
                </DialogTitle>
                <p className="text-xs text-gold/70 mt-0.5">محرر المدونة الملكي</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gold/10 border border-gold/20 rounded-xl p-1 flex-shrink-0">
              <button
                onClick={() => setPreview(false)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${!preview ? 'bg-gradient-to-r from-navy to-navy-light text-gold shadow' : 'text-gold/70 hover:text-gold'}`}
              >تحرير</button>
              <button
                onClick={() => setPreview(true)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${preview ? 'bg-gradient-to-r from-navy to-navy-light text-gold shadow' : 'text-gold/70 hover:text-gold'}`}
              >معاينة</button>
            </div>
          </div>
        </div>

        {preview ? (
          /* Live preview — exactly what readers will see */
          <div className="overflow-y-auto p-5 max-h-[70vh] lux-scrollbar">
            {/* Author hero */}
            <div className="relative overflow-hidden rounded-xl border-2 border-gold/30 bg-gradient-to-l from-gold/[0.09] via-amber-50/40 to-transparent p-3.5 mb-5 flex items-center justify-between gap-3">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, #D4AF37 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
              <div className="relative"><BlogAuthorChip author={user} /></div>
              <span className="relative text-[9px] font-extrabold rounded-full px-2.5 py-1 border bg-gold/15 text-[#8a6d1d] border-gold/45">✍ كاتب الموضوع</span>
            </div>
            <article>
              {cover && (
                <div className="aspect-video rounded-xl overflow-hidden shadow-md mb-4 border border-gold/20">
                  <img src={cover} alt={title} className="w-full h-full object-cover" />
                </div>
              )}
              {tags && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.split(',').map((t, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-gold/30 text-gold">{t.trim()}</Badge>
                  ))}
                </div>
              )}
              <h1 className="text-2xl font-bold text-navy mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-gold" />{title || 'العنوان غير مكتوب'}</h1>
              {excerpt && (
                <p className="text-base text-navy/80 leading-relaxed mb-4 border-r-4 border-gold pr-3">{excerpt}</p>
              )}
              <div className="text-navy/90 leading-loose whitespace-pre-wrap">
                {body || 'المحتوى فارغ'}
              </div>
            </article>
          </div>
        ) : (
          <div className="space-y-4 p-5 overflow-y-auto max-h-[70vh] lux-scrollbar">
            {/* Live author preview — the name shines */}
            <div className="rounded-xl border border-gold/30 bg-gradient-to-l from-gold/[0.08] to-transparent p-3 flex items-center justify-between gap-3">
              <BlogAuthorChip author={user} />
              <span className="text-[10px] text-muted-foreground font-bold">سيظهر اسمك بهذه الهيبة على الموضوع</span>
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><Newspaper className="w-3.5 h-3.5 text-gold" /> العنوان *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="عنوان فاخر يلخص موضوعك" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><MessageSquare className="w-3.5 h-3.5 text-gold" /> مقتطف قصير (يظهر في البطاقة)</Label>
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className={inputCls} placeholder="سطران يلخصان الفكرة" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5"><MessageSquare className="w-3.5 h-3.5 text-gold" /> المحتوى *</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={inputCls + ' leading-relaxed'} placeholder="اكتب موضوعك بالتفصيل... استخدم أسطراً فارغة لفصل الفقرات." />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">وسوم (فاصلة بينها)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="تدريب, طب" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">صورة الغلاف</Label>
              {/* Mode toggle — upload (default, identical to admin) vs URL */}
              <div className="flex items-center gap-1 bg-gold/5 border border-gold/20 rounded-xl p-1 mt-1 w-fit">
                <button
                  type="button"
                  onClick={() => setCoverMode('upload')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${coverMode === 'upload' ? 'bg-gradient-to-r from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}
                >
                  <span className="inline-flex items-center gap-1.5"><span className="text-[10px]">📤</span> رفع صورة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode('url')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${coverMode === 'url' ? 'bg-gradient-to-r from-navy to-navy-light text-gold shadow' : 'text-muted-foreground hover:text-navy'}`}
                >
                  <span className="inline-flex items-center gap-1.5"><span className="text-[10px]">🔗</span> رابط (متقدم)</span>
                </button>
              </div>
              {coverMode === 'upload' ? (
                <div className="mt-2.5">
                  {cover ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-md w-fit">
                      <img src={cover} alt="غلاف الموضوع" className="max-h-44 object-cover" />
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <label className="cursor-pointer">
                          <span className="w-7 h-7 rounded-full bg-white/90 text-navy flex items-center justify-center shadow text-xs font-bold hover:bg-white transition-colors">✎</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = '' }} />
                        </label>
                        <button type="button" onClick={() => setCover('')} className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow text-xs font-bold hover:bg-rose-600 transition-colors">✕</button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="rounded-xl border-2 border-dashed border-gold/40 bg-gold/[0.04] p-6 text-center hover:bg-gold/[0.08] transition-colors">
                        {uploadingCover ? <Loader2 className="w-7 h-7 mx-auto text-gold animate-spin" /> : <span className="text-2xl block mb-1.5">🖼️</span>}
                        <p className="text-xs font-bold text-navy">{uploadingCover ? 'جاري الرفع والضغط...' : 'اضغط لاختيار صورة الغلاف من جهازك'}</p>
                        <p className="text-[9px] text-muted-foreground mt-1">JPG / PNG / WebP — تُضغط تلقائياً للسرعة القصوى</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = '' }} />
                    </label>
                  )}
                </div>
              ) : (
                <Input value={cover} onChange={(e) => setCover(e.target.value)} className={'mt-2.5 ' + inputCls} placeholder="https://..." dir="ltr" />
              )}
            </div>
          </div>
        )}
        <DialogFooter className="border-t border-border/60 p-3 bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold shadow-md">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Newspaper className="w-4 h-4 ml-1" />}
            نشر الموضوع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SharedBlog() {
  // Read the current user from the global auth store so we can pass
  // user.id down to the reaction buttons + comment section. Previously
  // this component referenced an undeclared `user` variable which threw
  // a ReferenceError when the user opened a blog post inside the
  // dashboard's blog tab ("Application error: a client-side exception
  // has occurred").
  const user = useAuth((s) => s.user)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingPost, setViewingPost] = useState<any | null>(null)
  const [newPostOpen, setNewPostOpen] = useState(false)

  // ROYAL v4.2 — who can publish blog topics: trainers, admins & team.
  const canPublish = user && ['trainer', 'admin', 'team', 'leader', 'founder'].includes(user.role)

  useEffect(() => {
    fetch('/api/blog').then((r) => r.json()).then((d) => {
      setPosts(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ⚡ REAL-TIME: blog posts — readers see new articles INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('shared-blog-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'blog_posts' },
          (payload: any) => {
            // Only add published posts
            if (payload.new.status === 'منشور' || payload.new.status === 'published') {
              setPosts((prev: any[]) => [payload.new, ...prev])
              toast.info('📰 مقال جديد في المدونة')
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'blog_posts' },
          (payload: any) => {
            setPosts((prev: any[]) => prev.map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p))
            // Update viewingPost if it's the same one
            if (viewingPost?.id === payload.new.id) {
              setViewingPost(payload.new)
            }
          }
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'blog_posts' },
          (payload: any) => {
            setPosts((prev: any[]) => prev.filter((p) => p.id !== payload.old.id))
            if (viewingPost?.id === payload.old.id) {
              setViewingPost(null)
            }
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [viewingPost?.id])

  if (viewingPost) {
    const authorRid = blogAuthorIdentity(viewingPost.author)
    return (
      <SectionCard
        title={viewingPost.title}
        description={viewingPost.published_at ? new Date(viewingPost.published_at).toLocaleDateString('ar-EG') : ''}
        action={<Button variant="outline" onClick={() => setViewingPost(null)}><ArrowRight className="w-4 h-4 ml-1" /> رجوع</Button>}
      >
        {/* ROYAL author hero — the name shines */}
        <div className="relative overflow-hidden rounded-xl border-2 border-gold/30 bg-gradient-to-l from-gold/[0.09] via-amber-50/40 to-transparent p-3.5 mb-5 flex items-center justify-between gap-3">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, #D4AF37 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
          <div className="relative"><BlogAuthorChip author={viewingPost.author} /></div>
          {viewingPost.author && (
            <span className={`relative text-[9px] font-extrabold rounded-full px-2.5 py-1 border ${authorRid.cls}`}>✍ كاتب الموضوع</span>
          )}
        </div>
        {viewingPost.cover && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6">
            <img src={viewingPost.cover} alt={viewingPost.title} className="w-full h-full object-cover" />
          </div>
        )}
        {viewingPost.excerpt && (
          <p className="text-lg text-navy/80 leading-relaxed mb-6 border-r-4 border-gold pr-4">{viewingPost.excerpt}</p>
        )}
        <div className="text-navy whitespace-pre-wrap leading-loose">{viewingPost.body}</div>

        {/* Blog reaction buttons (heart like / thumbs down) */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <ReactionButtons type="blog" targetId={viewingPost.id} userId={user?.id} initialLikes={viewingPost.likes_count || 0} initialDislikes={viewingPost.dislikes_count || 0} />
        </div>

        {/* Blog comments section */}
        <BlogCommentSection blogPostId={viewingPost.id} userId={user?.id} />
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="المدونة"
      description={`${posts.length} مقال`}
      action={canPublish ? (
        <Button size="sm" onClick={() => setNewPostOpen(true)}
          className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-extrabold rounded-xl shadow-md">
          <Plus className="w-4 h-4 ml-1" /> موضوع جديد
        </Button>
      ) : undefined}
    >
      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد مقالات بعد.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((p) => (
            <Card key={p.id} className="overflow-hidden hover:shadow-md transition-all cursor-pointer" >
              <button onClick={() => setViewingPost(p)} className="w-full text-right">
                {p.cover && (
                  <div className="aspect-video overflow-hidden bg-navy">
                    <img src={p.cover} alt={p.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                )}
                <div className="p-4">
                  {p.tags && <Badge variant="outline" className="mb-2 text-[10px]">{p.tags.split(',')[0]}</Badge>}
                  <h4 className="font-bold text-navy text-sm mb-2 line-clamp-2">{p.title}</h4>
                  {p.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.excerpt}</p>}
                  {/* ROYAL author chip — the name shines on every card */}
                  {p.author && (
                    <div className="mb-3 pt-2 border-t border-border/40">
                      <BlogAuthorChip author={p.author} compact />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span><Clock className="w-3 h-3 inline" /> {p.published_at ? new Date(p.published_at).toLocaleDateString('ar-EG') : ''}</span>
                    <span><Eye className="w-3 h-3 inline" /> {p.views || 0}</span>
                  </div>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* ROYAL v4.2 — trainer/admin publish dialog */}
      <NewBlogPostDialog open={newPostOpen} onOpenChange={setNewPostOpen} user={user}
        onCreated={(post: any) => {
          if (post && post.status === 'منشور') setPosts((prev) => [post, ...prev])
        }}
      />
    </SectionCard>
  )
}

// ============================================================================
// SHARED FAQ — readable by everyone (accordion style)
// ============================================================================
export function SharedFAQ() {
  const [items, setItems] = useState<any[]>([])
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/faqs').then((r) => r.json()).then((d) => {
      setItems(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ⚡ REAL-TIME: FAQs — readers see FAQ changes INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('shared-faqs-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'faqs' },
          (payload: any) => {
            if (payload.new.status === 'نشط' || payload.new.status === 'active') {
              setItems((prev: any[]) => [payload.new, ...prev])
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'faqs' },
          (payload: any) => setItems((prev: any[]) => prev.map((f) => f.id === payload.new.id ? { ...f, ...payload.new } : f))
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'faqs' },
          (payload: any) => setItems((prev: any[]) => prev.filter((f) => f.id !== payload.old.id))
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  // Group by category
  const grouped: Record<string, any[]> = {}
  for (const f of items) {
    const c = f.category || 'عام'
    if (!grouped[c]) grouped[c] = []
    grouped[c].push(f)
  }

  if (loading) {
    return (
      <SectionCard title="الأسئلة الشائعة">
        <div className="text-center py-12"><Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" /></div>
      </SectionCard>
    )
  }

  if (items.length === 0) {
    return (
      <SectionCard title="الأسئلة الشائعة">
        <div className="text-center py-12 text-muted-foreground">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد أسئلة شائعة بعد.</p>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="الأسئلة الشائعة" description={`${items.length} سؤال`}>
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, faqs]) => (
          <div key={category}>
            <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-gold rounded-full" /> {category}
            </h3>
            <div className="space-y-2">
              {faqs.map((f) => {
                const idx = items.indexOf(f)
                const isOpen = openIdx === idx
                return (
                  <Card key={f.id} className="overflow-hidden">
                    <button
                      onClick={() => setOpenIdx(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-right hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-bold text-navy text-sm">{f.question}</span>
                      <ChevronDown className={`w-5 h-5 text-gold flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-sm text-gray-700 leading-relaxed border-t border-border pt-3">
                        {f.answer}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ============================================================================
// ADMIN FORUM BANS — manage active bans (lift a ban)
// ============================================================================
export function AdminForumBans() {
  const [bans, setBans] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadBans = useCallback(async () => {
    const res = await fetch('/api/forum-bans')
    const data = await res.json()
    const arr = Array.isArray(data) ? data : []
    setBans(arr)
    // Fetch profiles for all banned users
    const ids = arr.map((b: any) => b.banned_user_id).join(',')
    if (ids) {
      const pRes = await fetch(`/api/public-profiles?ids=${ids}`)
      const pData = await pRes.json()
      const map: Record<string, any> = {}
      for (const p of Array.isArray(pData) ? pData : []) map[p.user_id] = p
      setProfiles(map)
    }
  }, [])

  useEffect(() => { loadBans() }, [loadBans])

  const searchUsers = async (q: string) => {
    setSearchQ(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/users-search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } finally { setSearching(false) }
  }

  const banUser = async (user: any) => {
    const adminUser = useAuth.getState().user
    if (!adminUser) return
    const res = await fetch('/api/forum-bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        banned_user_id: user.id,
        banned_by_user_id: adminUser.id,
        reason: banReason || 'مخالفة قواعد المنتدى',
        scope: 'all',
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'فشل الحظر'); return }
    toast.success(`تم حظر ${user.name} من المنتدى`)
    setBanReason('')
    setSearchQ(''); setSearchResults([])
    loadBans()
  }

  const handleUnban = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/forum-bans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      toast.success('تم رفع الحظر')
      setDeleteTarget(null)
      loadBans()
    } finally { setDeleting(false) }
  }

  return (
    <SectionCard title="حظر المنتدى" description={`${bans.length} حظر نشط`}>
      <div className="space-y-6">
        {/* Search + ban section */}
        <Card className="p-4 bg-navy/5 border-gold/20">
          <h4 className="font-bold text-navy mb-3 flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500" /> حظر مستخدم جديد
          </h4>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQ}
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="ابحث بالاسم عن متدرب أو مدرب..."
                className="pr-10"
              />
            </div>
            {searching && <div className="text-xs text-muted-foreground"><Loader2 className="w-3 h-3 inline ml-1 animate-spin" /> جاري البحث...</div>}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded bg-white border">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.avatar || ''} />
                        <AvatarFallback className="bg-navy text-gold text-xs">{u.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-bold text-navy">{u.name}</div>
                        <div className="text-[10px] text-muted-foreground">{u.email}</div>
                      </div>
                      {roleBadge(u.role)}
                    </div>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => banUser(u)}>
                      <Ban className="w-3.5 h-3.5 ml-1" /> حظر
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="سبب الحظر (اختياري — الافتراضي: مخالفة قواعد المنتدى)"
              />
            </div>
          </div>
        </Card>

        {/* Active bans list */}
        <div>
          <h4 className="font-bold text-navy mb-3">الحظرات النشطة</h4>
          {bans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد حظرات نشطة.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bans.map((b) => {
                const profile = profiles[b.banned_user_id]
                return (
                  <Card key={b.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar || ''} />
                        <AvatarFallback className="bg-red-500/20 text-red-600 text-sm">
                          {profile?.name?.charAt(0) || '؟'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-navy text-sm">{profile?.name || 'مستخدم محذوف'}</div>
                        {roleBadge(profile?.role)}
                        {b.reason && <div className="text-xs text-muted-foreground mt-1">السبب: {b.reason}</div>}
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3 inline" /> منذ {new Date(b.banned_at).toLocaleDateString('ar-EG')}
                          {b.expires_at && ` · ينتهي ${new Date(b.expires_at).toLocaleDateString('ar-EG')}`}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-green-500/30 text-green-600 hover:bg-green-500/10" onClick={() => setDeleteTarget(b)}>
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> رفع الحظر
                    </Button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
        title="رفع الحظر"
        message="سيتمكن المستخدم من نشر المواضيع والردود في المنتدى مرة أخرى."
        itemLabel="المستخدم:"
        itemName={deleteTarget ? (profiles[deleteTarget.banned_user_id]?.name || '—') : ''}
        confirmLabel="رفع الحظر"
        cancelLabel="إلغاء"
        variant="info"
        onConfirm={handleUnban}
        loading={deleting}
      />
    </SectionCard>
  )
}
