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
  MessageSquare, Send, ArrowRight, Loader2, Search, X, MessageCircle,
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
      if (!targetId) { toast.error('اختر مستلماً من القائمة على اليمين'); return }
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
        <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Header — clean, single row */}
          <DialogHeader className="p-4 bg-gradient-to-l from-navy to-navy-light text-white border-b border-gold/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-gold" />
                الرسائل
              </DialogTitle>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Main body — two columns */}
          <div className="flex-1 flex min-h-0">
            {/* === Left sidebar: search + conversations === */}
            <div className="w-64 border-l border-border bg-gray-50 flex flex-col flex-shrink-0">
              {/* Search bar */}
              <div className="p-3 border-b border-border bg-white">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQ}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="ابحث عن مستخدم..."
                    className="text-xs pr-9 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
                {searching && <p className="text-[10px] text-gray-400 mt-1.5">جاري البحث...</p>}
                {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-1.5">لا توجد نتائج</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => startConversationWith(u)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-right transition-colors"
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={u.avatar || ''} />
                          <AvatarFallback className="bg-navy text-gold text-[10px]">{u.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-navy truncate">{u.name}</div>
                          <div className="text-[9px] text-gray-400 truncate">{u.email}</div>
                        </div>
                        {u.role === 'trainer' && <Badge className="bg-green-500/15 text-green-600 text-[8px] px-1 py-0">مدرب</Badge>}
                        {u.role === 'student' && <Badge className="bg-blue-500/15 text-blue-600 text-[8px] px-1 py-0">متدرب</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active conversation indicator */}
              {recipient && (
                <div className="p-2.5 bg-gold/10 border-b border-gold/20 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-gold uppercase tracking-wide">محادثة جديدة</div>
                    <div className="text-sm text-navy font-semibold truncate">{recipient.name}</div>
                  </div>
                  <button onClick={() => { setRecipient(null); setActiveConvId(null); setMessages([]) }} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Conversations list */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 && !recipient ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>لا توجد محادثات بعد</p>
                    <p className="text-[10px] mt-1">ابحث عن مستخدم في الأعلى</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setRecipient(null); setActiveConvId(c.id) }}
                      className={`w-full p-3 text-right border-b border-gray-100 hover:bg-white transition-colors ${activeConvId === c.id && !recipient ? 'bg-gold/10' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={c.other?.avatar || ''} />
                            <AvatarFallback className="bg-navy text-gold text-xs">{c.other?.name?.charAt(0) || '؟'}</AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-navy truncate">{c.other?.name || 'مستخدم'}</div>
                          <div className="text-[10px] text-gray-400 truncate">{c.last_message_body || '—'}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* === Right: chat area === */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
              {/* Chat header */}
              {(recipient || activeConvId) && (
                <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
                  <Avatar className="w-9 h-9">
                    {recipient ? (
                      <AvatarFallback className="bg-navy text-gold text-xs">{recipient.name.charAt(0)}</AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={conversations.find((c) => c.id === activeConvId)?.other?.avatar || ''} />
                        <AvatarFallback className="bg-navy text-gold text-xs">{conversations.find((c) => c.id === activeConvId)?.other?.name?.charAt(0) || '؟'}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-navy">{recipient?.name || conversations.find((c) => c.id === activeConvId)?.other?.name || 'مستخدم'}</div>
                    <div className="text-[10px] text-green-500">● متصل</div>
                  </div>
                </div>
              )}

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
                   style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(10,31,68,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                {!recipient && !activeConvId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-navy/5 flex items-center justify-center mb-4">
                      <MessageCircle className="w-10 h-10 text-navy/20" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">اختر محادثة من القائمة</p>
                    <p className="text-xs text-gray-300 mt-1">أو ابحث عن مستخدم لبدء محادثة جديدة</p>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-navy" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">ابدأ المحادثة — أرسل أول رسالة</div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                          <div className={`px-3.5 py-2 rounded-2xl ${
                            isMine
                              ? 'bg-navy text-white rounded-br-md'
                              : 'bg-white text-navy border border-gray-200 rounded-bl-md shadow-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                          </div>
                          <div className={`text-[9px] text-gray-400 mt-0.5 ${isMine ? 'text-left pr-1' : 'text-right pl-1'}`}>
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
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
                  placeholder={recipient || activeConvId ? 'اكتب رسالتك...' : 'اختر محادثة أو مستخدم أولًا...'}
                  className="flex-1 bg-gray-50 border-gray-200 rounded-full"
                  disabled={sending || (!recipient && !activeConvId)}
                />
                <Button
                  onClick={send}
                  disabled={sending || !draft.trim() || (!recipient && !activeConvId)}
                  className="bg-navy hover:bg-navy-light rounded-full w-10 h-10 p-0 flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
