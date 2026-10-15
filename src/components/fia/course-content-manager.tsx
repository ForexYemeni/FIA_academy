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
  Plus, Edit, Trash2, ChevronDown, ChevronUp, Video, FileText,
  HelpCircle, FileUp, GripVertical, Save, X, Loader2,
  Database, Copy, ExternalLink, RefreshCw, CheckCircle2, Eye,
} from 'lucide-react'
import { LessonPreviewModal } from '@/components/fia/lesson-preview-modal'

interface Module {
  id: string
  course_id: string
  title: string
  description?: string
  position: number
}

interface Lesson {
  id: string
  module_id: string
  title: string
  lesson_type: 'video' | 'text' | 'exam' | 'pdf'
  content?: string
  video_url?: string
  pdf_url?: string
  duration_minutes?: number
  position: number
  is_preview?: boolean
}

const LESSON_TYPES = [
  { value: 'video', label: 'فيديو', icon: Video, color: 'bg-red-500/15 text-red-600 border-red-500/30' },
  { value: 'text', label: 'نص', icon: FileText, color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  { value: 'exam', label: 'اختبار', icon: HelpCircle, color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  { value: 'pdf', label: 'PDF', icon: FileUp, color: 'bg-green-500/15 text-green-600 border-green-500/30' },
]

export function CourseContentManager({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<Module[]>([])
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({})
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupSqlCopied, setSetupSqlCopied] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const SETUP_SQL = `-- FIA Academy — Database Setup
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL,
  title TEXT NOT NULL,
  lesson_type TEXT DEFAULT 'text',
  content TEXT,
  video_url TEXT,
  pdf_url TEXT,
  duration_minutes INT DEFAULT 0,
  position INT DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  progress INT DEFAULT 0,
  payment_status TEXT DEFAULT 'free',
  amount_paid INT DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  title TEXT,
  role TEXT DEFAULT 'team',
  specialization TEXT,
  bio TEXT,
  vision TEXT,
  mission TEXT,
  qualifications TEXT,
  achievements TEXT,
  avatar TEXT,
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  twitter TEXT,
  years_experience INT DEFAULT 0,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_modules" ON course_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_lessons" ON course_lessons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_enrollments" ON enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_team" ON team_members FOR ALL USING (true) WITH CHECK (true);

INSERT INTO team_members (name, title, role, specialization, bio, vision, mission, email, phone, years_experience, display_order, is_active)
SELECT 'د. عبدالرحمن المحمدي', 'المؤسس والمدير التنفيذي', 'founder', 'الطب الباطني والتعليم الطبي',
       'طبيب استشاري وخبير تعليم طبي مع 15 عامًا من الخبرة.',
       'أن نكون المرجع الأول للتعليم الطبي المستمر في المنطقة.',
       'تمكين الكوادر الصحية بمعارف ومهارات تخدم المرضى.',
       'admin@fia.edu', '+967 700 000 001', 15, 0, true
WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE role = 'founder');`

  const copySql = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setSetupSqlCopied(true)
      toast.success('تم نسخ SQL! الصقه في Supabase SQL Editor واضغط Run')
      setTimeout(() => setSetupSqlCopied(false), 4000)
    })
  }

  // Dialogs
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; editing: Module | null }>({ open: false, editing: null })
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; editing: Lesson | null; moduleId: string } | null>(null)
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)

  const loadModules = async () => {
    setLoading(true)
    setNeedsSetup(false)
    try {
      const res = await fetch(`/api/modules?course_id=${courseId}`)
      const data = await res.json()
      if (data.needs_setup) {
        setNeedsSetup(true)
        setModules([])
        setLoading(false)
        return
      }
      const mods = Array.isArray(data) ? data : []
      setModules(mods)
      if (mods.length > 0 && expanded.size === 0) {
        setExpanded(new Set([mods[0].id]))
      }
      const lessonRes = await fetch(`/api/lessons?course_id=${courseId}`)
      const allLessons = await lessonRes.json()
      const byModule: Record<string, Lesson[]> = {}
      ;(allLessons || []).forEach((l: Lesson) => {
        if (!byModule[l.module_id]) byModule[l.module_id] = []
        byModule[l.module_id].push(l)
      })
      setLessonsByModule(byModule)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [courseId])

  const toggleModule = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveModule = async (data: any) => {
    try {
      const res = await fetch('/api/modules', {
        method: moduleDialog.editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moduleDialog.editing ? { id: moduleDialog.editing.id, ...data } : { course_id: courseId, ...data }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(moduleDialog.editing ? 'تم تحديث الوحدة' : 'تمت إضافة الوحدة')
        setModuleDialog({ open: false, editing: null })
        loadModules()
      } else if (result.needs_setup) {
        setNeedsSetup(true)
        setModuleDialog({ open: false, editing: null })
        toast.error('يجب تنفيذ SQL أولاً')
      } else {
        toast.error(result.error || 'فشل الحفظ')
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم')
    }
  }

  const deleteModule = async (id: string) => {
    if (!confirm('حذف الوحدة سيحذف جميع دروسها. متابعة؟')) return
    await fetch('/api/modules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف')
    loadModules()
  }

  const saveLesson = async (data: any, moduleId: string, editing: Lesson | null) => {
    try {
      const res = await fetch('/api/lessons', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...data } : { module_id: moduleId, ...data }),
      })
      if (res.ok) {
        toast.success(editing ? 'تم تحديث الدرس' : 'تمت إضافة الدرس')
        setLessonDialog(null)
        loadModules()
      } else {
        const result = await res.json()
        toast.error(result.error || 'فشل الحفظ')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    }
  }

  const deleteLesson = async (id: string) => {
    if (!confirm('حذف الدرس؟')) return
    await fetch('/api/lessons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('تم الحذف')
    loadModules()
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-navy mb-3" />
        <p className="text-sm text-muted-foreground">جاري تحميل محتوى الدورة...</p>
      </div>
    )
  }

  // ===== Database setup needed =====
  if (needsSetup) {
    return (
      <div className="space-y-4">
        <Card className="p-8 text-center bg-amber-50 border-2 border-amber-300">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500 flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-bold text-navy text-lg mb-2">تهيئة قاعدة البيانات مطلوبة</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            لتفعيل نظام الوحدات والدروس، يجب إنشاء جداول في Supabase. اضغط زر النسخ ثم الصق في Supabase SQL Editor واضغط Run.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={copySql} className="bg-navy hover:bg-navy-light">
              {setupSqlCopied ? <CheckCircle2 className="w-4 h-4 ml-1" /> : <Copy className="w-4 h-4 ml-1" />}
              {setupSqlCopied ? 'تم النسخ!' : 'نسخ SQL'}
            </Button>
            <a href="https://supabase.com/dashboard/project/tzquudmfazysjogorrxz/sql/new" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-navy/30 text-navy hover:bg-navy/5">
                <ExternalLink className="w-4 h-4 ml-1" /> فتح SQL Editor
              </Button>
            </a>
            <Button variant="outline" onClick={loadModules} className="border-navy/30 text-navy hover:bg-navy/5">
              <RefreshCw className="w-4 h-4 ml-1" /> إعادة المحاولة
            </Button>
          </div>
          <details className="mt-5 text-right">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-navy">عرض SQL الكامل</summary>
            <pre className="mt-3 text-xs bg-navy text-white p-4 rounded-lg overflow-x-auto max-h-72 overflow-y-auto font-mono" dir="ltr">{SETUP_SQL}</pre>
          </details>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-navy text-lg">محتوى الدورة</h3>
          <p className="text-sm text-muted-foreground">{modules.length} وحدة، {Object.values(lessonsByModule).flat().length} درس</p>
        </div>
        <Button
          className="bg-navy hover:bg-navy-light"
          onClick={() => setModuleDialog({ open: true, editing: null })}
        >
          <Plus className="w-4 h-4 ml-1" /> وحدة جديدة
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">لا توجد وحدات في هذه الدورة بعد</p>
          <Button className="bg-navy hover:bg-navy-light" onClick={() => setModuleDialog({ open: true, editing: null })}>
            <Plus className="w-4 h-4 ml-1" /> أضف أول وحدة
          </Button>
        </Card>
      ) : (
        modules.map((m, idx) => {
          const isExpanded = expanded.has(m.id)
          const lessons = lessonsByModule[m.id] || []
          return (
            <Card key={m.id} className="overflow-hidden">
              {/* Module header */}
              <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border">
                <button onClick={() => toggleModule(m.id)} className="flex items-center gap-3 flex-1 text-right">
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                  <div className="w-8 h-8 rounded-lg bg-navy text-gold flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-navy">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.description || `${lessons.length} درس`}</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setModuleDialog({ open: true, editing: m })}>
                    <Edit className="w-4 h-4 text-navy" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteModule(m.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Module lessons */}
              {isExpanded && (
                <div className="p-4 space-y-2">
                  {lessons.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      لا توجد دروس في هذه الوحدة
                    </div>
                  ) : (
                    lessons.map((l, li) => {
                      const type = LESSON_TYPES.find((t) => t.value === l.lesson_type) || LESSON_TYPES[0]
                      const Icon = type.icon
                      return (
                        <div key={l.id} className="flex items-center justify-between p-3 bg-white border border-border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3 flex-1">
                            <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                            <Badge className={type.color}><Icon className="w-3 h-3 ml-1" /> {type.label}</Badge>
                            <div className="flex-1">
                              <div className="font-medium text-navy text-sm flex items-center gap-2">
                                {l.title}
                                {l.is_preview && <Badge variant="outline" className="text-xs">معاينة مجانية</Badge>}
                              </div>
                              {l.duration_minutes ? (
                                <div className="text-xs text-muted-foreground">{l.duration_minutes} دقيقة</div>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setPreviewLesson(l)} title="معاينة الدرس">
                              <Eye className="w-4 h-4 text-gold" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setLessonDialog({ open: true, editing: l, moduleId: m.id })}>
                              <Edit className="w-4 h-4 text-navy" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteLesson(l.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-dashed"
                    onClick={() => setLessonDialog({ open: true, editing: null, moduleId: m.id })}
                  >
                    <Plus className="w-4 h-4 ml-1" /> إضافة درس
                  </Button>
                </div>
              )}
            </Card>
          )
        })
      )}

      {/* Module dialog */}
      {moduleDialog.open && (
        <ModuleDialog
          open={moduleDialog.open}
          onOpenChange={(o) => setModuleDialog({ open: o, editing: moduleDialog.editing })}
          editing={moduleDialog.editing}
          onSave={saveModule}
        />
      )}

      {/* Lesson dialog */}
      {lessonDialog?.open && (
        <LessonDialog
          open={lessonDialog.open}
          onOpenChange={(o) => setLessonDialog(o ? { ...lessonDialog, open: o } : null)}
          editing={lessonDialog.editing}
          moduleId={lessonDialog.moduleId}
          onSave={(data: any) => saveLesson(data, lessonDialog.moduleId, lessonDialog.editing)}
        />
      )}

      {/* Lesson preview modal */}
      <LessonPreviewModal
        open={!!previewLesson}
        onOpenChange={(o) => { if (!o) setPreviewLesson(null) }}
        lesson={previewLesson}
        modules={modules}
        onNavigate={(l) => setPreviewLesson(l)}
      />
    </div>
  )
}

// ============== Module Dialog ==============
function ModuleDialog({ open, onOpenChange, editing, onSave }: any) {
  const [title, setTitle] = useState(editing?.title || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [position, setPosition] = useState(editing?.position || 0)

  useEffect(() => {
    setTitle(editing?.title || '')
    setDescription(editing?.description || '')
    setPosition(editing?.position || 0)
  }, [editing])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'تعديل الوحدة' : 'وحدة جديدة'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>عنوان الوحدة *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: الوحدة الأولى - الأساسيات" className="mt-1" />
          </div>
          <div>
            <Label>وصف مختصر</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div>
            <Label>الترتيب</Label>
            <Input type="number" value={position} onChange={(e) => setPosition(parseInt(e.target.value) || 0)} dir="ltr" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            className="bg-navy hover:bg-navy-light"
            onClick={() => { if (!title) { toast.error('أدخل العنوان'); return } onSave({ title, description, position }); }}
          >
            <Save className="w-4 h-4 ml-1" /> حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============== Lesson Dialog ==============
function LessonDialog({ open, onOpenChange, editing, onSave }: any) {
  const [title, setTitle] = useState(editing?.title || '')
  const [lessonType, setLessonType] = useState<'video' | 'text' | 'exam' | 'pdf'>(editing?.lesson_type || 'video')
  const [content, setContent] = useState(editing?.content || '')
  const [videoUrl, setVideoUrl] = useState(editing?.video_url || '')
  const [pdfUrl, setPdfUrl] = useState(editing?.pdf_url || '')
  const [duration, setDuration] = useState(editing?.duration_minutes || 0)
  const [isPreview, setIsPreview] = useState(editing?.is_preview || false)
  const [position, setPosition] = useState(editing?.position || 0)
  const [savingPdf, setSavingPdf] = useState(false)

  useEffect(() => {
    setTitle(editing?.title || '')
    setLessonType(editing?.lesson_type || 'video')
    setContent(editing?.content || '')
    setVideoUrl(editing?.video_url || '')
    setPdfUrl(editing?.pdf_url || '')
    setDuration(editing?.duration_minutes || 0)
    setIsPreview(editing?.is_preview || false)
    setPosition(editing?.position || 0)
  }, [editing])

  const handlePdfUpload = async (file: File) => {
    setSavingPdf(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'pdfs')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setPdfUrl(data.url)
        toast.success('تم رفع PDF')
      } else toast.error('فشل رفع PDF')
    } finally {
      setSavingPdf(false)
    }
  }

  // Telegram video upload helper
  const [telegramInfo, setTelegramInfo] = useState<{ botToken: string; channelId: string } | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const handleVideoUpload = async (file: File) => {
    setUploadingVideo(true)
    try {
      // 1. Get Telegram bot info
      const infoRes = await fetch('/api/upload/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, caption: `FIA Lesson Video: ${title}` }),
      })
      const info = await infoRes.json()
      if (!info.botToken) {
        toast.error('فشل الحصول على معلومات تيليجرام')
        return
      }

      // 2. Upload to Telegram directly
      const fd = new FormData()
      fd.append('chat_id', info.channelId)
      fd.append('caption', info.caption)
      fd.append('video', file)
      const tgRes = await fetch(`https://api.telegram.org/bot${info.botToken}/sendVideo`, { method: 'POST', body: fd })
      const tgData = await tgRes.json()
      if (tgData.ok && tgData.result?.video) {
        const fileId = tgData.result.video.file_id
        // Get direct URL (note: file links expire, but for demo we use file_id)
        setVideoUrl(`tg://${fileId}`)
        toast.success('تم رفع الفيديو إلى تيليجرام')
      } else if (tgData.ok && tgData.result?.document) {
        setVideoUrl(`tg://${tgData.result.document.file_id}`)
        toast.success('تم رفع الملف إلى تيليجرام')
      } else {
        toast.error('فشل رفع الفيديو')
      }
    } catch (e: any) {
      toast.error('خطأ في الرفع')
    } finally {
      setUploadingVideo(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'تعديل الدرس' : 'درس جديد'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>عنوان الدرس *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مقدمة في الإنعاش القلبي" className="mt-1" />
          </div>

          <div>
            <Label>نوع الدرس</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {LESSON_TYPES.map((t) => {
                const Icon = t.icon
                const active = lessonType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setLessonType(t.value as any)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      active ? `${t.color} border-current` : 'border-border bg-muted/30 hover:border-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {lessonType === 'video' && (
            <div className="space-y-3">
              <div>
                <Label>رفع فيديو (عبر تيليجرام بوت)</Label>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="video-upload"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f) }}
                />
                <Button
                  variant="outline"
                  className="w-full mt-1"
                  disabled={uploadingVideo}
                  onClick={() => document.getElementById('video-upload')?.click()}
                >
                  {uploadingVideo ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Video className="w-4 h-4 ml-1" />}
                  {uploadingVideo ? 'جاري الرفع إلى تيليجرام...' : 'اختر فيديو'}
                </Button>
              </div>
              <div>
                <Label>أو أدخل رابط الفيديو مباشرة</Label>
                <Input value={videoUrl.startsWith('tg://') ? '' : videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." dir="ltr" className="mt-1" />
                {videoUrl.startsWith('tg://') && (
                  <div className="mt-2 text-xs text-green-600 flex items-center gap-2">
                    <Video className="w-3 h-3" /> تم رفع الفيديو عبر تيليجرام
                    <button onClick={() => setVideoUrl('')} className="text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {lessonType === 'pdf' && (
            <div className="space-y-3">
              <div>
                <Label>رفع ملف PDF</Label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="pdf-upload"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f) }}
                />
                <Button
                  variant="outline"
                  className="w-full mt-1"
                  disabled={savingPdf}
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                >
                  {savingPdf ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <FileUp className="w-4 h-4 ml-1" />}
                  {savingPdf ? 'جاري الرفع...' : 'اختر PDF'}
                </Button>
              </div>
              {pdfUrl && (
                <div className="text-xs text-green-600 flex items-center gap-2">
                  <FileUp className="w-3 h-3" /> {pdfUrl.split('/').pop()}
                  <button onClick={() => setPdfUrl('')} className="text-red-500"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          )}

          {lessonType === 'text' && (
            <div>
              <Label>محتوى الدرس النصي</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="اكتب محتوى الدرس هنا..." className="mt-1" />
            </div>
          )}

          {lessonType === 'exam' && (
            <ExamBuilder value={content} onChange={setContent} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>المدة (دقيقة)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} dir="ltr" className="mt-1" />
            </div>
            <div>
              <Label>الترتيب</Label>
              <Input type="number" value={position} onChange={(e) => setPosition(parseInt(e.target.value) || 0)} dir="ltr" className="mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="preview"
              checked={isPreview}
              onChange={(e) => setIsPreview(e.target.checked)}
              className="w-4 h-4 accent-gold"
            />
            <Label htmlFor="preview" className="cursor-pointer">درس معاينة مجانية (يمكن للزوار مشاهدته دون تسجيل)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            className="bg-navy hover:bg-navy-light"
            onClick={() => {
              if (!title) { toast.error('أدخل العنوان'); return }
              const data: any = {
                title,
                lesson_type: lessonType,
                content: content || null,
                video_url: videoUrl || null,
                pdf_url: pdfUrl || null,
                duration_minutes: duration,
                position,
                is_preview: isPreview,
              }
              onSave(data)
            }}
          >
            <Save className="w-4 h-4 ml-1" /> حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============== Visual Exam Builder (no JSON editing) ==============
function ExamBuilder({ value, onChange }: { value?: string | null; onChange: (v: string) => void }) {
  const [questions, setQuestions] = useState<any[]>(() => {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const updateJson = (qs: any[]) => {
    setQuestions(qs)
    onChange(JSON.stringify(qs))
  }

  const addQuestion = () => {
    updateJson([...questions, { q: '', options: ['', '', '', ''], answer: 0 }])
  }

  const updateQuestion = (i: number, field: string, val: any) => {
    const qs = [...questions]
    qs[i] = { ...qs[i], [field]: val }
    updateJson(qs)
  }

  const removeQuestion = (i: number) => {
    updateJson(questions.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          <HelpCircle className="w-4 h-4 text-purple-600" /> أسئلة الاختبار
        </Label>
        <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
          <Plus className="w-3.5 h-3.5 ml-1" /> سؤال جديد
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8 bg-purple-500/5 border border-purple-500/30 rounded-lg">
          <HelpCircle className="w-10 h-10 text-purple-600/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">لا توجد أسئلة بعد</p>
          <p className="text-xs text-muted-foreground mt-1">اضغط "سؤال جديد" لإضافة أول سؤال</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto fia-scroll pr-1">
          {questions.map((q, qi) => (
            <Card key={qi} className="p-3 border-purple-500/20">
              <div className="flex items-start gap-2 mb-2">
                <Badge variant="outline" className="text-xs bg-purple-500/5 border-purple-500/30 text-purple-600 flex-shrink-0">
                  سؤال {qi + 1}
                </Badge>
                <Input
                  value={q.q || ''}
                  onChange={(e) => updateQuestion(qi, 'q', e.target.value)}
                  placeholder="اكتب السؤال هنا..."
                  className="flex-1 text-sm"
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => removeQuestion(qi)} className="flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">الإجابات (اضغط الدائرة لتحديد الإجابة الصحيحة):</div>
                {(q.options || []).map((opt: string, oi: number) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, 'answer', oi)}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        q.answer === oi ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40 hover:border-purple-400'
                      }`}
                      title="تحديد كإجابة صحيحة"
                    >
                      {q.answer === oi && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...(q.options || [])]
                        newOptions[oi] = e.target.value
                        updateQuestion(qi, 'options', newOptions)
                      }}
                      placeholder={`الخيار ${oi + 1}`}
                      className={`text-sm flex-1 ${q.answer === oi ? 'border-green-500/40 bg-green-500/5' : ''}`}
                      dir="rtl"
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
