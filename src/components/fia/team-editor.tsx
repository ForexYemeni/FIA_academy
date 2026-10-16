'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus, Edit, Trash2, Save, Loader2, X, Crown, Star, Award, User,
  Phone, Mail, Briefcase, Eye, Target, Trophy, Linkedin, Twitter, Plus as PlusIcon, FileUp, PenTool,
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

  const del = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return
    await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('تم الحذف')
    load()
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-navy text-lg">
            {filterRole === 'founder' ? 'المؤسس' : filterRole === 'leader' ? 'الفريق القيادي' : 'أعضاء الفريق'}
          </h3>
          <p className="text-sm text-muted-foreground">{members.length} عضو</p>
        </div>
        {!filterRole || filterRole !== 'founder' ? (
          <Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 ml-1" /> عضو جديد
          </Button>
        ) : members.length === 0 ? (
          <Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 ml-1" /> إضافة المؤسس
          </Button>
        ) : null}
      </div>

      {members.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">لا يوجد أعضاء بعد</p>
          <Button className="bg-navy hover:bg-navy-light" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 ml-1" /> إضافة أول عضو
          </Button>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {members.map((m) => {
            const role = ROLE_BADGE[m.role] || ROLE_BADGE.team
            const RoleIcon = role.icon
            const quals = parseArray(m.qualifications)
            const achs = parseArray(m.achievements)
            return (
              <Card key={m.id} className="overflow-hidden">
                <div className="bg-fia-gradient p-5 text-white">
                  <div className="flex items-start gap-4">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-20 h-20 rounded-full object-cover border-4 border-gold/30 flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center border-4 border-gold/30">
                        <span className="text-3xl text-gold font-bold">{m.name?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate">{m.name}</h3>
                        <Badge className={`${role.color} flex-shrink-0`}>
                          <RoleIcon className="w-3 h-3 ml-1" /> {role.label}
                        </Badge>
                      </div>
                      <p className="text-gold text-sm font-semibold mb-2">{m.title}</p>
                      <p className="text-white/70 text-xs">{m.specialization}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {m.bio && (
                    <div>
                      <div className="text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> نبذة تعريفية
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{m.bio}</p>
                    </div>
                  )}

                  {m.vision && (
                    <div>
                      <div className="text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-gold" /> الرؤية
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{m.vision}</p>
                    </div>
                  )}

                  {m.mission && (
                    <div>
                      <div className="text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-gold" /> الرسالة
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{m.mission}</p>
                    </div>
                  )}

                  {quals.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-gold" /> المؤهلات
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {quals.slice(0, 3).map((q, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{q}</Badge>
                        ))}
                        {quals.length > 3 && <Badge variant="outline" className="text-xs">+{quals.length - 3}</Badge>}
                      </div>
                    </div>
                  )}

                  {achs.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-gold" /> الإنجازات
                      </div>
                      <ul className="text-xs text-muted-foreground list-disc pr-4 space-y-0.5">
                        {achs.slice(0, 2).map((a, i) => <li key={i}>{a}</li>)}
                        {achs.length > 2 && <li>+ {achs.length - 2} إنجاز آخر</li>}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 border-t border-border text-xs text-muted-foreground">
                    {m.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" /> {m.email}</span>}
                    {m.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" /> {m.phone}</span>}
                    {m.years_experience ? <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {m.years_experience} سنة خبرة</span> : null}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(m); setOpen(true) }}>
                      <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => del(m.id!)}>
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center z-50"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <DialogHeader>
          <DialogTitle className="text-navy text-lg">
            {editing ? 'تعديل العضو' : 'إضافة عضو جديد'} — {role === 'founder' ? 'المؤسس' : role === 'leader' ? 'قائد' : 'فريق'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">الاسم الكامل *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: د. هاني الشافعي" className="mt-1 text-base font-medium" />
            </div>
            <div>
              <Label className="text-xs">الدور</Label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="founder">المؤسس</option>
                <option value="leader">قائد</option>
                <option value="team">فريق</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">المسمى الوظيفي</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: المؤسس والمدير التنفيذي" className="mt-1" />
          </div>

          {/* Login credentials — for founder/leader only */}
          {(role === 'founder' || role === 'leader') && (
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <Label className="text-xs">البريد لتسجيل الدخول</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="mt-1 text-sm" placeholder="member@fia.edu" />
              </div>
              <div>
                <Label className="text-xs">كلمة المرور</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="mt-1 text-sm" placeholder="••••••••" />
              </div>
            </div>
          )}

          {/* Unified text field — all professional info in one place */}
          <div className="border-t border-border pt-4">
            <Label className="text-sm font-bold text-navy flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-gold" /> المعلومات المهنية
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              اكتب كل المعلومات في الحقل التالي. استخدم العناوين التالية لتقسيم البيانات تلقائياً:
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
              {['التخصص:', 'النبذة المهنية:', 'الرؤية:', 'الرسالة:', 'المؤهلات:', 'الإنجازات:', 'التكريمات:'].map(k => (
                <Badge key={k} variant="outline" className="text-[10px] bg-gold/5 border-gold/20 text-navy">{k}</Badge>
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
              className="mt-1 font-mono text-sm leading-relaxed"
              dir="rtl"
            />
          </div>

          {/* Live preview */}
          {(parsed.bio || parsed.vision || parsed.qualifications.length > 0 || parsed.achievements.length > 0) && (
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <div className="text-xs font-bold text-navy mb-2">معاينة البيانات المُقسّمة:</div>
              <div className="space-y-2">
                {parsed.specialization && <div className="text-xs"><span className="font-semibold text-navy">التخصص:</span> <span className="text-muted-foreground">{parsed.specialization}</span></div>}
                {parsed.bio && <div className="text-xs"><span className="font-semibold text-navy">النبذة:</span> <span className="text-muted-foreground line-clamp-2">{parsed.bio}</span></div>}
                {parsed.vision && <div className="text-xs"><span className="font-semibold text-navy">الرؤية:</span> <span className="text-muted-foreground line-clamp-1">{parsed.vision}</span></div>}
                {parsed.mission && <div className="text-xs"><span className="font-semibold text-navy">الرسالة:</span> <span className="text-muted-foreground line-clamp-1">{parsed.mission}</span></div>}
                {parsed.qualifications.length > 0 && (
                  <div className="text-xs"><span className="font-semibold text-navy">المؤهلات:</span> {parsed.qualifications.length} مؤهل</div>
                )}
                {parsed.achievements.length > 0 && (
                  <div className="text-xs"><span className="font-semibold text-navy">الإنجازات:</span> {parsed.achievements.length} إنجاز</div>
                )}
              </div>
            </div>
          )}

          {/* Contact info — compact */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <Label className="text-xs">البريد</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="mt-1 text-sm" placeholder="example@fia.edu" />
            </div>
            <div>
              <Label className="text-xs">الهاتف</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="mt-1 text-sm" placeholder="+967 7XX XXX XXX" />
            </div>
            <div>
              <Label className="text-xs">LinkedIn</Label>
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} dir="ltr" className="mt-1 text-sm" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Twitter</Label>
              <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} dir="ltr" className="mt-1 text-sm" placeholder="@username" />
            </div>
          </div>

          {/* Signature — founder only */}
          {role === 'founder' && (
          <div className="border-t border-border pt-4">
            <h3 className="font-bold text-navy text-sm mb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-gold" /> توقيع المؤسس (يظهر في الشهادات بعد الاعتماد)
            </h3>
            <div className="bg-gold/5 border border-gold/30 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-muted-foreground mb-3">
                💡 التوقيع لا يظهر في الشهادة افتراضياً. بمجرد رفع التوقيع هنا وحفظه، سيتم إظهاره في شهادات المتدربين مع اسم الموقّع ومنصبه.
              </p>
              <div className="flex items-center gap-3">
                {signature ? (
                  <img src={signature} alt="توقيع" className="h-14 w-auto bg-white border border-gold/30 rounded" />
                ) : (
                  <div className="h-14 w-28 bg-muted/30 border-2 border-dashed border-gold/30 rounded flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">لا يوجد توقيع</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" id="sig-upload" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return
                  const fd = new FormData(); fd.append('file', f); fd.append('folder', 'signatures')
                  try { const r = await fetch('/api/upload/image', { method: 'POST', body: fd }); const d = await r.json(); if (d.url) { setSignature(d.url); toast.success('تم رفع التوقيع') } else toast.error('فشل') } catch { toast.error('خطأ') }
                }} />
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('sig-upload')?.click()}>
                  <FileUp className="w-3.5 h-3.5 ml-1" /> رفع التوقيع
                </Button>
                {signature && <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => setSignature(null)}>إزالة</Button>}
              </div>
            </div>

            {/* Signatory name + position — shown ONLY when signature is approved */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">اسم الموقّع (يظهر أسفل التوقيع)</Label>
                <Input
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="د. هاني الشافعي"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">منصب الموقّع</Label>
                <Input
                  value={signatoryPosition}
                  onChange={(e) => setSignatoryPosition(e.target.value)}
                  placeholder="المدير التنفيذي"
                  className="text-sm"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              ⚠️ اسم الموقّع ومنصبه لا يظهران في الشهادة إلا بعد رفع التوقيع واعتماده.
            </p>
          </div>
          )}

          {/* Years + order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">سنوات الخبرة</Label>
              <Input type="number" value={yearsExp} onChange={(e) => setYearsExp(parseInt(e.target.value) || 0)} dir="ltr" className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">ترتيب العرض</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} dir="ltr" className="mt-1 text-sm" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري...</> : <><Save className="w-4 h-4 ml-1" /> حفظ</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
