'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth-store'
import { supabasePublic } from '@/lib/supabase'
import { toast } from 'sonner'
import { Send, Loader2, Search, X, MessageCircle } from 'lucide-react'

export function ChatWidget({ initialRecipientId, initialRecipientName }: { initialRecipientId?: string; initialRecipientName?: string }) {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recipient, setRecipient] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchUsers = (q: string) => {
    setSearchQ(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    fetch(`/api/users-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d.filter((u: any) => u.id !== user?.id && u.role !== 'admin') : []
        setSearchResults(arr)
      })
      .catch(() => {})
      .finally(() => setSearching(false))
  }

  const startConversationWith = (u: any) => {
    setRecipient({ id: u.id, name: u.name, avatar: u.avatar })
    setSearchQ('')
    setSearchResults([])
    const existing = conversations.find((c) => c.other_id === u.id)
    if (existing) setActiveConvId(existing.id)
    else { setActiveConvId(null); setMessages([]) }
    setTimeout(() => inputRef.current?.focus(), 200)
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
      setOpen(true)
      const existing = conversations.find((c) => c.other_id === initialRecipientId)
      if (existing) setActiveConvId(existing.id)
      else { setActiveConvId(null); setMessages([]) }
    }
  }, [initialRecipientId, initialRecipientName, user?.id, conversations])

  useEffect(() => { if (open) loadConversations() }, [open, loadConversations])
  useEffect(() => { if (activeConvId) loadMessages(activeConvId) }, [activeConvId, loadMessages])

  useEffect(() => {
    if (!activeConvId) return
    let channel: any
    try {
      channel = supabasePublic.channel('chat:' + activeConvId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConvId}` },
          (payload: any) => {
            setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new])
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
      if (!targetId) { toast.error('اختر مستلماً'); return }
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_id: user.id, recipient_id: targetId, body }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل'); return }
      if (!activeConvId && data.conversation_id) { setActiveConvId(data.conversation_id); loadConversations() }
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...data.message, sender: optimistic.sender } : m))
    } catch { toast.error('فشل الإرسال'); setMessages((prev) => prev.filter((m) => m.id !== optimistic.id)) }
    finally { setSending(false) }
  }

  if (!user) return null

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const otherName = recipient?.name || activeConv?.other?.name || 'مستخدم'
  const otherAvatar = recipient?.avatar || activeConv?.other?.avatar || null
  const hasActiveChat = !!(recipient || activeConvId)

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

      {/* Chat overlay — NO Dialog, fixed position, full control */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(900px,calc(100vw-3rem))] h-[min(600px,calc(100vh-8rem))] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
          {/* Header */}
          <div className="bg-navy text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-gold" />
              </div>
              <h2 className="text-base font-bold">المحادثات</h2>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: sidebar + chat */}
          <div className="flex-1 flex min-h-0">

            {/* Sidebar */}
            <div className="w-64 flex flex-col flex-shrink-0 border-l border-gray-100 bg-gray-50">
              {/* Search */}
              <div className="p-3 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQ}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="ابحث عن مستخدم..."
                    className="text-sm pr-9 h-9 bg-gray-50 border-gray-200 rounded-lg"
                  />
                </div>
                {searching && <p className="text-[10px] text-gray-400 mt-1.5">جاري البحث...</p>}
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button key={u.id} onClick={() => startConversationWith(u)} className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 text-right">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={u.avatar || ''} />
                          <AvatarFallback className="bg-navy text-gold text-xs font-bold">{u.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-navy truncate">{u.name}</div>
                          <div className="text-[9px] text-gray-400 truncate">{u.email}</div>
                        </div>
                        {u.role === 'trainer' && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[9px] px-1">مدرب</Badge>}
                        {u.role === 'student' && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[9px] px-1">متدرب</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New conversation banner */}
              {recipient && (
                <div className="px-3 py-2 bg-gold/10 border-b border-gold/15 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarFallback className="bg-navy text-gold text-[10px]">{recipient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-navy font-semibold truncate">{recipient.name}</span>
                  </div>
                  <button onClick={() => { setRecipient(null); setActiveConvId(null); setMessages([]) }} className="w-5 h-5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 && !recipient ? (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <MessageCircle className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-xs font-bold text-navy mb-1">لا توجد محادثات</p>
                    <p className="text-[10px] text-gray-400">ابحث عن مستخدم في الأعلى</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setRecipient(null); setActiveConvId(c.id) }}
                      className={`w-full px-3 py-2.5 text-right border-b border-gray-50 transition-colors ${activeConvId === c.id && !recipient ? 'bg-gold/10 border-r-2 border-r-gold' : 'hover:bg-gray-100'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={c.other?.avatar || ''} />
                            <AvatarFallback className="bg-navy text-gold text-xs font-bold">{c.other?.name?.charAt(0) || '؟'}</AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-navy truncate">{c.other?.name || 'مستخدم'}</span>
                            <span className="text-[9px] text-gray-400 flex-shrink-0 ml-2">
                              {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{c.last_message_body || 'لا توجد رسائل'}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50">

              {/* Chat header */}
              {hasActiveChat && (
                <div className="px-4 py-2.5 bg-white border-b border-gray-200 flex items-center gap-2.5 flex-shrink-0">
                  <Avatar className="w-9 h-9">
                    {otherAvatar ? <AvatarImage src={otherAvatar} /> : null}
                    <AvatarFallback className="bg-navy text-gold text-xs font-bold">{otherName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-bold text-navy">{otherName}</div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      <span className="text-[10px] text-green-600 font-medium">متصل</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(10,31,68,0.02) 1px, transparent 0)', backgroundSize: '24px 24px' }}
              >
                {!hasActiveChat ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-navy/5 flex items-center justify-center mb-3">
                      <MessageCircle className="w-8 h-8 text-navy/15" />
                    </div>
                    <h3 className="text-sm font-bold text-navy mb-1">ابدأ المحادثة</h3>
                    <p className="text-xs text-gray-400 max-w-[200px]">اختر محادثة أو ابحث عن مستخدم لبدء محادثة جديدة</p>
                  </div>
                ) : loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-navy" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-navy/5 flex items-center justify-center mb-2">
                      <Send className="w-7 h-7 text-navy/15" />
                    </div>
                    <p className="text-xs font-bold text-navy mb-0.5">لا توجد رسائل</p>
                    <p className="text-[10px] text-gray-400">أرسل أول رسالة إلى {otherName}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => {
                      const isMine = m.sender_id === user?.id
                      return (
                        <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                          <div className={`flex items-end gap-1.5 max-w-[75%] ${isMine ? 'flex-row' : 'flex-row-reverse'}`}>
                            {!isMine && (
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                {m.sender?.avatar ? <AvatarImage src={m.sender.avatar} /> : null}
                                <AvatarFallback className="bg-navy text-gold text-[8px] font-bold">{m.sender?.name?.charAt(0) || '؟'}</AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                                isMine ? 'bg-navy text-white rounded-bl-sm' : 'bg-white text-navy border border-gray-200 rounded-br-sm shadow-sm'
                              }`}>
                                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              </div>
                              <div className={`text-[8px] text-gray-400 mt-0.5 ${isMine ? 'text-left' : 'text-right'}`}>
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
              {hasActiveChat && (
                <div className="px-4 py-2.5 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
                  <Input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 bg-gray-50 border-gray-200 rounded-full h-10 text-sm"
                    disabled={sending}
                  />
                  <button
                    onClick={send}
                    disabled={sending || !draft.trim()}
                    className="w-10 h-10 rounded-full bg-navy hover:bg-navy-light text-gold flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
