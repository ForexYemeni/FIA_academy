'use client'

// ============================================================================
// ADMIN CERTIFICATES — Royal v3 redesign (FIA Royal design language)
// NEW: "إصدار شهادة" — issue a certificate manually with:
//   student picker (searchable), course picker (lux dropdown), issue date,
//   issuing body, external accreditation toggle.
// Data logic & APIs unchanged: /api/certificates, /api/certificate-requests
// ============================================================================
import React, { useEffect, useState } from 'react'
import {
  Award, FileText, Eye, Edit, Trash2, RefreshCw, XCircle, CheckCircle2,
  X, Search, Download, Loader2, Plus, Calendar, User, BookOpen, Landmark,
  BadgeCheck, ShieldCheck, Sparkles, Clock, Ban, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/fia/confirm-dialog'
import { CertificateViewer } from '@/components/fia/certificate-viewer'
import { supabasePublic } from '@/lib/supabase'
import {
  LuxSection, LuxStats, LuxSearch, LuxSelect, LuxCombo, LuxEmpty, LuxBadge,
  LuxField, LuxDialog, LuxSaveBar, LuxRow, luxInput,
} from './luxury'

const AdminCertificatesRoyal = React.memo(function AdminCertificatesRoyal() {
  const [items, setItems] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [previewCert, setPreviewCert] = useState<any | null>(null)
  const [tab, setTab] = useState<'issued' | 'requests'>('issued')

  // Confirm-dialog states for the three certificate actions
  const [certDeleteTarget, setCertDeleteTarget] = useState<any | null>(null)
  const [certDeleting, setCertDeleting] = useState(false)
  const [certRestoreTarget, setCertRestoreTarget] = useState<any | null>(null)
  const [certRestoring, setCertRestoring] = useState(false)
  const [reissueTarget, setReissueTarget] = useState<any | null>(null)
  const [reissuing, setReissuing] = useState<string | null>(null)

  const load = () => {
    fetch('/api/certificates').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []))
    fetch('/api/certificate-requests').then((r) => r.json()).then((d) => setRequests(Array.isArray(d) ? d : []))
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []))
    fetch('/api/students?role=student').then((r) => r.json()).then((d) => setStudents(Array.isArray(d) ? d : []))
    fetch('/api/enrollments').then((r) => r.json()).then((d) => setEnrollments(Array.isArray(d) ? d : []))
  }
  useEffect(() => { load() }, [])

  // ⚡ REAL-TIME: certificates — admin sees new certificates INSTANTLY
  useEffect(() => {
    let channel: any
    try {
      channel = supabasePublic
        .channel('admin-cert-list-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'certificates' },
          (payload: any) => setItems((prev) => [payload.new, ...prev]))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'certificates' },
          (payload: any) => setItems((prev) => prev.map((c) => c.id === payload.new.id ? { ...c, ...payload.new } : c)))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'certificates' },
          (payload: any) => setItems((prev) => prev.filter((c) => c.id !== payload.old.id)))
        .subscribe()
    } catch {}
    return () => { try { supabasePublic.removeChannel(channel) } catch {} }
  }, [])

  const filtered = items.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return (c.certificate_number || '').toLowerCase().includes(q) || (c.student_name || '').toLowerCase().includes(q) || (c.course_title || '').toLowerCase().includes(q)
    }
    return true
  })

  const del = async () => {
    if (!certDeleteTarget) return
    setCertDeleting(true)
    try {
      await fetch('/api/certificates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: certDeleteTarget.id }) })
      toast.success('تم الحذف')
      setCertDeleteTarget(null)
      load()
    } finally {
      setCertDeleting(false)
    }
  }
  const revoke = async () => { if (!revokeTarget || !revokeReason.trim()) { toast.error('أدخل سبب الإلغاء'); return }; await fetch('/api/certificates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: revokeTarget.id, status: 'ملغاة' }) }); toast.success('تم إلغاء الشهادة'); setRevokeTarget(null); setRevokeReason(''); load() }
  const restore = async () => {
    if (!certRestoreTarget) return
    setCertRestoring(true)
    try {
      await fetch('/api/certificates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: certRestoreTarget.id, status: 'صالحة' }) })
      toast.success('تمت الاستعادة')
      setCertRestoreTarget(null)
      load()
    } finally {
      setCertRestoring(false)
    }
  }

  // Reissue: regenerate the same certificate with a new number & new issued_at
  const reissue = async () => {
    if (!reissueTarget) return
    setReissuing(reissueTarget.id)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reissue', id: reissueTarget.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('تم إعادة الإصدار بنجاح!', {
          description: `الرقم الجديد: ${data.new_certificate.certificate_number}`,
        })
        setReissueTarget(null)
        load()
        window.open(`/api/certificate-pdf?number=${encodeURIComponent(data.new_certificate.certificate_number)}&format=pdf`, '_blank')
      } else {
        toast.error(data.error || 'فشل في إعادة الإصدار')
      }
    } catch (e: any) {
      toast.error('خطأ في الشبكة')
    } finally {
      setReissuing(null)
    }
  }

  // Certificate request actions
  const handleRequestAction = async (reqId: string, action: string, note?: string) => {
    try {
      const res = await fetch('/api/certificate-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reqId, action, note }),
      })
      if (res.ok) {
        toast.success(action === 'issue' ? 'تم إصدار الشهادة بنجاح!' : action === 'reject' ? 'تم رفض الطلب' : 'تم التحديث')
        load()
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } catch { toast.error('خطأ') }
  }

  const isCourseCompleted = (userId: string, courseId: string) => {
    return enrollments.some((e) => e.user_id === userId && e.course_id === courseId && (e.status === 'completed' || e.status === 'مكتمل'))
  }

  const requestStatusBadge = (status: string) => {
    const map: any = {
      pending: { label: 'بانتظار موافقة المدرب', color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30', tone: 'amber' },
      trainer_approved: { label: 'بانتظار موافقة المدير', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', tone: 'blue' },
      admin_approved: { label: 'بانتظار دفع الرسوم', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30', tone: 'purple' },
      issued: { label: 'تم الإصدار', color: 'bg-green-500/15 text-green-600 border-green-500/30', tone: 'green' },
      rejected: { label: 'مرفوض', color: 'bg-red-500/15 text-red-600 border-red-500/30', tone: 'red' },
    }
    return map[status] || map.pending
  }

  // Stats
  const validCount = items.filter((c) => c.status === 'صالحة').length
  const cancelledCount = items.filter((c) => c.status === 'ملغاة').length
  const pendingReqs = requests.filter((r) => r.status === 'pending' || r.status === 'trainer_approved').length

  return (
    <LuxSection
      title="الشهادات"
      subtitle="إدارة وإصدار شهادات الأكاديمية المعتمدة"
      icon={Award}
      themeKey="certificates"
      count={tab === 'issued' ? filtered.length : requests.length}
      stats={
        <LuxStats
          items={[
            { icon: Award, label: 'شهادات صالحة', value: validCount, grad: 'from-emerald-500 to-teal-600' },
            { icon: FileText, label: 'طلبات جديدة', value: pendingReqs, grad: 'from-amber-500 to-orange-600' },
            { icon: XCircle, label: 'شهادات ملغاة', value: cancelledCount, grad: 'from-rose-500 to-red-600' },
            { icon: BadgeCheck, label: 'إجمالي الشهادات', value: items.length, grad: 'from-navy to-navy-light' },
          ]}
        />
      }
      actions={
        <>
          {tab === 'requests' && (requests.filter((r) => r.status === 'pending' || r.status === 'trainer_approved').length > 0) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-l from-rose-500/20 to-amber-500/20 border border-rose-500/40 text-rose-200 text-xs font-extrabold">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              {requests.filter((r) => r.status === 'pending' || r.status === 'trainer_approved').length} طلب بانتظار المعالجة
            </span>
          )}
          <Button
            className="relative bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-lg active:scale-[0.97] transition-all font-extrabold overflow-hidden"
            onClick={() => setIssueOpen(true)}
          >
            <span className="absolute inset-0 lux-shimmer" />
            <Plus className="w-4 h-4 ml-1 relative" /> إصدار شهادة
          </Button>
        </>
      }
      toolbar={
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* Royal tabs */}
          <div className="flex gap-2 p-1 rounded-2xl bg-gradient-to-b from-navy/[0.04] to-transparent border border-gold/15 w-fit">
            <button
              onClick={() => setTab('issued')}
              className={`relative px-5 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'issued'
                  ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border border-gold/40'
                  : 'text-navy hover:bg-gold/5 border border-transparent'
              }`}
            >
              <Award className="w-4 h-4" /> الشهادات الصادرة
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/20 border border-gold/30 tabular-nums">{items.length}</span>
            </button>
            <button
              onClick={() => setTab('requests')}
              className={`relative px-5 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'requests'
                  ? 'bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-md border border-gold/40'
                  : 'text-navy hover:bg-gold/5 border border-transparent'
              }`}
            >
              <FileText className="w-4 h-4" /> طلبات الشهادات
              {pendingReqs > 0 && (
                <span className="bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5 shadow-sm tabular-nums">{pendingReqs}</span>
              )}
            </button>
          </div>
          {/* Filters (issued tab only) */}
          {tab === 'issued' && (
            <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
              <LuxSearch value={search} onChange={setSearch} placeholder="بحث برقم الشهادة أو اسم المتدرب أو الدورة..." className="flex-1" />
              <LuxSelect value={statusFilter === 'all' ? '' : statusFilter} onChange={(v) => setStatusFilter(v || 'all')} placeholder="كل الحالات" className="sm:w-44"
                options={[
                  { value: 'صالحة', label: 'صالحة', emoji: '✅' },
                  { value: 'ملغاة', label: 'ملغاة', emoji: '⛔' },
                  { value: 'مستبدلة', label: 'مستبدلة', emoji: '🔁' },
                ]} />
            </div>
          )}
        </div>
      }
    >
      {tab === 'issued' ? (
        filtered.length === 0 ? (
          <LuxEmpty
            icon={Award}
            themeKey="certificates"
            title={search || statusFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد شهادات صادرة'}
            hint={search || statusFilter !== 'all' ? 'جرّب تعديل البحث أو الفلاتر' : 'أصدر أول شهادة يدوياً بالضغط على زر "إصدار شهادة" — أو ستظهر هنا عند إصدارها من الطلبات'}
            action={items.length === 0 ? (
              <Button className="bg-gradient-to-l from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy rounded-xl shadow-md font-bold" onClick={() => setIssueOpen(true)}>
                <Plus className="w-4 h-4 ml-1" /> إصدار أول شهادة
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 fia-stagger">
            {filtered.map((c) => {
              const isValid = c.status === 'صالحة'
              const isCancelled = c.status === 'ملغاة'
              const isReplaced = c.status === 'مستبدلة'
              const theme = isValid
                ? { gradient: 'from-emerald-600 via-teal-700 to-emerald-700', border: 'border-emerald-400/40', glow: 'fia-status-glow' }
                : isCancelled
                  ? { gradient: 'from-rose-600 via-red-700 to-rose-700', border: 'border-rose-400/40', glow: '' }
                  : { gradient: 'from-blue-600 via-indigo-700 to-blue-700', border: 'border-blue-400/40', glow: '' }
              return (
                <Card key={c.id} className={`fia-card-hover p-0 overflow-hidden border ${theme.border}`}>
                  {/* Magical header */}
                  <div className={`relative bg-gradient-to-br ${theme.gradient} p-4 text-white overflow-hidden`}>
                    <div className="absolute inset-0 opacity-[0.18]" style={{
                      backgroundImage: 'radial-gradient(circle at 20% 25%, white 1px, transparent 1px)',
                      backgroundSize: '13px 13px',
                    }} />
                    <div className="absolute -top-5 -left-5 w-16 h-16 bg-white/15 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <Badge className={`${theme.glow} bg-white/15 text-white border border-white/30 backdrop-blur-sm text-[10px]`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-300 animate-pulse' : isCancelled ? 'bg-rose-300' : 'bg-blue-300'} ml-1`} />
                          {c.status}
                        </Badge>
                      </div>
                      <div className="font-mono text-[10px] font-bold text-white/90 break-all" dir="ltr">{c.certificate_number}</div>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-3.5 space-y-2">
                    <div>
                      <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><User className="w-2.5 h-2.5 text-gold/70" /> المتدرب</div>
                      <div className="font-extrabold text-navy text-xs line-clamp-1">{c.student_name}</div>
                    </div>
                    <div className="pt-1.5 border-t border-gold/15">
                      <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><BookOpen className="w-2.5 h-2.5 text-gold/70" /> الدورة</div>
                      <div className="text-[11px] text-navy line-clamp-2 leading-tight font-medium">{c.course_title || '-'}</div>
                    </div>
                    <LuxRow icon={Calendar}>صدرت في {c.issued_at ? new Date(c.issued_at).toLocaleDateString('ar-EG') : '-'}</LuxRow>
                    {/* Actions */}
                    <div className="flex gap-1 pt-1.5 border-t border-gold/15">
                      <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-navy/5" onClick={() => setPreviewCert(c)} title="معاينة">
                        <Eye className="w-3 h-3 ml-0.5 text-navy" />
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-blue-500/10" onClick={() => setReissueTarget(c)} disabled={!!reissuing} title="إعادة إصدار">
                        {reissuing === c.id ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <RefreshCw className="w-3 h-3 text-blue-600" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-navy/5" onClick={() => { setEditing(c); setEditOpen(true) }} title="تعديل">
                        <Edit className="w-3 h-3 text-navy" />
                      </Button>
                      {isValid ? (
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-rose-500/10" onClick={() => setRevokeTarget(c)} title="إلغاء">
                          <XCircle className="w-3 h-3 text-rose-500" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-emerald-500/10" onClick={() => setCertRestoreTarget(c)} title="استعادة">
                          <RotateCcw className="w-3 h-3 text-emerald-600" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] rounded-lg hover:bg-rose-500/10" onClick={() => setCertDeleteTarget(c)} title="حذف">
                        <Trash2 className="w-3 h-3 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        /* ⚡ Royal Certificate requests tab */
        <div className="space-y-3">
          {requests.length === 0 ? (
            <LuxEmpty
              icon={FileText}
              themeKey="certificates"
              title="لا توجد طلبات شهادات"
              hint="ستظهر طلبات الشهادات هنا عند تقديمها من قبل المتدربين"
            />
          ) : (
            requests.map((r) => {
              const badge = requestStatusBadge(r.status)
              const completed = isCourseCompleted(r.user_id, r.course_id)
              return (
                <Card key={r.id} className="fia-card-hover p-4 border border-gold/25 hover:border-gold/45 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-300 to-gold opacity-70" />
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <LuxBadge tone={badge.tone}>{badge.label}</LuxBadge>
                    {completed && <LuxBadge tone="green"><CheckCircle2 className="w-3 h-3" /> الدورة مكتملة</LuxBadge>}
                    {!completed && r.status === 'pending' && <LuxBadge tone="red"><Clock className="w-3 h-3" /> الدورة غير مكتملة</LuxBadge>}
                  </div>
                  <div className="font-extrabold text-navy text-sm mb-1">{r.student_name}</div>
                  <div className="text-xs text-muted-foreground mb-1">{r.course_title || '-'}</div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    {r.amount > 0 && <span className="text-gold font-bold">رسوم: {r.amount.toLocaleString()} {r.currency}</span>}
                    {r.created_at && <span dir="ltr">طلب في: {new Date(r.created_at).toLocaleDateString('ar-EG')}</span>}
                  </div>
                  {r.trainer_note && <div className="text-[11px] text-blue-600 mt-1.5 bg-blue-500/5 border border-blue-500/20 rounded-lg px-2.5 py-1.5">📝 ملاحظة المدرب: {r.trainer_note}</div>}
                  {r.admin_note && <div className="text-[11px] text-purple-600 mt-1.5 bg-purple-500/5 border border-purple-500/20 rounded-lg px-2.5 py-1.5">📝 ملاحظة المدير: {r.admin_note}</div>}
                  {r.cert_number && <div className="text-[11px] font-mono text-emerald-600 mt-1.5" dir="ltr">رقم الشهادة: {r.cert_number}</div>}
                  {r.verify_code && <div className="text-[11px] font-mono text-emerald-600" dir="ltr">رمز التحقق: {r.verify_code}</div>}

                  {/* Action buttons based on status */}
                  <div className="flex gap-2 mt-3 pt-2.5 border-t border-gold/15 flex-wrap">
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs rounded-lg shadow-md active:scale-[0.97] transition-all" disabled={!completed} onClick={() => handleRequestAction(r.id, 'trainer_approve', 'تم التأكد من إكمال الدورة')}>
                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> موافقة المدرب
                        </Button>
                        <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs rounded-lg" onClick={() => handleRequestAction(r.id, 'reject', 'لم تكتمل الدورة')}>
                          <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
                        </Button>
                      </>
                    )}
                    {r.status === 'trainer_approved' && (
                      <Button size="sm" className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-gold text-xs rounded-lg shadow-md active:scale-[0.97] transition-all" onClick={() => handleRequestAction(r.id, 'admin_approve', 'تمت الموافقة على الطلب')}>
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> موافقة المدير
                      </Button>
                    )}
                    {r.status === 'admin_approved' && (
                      <Button size="sm" className="bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy text-xs rounded-lg shadow-md active:scale-[0.97] transition-all" onClick={() => handleRequestAction(r.id, 'issue')}>
                        <Award className="w-3.5 h-3.5 ml-1" /> إصدار الشهادة
                      </Button>
                    )}
                    {r.status === 'issued' && r.cert_number && (
                      <a href={`/api/certificate-pdf?number=${encodeURIComponent(r.cert_number)}&format=pdf`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-gold/30 text-navy hover:bg-gold/10 text-xs rounded-lg">
                          <Download className="w-3.5 h-3.5 ml-1" /> تحميل الشهادة
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* === NEW: Royal issue-certificate dialog === */}
      {issueOpen && (
        <IssueCertificateDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          students={students}
          courses={courses}
          enrollments={enrollments}
          onSaved={load}
        />
      )}

      {/* Edit dialog (royal, minimal — same fields as before) */}
      {editOpen && (
        <EditCertificateDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          initial={editing}
          onSaved={load}
        />
      )}

      {revokeTarget && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) { setRevokeTarget(null); setRevokeReason('') } }}>
          <DialogContent className="sm:max-w-md p-0 border-0">
            {/* Royal header */}
            <div className="relative bg-gradient-to-br from-rose-600 to-red-700 p-5 text-white overflow-hidden rounded-t-xl">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, white 1.5px, transparent 1.5px)',
                backgroundSize: '22px 22px',
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <XCircle className="w-5 h-5" /> إلغاء الشهادة
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="space-y-3 p-5">
              <div className="bg-rose-50 border border-rose-500/30 p-3 rounded-xl">
                <div className="font-bold text-rose-700">{revokeTarget.student_name}</div>
                <div className="text-xs text-rose-600 font-mono" dir="ltr">{revokeTarget.certificate_number}</div>
                <div className="text-xs text-rose-600 mt-1">{revokeTarget.course_title}</div>
              </div>
              <div><Label className="text-navy font-bold">سبب الإلغاء *</Label><Textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} placeholder="مثال: خطأ في بيانات المتدرب..." className="mt-1 rounded-xl border-gold/30 focus:border-gold focus:ring-gold/25" /></div>
            </div>
            <div className="flex justify-end gap-2 p-4 bg-muted/20 border-t border-gold/15">
              <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeReason('') }} className="rounded-xl">إلغاء</Button>
              <Button onClick={revoke} className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl shadow-md active:scale-[0.97] transition-all">تأكيد الإلغاء</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {previewCert && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setPreviewCert(null) }}>
          <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto lux-scrollbar p-0 border-0">
            {/* Royal header */}
            <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy p-5 text-white overflow-hidden rounded-t-xl">
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 88% 20%, white 1px, transparent 1px)',
                backgroundSize: '22px 22px, 17px 17px',
              }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />
              <button onClick={() => setPreviewCert(null)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center z-10 backdrop-blur-sm transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                    <Award className="w-5 h-5 text-navy" />
                  </div>
                  معاينة الشهادة — <span className="font-mono text-gold" dir="ltr">{previewCert.certificate_number}</span>
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="p-5">
              <CertificateViewer certificate={previewCert} onClose={() => setPreviewCert(null)} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Permanent-delete confirm */}
      <ConfirmDialog
        open={!!certDeleteTarget}
        onOpenChange={(o) => { if (!o && !certDeleting) setCertDeleteTarget(null) }}
        title="تأكيد الحذف النهائي"
        message="هل أنت متأكد من الحذف النهائي؟"
        itemLabel="سيتم حذف الشهادة التالية:"
        itemName={certDeleteTarget ? `${certDeleteTarget.student_name} — ${certDeleteTarget.certificate_number}` : undefined}
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={del}
        loading={certDeleting}
      />

      {/* Restore certificate confirm */}
      <ConfirmDialog
        open={!!certRestoreTarget}
        onOpenChange={(o) => { if (!o && !certRestoring) setCertRestoreTarget(null) }}
        title="تأكيد استعادة الشهادة"
        message={'سيتم تغيير حالة الشهادة إلى "صالحة". هل أنت متأكد؟'}
        itemLabel="سيتم استعادة الشهادة التالية:"
        itemName={certRestoreTarget ? `${certRestoreTarget.student_name} — ${certRestoreTarget.certificate_number}` : undefined}
        confirmLabel="استعادة"
        cancelLabel="إلغاء"
        variant="info"
        onConfirm={restore}
        loading={certRestoring}
      />

      {/* Reissue certificate confirm */}
      <ConfirmDialog
        open={!!reissueTarget}
        onOpenChange={(o) => { if (!o && !reissuing) setReissueTarget(null) }}
        title="إعادة إصدار الشهادة"
        message={'سيتم:\n- تمييز الشهادة الحالية كـ "مستبدلة"\n- إصدار شهادة جديدة برقم جديد وتاريخ جديد\n- بقاء بيانات المتدرب والتسجيل كما هي'}
        itemLabel="الشهادة الحالية:"
        itemName={reissueTarget ? `${reissueTarget.student_name} | ${reissueTarget.course_title || '-'} | ${reissueTarget.certificate_number}` : undefined}
        confirmLabel="إعادة الإصدار"
        cancelLabel="إلغاء"
        variant="info"
        onConfirm={reissue}
        loading={!!reissuing}
      />
    </LuxSection>
  )
})

// ============================================================================
// ISSUE CERTIFICATE DIALOG — royal wizard-style manual issuance
// ============================================================================
function IssueCertificateDialog({ open, onOpenChange, students, courses, enrollments, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  students: any[]
  courses: any[]
  enrollments: any[]
  onSaved: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [issuedBy, setIssuedBy] = useState('أكاديمية المستقبل الدولية')
  const [hasAccreditation, setHasAccreditation] = useState(false)
  const [accreditationBody, setAccreditationBody] = useState('')
  const [saving, setSaving] = useState(false)

  const student = students.find((s) => s.id === studentId)
  const course = courses.find((c) => c.id === courseId)
  const isEnrolled = studentId && courseId && enrollments.some((e) => e.user_id === studentId && e.course_id === courseId)
  const enrollmentCompleted = studentId && courseId && enrollments.some((e) => e.user_id === studentId && e.course_id === courseId && (e.status === 'completed' || e.status === 'مكتمل'))

  const save = async () => {
    if (!student) { toast.error('اختر المتدرب أولاً'); return }
    if (!course) { toast.error('اختر الدورة أولاً'); return }
    if (!issueDate) { toast.error('حدد تاريخ الإصدار'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: student.name,
          student_id: student.id,
          course_title: course.title,
          course_id: course.id,
          issued_by: issuedBy || 'أكاديمية المستقبل الدولية',
          status: 'صالحة',
          issued_at: new Date(issueDate + 'T12:00:00').toISOString(),
          has_external_accreditation: hasAccreditation,
          external_accreditation_body: hasAccreditation ? (accreditationBody || null) : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم إصدار الشهادة بنجاح!', { description: `رقم الشهادة: ${data.certificate_number}` })
        onSaved()
        onOpenChange(false)
        // Reset
        setStudentId(''); setCourseId(''); setHasAccreditation(false); setAccreditationBody('')
        setIssueDate(new Date().toISOString().slice(0, 10))
        // Offer PDF preview
        window.open(`/api/certificate-pdf?number=${encodeURIComponent(data.certificate_number)}&format=pdf`, '_blank')
      } else {
        toast.error(data.error || 'فشل الإصدار')
      }
    } catch {
      toast.error('خطأ في الشبكة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title="إصدار شهادة جديدة"
      subtitle="اختر المتدرب والدورة وتاريخ الإصدار بدقة"
      icon={Award}
      gradient="from-[#0d1526] via-navy to-[#233158]"
      maxWidth="sm:max-w-2xl"
      footer={
        <LuxSaveBar
          onCancel={() => onOpenChange(false)}
          onSave={save}
          saving={saving}
          saveLabel="إصدار الشهادة"
          icon={BadgeCheck}
          gradient="from-gold to-amber-500"
          text="text-navy"
        />
      }
    >
      {/* ── Step 1: المتدرب ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center text-[11px] font-extrabold text-navy shadow-sm">1</div>
        <span className="text-xs font-extrabold text-navy">اختيار المتدرب</span>
        <div className="flex-1 h-px bg-gradient-to-l from-gold/30 to-transparent" />
      </div>
      <LuxCombo
        value={studentId}
        onChange={setStudentId}
        placeholder="— اختر المتدرب —"
        searchPlaceholder="ابحث بالاسم أو البريد أو الهاتف..."
        options={students.map((s) => ({
          value: s.id,
          label: s.name || 'بدون اسم',
          hint: s.email,
          meta: s.phone || undefined,
          emoji: (s.name || '؟').charAt(0),
        }))}
      />

      {/* ── Step 2: الدورة ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-2 mt-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center text-[11px] font-extrabold text-navy shadow-sm">2</div>
        <span className="text-xs font-extrabold text-navy">اختيار الدورة</span>
        <div className="flex-1 h-px bg-gradient-to-l from-gold/30 to-transparent" />
      </div>
      <LuxCombo
        value={courseId}
        onChange={setCourseId}
        placeholder="— اختر الدورة —"
        searchPlaceholder="ابحث بعنوان الدورة..."
        options={courses.map((c) => ({
          value: c.id,
          label: c.title,
          hint: c.price_type === 'مجانية' || c.price === 0 ? 'مجانية' : `${c.price?.toLocaleString()} ${c.currency || 'ر.ي'}`,
          meta: c.modules_count ? `${c.modules_count} وحدة` : undefined,
          emoji: '📘',
        }))}
      />

      {/* Enrollment status hint */}
      {studentId && courseId && (
        <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 border text-xs font-bold ${
          enrollmentCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
          : isEnrolled ? 'bg-blue-500/10 border-blue-500/30 text-blue-700'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
        }`}>
          {enrollmentCompleted ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : isEnrolled ? <Clock className="w-4 h-4 flex-shrink-0" />
            : <ShieldCheck className="w-4 h-4 flex-shrink-0" />}
          {enrollmentCompleted ? 'المتدرب مكتمل هذه الدورة — جاهز للإصدار'
            : isEnrolled ? 'المتدرب مسجل في الدورة لكنها غير مكتملة بعد'
            : 'المتدرب غير مسجل في هذه الدورة — يمكن الإصدار كشهادة خارجية'}
        </div>
      )}

      {/* ── Step 3: تفاصيل الإصدار ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-2 mt-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center text-[11px] font-extrabold text-navy shadow-sm">3</div>
        <span className="text-xs font-extrabold text-navy">تفاصيل الإصدار</span>
        <div className="flex-1 h-px bg-gradient-to-l from-gold/30 to-transparent" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LuxField label="تاريخ الإصدار" icon={Calendar} required>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-gold/30 bg-white text-sm text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 shadow-sm transition-all"
            dir="ltr"
          />
        </LuxField>
        <LuxField label="جهة الإصدار" icon={Landmark}>
          <Input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} className={luxInput} placeholder="أكاديمية المستقبل الدولية" />
        </LuxField>
      </div>

      {/* External accreditation */}
      <div className="rounded-xl border border-gold/25 bg-gradient-to-l from-gold/[0.06] to-transparent p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center border border-gold/30">
              <ShieldCheck className="w-4 h-4 text-gold" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-navy">اعتماد خارجي</div>
              <div className="text-[10px] text-muted-foreground">إضافة جهة اعتماد دولية للشهادة</div>
            </div>
          </div>
          <Switch checked={hasAccreditation} onCheckedChange={setHasAccreditation} />
        </div>
        {hasAccreditation && (
          <div className="mt-3 lux-pop">
            <LuxField label="اسم جهة الاعتماد" icon={Landmark} required>
              <Input value={accreditationBody} onChange={(e) => setAccreditationBody(e.target.value)} className={luxInput} placeholder="مثال: المجلس الدولي للطب الطبيعي" />
            </LuxField>
          </div>
        )}
      </div>

      {/* ── Live summary card ─────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-gold/30 shadow-sm">
        <div className="relative bg-gradient-to-l from-[#061024] via-navy to-navy-light px-4 py-3">
          <div className="absolute inset-0 opacity-[0.15]" style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, #D4AF37 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }} />
          <div className="relative flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-xs font-extrabold text-white">معاينة بيانات الشهادة</span>
          </div>
        </div>
        <div className="p-4 bg-white grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[9px] text-muted-foreground mb-0.5">المتدرب</div>
            <div className="font-extrabold text-navy truncate">{student?.name || '—'}</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground mb-0.5">الدورة</div>
            <div className="font-bold text-navy truncate">{course?.title || '—'}</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground mb-0.5">تاريخ الإصدار</div>
            <div className="font-bold text-navy">{issueDate ? new Date(issueDate).toLocaleDateString('ar-EG') : '—'}</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground mb-0.5">جهة الإصدار</div>
            <div className="font-bold text-navy truncate">{issuedBy || '—'}</div>
          </div>
          {hasAccreditation && (
            <div className="col-span-2">
              <div className="text-[9px] text-muted-foreground mb-0.5">الاعتماد الخارجي</div>
              <div className="font-bold text-navy truncate">{accreditationBody || '—'}</div>
            </div>
          )}
          <div className="col-span-2 flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-gold/15">
            <Sparkles className="w-3 h-3 text-gold" />
            سيتم توليد رقم الشهادة تلقائياً بصيغة FIA-2026-XXXXX وفتح معاينة PDF بعد الإصدار
          </div>
        </div>
      </div>
    </LuxDialog>
  )
}

// ============================================================================
// EDIT CERTIFICATE DIALOG — royal edit with same fields as SimpleDialog had
// ============================================================================
function EditCertificateDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: any
  onSaved: () => void
}) {
  const [form, setForm] = useState<any>(initial || {})
  const [saving, setSaving] = useState(false)
  useEffect(() => { setForm(initial || {}) }, [initial])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/certificates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: initial.id, ...form }),
      })
      if (res.ok) {
        toast.success('تم تحديث الشهادة')
        onSaved(); onOpenChange(false)
      } else {
        const d = await res.json(); toast.error(d.error || 'فشل')
      }
    } finally { setSaving(false) }
  }

  return (
    <LuxDialog
      open={open}
      onOpenChange={onOpenChange}
      title="تعديل بيانات الشهادة"
      subtitle={initial?.certificate_number}
      icon={Edit}
      gradient="from-[#0d1526] via-navy to-[#233158]"
      maxWidth="sm:max-w-lg"
      footer={
        <LuxSaveBar
          onCancel={() => onOpenChange(false)}
          onSave={save}
          saving={saving}
          saveLabel="حفظ التعديلات"
          icon={CheckCircle2}
          gradient="from-gold to-amber-500"
          text="text-navy"
        />
      }
    >
      <LuxField label="اسم المتدرب" icon={User} required>
        <Input value={form.student_name || ''} onChange={(e) => setForm({ ...form, student_name: e.target.value })} className={luxInput} />
      </LuxField>
      <LuxField label="عنوان الدورة" icon={BookOpen} required>
        <Input value={form.course_title || ''} onChange={(e) => setForm({ ...form, course_title: e.target.value })} className={luxInput} />
      </LuxField>
      <div className="grid grid-cols-2 gap-3">
        <LuxField label="الحالة" icon={ShieldCheck}>
          <LuxSelect
            value={form.status || ''}
            onChange={(v) => setForm({ ...form, status: v })}
            placeholder="— اختر —"
            options={[
              { value: 'صالحة', label: 'صالحة', emoji: '✅' },
              { value: 'ملغاة', label: 'ملغاة', emoji: '⛔' },
              { value: 'مستبدلة', label: 'مستبدلة', emoji: '🔁' },
            ]}
          />
        </LuxField>
        <LuxField label="جهة الإصدار" icon={Landmark}>
          <Input value={form.issued_by || ''} onChange={(e) => setForm({ ...form, issued_by: e.target.value })} className={luxInput} />
        </LuxField>
      </div>
      <LuxField label="جهة الاعتماد الخارجية" icon={ShieldCheck} hint="اختياري">
        <Input value={form.external_accreditation_body || ''} onChange={(e) => setForm({ ...form, external_accreditation_body: e.target.value })} className={luxInput} />
      </LuxField>
    </LuxDialog>
  )
}

export { AdminCertificatesRoyal }
