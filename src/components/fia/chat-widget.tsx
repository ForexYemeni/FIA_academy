'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth-store'
import { supabasePublic } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  MessageSquare, Send, Loader2, Search, X, MessageCircle, Users, Phone, Video,
} from 'lucide-react'

export function ChatWidget({ initialRecipientId, initialRecipientName }: { initialRecipientId?: string; initialRecipientName?: string }) {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recipient, setRecipient] = useState<{ id: string; name: string } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    setRecipient({ id: u.id, name: u.name })
    setSearchQ('')
    setSearchResults([])
    const existing = conversations.find((c) => c.other_id === u.id)
    if (existing) setActiveConvId(existing.id)
    else { setActiveConvId(null); setMessages([]) }
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
        fetch('/api/chat', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: convId, user_id: user?.id }),
        }).catch(() => {})
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
      channel = supabasePublic
        .channel('chat:' + activeConvId)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConvId}` },
          (payload: any) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
            if (payload.new.sender_id !== user?.id) {
              fetch('/api/chat', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: activeConvId, user_id: user?.id }),
              }).catch(() => {})
            }
          }
        )
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [activeConvId, user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!draft.trim() || !user?.id) return
    setSending(true)
    const body = draft
    setDraft('')

    const optimistic = {
      id: 'temp-' + Date.now(),
      conversation_id: activeConvId || '',
      sender_id: user.id,
      body,
      created_at: new Date().toISOString(),
      sender: { user_id: user.id, name: user.name, avatar: user.avatar, role: user.role },
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      let targetId = recipient?.id || ''
      if (!targetId && activeConvId) {
        const conv = conversations.find((c) => c.id === activeConvId)
        if (conv?.other_id) targetId = conv.other_id
      }
      if (!targetId) { toast.error('اختر مستلماً'); return }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: user.id, recipient_id: targetId, body }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الإرسال'); return }
      if (!activeConvId && data.conversation_id) {
        setActiveConvId(data.conversation_id)
        loadConversations()
      }
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...data.message, sender: optimistic.sender } : m))
    } catch {
      toast.error('فشل الإرسال')
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  if (!user) return null

  // Get active conversation info
  const activeConv = conversations.find((c) => c.id === activeConvId)
  const otherName = recipient?.name || activeConv?.other?.name || 'مستخدم'
  const otherAvatar = activeConv?.other?.avatar || null

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-navy hover:bg-navy-light text-gold shadow-xl flex items-center justify-center transition-all z-30 hover:scale-110"
        title="المحادثات"
      >
        <MessageCircle className="w-7 h-7" />
        {conversations.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-navy text-[10px] font-bold rounded-full flex items-center justify-center">
            {conversations.length > 9 ? '9+' : conversations.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* === HEADER === */}
          <DialogHeader className="p-0 flex-shrink-0">
            <div className="bg-gradient-to-l from-navy to-navy-light px-5 py-3 flex items-center justify-between border-b border-gold/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <DialogTitle className="text-white text-base font-bold">الرسائل</DialogTitle>
                  <p className="text-white/50 text-[10px]">محادثاتك مع المدربين والمتدربين</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          {/* === MAIN BODY === */}
          <div className="flex-1 flex min-h-0" style={{ height: '70vh' }}>

            {/* ===== SIDEBAR ===== */}
            <div className="w-72 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQ}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="ابحث عن مستخدم لبدء محادثة..."
                    className="text-sm pr-10 h-10 bg-gray-50 border-gray-200 focus:bg-white rounded-lg"
                  />
                </div>
                {searching && <p className="text-[10px] text-gray-400 mt-2 px-1">جاري البحث...</p>}
                {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-2 px-1">لا توجد نتائج — جرّب اسماً آخر</p>
                )}

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-52 overflow-y-auto">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide px-1 mb-1">نتائج البحث</p>
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => startConversationWith(u)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-right transition-colors"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={u.avatar || ''} />
                            <AvatarFallback className="bg-navy text-gold text-sm font-bold">{u.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-navy truncate">{u.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                        </div>
                        {u.role === 'trainer' && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[9px] px-1.5 py-0">مدرب</Badge>}
                        {u.role === 'student' && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[9px] px-1.5 py-0">متدرب</Badge>}
                        {u.role === 'founder' && <Badge className="bg-gold/15 text-gold border-gold/30 text-[9px] px-1.5 py-0">مؤسس</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New conversation indicator */}
              {recipient && (
                <div className="p-3 bg-gold/10 border-b border-gold/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-navy text-gold text-xs">{recipient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gold font-bold">محادثة جديدة</div>
                      <div className="text-sm text-navy font-semibold truncate">{recipient.name}</div>
                    </div>
                  </div>
                  <button onClick={() => { setRecipient(null); setActiveConvId(null); setMessages([]) }} className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Conversations list */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 && !recipient ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <MessageCircle className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-navy mb-1">لا توجد محادثات</p>
                    <p className="text-xs text-gray-400">ابحث عن مستخدم في الأعلى لبدء محادثة جديدة</p>
                  </div>
                ) : (
                  conversations.map((c) => {
                    const isActive = activeConvId === c.id && !recipient
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setRecipient(null); setActiveConvId(c.id) }}
                        className={`w-full p-3 text-right border-b border-gray-50 transition-colors ${isActive ? 'bg-gold/10 border-r-2 border-r-gold' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar className="w-11 h-11">
                              <AvatarImage src={c.other?.avatar || ''} />
                              <AvatarFallback className="bg-navy text-gold text-sm font-bold">{c.other?.name?.charAt(0) || '؟'}</AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-bold text-navy truncate">{c.other?.name || 'مستخدم'}</span>
                              <span className="text-[9px] text-gray-400 flex-shrink-0">
                                {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate">{c.last_message_body || 'لا توجد رسائل'}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* ===== CHAT AREA ===== */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50">

              {/* Chat header */}
              {(recipient || activeConvId) && (
                <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {recipient ? (
                        <AvatarFallback className="bg-navy text-gold text-sm font-bold">{recipient.name.charAt(0)}</AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={otherAvatar || ''} />
                          <AvatarFallback className="bg-navy text-gold text-sm font-bold">{otherName.charAt(0)}</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div>
                      <div className="text-sm font-bold text-navy">{otherName}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <span className="text-[10px] text-green-600 font-medium">متصل الآن</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(10,31,68,0.03) 1px, transparent 0)', backgroundSize: '28px 28px' }}
              >
                {!recipient && !activeConvId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 rounded-full bg-navy/5 flex items-center justify-center mb-4">
                      <MessageCircle className="w-12 h-12 text-navy/15" />
                    </div>
                    <h3 className="text-lg font-bold text-navy mb-1">ابدأ المحادثة</h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                      اختر محادثة من القائمة على اليمين، أو ابحث عن مستخدم جديد لبدء محادثة معه
                    </p>
                  </div>
                ) : loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-navy" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-navy/5 flex items-center justify-center mb-3">
                      <Send className="w-10 h-10 text-navy/15" />
                    </div>
                    <p className="text-sm font-bold text-navy mb-1">ابدأ المحادثة</p>
                    <p className="text-xs text-gray-400">أرسل أول رسالة إلى {otherName}</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                        <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? 'flex-row' : 'flex-row-reverse'}`}>
                          {!isMine && (
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarImage src={m.sender?.avatar || ''} />
                              <AvatarFallback className="bg-navy text-gold text-[10px] font-bold">{m.sender?.name?.charAt(0) || '؟'}</AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div className={`px-4 py-2.5 rounded-2xl ${
                              isMine
                                ? 'bg-navy text-white rounded-bl-md'
                                : 'bg-white text-navy border border-gray-200 rounded-br-md shadow-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                            </div>
                            <div className={`text-[9px] text-gray-400 mt-0.5 ${isMine ? 'text-left' : 'text-right'}`}>
                              {m.created_at ? new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={recipient || activeConvId ? 'اكتب رسالتك...' : 'اختر محادثة أولاً...'}
                  className="flex-1 bg-gray-50 border-gray-200 rounded-full h-11 text-sm"
                  disabled={sending || (!recipient && !activeConvId)}
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim() || (!recipient && !activeConvId)}
                  className="w-11 h-11 rounded-full bg-navy hover:bg-navy-light text-gold flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
