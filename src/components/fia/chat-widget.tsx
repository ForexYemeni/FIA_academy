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

  // Search for users to start a new conversation
  const searchUsers = (q: string) => {
    setSearchQ(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    fetch(`/api/users-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        // Filter out the current user + admins (admins can't be messaged directly via this UI)
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
    // Check if conversation already exists
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
        // Mark as read (PUT)
        fetch('/api/chat', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: convId, user_id: user?.id }),
        }).catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  // Open with a specific recipient (creates conversation on first message)
  useEffect(() => {
    if (initialRecipientId && initialRecipientName && user?.id) {
      setRecipient({ id: initialRecipientId, name: initialRecipientName })
      setOpen(true)
      // Check if conversation already exists
      const existing = conversations.find(
        (c) => c.other_id === initialRecipientId
      )
      if (existing) {
        setActiveConvId(existing.id)
      } else {
        setActiveConvId(null)
        setMessages([])
      }
    }
  }, [initialRecipientId, initialRecipientName, user?.id, conversations])

  // Load conversations on open
  useEffect(() => {
    if (open) loadConversations()
  }, [open, loadConversations])

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId)
  }, [activeConvId, loadMessages])

  // Real-time subscription to new messages in the active conversation
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
            // Auto-mark as read if it's from the other person
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!draft.trim() || !user?.id) return
    setSending(true)
    const body = draft
    setDraft('')

    // Optimistic — append immediately
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
      // Determine the recipient: either explicitly set (new conversation),
      // or look it up from the active conversation's other_id field
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
      // If we didn't have a conversation before, set it now
      if (!activeConvId && data.conversation_id) {
        setActiveConvId(data.conversation_id)
        loadConversations()
      }
      // Replace optimistic message with real one
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...data.message, sender: optimistic.sender } : m))
    } catch {
      toast.error('فشل الإرسال')
      // Remove optimistic
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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-navy hover:bg-navy-light text-gold shadow-xl flex items-center justify-center transition-all z-30"
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 bg-navy text-white border-b border-gold/20">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gold" /> الرسائل
              </DialogTitle>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex min-h-0">
            {/* Sidebar — conversations list + new conversation search — always visible */}
            <div className="w-64 border-l border-border bg-muted/30 flex flex-col flex-shrink-0">
              {/* Search to start new conversation */}
              <div className="p-3 border-b border-border bg-white">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQ}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="ابحث عن مستخدم..."
                    className="text-xs pr-8"
                  />
                </div>
                {searching && <p className="text-[10px] text-muted-foreground mt-1">جاري البحث...</p>}
                {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">لا توجد نتائج — جرّب اسم مدرب أو متدرب</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => startConversationWith(u)}
                        className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-right"
                      >
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={u.avatar || ''} />
                          <AvatarFallback className="bg-navy text-gold text-[10px]">{u.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-navy truncate">{u.name}</div>
                          <div className="text-[9px] text-muted-foreground truncate">{u.email}</div>
                        </div>
                        {u.role === 'trainer' && <Badge className="bg-green-500/15 text-green-600 text-[8px] px-1 py-0">مدرب</Badge>}
                        {u.role === 'student' && <Badge className="bg-blue-500/15 text-blue-600 text-[8px] px-1 py-0">متدرب</Badge>}
                        {u.role === 'founder' && <Badge className="bg-gold/15 text-gold text-[8px] px-1 py-0">مؤسس</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active conversation indicator */}
              {recipient && (
                <div className="p-3 bg-gold/10 border-b border-gold/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-navy">محادثة جديدة مع</div>
                    <div className="text-sm text-navy font-medium mt-0.5">{recipient.name}</div>
                  </div>
                  <button onClick={() => { setRecipient(null); setActiveConvId(null); setMessages([]) }} className="text-muted-foreground hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 && !recipient ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    لا توجد محادثات بعد
                    <p className="text-[10px] mt-1">ابحث عن مستخدم في الأعلى لبدء محادثة</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setRecipient(null); setActiveConvId(c.id) }}
                      className={`w-full p-3 text-right border-b border-border hover:bg-muted transition-colors ${activeConvId === c.id && !recipient ? 'bg-gold/10' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={c.other?.avatar || ''} />
                          <AvatarFallback className="bg-navy text-gold text-xs">
                            {c.other?.name?.charAt(0) || '؟'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-navy truncate">{c.other?.name || 'مستخدم'}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {c.last_message_body || ''}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Main — messages */}
            <div className="flex-1 flex flex-col min-w-0">
              {recipient && (
                <div className="p-3 bg-muted/20 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-navy text-gold text-xs">{recipient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-navy text-sm">{recipient.name}</span>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-muted/10 to-white">
                {messages.length === 0 && !loading && (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    ابدأ المحادثة — أرسل أول رسالة
                  </div>
                )}
                {loading && <div className="text-center py-8"><Loader2 className="w-5 h-5 mx-auto animate-spin text-navy" /></div>}
                {messages.map((m) => {
                  const isMine = m.sender_id === user?.id
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl ${
                        isMine
                          ? 'bg-navy text-white rounded-bl-sm'
                          : 'bg-muted text-navy rounded-br-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Draft + send — always enabled; if no recipient, input shows
                  a placeholder that tells the user to pick someone first */}
              <div className="p-3 border-t border-border flex items-center gap-2 bg-white">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={recipient ? 'اكتب رسالتك...' : 'اختر مستلماً من القائمة على اليمين لبدء المحادثة...'}
                  className="flex-1"
                  disabled={sending || (!recipient && !activeConvId)}
                />
                <Button
                  onClick={send}
                  disabled={sending || !draft.trim() || (!recipient && !activeConvId)}
                  className="bg-navy hover:bg-navy-light"
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
