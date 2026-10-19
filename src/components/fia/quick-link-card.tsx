'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Shield, Award, Users, FileText, RefreshCw, LifeBuoy, Eye, Target, Heart, Mail,
  BookOpen, GraduationCap, UserCog, Crown, ChevronLeft, X, Star, Briefcase, Phone, Linkedin,
  Building2, ExternalLink, CheckCircle2, Loader2, Send, Sparkles, Clock, Tag, Share2,
} from 'lucide-react'

// ⚡ Professional card metadata: gradient + accent for each card type.
// These are used in the dialog header to give each card a distinctive
// look. The gradients are pure CSS (no images) so they render instantly.
const CARD_STYLES: Record<string, { gradient: string; bg: string; accent: string }> = {
  courses:  { gradient: 'from-blue-600 to-indigo-700',    bg: 'from-blue-50 to-indigo-50',    accent: 'text-blue-600' },
  trainers: { gradient: 'from-emerald-600 to-teal-700',   bg: 'from-emerald-50 to-teal-50',  accent: 'text-emerald-600' },
  team:     { gradient: 'from-amber-600 to-orange-700',    bg: 'from-amber-50 to-orange-50',  accent: 'text-amber-600' },
  about:    { gradient: 'from-purple-600 to-fuchsia-700', bg: 'from-purple-50 to-fuchsia-50', accent: 'text-purple-600' },
  privacy:  { gradient: 'from-slate-600 to-gray-700',     bg: 'from-slate-50 to-gray-50',   accent: 'text-slate-600' },
  terms:    { gradient: 'from-sky-600 to-blue-700',       bg: 'from-sky-50 to-blue-50',     accent: 'text-sky-600' },
  refund:   { gradient: 'from-rose-600 to-pink-700',      bg: 'from-rose-50 to-pink-50',    accent: 'text-rose-600' },
  support:  { gradient: 'from-cyan-600 to-blue-700',      bg: 'from-cyan-50 to-blue-50',    accent: 'text-cyan-600' },
  social:   { gradient: 'from-violet-600 to-purple-700',  bg: 'from-violet-50 to-purple-50', accent: 'text-violet-600' },
  partners: { gradient: 'from-teal-600 to-emerald-700',   bg: 'from-teal-50 to-emerald-50', accent: 'text-teal-600' },
  licenses: { gradient: 'from-indigo-600 to-blue-700',    bg: 'from-indigo-50 to-blue-50',   accent: 'text-indigo-600' },
}

export function QuickLinkCard({ cardId, onClose, settings }: { cardId: string | null; onClose: () => void; settings: any }) {
  const [courses, setCourses] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [licenses, setLicenses] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null)

  useEffect(() => {
    if (cardId === 'courses') fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    if (cardId === 'trainers') {
      fetch('/api/trainers').then((r) => r.json()).then((d) => setTrainers(Array.isArray(d) ? d : [])).catch(() => {})
      fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    }
    if (cardId === 'team') fetch('/api/team').then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {})
    if (cardId === 'partners') fetch('/api/partners').then((r) => r.json()).then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {})
    if (cardId === 'licenses') fetch('/api/licenses').then((r) => r.json()).then((d) => setLicenses(Array.isArray(d) ? d : [])).catch(() => {})
  }, [cardId])

  // Reset selection when card changes
  useEffect(() => { setSelectedMember(null); setSelectedTrainer(null) }, [cardId])

  if (!cardId) return null

  const meta: Record<string, { title: string; icon: any }> = {
    courses: { title: 'دوراتنا', icon: BookOpen },
    trainers: { title: 'مدربونا', icon: GraduationCap },
    team: { title: 'المؤسس والفريق', icon: UserCog },
    about: { title: 'من نحن', icon: Award },
    privacy: { title: 'سياسة الخصوصية', icon: Shield },
    terms: { title: 'شروط الاستخدام', icon: FileText },
    refund: { title: 'سياسة الاسترداد', icon: RefreshCw },
    support: { title: 'الدعم والمساعدة', icon: LifeBuoy },
    social: { title: 'تابعنا', icon: Users },
    partners: { title: 'شركاؤنا', icon: Building2 },
    licenses: { title: 'التراخيص والاعتمادات', icon: Shield },
  }

  const m = meta[cardId]
  if (!m) return null
  const Icon = m.icon

  // Parse qualifications/achievements from string to array
  const parseList = (str: string | null | undefined): string[] => {
    if (!str) return []
    try { const arr = JSON.parse(str); return Array.isArray(arr) ? arr : [] } catch { return str.split('\n').filter((s: string) => s.trim()) }
  }

  const getContent = () => {
    // === COURSES — professional cards with cover images + gradient overlays ===
    if (cardId === 'courses') {
      if (courses.length === 0) return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
            <BookOpen className="w-8 h-8 text-blue-300" />
          </div>
          <p className="text-sm text-gray-500">لا توجد دورات متاحة حالياً</p>
        </div>
      )
      return (
        <div className="space-y-3">
          {courses.map((c) => {
            const isFree = c.price_type === 'مجانية' || c.price === 0
            return (
              <div key={c.id} className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200/60 hover:border-blue-500/40 hover:shadow-lg transition-all">
                {/* Cover image with gradient overlay */}
                {c.cover ? (
                  <div className="relative h-24 overflow-hidden">
                    <img src={c.cover} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1F44]/80 via-[#0A1F44]/20 to-transparent" />
                    {/* Price badge on cover */}
                    <div className="absolute top-2 left-2">
                      {isFree ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-white bg-green-500 px-2.5 py-1 rounded-full font-bold shadow-md">
                          <Tag className="w-2.5 h-2.5" /> مجانية
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#0A1F44] bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 rounded-full font-bold shadow-md">
                          <Tag className="w-2.5 h-2.5" /> {c.price?.toLocaleString()} {c.currency || 'ر.ي'}
                        </span>
                      )}
                    </div>
                    {/* Title on cover */}
                    <h4 className="absolute bottom-2 right-2 left-2 text-white font-bold text-sm leading-tight line-clamp-1">{c.title}</h4>
                  </div>
                ) : (
                  /* No cover — header with gradient + icon */
                  <div className="relative h-20 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <BookOpen className="w-10 h-10 text-white/30" />
                    <div className="absolute top-2 left-2">
                      {isFree ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-white bg-green-500 px-2.5 py-1 rounded-full font-bold shadow-md">
                          <Tag className="w-2.5 h-2.5" /> مجانية
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#0A1F44] bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 rounded-full font-bold shadow-md">
                          <Tag className="w-2.5 h-2.5" /> {c.price?.toLocaleString()} {c.currency || 'ر.ي'}
                        </span>
                      )}
                    </div>
                    <h4 className="absolute bottom-2 right-2 left-2 text-white font-bold text-sm leading-tight line-clamp-1">{c.title}</h4>
                  </div>
                )}
                {/* Body — description + badges */}
                <div className="p-3">
                  {c.short_description && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">{c.short_description}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.duration_hours > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" /> {c.duration_hours} ساعة
                      </span>
                    )}
                    {c.level && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Award className="w-2.5 h-2.5" /> {c.level}
                      </span>
                    )}
                    {c.category && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        <BookOpen className="w-2.5 h-2.5" /> {c.category}
                      </span>
                    )}
                    {c.enrolled > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Users className="w-2.5 h-2.5" /> {c.enrolled} متدرب
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // === TRAINERS (clickable → show achievements + courses) ===
    if (cardId === 'trainers') {
      if (selectedTrainer) {
        // === DETAIL VIEW for selected trainer ===
        const trainerCourses = courses.filter((c) => c.trainer_id === selectedTrainer.id)
        const achievements = parseList(selectedTrainer.achievements)
        const qualifications = parseList(selectedTrainer.qualifications)

        return (
          <div className="space-y-3">
            {/* Back button — professional pill button */}
            <button onClick={() => setSelectedTrainer(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-all">
              <ChevronLeft className="w-4 h-4" /> رجوع للقائمة
            </button>

            {/* Trainer hero header — emerald gradient with avatar */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-lg">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative flex items-center gap-4">
                {selectedTrainer.avatar ? (
                  <img src={selectedTrainer.avatar} alt={selectedTrainer.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-2xl">{selectedTrainer.name?.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-base leading-tight">{selectedTrainer.name}</h4>
                  {selectedTrainer.title && <p className="text-white/80 text-xs mt-1">{selectedTrainer.title}</p>}
                  {selectedTrainer.specialization && (
                    <span className="inline-block mt-1.5 text-[10px] bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                      {selectedTrainer.specialization}
                    </span>
                  )}
                  {selectedTrainer.years_experience > 0 && (
                    <p className="text-white/60 text-[10px] mt-1.5 flex items-center gap-1">
                      <Briefcase className="w-2.5 h-2.5" /> {selectedTrainer.years_experience} سنوات خبرة
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bio — professional card with left border accent */}
            {selectedTrainer.bio && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60 border-r-4 border-r-emerald-500/40">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1.5 flex items-center gap-1.5">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full" /> النبذة المهنية
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedTrainer.bio}</p>
              </div>
            )}

            {/* Qualifications — professional badges */}
            {qualifications.length > 0 && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> المؤهلات العلمية
                </h5>
                <div className="space-y-1.5">
                  {qualifications.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-50/50 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-700 leading-relaxed">{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements — professional list */}
            {achievements.length > 0 && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> الإنجازات المهنية
                </h5>
                <div className="space-y-1.5">
                  {achievements.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-emerald-50/50 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                      <span className="text-xs text-gray-700 leading-relaxed">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courses — professional cards */}
            {trainerCourses.length > 0 && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" /> الدورات ({trainerCourses.length})
                </h5>
                <div className="space-y-1.5">
                  {trainerCourses.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs text-gray-700 font-medium">{c.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      // === LIST VIEW for trainers ===
      if (trainers.length === 0) return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
            <GraduationCap className="w-8 h-8 text-emerald-300" />
          </div>
          <p className="text-sm text-gray-500">لا يوجد مدربون حالياً</p>
        </div>
      )
      return (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 mb-3 text-[10px] text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>اضغط على أي مدرب لعرض الإنجازات والدورات</span>
          </div>
          {trainers.map((t) => (
            <button key={t.id} onClick={() => setSelectedTrainer(t)}
              className="group w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200/60 hover:border-emerald-500/40 hover:shadow-md transition-all text-right">
              {t.avatar ? (
                <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white font-bold text-sm">{t.name?.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 text-right min-w-0">
                <h4 className="font-bold text-[#0A1F44] text-sm">{t.name}</h4>
                {t.title && <p className="text-xs text-gray-500 mt-0.5">{t.title}</p>}
                {t.specialization && (
                  <span className="inline-block text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                    {t.specialization}
                  </span>
                )}
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      )
    }

    // === TEAM (founder first with crown badge, clickable → details) ===
    if (cardId === 'team') {
      if (selectedMember) {
        // === DETAIL VIEW for selected member ===
        const qualifications = parseList(selectedMember.qualifications)
        const achievements = parseList(selectedMember.achievements)
        const isFounder = selectedMember.role === 'founder'

        return (
          <div className="space-y-3">
            {/* Back button */}
            <button onClick={() => setSelectedMember(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-all">
              <ChevronLeft className="w-4 h-4" /> رجوع للقائمة
            </button>

            {/* Member hero header — gold gradient for founder, navy for others */}
            <div className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ${isFounder ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600' : 'bg-gradient-to-br from-[#0A1F44] to-[#102a63]'}`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {selectedMember.avatar ? (
                    <img src={selectedMember.avatar} alt={selectedMember.name} className={`w-20 h-20 rounded-2xl object-cover border-2 ${isFounder ? 'border-white/50' : 'border-white/30'} shadow-md`} />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center`}>
                      <span className="text-white font-bold text-2xl">{selectedMember.name?.charAt(0)}</span>
                    </div>
                  )}
                  {isFounder && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                      <Crown className="w-5 h-5 text-amber-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white text-base">{selectedMember.name}</h4>
                    {isFounder && <span className="text-[10px] bg-[#0A1F44] text-amber-400 px-2 py-0.5 rounded-full font-bold">المؤسس</span>}
                    {selectedMember.role === 'leader' && <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">قيادي</span>}
                  </div>
                  {selectedMember.title && <p className={`text-xs mt-1 ${isFounder ? 'text-[#0A1F44]/80' : 'text-white/80'}`}>{selectedMember.title}</p>}
                  {selectedMember.specialization && (
                    <span className="inline-block mt-1.5 text-[10px] bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                      {selectedMember.specialization}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {selectedMember.bio && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60 border-r-4 border-r-amber-500/40">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1.5 flex items-center gap-1.5">
                  <span className="w-1 h-4 bg-amber-500 rounded-full" /> النبذة المهنية
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedMember.bio}</p>
              </div>
            )}

            {/* Vision — special for founder/leaders */}
            {selectedMember.vision && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60 border-r-4 border-r-purple-500/40">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-500" /> الرؤية
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedMember.vision}</p>
              </div>
            )}

            {/* Mission */}
            {selectedMember.mission && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60 border-r-4 border-r-blue-500/40">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-500" /> الرسالة
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedMember.mission}</p>
              </div>
            )}

            {/* Qualifications */}
            {qualifications.length > 0 && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> المؤهلات
                </h5>
                <div className="space-y-1.5">
                  {qualifications.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-50/50 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-700 leading-relaxed">{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="p-3.5 bg-white rounded-xl border border-gray-200/60">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> الإنجازات
                </h5>
                <div className="space-y-1.5">
                  {achievements.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-emerald-50/50 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                      <span className="text-xs text-gray-700 leading-relaxed">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact — professional buttons */}
            {(selectedMember.email || selectedMember.linkedin || selectedMember.phone) && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {selectedMember.email && (
                  <a href={`mailto:${selectedMember.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#0A1F44] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-all">
                    <Mail className="w-3.5 h-3.5" /> بريد
                  </a>
                )}
                {selectedMember.linkedin && (
                  <a href={selectedMember.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all">
                    <Linkedin className="w-3.5 h-3.5" /> لينكدإن
                  </a>
                )}
                {selectedMember.phone && (
                  <a href={`tel:${selectedMember.phone}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition-all">
                    <Phone className="w-3.5 h-3.5" /> هاتف
                  </a>
                )}
              </div>
            )}
          </div>
        )
      }

      // === LIST VIEW for team — founder first with crown ===
      if (team.length === 0) return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
            <Users className="w-8 h-8 text-amber-300" />
          </div>
          <p className="text-sm text-gray-500">لا يوجد أعضاء فريق حالياً</p>
        </div>
      )

      // Sort: founder first, then leaders, then team
      const sorted = [...team].sort((a, b) => {
        const order = { founder: 0, leader: 1, team: 2 }
        return (order[a.role as keyof typeof order] || 3) - (order[b.role as keyof typeof order] || 3)
      })

      return (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 mb-3 text-[10px] text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>اضغط على أي عضو لعرض التفاصيل</span>
          </div>
          {sorted.map((member) => {
            const isFounder = member.role === 'founder'
            const isLeader = member.role === 'leader'
            return (
              <button key={member.id} onClick={() => setSelectedMember(member)}
                className={`group w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right relative ${
                  isFounder
                    ? 'bg-gradient-to-l from-amber-50 to-yellow-50 border border-amber-200/60 hover:border-amber-400/50 hover:shadow-md'
                    : 'bg-white border border-gray-200/60 hover:border-amber-500/30 hover:shadow-md'
                }`}>
                <div className="relative flex-shrink-0">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className={`w-12 h-12 rounded-xl object-cover shadow-sm ${isFounder ? 'border-2 border-amber-400' : ''}`} />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isFounder ? 'bg-gradient-to-br from-amber-500 to-yellow-600' : 'bg-gradient-to-br from-[#0A1F44] to-[#102a63]'}`}>
                      <span className={`font-bold text-sm ${isFounder ? 'text-white' : 'text-[#C9A961]'}`}>{member.name?.charAt(0)}</span>
                    </div>
                  )}
                  {isFounder && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    {isFounder && <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">★ المؤسس</span>}
                    {isLeader && <span className="text-[9px] bg-blue-500/15 text-blue-600 px-2 py-0.5 rounded-full font-bold flex-shrink-0">قيادي</span>}
                    <h4 className="font-bold text-[#0A1F44] text-sm">{member.name}</h4>
                  </div>
                  {member.title && <p className="text-xs text-gray-500 mt-0.5">{member.title}</p>}
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-amber-500 group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )
    }

    // === ABOUT ===
    if (cardId === 'about') {
      const aboutItems = [
        { icon: Eye, title: 'رؤيتنا', text: settings.about_vision || 'لم تتم إضافة رؤيتنا بعد.', gradient: 'from-purple-500 to-fuchsia-600', bg: 'bg-purple-50/50', accent: 'text-purple-600' },
        { icon: Target, title: 'رسالتنا', text: settings.about_mission || 'لم تتم إضافة رسالتنا بعد.', gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50/50', accent: 'text-blue-600' },
        { icon: Heart, title: 'قيمنا', text: settings.about_values || 'لم تتم إضافة قيمنا بعد.', gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-50/50', accent: 'text-rose-600' },
        { icon: Users, title: 'فريقنا', text: settings.about_team || 'لم تتم إضافة فريقنا بعد.', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50/50', accent: 'text-amber-600' },
      ]
      return (
        <div className="space-y-3">
          {aboutItems.map((item, i) => {
            const ItemIcon = item.icon
            return (
              <div key={i} className="group p-3.5 bg-white rounded-xl border border-gray-200/60 hover:border-purple-500/30 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                    <ItemIcon className="w-5 h-5 text-white" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm mb-1.5 ${item.accent}`}>{item.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // === PARTNERS — professional cards mirroring admin's design ===
    if (cardId === 'partners') {
      // Respect the admin's visibility toggle — if disabled, show a clear message
      if (settings.show_partners !== true) {
        return (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">قسم الشركاء غير مُفعّل من الإدارة حالياً</p>
          </div>
        )
      }
      // Only show 'نشط' partners on the public site
      const active = partners.filter((p) => p.status === 'نشط')
      if (active.length === 0) {
        return (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">لا يوجد شركاء بعد. سيتم عرض الشركاء هنا فور إضافتهم من حساب الإدارة.</p>
          </div>
        )
      }
      return (
        <div className="space-y-3">
          {active.map((p) => (
            <div key={p.id} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-l from-[#0A1F44] to-[#102a63] text-white">
              <div className="w-14 h-14 rounded-2xl bg-[#C9A961]/20 flex items-center justify-center text-3xl flex-shrink-0">
                {p.logo || '🤝'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-white text-sm">{p.name}</h4>
                  <span className="inline-flex items-center gap-1 text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" /> شراكة فعّالة
                  </span>
                </div>
                {p.description && <p className="text-white/60 text-xs leading-relaxed">{p.description}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {p.since && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 text-[#C9A961] border border-[#C9A961]/30 px-2 py-0.5 rounded-full">
                      ★ شريك منذ {p.since}
                    </span>
                  )}
                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-[#C9A961] hover:text-white transition-colors"
                      dir="ltr"
                    >
                      <ExternalLink className="w-3 h-3" /> زيارة الموقع
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // === LICENSES — professional cards mirroring admin's design ===
    if (cardId === 'licenses') {
      if (settings.show_licenses !== true) {
        return (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">قسم التراخيص غير مُفعّل من الإدارة حالياً</p>
          </div>
        )
      }
      // Only show 'ساري' licenses on the public site
      const active = licenses.filter((l) => l.status === 'ساري')
      if (active.length === 0) {
        return (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">لا توجد تراخيص بعد. سيتم عرض التراخيص هنا فور إضافتها من حساب الإدارة.</p>
          </div>
        )
      }
      return (
        <div className="space-y-3">
          {active.map((l) => (
            <div key={l.id} className="p-4 rounded-xl bg-gray-50 border-2 border-[#C9A961]/20">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#C9A961]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#0A1F44] text-sm leading-tight">{l.issuing_body}</h4>
                    {l.type && <p className="text-[#C9A961] text-xs font-semibold mt-0.5">{l.type}</p>}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[9px] bg-green-500/15 text-green-700 border border-green-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" /> ساري
                </span>
              </div>

              {l.number && (
                <div className="flex items-center justify-between bg-white rounded-lg p-2 mb-2 border border-gray-100">
                  <span className="text-[10px] text-gray-500">رقم الترخيص</span>
                  <span className="font-mono text-[#0A1F44] font-bold text-xs" dir="ltr">{l.number}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500 pt-2 border-t border-gray-100">
                {l.issued_at && (
                  <span>إصدار: <span dir="ltr" className="font-medium text-[#0A1F44]">{l.issued_at}</span></span>
                )}
                {l.expires_at && (
                  <span>ينتهي: <span dir="ltr" className="font-medium text-[#0A1F44]">{l.expires_at}</span></span>
                )}
              </div>

              {l.verification_url && (
                <a
                  href={l.verification_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#0A1F44] hover:bg-[#102a63] text-[#C9A961] px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  تحقق من صحة الترخيص
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )
    }

    // === SOCIAL ===
    if (cardId === 'social') {
      const socials = [
        { key: 'facebook', name: 'فيسبوك', enabled: settings.social_facebook_enabled, url: settings.social_facebook, color: '#1877F2', bg: 'from-blue-500 to-blue-700',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
        { key: 'telegram', name: 'تيليجرام', enabled: settings.social_telegram_enabled, url: settings.social_telegram, color: '#0088cc', bg: 'from-cyan-400 to-blue-500',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg> },
        { key: 'whatsapp', name: 'واتساب', enabled: settings.social_whatsapp_enabled, url: settings.social_whatsapp, color: '#25D366', bg: 'from-green-400 to-green-600',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297.149-1.255.362-1.255.362l-.02.02c-.297-.149-1.255-.362-1.255-.362-.49.139-.614.471-.021.789.595.316 1.123.767 1.437 1.387.314.62.349 1.392.07 2.068-.279.676-.84 1.215-1.55 1.508-.71.293-1.523.335-2.282.124-.76-.211-1.443-.67-1.962-1.295-.52-.625-.852-1.392-.955-2.21-.103-.818.021-1.646.356-2.388.335-.742.873-1.375 1.547-1.817.674-.442 1.465-.672 2.27-.66.805.012 1.602.264 2.27.715.674.442 1.215 1.083 1.547 1.817.335.742.459 1.571.356 2.388-.103.818-.435 1.585-.955 2.21-.52.625-1.202 1.084-1.962 1.295-.76.211-1.573.169-2.282-.124-.71-.293-1.271-.832-1.55-1.508-.279-.676-.244-1.448.07-2.068.314-.62.842-1.071 1.437-1.387.593-.318 1.459-.127 1.95-.421z M12.02 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12.02 0zm.01 21.82c-5.42 0-9.82-4.4-9.82-9.82S6.6 2.18 12.02 2.18s9.82 4.4 9.82 9.82-4.4 9.82-9.82 9.82z"/></svg> },
        { key: 'sms', name: 'رسائل نصية', enabled: settings.social_sms_enabled, url: settings.social_sms, color: '#34A853', bg: 'from-emerald-400 to-green-600',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-5c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zm-6 0c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1z"/></svg> },
      ]
      const activeSocials = socials.filter((s) => s.enabled && s.url)
      if (activeSocials.length === 0) return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
            <Share2 className="w-8 h-8 text-violet-300" />
          </div>
          <p className="text-sm text-gray-500">لم تتم إضافة روابط التواصل بعد.</p>
        </div>
      )
      return (
        <div className="grid grid-cols-2 gap-3">
          {activeSocials.map((s) => {
            const href = s.key === 'telegram' ? (s.url.startsWith('http') ? s.url : `https://t.me/${s.url.replace('@', '')}`)
              : s.key === 'whatsapp' ? (s.url.startsWith('http') ? s.url : `https://wa.me/${s.url.replace(/[^0-9]/g, '')}`)
              : s.key === 'sms' ? `sms:${s.url}` : s.url
            return (
              <a key={s.key} href={href} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-gray-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.bg} flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  {s.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-[#0A1F44] transition-colors">{s.name}</span>
              </a>
            )
          })}
        </div>
      )
    }

    // === SUPPORT — with contact form that sends to admin inbox ===
    if (cardId === 'support') {
      return <SupportContactForm settings={settings} />
    }

    // === POLICIES — professional layout with icon + styled content ===
    const fieldMap: Record<string, string> = { privacy: 'policy_privacy', terms: 'policy_terms', refund: 'policy_refund' }
    const content = settings[fieldMap[cardId]] || 'هذا المحتوى قيد التحضير. سيتم تحديثه قريباً.'
    const policyIcons: Record<string, { icon: any; color: string }> = {
      privacy: { icon: Shield, color: 'text-slate-600' },
      terms:   { icon: FileText, color: 'text-sky-600' },
      refund:  { icon: RefreshCw, color: 'text-rose-600' },
    }
    const PolicyIcon = policyIcons[cardId]?.icon || FileText
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-gray-200/60">
          <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0`}>
            <PolicyIcon className={`w-5 h-5 ${policyIcons[cardId]?.color || 'text-gray-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      </div>
    )
  }

  // Get the professional style for this card
  const style = CARD_STYLES[cardId] || CARD_STYLES.about

  return (
    <Dialog open={!!cardId} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0">
        {/* ⚡ Professional gradient header — gives each card a distinctive
            look. The gradient is pure CSS (no images) so it renders
            instantly without affecting Realtime performance. */}
        <div className={`relative bg-gradient-to-br ${style.gradient} p-5 pb-4 rounded-t-xl overflow-hidden`}>
          {/* Decorative pattern overlay (subtle, doesn't affect performance) */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Icon + Title */}
          <div className="relative flex items-center gap-3 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/20">
              <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">{m.title}</DialogTitle>
              <p className="text-white/70 text-xs mt-0.5">أكاديمية المستقبل الدولية</p>
            </div>
          </div>
        </div>
        {/* Content body with subtle gradient background */}
        <div className={`bg-gradient-to-b ${style.bg} p-5`}>
          {getContent()}
          {['privacy', 'terms', 'refund'].includes(cardId) && settings.email && (
            <div className="mt-4 pt-4 border-t border-gray-200/60 text-center">
              <p className="text-xs text-gray-500 mb-2">لأي استفسار بخصوص {m.title}</p>
              <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#C9A961]/30 text-sm font-medium text-[#0A1F44] hover:bg-[#C9A961]/5 hover:border-[#C9A961]/50 transition-all shadow-sm">
                <Mail className="w-4 h-4 text-[#C9A961]" /> راسلنا
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Support contact form — sends a message to the admin's inbox
function SupportContactForm({ settings }: { settings: any }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!form.name || !form.email || !form.message) return
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h4 className="font-bold text-[#0A1F44] text-base mb-1">تم إرسال رسالتك بنجاح!</h4>
        <p className="text-xs text-gray-500 mb-4">سنرد عليك في أقرب وقت ممكن عبر بريدك الإلكتروني</p>
        <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-4 py-2 rounded-full transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> إرسال رسالة أخرى
        </button>
      </div>
    )
  }

  const supportText = settings.policy_support || 'فريق الدعم لدينا متاح لمساعدتك في أي وقت. أرسل لنا رسالتك وسنرد عليك في أقرب وقت ممكن.'

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 p-3 bg-cyan-50/50 rounded-xl border border-cyan-200/40">
        <LifeBuoy className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">{supportText}</p>
      </div>
      {/* Form fields */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-[10px] font-bold text-[#0A1F44] mb-1.5 block">الاسم *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 text-sm bg-white border border-gray-200/60 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all" placeholder="اسمك الكامل" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#0A1F44] mb-1.5 block">البريد *</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-10 px-3 text-sm bg-white border border-gray-200/60 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all" placeholder="email@example.com" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-[#0A1F44] mb-1.5 block">الموضوع</label>
        <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full h-10 px-3 text-sm bg-white border border-gray-200/60 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all" placeholder="موضوع الرسالة" />
      </div>
      <div>
        <label className="text-[10px] font-bold text-[#0A1F44] mb-1.5 block">الرسالة *</label>
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="w-full p-3 text-sm bg-white border border-gray-200/60 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none transition-all" placeholder="اكتب رسالتك هنا..." />
      </div>
      <button onClick={submit} disabled={sending || !form.name || !form.email || !form.message} className="w-full h-11 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? 'جاري الإرسال...' : 'إرسال الرسالة'}
      </button>
    </div>
  )
}
