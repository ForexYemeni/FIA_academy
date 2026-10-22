'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { PasswordConfirmDialog } from '@/components/fia/password-confirm-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { LuxSelect } from './dashboards/luxury'
import {
  Plus, Edit, Trash2, Save, Loader2, X, Crown, Star, Award, User,
  Phone, Mail, Briefcase, Eye, Target, Trophy, Linkedin, Twitter, Plus as PlusIcon, FileUp, PenTool,
  Sparkles, Globe, Lock, Layers,
} from 'lucide-react'
import { AvatarUploader } from '@/components/fia/avatar-uploader'

interface TeamMember {
  id?: string
  user_id?: string | null
  name: string
  title?: string | null
  role: string
  specialization?: string | null
  bio?: string | null
  vision?: string | null
  mission?: string | null
  qualifications?: string | null
  achievements?: string | null
  avatar?: string | null
  signature?: string | null
  email?: string | null
  phone?: string | null
  linkedin?: string | null
  twitter?: string | null
  years_experience?: number
  display_order?: number
  is_active?: boolean
  password?: string
  signatory_name?: string | null
  signatory_position?: string | null
  created_at?: string
  updated_at?: string
}

const ROLE_BADGE: Record<string, { label: string; color: string; icon: any }> = {
  founder: { label: 'المؤسس', color: 'bg-gold/15 text-gold border-gold/30', icon: Crown },
  leader: { label: 'قائد', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30', icon: Star },
  team: { label: 'فريق', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: User },
}

function parseArray(s?: string | null): string[] {
  if (!s) return []
  try { return JSON.parse(s) } catch { return [] }
}

function stringifyArray(arr: string[]): string {
  return JSON.stringify(arr.filter(Boolean))
}

export function TeamEditor({ filterRole }: { filterRole?: 'founder' | 'leader' | 'team' }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [open, setOpen] = useState(false)
  const [tableExists, setTableExists] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const url = filterRole ? `/api/team?role=${filterRole}` : '/api/team'
      const res = await fetch(url)
      const data = await res.json()
      if (data.exists === false) {
        setTableExists(false)
        setMembers([])
      } else {
        setMembers(Array.isArray(data) ? data : [])
        setTableExists(true)
      }
    } catch {
      setTableExists(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterRole])

  const save = async (member: TeamMember) => {
    try {
      const isEditing = !!member.id
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing ? { id: member.id, ...member } : member
      const res = await fetch('/api/team', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الحفظ')
        return
      }
      toast.success(isEditing ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح')
      setOpen(false)
      setEditing(null)
      load()
    } catch (e) {
      toast.error('خطأ في الاتصال')
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const del = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      toast.success('تم حذف العضو')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('فشل الحذف')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-navy mb-3" />
        <p className="text-sm text-muted-foreground">جاري تحميل أعضاء الفريق...</p>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <Card className="p-8 text-center bg-amber-50 border-amber-300">
        <Briefcase className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h3 className="font-bold text-navy text-lg mb-2">جدول أعضاء الفريق غير موجود</h3>
        <p className="text-sm text-muted-foreground mb-4">
          يجب تنفيذ ملف SQL أولاً في Supabase Dashboard → SQL Editor لتفعيل هذه الميزة.
        </p>
        <a href="https://supabase.com/dashboard/project/tzquudmfazysjogorrxz/sql/new" target="_blank" rel="noopener noreferrer">
          <Button className="bg-navy hover:bg-navy-light">فتح SQL Editor</Button>
        </a>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ⚡ Magical header with add button */}
      <div className="flex items-center justify-between relative">
        <div>
          <h3 className="font-bold text-navy text-lg flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-gold to-amber-500 rounded-full" />
            {filterRole === 'founder' ? 'المؤسس' : filterRole === 'leader' ? 'الفريق القيادي' : 'أعضاء الفريق'}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{members.length} عضو</p>
        </div>
        {!filterRole || filterRole !== 'founder' ? (
          <Button className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 ml-1" /> عضو جديد
          </Button>
        ) : members.length === 0 ? (
          <Button className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md active:scale-[0.97] transition-all" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 ml-1" /> إضافة المؤسس
          </Button>
        ) : null}
      </div>

      {members.length === 0 ? (
        /* ⚡ Magical empty state */
        <div className="text-center py-14">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
              <User className="w-10 h-10 text-gold" />
            </div>
          </div>
          <h3 className="font-bold text-navy text-base mb-1.5">لا يوجد أعضاء بعد</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">أضف أول عضو بالضغط على زر "عضو جديد" ✨</p>
          <Button className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 ml-1" /> إضافة أول عضو
          </Button>
        </div>
      ) : (
        /* ⚡ Magical member cards — 2 columns with gradient headers */
        <div className="grid lg:grid-cols-2 gap-4 fia-stagger">
          {members.map((m) => {
            const role = ROLE_BADGE[m.role] || ROLE_BADGE.team
            const RoleIcon = role.icon
            const quals = parseArray(m.qualifications)
            const achs = parseArray(m.achievements)
            const isFounder = m.role === 'founder'
            return (
              <Card key={m.id} className={`fia-card-hover overflow-hidden border ${isFounder ? 'border-gold/40' : 'border-gold/20'} hover:border-gold/40`}>
                {/* ⚡ Magical gradient header */}
                <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy p-5 text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-25" style={{
                    backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                    backgroundSize: '24px 24px, 18px 18px'
                  }} />
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-gold/15 rounded-full blur-2xl" />
                  {isFounder && (
                    <div className="absolute -top-2 left-2 text-gold/20 text-6xl">
                      <Crown className="w-12 h-12" />
                    </div>
                  )}
                  <div className="relative flex items-start gap-4">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-20 h-20 rounded-xl object-cover border-2 border-gold/40 flex-shrink-0 shadow-md" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gold/20 to-amber-500/20 flex items-center justify-center border-2 border-gold/40 shadow-md">
                        <span className="text-3xl text-gold font-bold">{m.name?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate">{m.name}</h3>
                        {isFounder && <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                      </div>
                      <Badge className={`${role.color} flex-shrink-0 mb-2 inline-flex items-center gap-1`}>
                        <RoleIcon className="w-3 h-3" /> {role.label}
                      </Badge>
                      <p className="text-gold text-sm font-semibold mb-1">{m.title}</p>
                      {m.specialization && <p className="text-white/70 text-xs line-clamp-1">{m.specialization}</p>}
                    </div>
                  </div>
                </div>

                {/* Body — compact info */}
                <div className="p-5 space-y-3">
                  {m.bio && (
                    <div>
                      <div className="text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gold" /> نبذة تعريفية
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{m.bio}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {m.vision && (
                      <div>
                        <div className="text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-gold" /> الرؤية
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{m.vision}</p>
                      </div>
                    )}
                    {m.mission && (
                      <div>
                        <div className="text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-gold" /> الرسالة
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{m.mission}</p>
                      </div>
                    )}
                  </div>

                  {quals.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-gold" /> المؤهلات
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {quals.slice(0, 3).map((q, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-gold/5 border-gold/30 text-navy">{q}</Badge>
                        ))}
                        {quals.length > 3 && <Badge variant="outline" className="text-xs bg-muted/30">+{quals.length - 3}</Badge>}
                      </div>
                    </div>
                  )}

                  {achs.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-gold" /> الإنجازات
                      </div>
                      <ul className="text-xs text-muted-foreground list-disc pr-4 space-y-0.5">
                        {achs.slice(0, 2).map((a, i) => <li key={i}>{a}</li>)}
                        {achs.length > 2 && <li className="text-gold">+ {achs.length - 2} إنجاز آخر</li>}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    {m.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3 text-gold/60" /> <span className="truncate">{m.email}</span></span>}
                    {m.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3 text-gold/60" /> {m.phone}</span>}
                    {m.years_experience ? <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-gold/60" /> {m.years_experience} سنة</span> : null}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border/40">
                    <Button size="sm" variant="outline" className="flex-1 rounded-lg border-gold/30 hover:border-gold hover:bg-gold/5" onClick={() => { setEditing(m); setOpen(true) }}>
                      <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg" onClick={() => setDeleteTarget(m)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {open && (
        <TeamMemberDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          defaultRole={filterRole || 'team'}
          onSave={save}
        />
      )}

      {/* Password-confirmation dialog for team member deletion.
          Prevents accidental destructive deletes — the admin must
          type their own account password to confirm. */}
      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="حذف عضو الفريق"
        message="سيتم حذف هذا العضو نهائياً. أدخل كلمة مرورك للتأكيد."
        itemLabel="سيتم حذف العضو التالي:"
        itemName={deleteTarget?.name}
        confirmLabel="حذف نهائي"
        onConfirm={del}
        loading={deleting}
      />
    </div>
  )
}

// ============== Simple Team Member Dialog ==============
function TeamMemberDialog({ open, onOpenChange, editing, defaultRole, onSave }: any) {
  // Single unified text field for all professional info
  const [name, setName] = useState(editing?.name || '')
  const [title, setTitle] = useState(editing?.title || '')
  const [role, setRole] = useState(editing?.role || defaultRole)
  const [avatar, setAvatar] = useState(editing?.avatar || null)
  const [signature, setSignature] = useState(editing?.signature || null)
  const [signatoryName, setSignatoryName] = useState(editing?.signatory_name || '')
  const [signatoryPosition, setSignatoryPosition] = useState(editing?.signatory_position || 'المدير التنفيذي')
  const [email, setEmail] = useState(editing?.email || '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState(editing?.phone || '')
  const [linkedin, setLinkedin] = useState(editing?.linkedin || '')
  const [twitter, setTwitter] = useState(editing?.twitter || '')
  const [yearsExp, setYearsExp] = useState(editing?.years_experience || 0)
  const [displayOrder, setDisplayOrder] = useState(editing?.display_order || 0)

  // Single unified text field — user writes everything in one textarea
  // Format: each section starts with a keyword on its own line
  // Lines starting with keywords are parsed into structured fields
  const [unifiedText, setUnifiedText] = useState(() => {
    if (!editing) return ''
    const parts: string[] = []
    if (editing.specialization) parts.push(`التخصص: ${editing.specialization}`)
    if (editing.bio) parts.push(`النبذة المهنية:\n${editing.bio}`)
    if (editing.vision) parts.push(`الرؤية:\n${editing.vision}`)
    if (editing.mission) parts.push(`الرسالة:\n${editing.mission}`)
    const quals = parseArray(editing.qualifications)
    if (quals.length > 0) parts.push(`المؤهلات:\n${quals.map(q => `• ${q}`).join('\n')}`)
    const achs = parseArray(editing.achievements)
    if (achs.length > 0) parts.push(`الإنجازات:\n${achs.map(a => `• ${a}`).join('\n')}`)
    return parts.join('\n\n')
  })

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setName(editing.name || '')
      setTitle(editing.title || '')
      setRole(editing.role || defaultRole)
      setAvatar(editing.avatar || null)
      setSignature(editing.signature || null)
      setSignatoryName(editing.signatory_name || '')
      setSignatoryPosition(editing.signatory_position || 'المدير التنفيذي')
      setEmail(editing.email || '')
      setPassword('')
      setPhone(editing.phone || '')
      setLinkedin(editing.linkedin || '')
      setTwitter(editing.twitter || '')
      setYearsExp(editing.years_experience || 0)
      setDisplayOrder(editing.display_order || 0)
      const parts: string[] = []
      if (editing.specialization) parts.push(`التخصص: ${editing.specialization}`)
      if (editing.bio) parts.push(`النبذة المهنية:\n${editing.bio}`)
      if (editing.vision) parts.push(`الرؤية:\n${editing.vision}`)
      if (editing.mission) parts.push(`الرسالة:\n${editing.mission}`)
      const quals = parseArray(editing.qualifications)
      if (quals.length > 0) parts.push(`المؤهلات:\n${quals.map(q => `• ${q}`).join('\n')}`)
      const achs = parseArray(editing.achievements)
      if (achs.length > 0) parts.push(`الإنجازات:\n${achs.map(a => `• ${a}`).join('\n')}`)
      setUnifiedText(parts.join('\n\n'))
    } else {
      setName(''); setTitle(''); setRole(defaultRole); setAvatar(null); setSignature(null)
      setSignatoryName(''); setSignatoryPosition('المدير التنفيذي')
      setEmail(''); setPassword(''); setPhone(''); setLinkedin(''); setTwitter(''); setYearsExp(0); setDisplayOrder(0)
      setUnifiedText('')
    }
  }, [editing, defaultRole])

  // Parse unified text into structured fields
  const parseUnifiedText = (text: string) => {
    const result: any = { specialization: null, bio: null, vision: null, mission: null, qualifications: [], achievements: [] }
    if (!text.trim()) return result

    const sections = text.split(/\n\n+/)
    for (const section of sections) {
      const lines = section.trim().split('\n')
      const header = lines[0].trim()
      const body = lines.slice(1).join('\n').trim()

      if (header.startsWith('التخصص:')) {
        result.specialization = header.replace('التخصص:', '').trim()
      } else if (header.startsWith('النبذة') || header.startsWith('نبذة')) {
        result.bio = body || header.replace(/^[^:]*:\s*/, '').trim()
      } else if (header.startsWith('الرؤية') || header.startsWith('رؤية')) {
        result.vision = body || header.replace(/^[^:]*:\s*/, '').trim()
      } else if (header.startsWith('الرسالة') || header.startsWith('رسالة')) {
        result.mission = body || header.replace(/^[^:]*:\s*/, '').trim()
      } else if (header.startsWith('المؤهلات') || header.startsWith('مؤهلات')) {
        const items = body.split('\n').map(l => l.replace(/^\s*•\s*/, '').trim()).filter(Boolean)
        result.qualifications = items
      } else if (header.startsWith('الإنجازات') || header.startsWith('إنجازات') || header.startsWith('التكريمات') || header.startsWith('تكريمات')) {
        const items = body.split('\n').map(l => l.replace(/^\s*•\s*/, '').trim()).filter(Boolean)
        result.achievements = items
      } else {
        // Unrecognized section — treat as bio if no bio yet
        if (!result.bio) result.bio = section.trim()
      }
    }
    return result
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('الاسم مطلوب')
      return
    }
    setSaving(true)
    const parsed = parseUnifiedText(unifiedText)
    const finalForm: TeamMember = {
      id: editing?.id,
      name: name.trim(),
      title: title.trim() || null,
      role,
      password: password || undefined, // Pass actual password to API
      specialization: parsed.specialization,
      bio: parsed.bio,
      vision: parsed.vision,
      mission: parsed.mission,
      qualifications: stringifyArray(parsed.qualifications),
      achievements: stringifyArray(parsed.achievements),
      avatar: avatar || null,
      signature: role === 'founder' ? (signature || null) : null,
      signatory_name: role === 'founder' ? (signatoryName.trim() || null) : null,
      signatory_position: role === 'founder' ? (signatoryPosition.trim() || null) : null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      linkedin: linkedin.trim() || null,
      twitter: twitter.trim() || null,
      years_experience: yearsExp || 0,
      display_order: displayOrder || 0,
      is_active: true,
    }
    await onSave(finalForm)
    setSaving(false)
  }

  // Live preview of parsed sections
  const parsed = parseUnifiedText(unifiedText)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0">
        {/* ⚡ Magical gradient header */}
        <div className={`relative p-5 pb-6 text-white overflow-hidden ${
          role === 'founder'
            ? 'bg-gradient-to-br from-gold via-amber-500 to-yellow-600'
            : role === 'leader'
              ? 'bg-gradient-to-br from-navy via-navy-light to-navy'
              : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-700'
        }`}>
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, white 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px, 18px 18px'
          }} />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30">
              {role === 'founder' ? <Crown className="w-7 h-7 text-white" /> : role === 'leader' ? <Star className="w-7 h-7 text-white" /> : <User className="w-7 h-7 text-white" />}
            </div>
            <div>
              <DialogTitle className={`text-xl font-bold tracking-tight ${role === 'founder' ? 'text-navy' : 'text-white'}`}>
                {editing ? 'تعديل العضو' : 'إضافة عضو جديد'}
              </DialogTitle>
              <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${role === 'founder' ? 'text-navy/80' : 'text-white/80'}`}>
                <Sparkles className="w-3 h-3" />
                {role === 'founder' ? 'المؤسس — صلاحيات كاملة' : role === 'leader' ? 'قائد — صلاحيات إدارية' : 'عضو فريق'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Avatar — always available (even before save) */}
          <div className="flex justify-center p-2">
            <AvatarUploader
              userId={editing?.id || 'temp-' + Date.now()}
              role="team"
              initialUrl={avatar || undefined}
              name={name || 'عضو'}
              size="lg"
              onUploaded={(url) => setAvatar(url)}
            />
          </div>

          {/* Basic: Name + Title + Role in one row */}
          <SectionTitle icon={User} label="الهوية والصلاحيات" />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-gold" /> الاسم الكامل *
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: د. هاني الشافعي" className="text-base font-medium rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Star className="w-3.5 h-3.5 text-gold" /> الدور
              </Label>
              <LuxSelect value={role} onChange={setRole} title="دور العضو في الفريق" icon={Star}
                options={[
                  { value: 'founder', label: 'المؤسس', emoji: '👑' },
                  { value: 'leader', label: 'قائد', emoji: '🎖️' },
                  { value: 'team', label: 'فريق', emoji: '👥' },
                ]} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gold" /> المسمى الوظيفي
            </Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: المؤسس والمدير التنفيذي" className="rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" />
          </div>

          {/* Login credentials — for founder/leader only */}
          {(role === 'founder' || role === 'leader') && (
            <>
              <SectionTitle icon={Lock} label="بيانات الدخول للحساب" />
              <div className="grid grid-cols-2 gap-3 border-t border-gold/20 pt-4">
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-gold" /> البريد لتسجيل الدخول
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="member@fia.edu" />
              </div>
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-gold" /> كلمة المرور
                </Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="••••••••" />
              </div>
            </div>
            </>
          )}

          {/* Unified text field — all professional info in one place */}
          <SectionTitle icon={Award} label="المعلومات المهنية الكاملة" />
          <div className="border-t border-gold/20 pt-4">
            <Label className="text-sm font-bold text-navy flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-gold" /> المعلومات المهنية
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              اكتب كل المعلومات في الحقل التالي. استخدم العناوين التالية لتقسيم البيانات تلقائياً:
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
              {['التخصص:', 'النبذة المهنية:', 'الرؤية:', 'الرسالة:', 'المؤهلات:', 'الإنجازات:', 'التكريمات:'].map(k => (
                <Badge key={k} variant="outline" className="text-[10px] bg-gold/5 border-gold/30 text-navy">{k}</Badge>
              ))}
            </div>
            <Textarea
              value={unifiedText}
              onChange={(e) => setUnifiedText(e.target.value)}
              rows={12}
              placeholder={`التخصص: طبيب عام وخبير تعليم طبي

النبذة المهنية:
طبيب عام وخبير في التعليم الطبي، يمتلك أكثر من 10 عامًا من الخبرة...

الرؤية:
أن نوصل التعليم الطبي المستمر لكل ممارس صحي...

الرسالة:
تمكين الكوادر الصحية بمعارف ومهارات عصرية...

المؤهلات:
• بكالريوس طب عام وجراحة
• عضوية البورد الأوروبي
• ماجستير في التنمية البشرية
• مدرب معتمد في ACLS و BLS

الإنجازات:
• أسس أكاديمية المستقبل الدولية
• درّب أكثر من 3,000 ممارس صحي
• طبيب سابق لدى اليونيسف
• نشر أكثر من 20 بحثًا علميًا`}
              className="mt-1 font-mono text-sm leading-relaxed rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
              dir="rtl"
            />
          </div>

          {/* Live preview — magical */}
          {(parsed.bio || parsed.vision || parsed.qualifications.length > 0 || parsed.achievements.length > 0) && (
            <div className="relative bg-gradient-to-br from-gold/5 to-amber-50/30 rounded-xl p-3 border border-gold/30 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <div className="relative">
                <div className="text-xs font-bold text-navy mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-gold" /> معاينة البيانات المُقسّمة:
                </div>
                <div className="space-y-1.5">
                  {parsed.specialization && <div className="text-xs"><span className="font-bold text-navy">التخصص:</span> <span className="text-muted-foreground">{parsed.specialization}</span></div>}
                  {parsed.bio && <div className="text-xs"><span className="font-bold text-navy">النبذة:</span> <span className="text-muted-foreground line-clamp-2">{parsed.bio}</span></div>}
                  {parsed.vision && <div className="text-xs"><span className="font-bold text-navy">الرؤية:</span> <span className="text-muted-foreground line-clamp-1">{parsed.vision}</span></div>}
                  {parsed.mission && <div className="text-xs"><span className="font-bold text-navy">الرسالة:</span> <span className="text-muted-foreground line-clamp-1">{parsed.mission}</span></div>}
                  {parsed.qualifications.length > 0 && (
                    <div className="text-xs flex items-center gap-1.5"><Award className="w-3 h-3 text-gold" /> <span className="font-bold text-navy">المؤهلات:</span> <span className="text-emerald-600 font-bold">{parsed.qualifications.length} مؤهل</span></div>
                  )}
                  {parsed.achievements.length > 0 && (
                    <div className="text-xs flex items-center gap-1.5"><Trophy className="w-3 h-3 text-gold" /> <span className="font-bold text-navy">الإنجازات:</span> <span className="text-emerald-600 font-bold">{parsed.achievements.length} إنجاز</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact info — compact */}
          <SectionTitle icon={Phone} label="بيانات التواصل والتفاعل" />
          <div className="grid grid-cols-2 gap-3 border-t border-gold/20 pt-4">
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-gold" /> البريد
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="example@fia.edu" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-gold" /> الهاتف
              </Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="+967 7XX XXX XXX" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-gold" /> LinkedIn
              </Label>
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-gold" /> Twitter
              </Label>
              <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="@username" />
            </div>
          </div>

          {/* Signature — founder only */}
          {role === 'founder' && (
          <div className="border-t border-gold/20 pt-4">
            <h3 className="font-bold text-navy text-sm mb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-gold" /> توقيع المؤسس (يظهر في الشهادات بعد الاعتماد)
            </h3>
            <div className="bg-gradient-to-br from-gold/5 to-amber-50/30 border border-gold/30 rounded-xl p-3 mb-3 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/15 rounded-full blur-xl" />
              <p className="text-[10px] text-muted-foreground mb-3 relative">
                💡 التوقيع لا يظهر في الشهادة افتراضياً. بمجرد رفعه هنا وحفظه، سيظهر في شهادات المتدربين مع اسم الموقّع ومنصبه.
              </p>
              <div className="flex items-center gap-3 relative">
                {signature ? (
                  <img src={signature} alt="توقيع" className="h-14 w-auto bg-white border border-gold/30 rounded-lg" />
                ) : (
                  <div className="h-14 w-28 bg-muted/30 border-2 border-dashed border-gold/30 rounded-lg flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">لا يوجد توقيع</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" id="sig-upload" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return
                  const fd = new FormData(); fd.append('file', f); fd.append('folder', 'signatures')
                  try { const r = await fetch('/api/upload/image', { method: 'POST', body: fd }); const d = await r.json(); if (d.url) { setSignature(d.url); toast.success('تم رفع التوقيع') } else toast.error('فشل') } catch { toast.error('خطأ') }
                }} />
                <Button type="button" variant="outline" size="sm" className="rounded-lg border-gold/30 hover:border-gold hover:bg-gold/5" onClick={() => document.getElementById('sig-upload')?.click()}>
                  <FileUp className="w-3.5 h-3.5 ml-1" /> رفع التوقيع
                </Button>
                {signature && <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => setSignature(null)}>إزالة</Button>}
              </div>
            </div>

            {/* Signatory name + position — shown ONLY when signature is approved */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-gold" /> اسم الموقّع
                </Label>
                <Input
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="د. هاني الشافعي"
                  className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-gold" /> منصب الموقّع
                </Label>
                <Input
                  value={signatoryPosition}
                  onChange={(e) => setSignatoryPosition(e.target.value)}
                  placeholder="المدير التنفيذي"
                  className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              ⚠️ اسم الموقّع ومنصبه لا يظهران في الشهادة إلا بعد رفع التوقيع واعتماده.
            </p>
          </div>
          )}

          {/* Years + order */}
          <SectionTitle icon={Layers} label="الخبرة وترتيب العرض" />
          <div className="grid grid-cols-2 gap-3 border-t border-gold/20 pt-4">
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gold" /> سنوات الخبرة
              </Label>
              <Input type="number" value={yearsExp || ''} onChange={(e) => setYearsExp(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-gold" /> ترتيب العرض
              </Label>
              <Input type="number" value={displayOrder || ''} onChange={(e) => setDisplayOrder(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} dir="ltr" className="text-sm rounded-xl border-gold/30 focus:border-gold focus:ring-gold/30" placeholder="0" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-muted/20 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold rounded-xl shadow-md active:scale-[0.97] transition-all px-6">
            {saving ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : <><Save className="w-4 h-4 ml-1" /> حفظ</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Section divider — same royal style as the trainer profile dialog
function SectionTitle({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center shadow-sm border border-gold/30">
        <Icon className="w-3.5 h-3.5 text-gold" />
      </div>
      <span className="text-xs font-extrabold text-navy">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-gold/30 to-transparent" />
    </div>
  )
}
