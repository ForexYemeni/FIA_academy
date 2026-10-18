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
import {
  MessageSquare, Plus, ArrowRight, Eye, Reply, Pin, Trash2, Ban,
  Newspaper, HelpCircle, ChevronDown, Clock, Loader2, AlertTriangle,
  Send, Shield, CheckCircle2, Search, X, ThumbsUp, ThumbsDown, Heart, MessageCircle,
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
                      <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-opacity" title="حذف">
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
        <Button className="bg-navy hover:bg-navy-light" onClick={() => setNewTopicOpen(true)}>
          <Plus className="w-4 h-4 ml-1" /> موضوع جديد
        </Button>
      }
    >
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeCategory === c.id
                ? 'bg-navy text-gold shadow-md'
                : 'bg-muted/50 hover:bg-muted text-navy'
            }`}
          >
            <span>{c.icon}</span> {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" />
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد مواضيع بعد في هذه الفئة. كن أول من يبدأ النقاش!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((t) => (
            <Card key={t.id} className="p-4 hover:shadow-md transition-all cursor-pointer" >
              <button onClick={() => openTopic(t)} className="w-full text-right">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    {t.pinned && <Badge className="bg-gold/15 text-gold border-gold/30 mb-1 text-[10px]">📌 مثبت</Badge>}
                    <h4 className="font-bold text-navy text-base mb-1">{t.title}</h4>
                    {t.body && <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>}
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted-foreground rotate-[-90deg]" />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <AuthorChip author={t.author} />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span><Eye className="w-3 h-3 inline" /> {t.views || 0}</span>
                    <span><Reply className="w-3 h-3 inline" /> {t.replies_count || 0}</span>
                    <span><Clock className="w-3 h-3 inline" /> {new Date(t.updated_at || t.created_at).toLocaleDateString('ar-EG')}</span>
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
// SHARED BLOG — readable by students/trainers/team
// ============================================================================
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

  useEffect(() => {
    fetch('/api/blog').then((r) => r.json()).then((d) => {
      setPosts(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (viewingPost) {
    return (
      <SectionCard
        title={viewingPost.title}
        description={viewingPost.published_at ? new Date(viewingPost.published_at).toLocaleDateString('ar-EG') : ''}
        action={<Button variant="outline" onClick={() => setViewingPost(null)}><ArrowRight className="w-4 h-4 ml-1" /> رجوع</Button>}
      >
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
    <SectionCard title="المدونة" description={`${posts.length} مقال`}>
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
