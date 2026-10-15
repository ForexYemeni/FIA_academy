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
  Phone, Mail, Briefcase, Eye, Target, Trophy, Linkedin, Twitter, Plus as PlusIcon,
} from 'lucide-react'
import { AvatarUploader } from '@/components/fia/avatar-uploader'

interface TeamMember {
  id?: string
  user_id?: string | null
  name: string
  title?: string | null
  role: string  // founder | leader | team
  specialization?: string | null
  bio?: string | null
  vision?: string | null
  mission?: string | null
  qualifications?: string | null  // JSON array string
  achievements?: string | null     // JSON array string
  avatar?: string | null
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

// ============== Full Team Member Dialog ==============
function TeamMemberDialog({ open, onOpenChange, editing, defaultRole, onSave }: any) {
  const [form, setForm] = useState<TeamMember>(
    editing || {
      name: '',
      title: '',
      role: defaultRole,
      specialization: '',
      bio: '',
      vision: '',
      mission: '',
      qualifications: '[]',
      achievements: '[]',
      avatar: null,
      email: '',
      phone: '',
      linkedin: '',
      twitter: '',
      years_experience: 0,
      display_order: 0,
      is_active: true,
    }
  )
  const [saving, setSaving] = useState(false)
  const [qualifications, setQualifications] = useState<string[]>(parseArray(editing?.qualifications))
  const [achievements, setAchievements] = useState<string[]>(parseArray(editing?.achievements))
  const [newQual, setNewQual] = useState('')
  const [newAch, setNewAch] = useState('')

  useEffect(() => {
    if (editing) {
      setForm(editing)
      setQualifications(parseArray(editing.qualifications))
      setAchievements(parseArray(editing.achievements))
    } else {
      setForm({
        name: '',
        title: '',
        role: defaultRole,
        specialization: '',
        bio: '',
        vision: '',
        mission: '',
        qualifications: '[]',
        achievements: '[]',
        avatar: null,
        email: '',
        phone: '',
        linkedin: '',
        twitter: '',
        years_experience: 0,
        display_order: 0,
        is_active: true,
      })
      setQualifications([])
      setAchievements([])
    }
  }, [editing, defaultRole])

  const addQual = () => {
    if (newQual.trim()) {
      const arr = [...qualifications, newQual.trim()]
      setQualifications(arr)
      setForm({ ...form, qualifications: stringifyArray(arr) })
      setNewQual('')
    }
  }
  const removeQual = (i: number) => {
    const arr = qualifications.filter((_, idx) => idx !== i)
    setQualifications(arr)
    setForm({ ...form, qualifications: stringifyArray(arr) })
  }
  const addAch = () => {
    if (newAch.trim()) {
      const arr = [...achievements, newAch.trim()]
      setAchievements(arr)
      setForm({ ...form, achievements: stringifyArray(arr) })
      setNewAch('')
    }
  }
  const removeAch = (i: number) => {
    const arr = achievements.filter((_, idx) => idx !== i)
    setAchievements(arr)
    setForm({ ...form, achievements: stringifyArray(arr) })
  }

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error('الاسم مطلوب')
      return
    }
    setSaving(true)
    const finalForm = {
      ...form,
      qualifications: stringifyArray(qualifications),
      achievements: stringifyArray(achievements),
    }
    await onSave(finalForm)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy text-lg">
            {editing ? 'تعديل العضو' : 'إضافة عضو جديد'} — {form.role === 'founder' ? 'المؤسس' : form.role === 'leader' ? 'قائد' : 'فريق'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
            {form.id ? (
              <AvatarUploader
                userId={form.id}
                role="team"
                initialUrl={form.avatar}
                name={form.name}
                size="xl"
                onUploaded={(url) => setForm({ ...form, avatar: url })}
              />
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-navy flex items-center justify-center mb-2">
                  <User className="w-12 h-12 text-gold" />
                </div>
                <p className="text-xs text-muted-foreground">احفظ أولاً ثم ارفع الصورة</p>
              </div>
            )}
            {form.avatar && !form.id && (
              <Badge variant="outline" className="text-xs">سيتم رفع الصورة بعد الحفظ</Badge>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>الاسم الكامل *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>المسمى الوظيفي</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: المؤسس والمدير التنفيذي" className="mt-1" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>الدور</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="founder">المؤسس</option>
                <option value="leader">قائد</option>
                <option value="team">فريق</option>
              </select>
            </div>
            <div>
              <Label>التخصص</Label>
              <Input value={form.specialization || ''} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>النبذة التعريفية</Label>
            <Textarea value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="mt-1" />
          </div>

          {/* Vision & Mission */}
          <div className="bg-navy/5 p-4 rounded-lg border border-navy/10 space-y-4">
            <h3 className="font-bold text-navy text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-gold" /> الرؤية والرسالة
            </h3>
            <div>
              <Label className="text-navy">الرؤية</Label>
              <Textarea value={form.vision || ''} onChange={(e) => setForm({ ...form, vision: e.target.value })} rows={2} placeholder="ما الذي تطمح للوصول إليه..." className="mt-1" />
            </div>
            <div>
              <Label className="text-navy">الرسالة</Label>
              <Textarea value={form.mission || ''} onChange={(e) => setForm({ ...form, mission: e.target.value })} rows={2} placeholder="كيف تخطط لتحقيق رؤيتك..." className="mt-1" />
            </div>
          </div>

          {/* Qualifications (dynamic list) */}
          <div className="space-y-2">
            <Label className="text-navy flex items-center gap-2">
              <Award className="w-4 h-4 text-gold" /> المؤهلات العلمية والاحترافية
            </Label>
            <div className="flex gap-2">
              <Input
                value={newQual}
                onChange={(e) => setNewQual(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQual() } }}
                placeholder="مثال: استشاري طب باطني — اضغط Enter للإضافة"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addQual}>
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
            {qualifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {qualifications.map((q, i) => (
                  <Badge key={i} variant="outline" className="bg-gold/5 border-gold/30 text-navy">
                    {q}
                    <button onClick={() => removeQual(i)} className="mr-1 text-red-500 hover:text-red-700">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Achievements (dynamic list) */}
          <div className="space-y-2">
            <Label className="text-navy flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" /> الإنجازات والمساهمات
            </Label>
            <div className="flex gap-2">
              <Input
                value={newAch}
                onChange={(e) => setNewAch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAch() } }}
                placeholder="مثال: تدريب أكثر من 5,000 طالب — اضغط Enter للإضافة"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addAch}>
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
            {achievements.length > 0 && (
              <div className="space-y-1 mt-2">
                {achievements.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 p-2 rounded-md border border-border">
                    <span className="text-sm text-navy flex items-start gap-2">
                      <Trophy className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />
                      {a}
                    </span>
                    <button onClick={() => removeAch(i)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-navy">البريد الإلكتروني</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="mt-1" />
            </div>
            <div>
              <Label className="text-navy">رقم الهاتف</Label>
              <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="mt-1" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-navy flex items-center gap-1"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label>
              <Input value={form.linkedin || ''} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." dir="ltr" className="mt-1" />
            </div>
            <div>
              <Label className="text-navy flex items-center gap-1"><Twitter className="w-3.5 h-3.5" /> Twitter</Label>
              <Input value={form.twitter || ''} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="@username" dir="ltr" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-navy">سنوات الخبرة</Label>
              <Input type="number" value={form.years_experience || 0} onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value) || 0 })} dir="ltr" className="mt-1" />
            </div>
            <div>
              <Label className="text-navy">ترتيب العرض</Label>
              <Input type="number" value={form.display_order || 0} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} dir="ltr" className="mt-1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy-light">
            {saving ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4 ml-1" /> حفظ</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
