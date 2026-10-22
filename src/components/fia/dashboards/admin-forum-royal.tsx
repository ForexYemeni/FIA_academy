'use client'

// ============================================================================
// ADMIN FORUM — Royal v3 redesign (FIA Royal design language)
// Professional display for ALL account types (admin/trainer/student/founder/
// leader/team role badges everywhere) + rich luxurious topic list.
// Data logic & APIs unchanged: /api/forum-categories, /api/forum-topics,
// /api/forum, /api/forum-bans
// ============================================================================
import React, { useEffect, useState } from 'react'
import {
  MessageSquare, Plus, Edit, Trash2, Eye, Clock, Pin, Reply, Send, Ban,
  Loader2, Sparkles, ArrowRight, Users, Hash, Search, LayoutGrid,
  FileText, ShieldCheck, TrendingUp, X, CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { supabasePublic } from '@/lib/supabase'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxEmpty, LuxBadge,
  LuxField, luxInput,
} from './luxury'

// ---------------------------------------------------------------------------
// Role identity — professional badges + avatar treatment for ALL accounts
// ---------------------------------------------------------------------------
export function roleIdentity(role?: string, isTrainerTeam = false): { label: string; cls: string; dot: string } {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    admin:    { label: 'مدير النظام', cls: 'bg-rose-500/12 text-rose-600 border-rose-500/35', dot: 'bg-rose-500' },
    trainer:  { label: 'مدرب',         cls: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/35', dot: 'bg-emerald-500' },
    student:  { label: 'متدرب',       cls: 'bg-blue-500/12 text-blue-700 border-blue-500/35', dot: 'bg-blue-500' },
    founder:  { label: 'المؤسس',      cls: 'bg-gold/15 text-[#8a6d1d] border-gold/45', dot: 'bg-gold' },
    leader:   { label: 'قائد فريق',   cls: 'bg-purple-500/12 text-purple-700 border-purple-500/35', dot: 'bg-purple-500' },
    team:     { label: 'فريق الإدارة', cls: 'bg-slate-500/12 text-slate-600 border-slate-500/35', dot: 'bg-slate-500' },
  }
  return map[role || ''] || { label: 'عضو', cls: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' }
}

function AuthorChip({ author, size = 'md' }: { author: any; size?: 'sm' | 'md' }) {
  const rid = roleIdentity(author?.role)
  const w = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  const letter = size === 'sm' ? 'text-[10px]' : 'text-xs'
  if (!author) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${w} rounded-xl bg-muted flex items-center justify-center`}><Users className="w-3.5 h-3.5 text-muted-foreground" /></div>
        <span className="text-xs text-muted-foreground">مستخدم محذوف</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative flex-shrink-0">
        <Avatar className={`${w} rounded-xl border-2 ${author.role === 'founder' ? 'border-gold' : 'border-gold/30'}`}>
          <AvatarImage src={author.avatar || ''} />
          <AvatarFallback className={`${letter} font-extrabold bg-gradient-to-br from-navy to-navy-light text-gold rounded-xl`}>
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

// time-ago helper
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
export function AdminForumRoyal() {
  const [tab, setTab] = useState<'categories' | 'topics'>('categories')
  const [cats, setCats] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  // topic viewing + reply + new topic creation
  const [viewingTopic, setViewingTopic] = useState<any | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [newTopicOpen, setNewTopicOpen] = useState(false)
  const [newTopicCat, setNewTopicCat] = useState<string>('')
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicBody, setNewTopicBody] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)
  // ban from inside topic view
  const [banTarget, setBanTarget] = useState<any | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)
  // list filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [loadingPosts, setLoadingPosts] = useState(false)

  const loadCats = () => fetch('/api/forum-categories').then((r) => r.json()).then((d) => setCats(Array.isArray(d) ? d : []))
  const loadTopics = () => fetch('/api/forum-topics').then((r) => r.json()).then((d) => setTopics(Array.isArray(d) ? d : []))
  useEffect(() => { loadCats(); loadTopics() }, [])

  // ⚡ REAL-TIME: forum — admin sees new topics + replies INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-forum-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_topics' },
          (payload: any) => {
            setTopics((prev: any[]) => prev.some((t) => t.id === payload.new.id) ? prev : [{ ...payload.new, author: null }, ...prev])
            toast.info('💬 موضوع جديد في المنتدى')
          })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' },
          () => toast.info('💬 رد جديد في المنتدى'))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'forum_topics' },
          (payload: any) => setTopics((prev: any[]) => prev.filter((t) => t.id !== payload.old.id)))
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const handleDeleteCat = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/forum-categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
      toast.success('تم حذف الفئة')
      setDeleteTarget(null); loadCats()
    } finally { setDeleting(false) }
  }

  const openTopic = async (t: any) => {
    setViewingTopic(t)
    setLoadingPosts(true)
    try {
      const res = await fetch(`/api/forum?topic_id=${t.id}`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } finally { setLoadingPosts(false) }
  }

  const getAdminUser = () => {
    try {
      const stored = localStorage.getItem('fia-auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed?.state?.user || null
      }
    } catch {}
    return null
  }
  const currentUser = getAdminUser()

  const submitReply = async () => {
    if (!replyText.trim() || !viewingTopic || !currentUser?.id) return
    setReplying(true)
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: viewingTopic.id, user_id: currentUser.id, body: replyText }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الإرسال'); return }
      const postsRes = await fetch(`/api/forum?topic_id=${viewingTopic.id}`)
      const postsData = await postsRes.json()
      setPosts(Array.isArray(postsData) ? postsData : [])
      setReplyText('')
      loadTopics()
      toast.success('تم نشر ردك')
    } finally { setReplying(false) }
  }

  const submitNewTopic = async () => {
    if (!newTopicTitle.trim() || !newTopicCat || !currentUser?.id) {
      toast.error('الفئة والعنوان مطلوبان'); return
    }
    setSavingTopic(true)
    try {
      const res = await fetch('/api/forum-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: newTopicCat, user_id: currentUser.id, title: newTopicTitle, body: newTopicBody }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل النشر'); return }
      toast.success('تم نشر الموضوع')
      setNewTopicOpen(false)
      setNewTopicTitle(''); setNewTopicBody('')
      loadTopics()
      openTopic(data)
    } finally { setSavingTopic(false) }
  }

  const handleBanUser = async () => {
    if (!banTarget || !currentUser?.id) return
    setBanning(true)
    try {
      const res = await fetch('/api/forum-bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banned_user_id: banTarget.userId,
          banned_by_user_id: currentUser.id,
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

  const togglePin = async (t: any) => {
    await fetch('/api/forum-topics', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, pinned: !t.pinned }) })
    toast.success(t.pinned ? 'تم إلغاء التثبيت' : 'تم تثبيت الموضوع')
    loadTopics()
  }

  // 🛡️ حذف موضوع بلا تأكيد كان يمحو نقاشاً كاملاً بنقرة واحدة — الآن حوار تأكيد ملكي مستقل
  const [topicDeleteTarget, setTopicDeleteTarget] = useState<any | null>(null)
  const [topicDeleting, setTopicDeleting] = useState(false)
  const deleteTopic = async (t: any) => {
    setTopicDeleteTarget(t)
  }
  const confirmDeleteTopic = async () => {
    if (!topicDeleteTarget) return
    setTopicDeleting(true)
    try {
      const res = await fetch('/api/forum-topics', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: topicDeleteTarget.id }) })
      if (res.ok) {
        toast.success('تم حذف الموضوع')
        setTopicDeleteTarget(null)
        loadTopics()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشل الحذف')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setTopicDeleting(false)
    }
  }

  // Filters for topic list
  const filteredTopics = topics.filter((t) => {
    if (catFilter && t.category_id !== catFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (t.title || '').toLowerCase().includes(q) || (t.body || '').toLowerCase().includes(q) || (t.author?.name || '').toLowerCase().includes(q)
  })
  const pinnedTopics = filteredTopics.filter((t) => t.pinned)
  const normalTopics = filteredTopics.filter((t) => !t.pinned)
  const catName = (id: string) => cats.find((c) => c.id === id)?.name

  const totalReplies = topics.reduce((a, t) => a + (t.replies_count || 0), 0)
  const totalViews = topics.reduce((a, t) => a + (t.views || 0), 0)

  // ==========================================================================
  // TOPIC DETAIL VIEW — royal thread
  // ==========================================================================
  if (viewingTopic) {
    const rid = roleIdentity(viewingTopic.author?.role)
    return (
      <LuxSection
        title={viewingTopic.title}
        subtitle={`${posts.length} رد${viewingTopic.author ? ` · بقلم ${viewingTopic.author.name}` : ''}`}
        icon={MessageSquare}
        themeKey="forum"
        count={posts.length}
        actions={
          <Button variant="outline" onClick={() => setViewingTopic(null)} className="rounded-xl border-gold/40 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm">
            <ArrowRight className="w-4 h-4 ml-1" /> رجوع للقائمة
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Original topic — royal card */}
          <Card className="relative p-0 border-gold/35 bg-gradient-to-br from-gold/[0.07] to-white overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-80" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <AuthorChip author={viewingTopic.author} />
                <div className="flex items-center gap-2 flex-wrap">
                  {viewingTopic.pinned && <LuxBadge tone="gold"><Pin className="w-2.5 h-2.5" /> موضوع مثبت</LuxBadge>}
                  {catName(viewingTopic.category_id) && <LuxBadge tone="navy">{catName(viewingTopic.category_id)}</LuxBadge>}
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gold/70" /> {timeAgo(viewingTopic.created_at)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{viewingTopic.body}</p>
            </div>
          </Card>

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
              <Card key={p.id} className={`relative p-4 border overflow-hidden ${p.is_solution ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : 'border-gold/20'} fia-card-hover`}>
                {p.is_solution
                  ? <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-400 opacity-70" />
                  : <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold/60 via-amber-300/60 to-gold/60 opacity-50" />}
                <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap">
                  <AuthorChip author={p.author} size="sm" />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gold/70" /> {timeAgo(p.created_at)}
                    </span>
                    {p.is_solution && <LuxBadge tone="green"><ShieldCheck className="w-2.5 h-2.5" /> حل مقبول</LuxBadge>}
                    {/* Ban button (not on self, not on admins) */}
                    {currentUser && p.user_id !== currentUser.id && p.author?.role !== 'admin' && (
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
              </Card>
            ))
          )}

          {/* Reply box — royal */}
          <Card className="relative p-4 bg-gradient-to-br from-white to-gold/[0.05] border border-gold/25 rounded-xl overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-70" />
            <Label className="mb-2 block text-xs font-extrabold text-navy flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center border border-gold/30">
                <Send className="w-3 h-3 text-gold" />
              </div>
              أضف رداً رسمياً — بصفتك مدير النظام
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

        {/* Ban confirmation dialog */}
        <Dialog open={!!banTarget} onOpenChange={(o) => { if (!o) { setBanTarget(null); setBanReason('') } }}>
          <DialogContent className="sm:max-w-md p-0 border-0 overflow-hidden">
            <div className="relative bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 p-5 pb-7">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px)',
                backgroundSize: '22px 22px',
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
              <DialogTitle className="relative text-gold text-lg font-bold flex items-center gap-2">
                <Ban className="w-5 h-5 text-gold" /> حظر {banTarget?.name} من المنتدى
              </DialogTitle>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                سيتم منع هذا المستخدم من نشر المواضيع والردود في المنتدى. يمكن رفع الحظر لاحقاً من شاشة "حظر المنتدى".
              </p>
              <LuxField label="سبب الحظر" icon={FileText} hint="اختياري">
                <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="مخالفة قواعد المنتدى" className={luxInput} />
              </LuxField>
            </div>
            <DialogFooter className="p-5 pt-0">
              <Button variant="outline" className="rounded-xl border-gold/30 hover:bg-gold/5" onClick={() => { setBanTarget(null); setBanReason('') }}>إلغاء</Button>
              <Button onClick={handleBanUser} disabled={banning} className="bg-gradient-to-l from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl shadow-md active:scale-[0.97] transition-all">
                {banning ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Ban className="w-4 h-4 ml-1" />}
                تأكيد الحظر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </LuxSection>
    )
  }

  // ==========================================================================
  // MAIN VIEW — categories & topics
  // ==========================================================================
  return (
    <LuxSection
      title="المنتدى"
      subtitle="إدارة الفئات والمواضيع ومتابعة نقاشات جميع الحسابات"
      icon={MessageSquare}
      themeKey="forum"
      count={tab === 'categories' ? cats.length : filteredTopics.length}
      stats={
        <LuxStats
          items={[
            { icon: LayoutGrid, label: 'الفئات', value: cats.length, grad: 'from-navy to-navy-light' },
            { icon: FileText, label: 'المواضيع', value: topics.length, grad: 'from-blue-500 to-indigo-600' },
            { icon: Reply, label: 'إجمالي الردود', value: totalReplies, grad: 'from-emerald-500 to-teal-600' },
            { icon: TrendingUp, label: 'إجمالي المشاهدات', value: totalViews.toLocaleString(), grad: 'from-gold to-amber-600' },
          ]}
        />
      }
      actions={
        <div className="flex gap-2 items-center flex-wrap">
          {/* Royal tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/10 border border-gold/30 backdrop-blur-sm">
            <button
              onClick={() => setTab('categories')}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'categories' ? 'bg-gradient-to-l from-gold to-amber-500 text-navy shadow' : 'text-white/80 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> الفئات
              <span className="text-[9px] px-1 py-px rounded-full bg-black/20 tabular-nums">{cats.length}</span>
            </button>
            <button
              onClick={() => setTab('topics')}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'topics' ? 'bg-gradient-to-l from-gold to-amber-500 text-navy shadow' : 'text-white/80 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> المواضيع
              <span className="text-[9px] px-1 py-px rounded-full bg-black/20 tabular-nums">{topics.length}</span>
            </button>
          </div>
          {tab === 'categories' && (
            <Button size="sm" className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md active:scale-[0.97] transition-all font-extrabold" onClick={() => { setEditingCat(null); setOpenCat(true) }}>
              <Plus className="w-3.5 h-3.5 ml-1" /> فئة جديدة
            </Button>
          )}
          {tab === 'topics' && (
            <Button size="sm" className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md active:scale-[0.97] transition-all font-extrabold" onClick={() => {
              if (cats.length === 0) { toast.error('أضف فئة أولاً'); return }
              setNewTopicCat(cats[0].id)
              setNewTopicOpen(true)
            }}>
              <Plus className="w-3.5 h-3.5 ml-1" /> موضوع جديد
            </Button>
          )}
        </div>
      }
      toolbar={tab === 'topics' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <LuxSearch value={search} onChange={setSearch} placeholder="ابحث في المواضيع وأسماء الكتّاب..." className="sm:col-span-2" />
          <LuxSelect value={catFilter} onChange={setCatFilter} placeholder="كل الفئات"
            options={cats.map((c) => ({ value: c.id, label: c.name, emoji: c.icon || '💬' }))} />
        </div>
      )}
    >
      {tab === 'categories' ? (
        <>
          {cats.length === 0 ? (
            <LuxEmpty icon={LayoutGrid} themeKey="forum" title="لا توجد فئات بعد" hint="أنشئ أول فئة لتنظيم مواضيع المنتدى — مثل: نقاشات عامة، أسئلة الدورات، إعلانات" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fia-stagger">
              {cats.map((c) => {
                const topicCount = topics.filter((t) => t.category_id === c.id).length
                return (
                  <Card key={c.id} className="fia-card-hover p-0 border border-gold/25 overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-l from-sky-500 via-blue-400 to-sky-500 opacity-70" />
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gold/30 blur-md rounded-xl" />
                          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-navy to-navy-light border border-gold/40 flex items-center justify-center text-2xl shadow-md">
                            {c.icon || '💬'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-navy flex items-center gap-1.5">{c.name}</div>
                          {c.description && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{c.description}</div>}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <LuxBadge tone="blue"><FileText className="w-2.5 h-2.5" /> {topicCount} موضوع</LuxBadge>
                            <span className="text-[9px] font-mono text-muted-foreground/70" dir="ltr">#{c.slug}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-gold/15">
                        <Button size="sm" variant="outline" className="flex-1 border-gold/30 hover:bg-gold/10 hover:border-gold rounded-lg text-[11px] font-bold" onClick={() => { setEditingCat(c); setOpenCat(true) }}>
                          <Edit className="w-3 h-3 ml-1" /> تعديل
                        </Button>
                        <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-lg w-9 p-0" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
          {openCat && <CategoryDialogRoyal open={openCat} onOpenChange={setOpenCat} initial={editingCat} onSaved={() => { setOpenCat(false); loadCats() }} />}
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}
            title="حذف الفئة"
            message="سيتم حذف الفئة وكل مواضيعها ومنشوراتها. متأكد؟"
            itemLabel="الفئة:"
            itemName={deleteTarget?.name}
            confirmLabel="حذف"
            cancelLabel="إلغاء"
            variant="danger"
            onConfirm={handleDeleteCat}
            loading={deleting}
          />

          {/* 🛡️ حوار تأكيد حذف الموضوع — مستقل عن حوار الفئات */}
          <ConfirmDialog
            open={!!topicDeleteTarget}
            onOpenChange={(o) => { if (!o && !topicDeleting) setTopicDeleteTarget(null) }}
            title="تأكيد حذف الموضوع"
            message="سيُحذف الموضوع وكل ردوده نهائياً. هذه العملية لا يمكن التراجع عنها."
            itemLabel="الموضوع:"
            itemName={topicDeleteTarget?.title}
            confirmLabel="حذف نهائي"
            cancelLabel="إلغاء"
            variant="danger"
            onConfirm={confirmDeleteTopic}
            loading={topicDeleting}
          />
        </>
      ) : (
        <>
          {filteredTopics.length === 0 ? (
            <LuxEmpty
              icon={MessageSquare}
              themeKey="forum"
              title={search || catFilter ? 'لا توجد نتائج مطابقة' : 'لا توجد مواضيع بعد'}
              hint={search || catFilter ? 'جرّب تعديل البحث أو فلتر الفئة' : 'ابدأ أول نقاش — اضغط "موضوع جديد" لإنشاء موضوع مثّر للتفاعل'}
            />
          ) : (
            <div className="space-y-3 fia-stagger">
              {pinnedTopics.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] font-extrabold text-[#8a6d1d] pt-1">
                  <Pin className="w-3.5 h-3.5 text-gold" /> مواضيع مثبتة ({pinnedTopics.length})
                  <div className="flex-1 h-px bg-gradient-to-l from-gold/30 to-transparent" />
                </div>
              )}
              {pinnedTopics.map((t) => <TopicRowRoyal key={t.id} t={t} onOpen={openTopic} onPin={togglePin} onDelete={deleteTopic} catName={catName(t.category_id)} />)}
              {pinnedTopics.length > 0 && normalTopics.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] font-extrabold text-muted-foreground pt-2">
                  <FileText className="w-3.5 h-3.5 text-gold/70" /> جميع المواضيع ({normalTopics.length})
                  <div className="flex-1 h-px bg-gradient-to-l from-gold/25 to-transparent" />
                </div>
              )}
              {normalTopics.map((t) => <TopicRowRoyal key={t.id} t={t} onOpen={openTopic} onPin={togglePin} onDelete={deleteTopic} catName={catName(t.category_id)} />)}
            </div>
          )}
        </>
      )}

      {/* New topic dialog — royal */}
      <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto lux-scrollbar p-0 border-0">
          <div className="relative bg-gradient-to-br from-[#101a33] via-navy to-[#20325c] p-5 pb-7">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.2px, transparent 1.2px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-3xl" />
            <button onClick={() => setNewTopicOpen(false)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center z-10 transition-colors">
              <X className="w-4 h-4 text-white/90" />
            </button>
            <DialogTitle className="relative text-gold text-lg font-extrabold flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gold/20 backdrop-blur-md flex items-center justify-center border border-gold/40">
                <MessageSquare className="w-5 h-5 text-gold" />
              </div>
              <span>
                موضوع جديد
                <span className="block text-xs font-normal text-white/70 mt-0.5">انشر موضوعاً باسم حسابك الرسمي</span>
              </span>
            </DialogTitle>
          </div>
          <div className="space-y-4 p-5 bg-gradient-to-b from-gold/[0.04] to-white">
            <LuxField label="الفئة" icon={LayoutGrid} required>
              <LuxSelect value={newTopicCat} onChange={setNewTopicCat} placeholder="— اختر الفئة —"
                options={cats.map((c) => ({ value: c.id, label: c.name, emoji: c.icon || '💬' }))} />
            </LuxField>
            <LuxField label="عنوان الموضوع" icon={FileText} required>
              <Input value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} className={luxInput} placeholder="عنوان جذاب يلخص الموضوع" />
            </LuxField>
            <LuxField label="محتوى الموضوع" icon={MessageSquare}>
              <Textarea value={newTopicBody} onChange={(e) => setNewTopicBody(e.target.value)} rows={8} className="rounded-xl border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/25 lux-scrollbar" placeholder="اكتب محتوى الموضوع هنا..." />
            </LuxField>
          </div>
          <DialogFooter className="p-4 bg-muted/20 border-t border-gold/15">
            <Button variant="outline" className="rounded-xl border-gold/30 hover:bg-gold/5" onClick={() => setNewTopicOpen(false)}>إلغاء</Button>
            <Button onClick={submitNewTopic} disabled={savingTopic} className="bg-gradient-to-l from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all font-bold">
              {savingTopic ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
              {savingTopic ? 'جاري النشر...' : 'نشر الموضوع'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LuxSection>
  )
}

// ============================================================================
// TOPIC ROW — rich luxurious topic card with author identity
// ============================================================================
function TopicRowRoyal({ t, onOpen, onPin, onDelete, catName }: {
  t: any
  onOpen: (t: any) => void
  onPin: (t: any) => void
  onDelete: (t: any) => void
  catName?: string
}) {
  const rid = roleIdentity(t.author?.role)
  return (
    <Card className="fia-card-hover p-0 border border-gold/20 hover:border-gold/45 overflow-hidden relative">
      {/* Gold side accent */}
      <div className={`absolute top-0 bottom-0 right-0 w-1.5 bg-gradient-to-b ${t.pinned ? 'from-gold via-amber-400 to-gold' : 'from-gold/40 via-amber-300/40 to-gold/40'}`} />
      <button onClick={() => onOpen(t)} className="w-full text-right">
        <div className="p-4 pr-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Title + pinned */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {t.pinned && <LuxBadge tone="gold"><Pin className="w-2.5 h-2.5" /> مثبت</LuxBadge>}
                {catName && <LuxBadge tone="navy">{catName}</LuxBadge>}
              </div>
              <h4 className="font-extrabold text-navy text-sm mb-1 flex items-center gap-1.5 leading-snug">
                {t.title}
                {t.author?.role === 'founder' && <Sparkles className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
              </h4>
              {t.body && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body}</p>}
              {/* Stats */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2.5 flex-wrap">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-gold/70" /> {t.views || 0} مشاهدة</span>
                <span className="flex items-center gap-1"><Reply className="w-3 h-3 text-gold/70" /> {t.replies_count || 0} رد</span>
                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-gold/70" /> {timeAgo(t.created_at)}</span>
              </div>
            </div>
            {/* Author identity — professional card */}
            <div className="hidden sm:flex flex-col items-end gap-1.5 flex-shrink-0">
              <AuthorChip author={t.author} size="sm" />
              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-bold ${rid.cls}`}>
                <span className={`w-1 h-1 rounded-full ${rid.dot}`} /> {rid.label}
              </span>
            </div>
          </div>
        </div>
      </button>
      {/* Actions strip */}
      <div className="flex border-t border-gold/15 bg-gradient-to-b from-transparent to-gold/[0.03]" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onOpen(t)} className="flex-1 py-2 text-[11px] font-bold text-navy hover:bg-gold/10 flex items-center justify-center gap-1 transition-colors">
          <Eye className="w-3.5 h-3.5 text-gold" /> عرض النقاش
        </button>
        <div className="w-px bg-gold/15" />
        <button onClick={() => onPin(t)} className="flex-1 py-2 text-[11px] font-bold text-navy hover:bg-gold/10 flex items-center justify-center gap-1 transition-colors" title={t.pinned ? 'إلغاء التثبيت' : 'تثبيت'}>
          <Pin className={`w-3.5 h-3.5 ${t.pinned ? 'text-gold' : 'text-muted-foreground'}`} /> {t.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
        </button>
        <div className="w-px bg-gold/15" />
        <button onClick={() => onDelete(t)} className="flex-1 py-2 text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-1 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> حذف
        </button>
      </div>
    </Card>
  )
}

// ============================================================================
// CATEGORY DIALOG — royal
// ============================================================================
function CategoryDialogRoyal({ open, onOpenChange, initial, onSaved }: any) {
  const [form, setForm] = useState<any>(initial || { name: '', description: '', icon: '💬', slug: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { setForm(initial || { name: '', description: '', icon: '💬', slug: '' }) }, [initial])

  const ICONS = ['💬', '📢', '🎓', '🩺', '📚', '💡', '🤝', '🏆', '❓', '🔥', '⭐', '🧠']

  const save = async () => {
    if (!form.name) { toast.error('اسم الفئة مطلوب'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/forum-categories', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...form } : form),
      })
      if (res.ok) {
        toast.success(initial ? 'تم تحديث الفئة' : 'تم إنشاء الفئة')
        onSaved()
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto lux-scrollbar p-0 border-0">
        <div className="relative bg-gradient-to-br from-[#101a33] via-navy to-[#20325c] p-5 pb-7">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.2px, transparent 1.2px)',
            backgroundSize: '20px 20px',
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-3xl" />
          <DialogTitle className="relative text-gold text-lg font-extrabold flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gold/20 backdrop-blur-md flex items-center justify-center border border-gold/40 text-xl">
              {form.icon || '💬'}
            </div>
            <span>
              {initial ? 'تعديل الفئة' : 'فئة جديدة'}
              <span className="block text-xs font-normal text-white/70 mt-0.5">تنظيم مواضيع المنتدى</span>
            </span>
          </DialogTitle>
        </div>
        <div className="space-y-4 p-5 bg-gradient-to-b from-gold/[0.04] to-white">
          <LuxField label="اسم الفئة" icon={Hash} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={luxInput} placeholder="مثال: نقاشات الدورات" />
          </LuxField>
          <LuxField label="الوصف" icon={FileText} hint="اختياري">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="rounded-xl border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/25" placeholder="وصف قوي يوضح محتوى الفئة..." />
          </LuxField>
          <LuxField label="أيقونة الفئة" icon={Sparkles}>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })}
                  className={`aspect-square rounded-xl border-2 text-xl flex items-center justify-center transition-all ${
                    form.icon === ic ? 'border-gold bg-gradient-to-b from-gold/15 to-transparent shadow-md scale-105' : 'border-gold/15 bg-white hover:border-gold/40'
                  }`}>
                  {ic}
                </button>
              ))}
            </div>
          </LuxField>
          <LuxField label="المعرّف (slug)" icon={Hash} hint="اختياري — يُولَّد تلقائياً">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })} dir="ltr" className={luxInput + ' font-mono'} placeholder="general-discussion" />
          </LuxField>
        </div>
        <DialogFooter className="p-4 bg-muted/20 border-t border-gold/15">
          <Button variant="outline" className="rounded-xl border-gold/30 hover:bg-gold/5" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md active:scale-[0.97] transition-all font-bold">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />}
            {initial ? 'حفظ التعديلات' : 'إنشاء الفئة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
