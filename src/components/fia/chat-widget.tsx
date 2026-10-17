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
} from 'lucide-react'

export function ChatWidget({ initialRecipientId, initialRecipientName }: { initialRecipientId?: string; initialRecipientName?: string }) {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'search' | 'chat'>('search')
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recipient, setRecipient] = useState<{ id: string; name: string; avatar?: string; role?: string } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
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

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('هل تريد حذف هذه المحادثة بالكامل؟ لا يمكن التراجع.')) return
    try {
      await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId }),
      })
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConvId === convId) goBack()
      toast.success('تم حذف المحادثة')
    } catch {
      toast.error('فشل الحذف')
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
                msg.sender = recipient
                  ? { user_id: recipient.id, name: recipient.name, avatar: recipient.avatar, role: recipient.role }
                  : (activeConv?.other
                    ? { user_id: activeConv.other.user_id || activeConv.other_id, name: activeConv.other.name, avatar: activeConv.other.avatar, role: activeConv.other.role }
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
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-navy hover:bg-navy-light text-gold shadow-xl flex items-center justify-center transition-all z-50 hover:scale-110"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        {!open && conversations.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gold text-navy text-[10px] font-bold rounded-full flex items-center justify-center">
            {conversations.length > 9 ? '9+' : conversations.length}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(860px,calc(100vw-3rem))] h-[min(560px,calc(100vh-8rem))] bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

          {view === 'search' ? (
            // ==================== VIEW 1: SEARCH ====================
            <>
              {/* Header */}
              <div className="bg-gradient-to-l from-navy to-navy-light text-white px-5 py-4 flex items-center gap-3 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h2 className="text-base font-bold">المحادثات</h2>
                  <p className="text-white/50 text-[10px]">ابحث عن مستخدم لبدء محادثة</p>
                </div>
              </div>

              {/* Search bar */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQ}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="ابحث بالاسم عن مدرب أو متدرب أو عضو فريق..."
                    className="w-full h-12 pr-12 pl-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
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
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide px-2 mb-2">نتائج البحث ({searchResults.length})</p>
                    {searchResults.map((u) => (
                      <button key={u.id} onClick={() => openConversation(u)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-right transition-colors mb-1">
                        <Avatar className="w-11 h-11 flex-shrink-0">
                          <AvatarImage src={u.avatar || ''} />
                          <AvatarFallback className="bg-navy text-gold text-sm font-bold">{u.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-navy truncate">{u.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                        </div>
                        {u.role && <Badge className="bg-navy/5 text-navy border-navy/10 text-[9px] px-2">{roleLabel(u.role)}</Badge>}
                        <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 rotate-180" />
                      </button>
                    ))}
                  </div>
                ) : conversations.length > 0 ? (
                  // Recent conversations
                  <div className="p-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide px-2 mb-2">المحادثات الأخيرة</p>
                    {conversations.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-right transition-colors mb-1 group">
                        <button onClick={() => openExistingConversation(c)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
                          <div className="relative flex-shrink-0">
                            <Avatar className="w-11 h-11">
                              <AvatarImage src={c.other?.avatar || ''} />
                              <AvatarFallback className="bg-navy text-gold text-sm font-bold">{c.other?.name?.charAt(0) || '؟'}</AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-navy truncate">{c.other?.name || 'مستخدم'}</div>
                            <div className="text-[10px] text-gray-400 truncate">{c.last_message_body || 'لا توجد رسائل'}</div>
                          </div>
                          <span className="text-[9px] text-gray-400 flex-shrink-0">
                            {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </button>
                        <button onClick={(e) => deleteConversation(c.id, e)} className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="حذف المحادثة">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Empty state
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-navy/5 flex items-center justify-center mb-4">
                      <Users className="w-10 h-10 text-navy/15" />
                    </div>
                    <h3 className="text-base font-bold text-navy mb-1">ابدأ محادثة جديدة</h3>
                    <p className="text-xs text-gray-400 max-w-[240px] leading-relaxed">
                      ابحث عن مدرب أو متدرب أو عضو فريق بالاسم في الأعلى، ثم اختره لبدء محادثة
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // ==================== VIEW 2: CHAT CONVERSATION ====================
            <>
              {/* Chat header — with delete + close buttons */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                <button onClick={goBack} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0" title="رجوع">
                  <ArrowRight className="w-4 h-4 text-navy" />
                </button>
                <Avatar className="w-10 h-10 flex-shrink-0">
                  {otherAvatar ? <AvatarImage src={otherAvatar} /> : null}
                  <AvatarFallback className="bg-navy text-gold text-sm font-bold">{otherName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy truncate">{otherName}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-[10px] text-green-600 font-medium">متصل الآن</span>
                    {recipient?.role && (
                      <Badge className="bg-navy/5 text-navy border-navy/10 text-[8px] px-1.5 py-0 mr-1">{roleLabel(recipient.role)}</Badge>
                    )}
                  </div>
                </div>
                {activeConvId && (
                  <button
                    onClick={(e) => deleteConversation(activeConvId, e)}
                    className="w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="حذف المحادثة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors" title="إغلاق">
                  <X className="w-4 h-4 text-navy" />
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
    </>
  )
}
