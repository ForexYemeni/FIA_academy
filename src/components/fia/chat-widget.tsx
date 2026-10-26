'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth-store'
import { supabasePublic } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Send, Loader2, Search, X, MessageCircle, ArrowRight, Users, Trash2,
  AlertTriangle, Sparkles, Clock,
} from 'lucide-react'

export function ChatWidget({ initialRecipientId, initialRecipientName }: { initialRecipientId?: string; initialRecipientName?: string }) {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'search' | 'chat'>('search')
  const [conversations, setConversations] = useState<any[]>([])
  // ⚡ Live ref so realtime handlers always read the freshest conversations
  // (fixes the ReferenceError: activeConv is not defined crash)
  const conversationsRef = useRef<any[]>([])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recipient, setRecipient] = useState<{ id: string; name: string; avatar?: string; role?: string } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  // 👑 v10.5 — الفتح من مركز الأدوات العائم (FiaFabHub) — بلا زر عائم مستقل
  useEffect(() => {
    const onFabOpen = () => setOpen(true)
    window.addEventListener('fia-fab:chat', onFabOpen)
    return () => window.removeEventListener('fia-fab:chat', onFabOpen)
  }, [])
  // 👑 v10.11 — «دردشة فورية مع الإدارة» من بطاقة الحظر الملكية:
  // يفتح محادثة مباشرة مع حساب الإدارة الأساسي (api/admin/contact)
  useEffect(() => {
    const onBanChat = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { id?: string; name?: string; avatar?: string } | null
      setOpen(true)
      if (detail?.id) {
        openConversation({ id: detail.id, name: detail.name || 'إدارة الأكاديمية', avatar: detail.avatar })
      }
    }
    window.addEventListener('fia-ban:chat-admin', onBanChat)
    return () => window.removeEventListener('fia-ban:chat-admin', onBanChat)
  })
  // ⚡ NEW: typing indicator + read receipts + online status
  const [isTyping, setIsTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const typingTimeoutRef = useRef<any>(null)
  const typingChannelRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const searchUsers = (q: string) => {
    setSearchQ(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    fetch(`/api/users-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d.filter((u: any) => u.id !== user?.id) : []
        setSearchResults(arr)
      })
      .catch(() => {})
      .finally(() => setSearching(false))
  }

  const openConversation = (u: any) => {
    setRecipient({ id: u.id, name: u.name, avatar: u.avatar, role: u.role })
    setSearchQ('')
    setSearchResults([])
    setView('chat')
    const existing = conversations.find((c) => c.other_id === u.id)
    if (existing) setActiveConvId(existing.id)
    else { setActiveConvId(null); setMessages([]) }
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  const openExistingConversation = (c: any) => {
    setRecipient({ id: c.other_id, name: c.other?.name, avatar: c.other?.avatar, role: c.other?.role })
    setActiveConvId(c.id)
    setView('chat')
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  const goBack = () => {
    setView('search')
    setRecipient(null)
    setActiveConvId(null)
    setMessages([])
    setTimeout(() => searchRef.current?.focus(), 200)
  }

  const requestDelete = (convId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTarget({ id: convId, name })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: deleteTarget.id }),
      })
      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      if (activeConvId === deleteTarget.id) goBack()
      toast.success('تم حذف المحادثة')
      setDeleteTarget(null)
    } catch {
      toast.error('فشل الحذف')
    } finally {
      setDeleting(false)
    }
  }

  const loadConversations = useCallback(() => {
    if (!user?.id) return
    fetch(`/api/chat?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => setConversations(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [user?.id])

  const loadMessages = useCallback((convId: string) => {
    setLoading(true)
    fetch(`/api/chat?conversation_id=${convId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(Array.isArray(d) ? d : [])
        fetch('/api/chat', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: convId, user_id: user?.id }) }).catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (initialRecipientId && initialRecipientName && user?.id) {
      setRecipient({ id: initialRecipientId, name: initialRecipientName })
      setOpen(true); setView('chat')
      const existing = conversations.find((c) => c.other_id === initialRecipientId)
      if (existing) setActiveConvId(existing.id)
      else { setActiveConvId(null); setMessages([]) }
    }
  }, [initialRecipientId, initialRecipientName, user?.id, conversations])

  useEffect(() => { if (open) { loadConversations(); setTimeout(() => searchRef.current?.focus(), 200) } }, [open, loadConversations])
  useEffect(() => { if (activeConvId) loadMessages(activeConvId) }, [activeConvId, loadMessages])

  useEffect(() => {
    if (!activeConvId) return
    let channel: any
    try {
      channel = supabasePublic.channel('chat:' + activeConvId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConvId}` },
          (payload: any) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev
              // If the incoming message has no sender profile (realtime
              // payloads only have raw row data), build one from the
              // known recipient/conversation data so the name shows.
              const msg = payload.new
              if (!msg.sender) {
                const conv = conversationsRef.current.find((c: any) => c.id === activeConvId)
                msg.sender = recipient
                  ? { user_id: recipient.id, name: recipient.name, avatar: recipient.avatar, role: recipient.role }
                  : (conv?.other
                    ? { user_id: conv.other.user_id || conv.other_id, name: conv.other.name, avatar: conv.other.avatar, role: conv.other.role }
                    : null)
              }
              return [...prev, msg]
            })
            if (payload.new.sender_id !== user?.id) {
              fetch('/api/chat', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: activeConvId, user_id: user?.id }) }).catch(() => {})
            }
          }).subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [activeConvId, user?.id])

  // ⚡ REAL-TIME: conversation list — when a new conversation is created
  // (e.g. someone messages me for the first time), it appears INSTANTLY.
  useEffect(() => {
    if (!user?.id) return
    let channel: any
    try {
      channel = supabasePublic
        .channel(`conversations-list:${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_conversations' },
          (payload: any) => {
            if (payload.new.participant_1 === user.id || payload.new.participant_2 === user.id) {
              loadConversations()
              toast.success('💬 محادثة جديدة!')
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_conversations' },
          (payload: any) => {
            setConversations((prev) => prev.map((c) =>
              c.id === payload.new.id ? { ...c, ...payload.new } : c
            ))
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [user?.id])

  // ⚡ TYPING INDICATOR: broadcast typing status via Realtime Presence
  useEffect(() => {
    if (!activeConvId || !user?.id) return
    let channel: any
    try {
      const convId = activeConvId
      channel = supabasePublic.channel(`typing:${convId}`, {
        config: { presence: { key: user.id } }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const typingUsers = Object.keys(state).filter(id => id !== user.id)
        setIsTyping(typingUsers.length > 0)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers((prev) => new Set(prev).add(key))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        setIsTyping(false)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, typing: false })
        }
      })
      typingChannelRef.current = channel
    } catch {}
    return () => {
      try { supabasePublic.removeChannel(channel) } catch {}
      typingChannelRef.current = null
    }
  }, [activeConvId, user?.id])

  const broadcastTyping = (typing: boolean) => {
    const channel = typingChannelRef.current
    if (!channel || !user?.id) return
    try { channel.track({ user_id: user.id, typing }) } catch {}
  }

  useEffect(() => {
    if (!draft) {
      broadcastTyping(false)
      return
    }
    broadcastTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false)
    }, 2000)
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [draft])

  // ⚡ REAL-TIME: mark messages as read instantly when chat is open
  useEffect(() => {
    if (!open || !activeConvId || !user?.id) return
    setMessages((prev) => prev.map((m) => m.sender_id !== user.id && !m.read_at
      ? { ...m, read_at: new Date().toISOString() }
      : m
    ))
  }, [open, activeConvId, messages.length, user?.id])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!draft.trim() || !user?.id) return
    setSending(true)
    const body = draft
    setDraft('')
    const optimistic = { id: 'temp-' + Date.now(), conversation_id: activeConvId || '', sender_id: user.id, body, created_at: new Date().toISOString(), sender: { user_id: user.id, name: user.name, avatar: user.avatar, role: user.role } }
    setMessages((prev) => [...prev, optimistic])
    try {
      let targetId = recipient?.id || ''
      if (!targetId && activeConvId) { const conv = conversations.find((c) => c.id === activeConvId); if (conv?.other_id) targetId = conv.other_id }
      if (!targetId) { toast.error('فشل'); return }
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_id: user.id, recipient_id: targetId, body }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل'); return }
      if (!activeConvId && data.conversation_id) { setActiveConvId(data.conversation_id); loadConversations() }
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...data.message, sender: optimistic.sender } : m))
    } catch { toast.error('فشل الإرسال'); setMessages((prev) => prev.filter((m) => m.id !== optimistic.id)) }
    finally { setSending(false) }
  }

  if (!user) return null

  const otherName = recipient?.name || 'مستخدم'
  const otherAvatar = recipient?.avatar || null

  const roleLabel = (r?: string) => {
    if (r === 'admin') return 'مدير'
    if (r === 'trainer') return 'مدرب'
    if (r === 'student') return 'متدرب'
    if (r === 'founder') return 'المؤسس'
    if (r === 'leader') return 'قائد'
    if (r === 'team') return 'فريق'
    return ''
  }

  return (
    <>
      {/* 👑 v10.5 — الزر العائم المستقل أُزيل: الدردشة تُفتح من مركز الأدوات (FiaFabHub)
          عبر حدث النافذة الموحد — بلا أي ازدواج أزرار أسفل الشاشة */}
      {/* Overlay */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(860px,calc(100vw-3rem))] h-[min(560px,calc(100vh-8rem))] bg-white rounded-2xl overflow-hidden flex flex-col border-2 border-gold/30" style={{ boxShadow: '0 20px 60px rgba(11, 22, 53, 0.35), 0 0 40px -10px rgba(212, 175, 55, 0.4)' }}>

          {view === 'search' ? (
            // ==================== VIEW 1: SEARCH ====================
            <>
              {/* ⚡ Magical header */}
              <div className="relative bg-gradient-to-l from-navy via-navy-light to-navy text-white px-5 py-4 flex items-center gap-3 flex-shrink-0 overflow-hidden">
                <div className="absolute inset-0 opacity-25" style={{
                  backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
                  backgroundSize: '24px 24px, 18px 18px'
                }} />
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-gold/15 rounded-full blur-2xl" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                  <MessageCircle className="w-5 h-5 text-navy" />
                </div>
                <div className="relative flex-1">
                  <h2 className="text-base font-bold">المحادثات</h2>
                  <p className="text-gold/80 text-[10px] flex items-center gap-1">
                    <span className="w-1 h-1 bg-gold rounded-full animate-pulse" />
                    ابحث عن مستخدم لبدء محادثة
                  </p>
                </div>
                {/* 👑 v10.5 — زر إغلاق في ترويسة البحث (كان الإغلاق عبر الزر العائم المُزال) */}
                <button
                  onClick={() => setOpen(false)}
                  className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
                  title="إغلاق"
                  aria-label="إغلاق المحادثات"
                >
                  <X className="w-4 h-4 text-gold" />
                </button>
              </div>

              {/* Search bar */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/60" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQ}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="ابحث بالاسم عن مدرب أو متدرب أو عضو فريق..."
                    className="w-full h-12 pr-12 pl-4 text-sm bg-gradient-to-br from-gray-50 to-white border-2 border-gold/20 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                  />
                  {searchQ && (
                    <button onClick={() => { setSearchQ(''); setSearchResults([]) }} className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>
                {searching && <p className="text-[10px] text-gray-400 mt-2 px-1">جاري البحث...</p>}
                {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-2 px-1">لا توجد نتائج — جرّب اسماً آخر</p>
                )}
              </div>

              {/* Body: search results OR recent conversations */}
              <div className="flex-1 overflow-y-auto">
                {searchResults.length > 0 ? (
                  // Search results
                  <div className="p-3">
                    <p className="text-[10px] text-gold font-bold uppercase tracking-wide px-2 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> نتائج البحث ({searchResults.length})
                    </p>
                    {searchResults.map((u) => (
                      <button key={u.id} onClick={() => openConversation(u)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-l hover:from-gold/5 hover:to-transparent text-right transition-all mb-1 border border-transparent hover:border-gold/20">
                        <Avatar className="w-11 h-11 flex-shrink-0 ring-2 ring-gold/20">
                          <AvatarImage src={u.avatar || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-navy to-navy-light text-gold text-sm font-bold">{u.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-navy truncate">{u.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                        </div>
                        {u.role && <Badge className="bg-gradient-to-r from-navy/5 to-navy/10 text-navy border-navy/10 text-[9px] px-2">{roleLabel(u.role)}</Badge>}
                        <ArrowRight className="w-4 h-4 text-gold/60 flex-shrink-0 rotate-180" />
                      </button>
                    ))}
                  </div>
                ) : conversations.length > 0 ? (
                  // Recent conversations
                  <div className="p-3">
                    <p className="text-[10px] text-gold font-bold uppercase tracking-wide px-2 mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> المحادثات الأخيرة
                    </p>
                    {conversations.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-l hover:from-gold/5 hover:to-transparent text-right transition-all mb-1 group border border-transparent hover:border-gold/20">
                        <button onClick={() => openExistingConversation(c)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
                          <div className="relative flex-shrink-0">
                            <Avatar className="w-11 h-11 ring-2 ring-gold/20">
                              <AvatarImage src={c.other?.avatar || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-navy to-navy-light text-gold text-sm font-bold">{c.other?.name?.charAt(0) || '؟'}</AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-navy truncate">{c.other?.name || 'مستخدم'}</div>
                            <div className="text-[10px] text-gray-400 truncate">{c.last_message_body || 'لا توجد رسائل'}</div>
                          </div>
                          <span className="text-[9px] text-gray-400 flex-shrink-0">
                            {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </button>
                        <button onClick={(e) => requestDelete(c.id, c.other?.name || 'مستخدم', e)} className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" title="حذف المحادثة">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Empty state — magical
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                        <Users className="w-10 h-10 text-gold" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-navy mb-1">ابدأ محادثة جديدة</h3>
                    <p className="text-xs text-gray-400 max-w-[240px] leading-relaxed">
                      ابحث عن مدرب أو متدرب أو عضو فريق بالاسم في الأعلى، ثم اختره لبدء محادثة ✨
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // ==================== VIEW 2: CHAT CONVERSATION ====================
            <>
              {/* ⚡ Magical chat header */}
              <div className="relative bg-gradient-to-l from-navy via-navy-light to-navy text-white px-4 py-3 flex items-center gap-3 flex-shrink-0 overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1px, transparent 1px)',
                  backgroundSize: '14px 14px'
                }} />
                <button onClick={goBack} className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0" title="رجوع">
                  <ArrowRight className="w-4 h-4 text-gold" />
                </button>
                <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-gold/40">
                  {otherAvatar ? <AvatarImage src={otherAvatar} /> : null}
                  <AvatarFallback className="bg-gradient-to-br from-gold/30 to-amber-500/30 text-gold text-sm font-bold">{otherName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="relative flex-1 min-w-0">
                  <div className="text-sm font-bold truncate text-white">{otherName}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-green-300 font-medium">متصل الآن</span>
                    {recipient?.role && (
                      <Badge className="bg-white/10 text-gold border-gold/30 text-[8px] px-1.5 py-0 mr-1">{roleLabel(recipient.role)}</Badge>
                    )}
                  </div>
                </div>
                {activeConvId && (
                  <button
                    onClick={(e) => requestDelete(activeConvId, otherName, e)}
                    className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/30 text-white flex items-center justify-center flex-shrink-0 transition-colors"
                    title="حذف المحادثة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors" title="إغلاق">
                  <X className="w-4 h-4 text-gold" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(10,31,68,0.02) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-navy" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-navy/5 flex items-center justify-center mb-3">
                      <Send className="w-8 h-8 text-navy/15" />
                    </div>
                    <p className="text-sm font-bold text-navy mb-1">لا توجد رسائل بعد</p>
                    <p className="text-xs text-gray-400">أرسل أول رسالة إلى {otherName}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {messages.map((m) => {
                      const isMine = m.sender_id === user?.id
                      return (
                        <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                          <div className={`flex items-end gap-1.5 max-w-[70%] ${isMine ? 'flex-row' : 'flex-row-reverse'}`}>
                            {!isMine && (
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                {m.sender?.avatar ? <AvatarImage src={m.sender.avatar} /> : null}
                                <AvatarFallback className="bg-navy text-gold text-[8px] font-bold">{m.sender?.name?.charAt(0) || '؟'}</AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                                isMine ? 'bg-navy text-white rounded-bl-sm' : 'bg-white text-navy border border-gray-200 rounded-br-sm shadow-sm'
                              }`}>
                                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              </div>
                              <div className={`text-[9px] text-gray-400 mt-0.5 ${isMine ? 'text-left' : 'text-right'}`}>
                                {m.created_at ? new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* ⚡ TYPING INDICATOR - shows when other user is typing */}
                {isTyping && (
                  <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span>يكتب الآن...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 h-11 px-4 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                  disabled={sending}
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  className="w-11 h-11 rounded-full bg-navy hover:bg-navy-light text-gold flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* === DELETE CONFIRMATION CARD — professional === */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { if (!deleting) setDeleteTarget(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Top: red gradient with icon */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white text-lg font-bold">حذف المحادثة</h3>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">سيتم حذف المحادثة بالكامل مع</p>
              <p className="font-bold text-navy text-base mb-3">{deleteTarget.name}</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-600 leading-relaxed">
                  ⚠️ سيتم حذف جميع الرسائل نهائياً ولا يمكن استعادتها بعد الحذف.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'جاري الحذف...' : 'حذف نهائي'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
