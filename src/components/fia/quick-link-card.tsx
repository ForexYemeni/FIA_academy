'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Shield, Award, Users, FileText, RefreshCw, LifeBuoy, Eye, Target, Heart, Mail,
  BookOpen, GraduationCap, UserCog, Crown, ChevronLeft, X, Star, Briefcase, Phone, Linkedin,
  Building2, ExternalLink, CheckCircle2,
} from 'lucide-react'

export function QuickLinkCard({ cardId, onClose, settings }: { cardId: string | null; onClose: () => void; settings: any }) {
  const [courses, setCourses] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [licenses, setLicenses] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null)

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
    // === COURSES ===
    if (cardId === 'courses') {
      if (courses.length === 0) return <p className="text-sm text-gray-500 text-center py-8">لا توجد دورات متاحة حالياً</p>
      return (
        <div className="space-y-3">
          {courses.map((c) => (
            <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#C9A961]" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-[#0A1F44] text-sm">{c.title}</h4>
                {c.short_description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.short_description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {c.duration_hours && <span className="text-[10px] text-gray-400">{c.duration_hours} ساعة</span>}
                  {c.level && <span className="text-[10px] text-gray-400">{c.level}</span>}
                  {c.price_type === 'free' || c.price === 0 ? (
                    <span className="text-[10px] text-green-600 font-semibold">مجانية</span>
                  ) : (
                    <span className="text-[10px] text-[#C9A961] font-semibold">{c.price?.toLocaleString()} {c.currency || 'ر.ي'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
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
          <div className="space-y-4">
            {/* Back button */}
            <button onClick={() => setSelectedTrainer(null)} className="flex items-center gap-1 text-xs text-[#C9A961] hover:text-[#0A1F44] mb-2">
              <ChevronLeft className="w-4 h-4 rotate-180" /> رجوع للقائمة
            </button>

            {/* Trainer header */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-l from-[#0A1F44] to-[#102a63] rounded-xl text-white">
              {selectedTrainer.avatar ? (
                <img src={selectedTrainer.avatar} alt={selectedTrainer.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A961] flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-[#C9A961] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A961] font-bold text-xl">{selectedTrainer.name?.charAt(0)}</span>
                </div>
              )}
              <div>
                <h4 className="font-bold text-white text-base">{selectedTrainer.name}</h4>
                {selectedTrainer.title && <p className="text-[#C9A961] text-xs">{selectedTrainer.title}</p>}
                {selectedTrainer.specialization && <p className="text-white/60 text-[10px] mt-0.5">{selectedTrainer.specialization}</p>}
                {selectedTrainer.years_experience > 0 && <p className="text-white/40 text-[10px] mt-0.5">{selectedTrainer.years_experience} سنوات خبرة</p>}
              </div>
            </div>

            {/* Bio */}
            {selectedTrainer.bio && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1">النبذة المهنية</h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedTrainer.bio}</p>
              </div>
            )}

            {/* Qualifications */}
            {qualifications.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2 flex items-center gap-1"><Star className="w-3 h-3 text-[#C9A961]" /> المؤهلات</h5>
                <ul className="space-y-1">
                  {qualifications.map((q, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-[#C9A961] mt-0.5">•</span> {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2 flex items-center gap-1"><Briefcase className="w-3 h-3 text-[#C9A961]" /> الإنجازات</h5>
                <ul className="space-y-1">
                  {achievements.map((a, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-[#C9A961] mt-0.5">•</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Courses */}
            {trainerCourses.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2 flex items-center gap-1"><BookOpen className="w-3 h-3 text-[#C9A961]" /> الدورات ({trainerCourses.length})</h5>
                <div className="space-y-1.5">
                  {trainerCourses.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs text-gray-600 p-1.5 bg-white rounded-lg">
                      <BookOpen className="w-3 h-3 text-[#C9A961] flex-shrink-0" /> {c.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No contact info shown — privacy: no email/phone/linkedin for trainers */}
          </div>
        )
      }

      // === LIST VIEW for trainers ===
      if (trainers.length === 0) return <p className="text-sm text-gray-500 text-center py-8">لا يوجد مدربون حالياً</p>
      return (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 mb-2 text-center">اضغط على أي مدرب لعرض الإنجازات والدورات</p>
          {trainers.map((t) => (
            <button key={t.id} onClick={() => setSelectedTrainer(t)}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all text-right">
              {t.avatar ? (
                <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#0A1F44] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A961] font-bold text-sm">{t.name?.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 text-right">
                <h4 className="font-bold text-[#0A1F44] text-sm">{t.name}</h4>
                {t.title && <p className="text-xs text-gray-500">{t.title}</p>}
                {t.specialization && <p className="text-[10px] text-gray-400 mt-0.5">{t.specialization}</p>}
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-300 flex-shrink-0" />
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

        return (
          <div className="space-y-4">
            <button onClick={() => setSelectedMember(null)} className="flex items-center gap-1 text-xs text-[#C9A961] hover:text-[#0A1F44] mb-2">
              <ChevronLeft className="w-4 h-4 rotate-180" /> رجوع للقائمة
            </button>

            {/* Member header — special styling for founder */}
            <div className={`flex items-center gap-3 p-4 rounded-xl text-white ${selectedMember.role === 'founder' ? 'bg-gradient-to-l from-[#C9A961] via-[#D4AF37] to-[#C9A961]' : 'bg-gradient-to-l from-[#0A1F44] to-[#102a63]'}`}>
              <div className="relative">
                {selectedMember.avatar ? (
                  <img src={selectedMember.avatar} alt={selectedMember.name} className={`w-16 h-16 rounded-full object-cover flex-shrink-0 ${selectedMember.role === 'founder' ? 'border-2 border-white' : 'border-2 border-[#C9A961]'}`} />
                ) : (
                  <div className={`w-16 h-16 rounded-full ${selectedMember.role === 'founder' ? 'bg-white/20' : 'bg-white/10'} flex items-center justify-center flex-shrink-0`}>
                    <span className={`font-bold text-xl ${selectedMember.role === 'founder' ? 'text-[#0A1F44]' : 'text-[#C9A961]'}`}>{selectedMember.name?.charAt(0)}</span>
                  </div>
                )}
                {selectedMember.role === 'founder' && (
                  <div className="absolute -top-1 -right-1 text-xl">👑</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base">{selectedMember.name}</h4>
                  {selectedMember.role === 'founder' && <span className="text-[10px] bg-[#0A1F44] text-[#C9A961] px-2 py-0.5 rounded-full font-bold">المؤسس</span>}
                  {selectedMember.role === 'leader' && <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">قيادي</span>}
                </div>
                {selectedMember.title && <p className={`text-xs ${selectedMember.role === 'founder' ? 'text-[#0A1F44]/80' : 'text-[#C9A961]'}`}>{selectedMember.title}</p>}
                {selectedMember.specialization && <p className="text-white/60 text-[10px] mt-0.5">{selectedMember.specialization}</p>}
              </div>
            </div>

            {/* Bio */}
            {selectedMember.bio && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1">النبذة المهنية</h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedMember.bio}</p>
              </div>
            )}

            {/* Vision */}
            {selectedMember.vision && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1 flex items-center gap-1"><Eye className="w-3 h-3 text-[#C9A961]" /> الرؤية</h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedMember.vision}</p>
              </div>
            )}

            {/* Mission */}
            {selectedMember.mission && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-1 flex items-center gap-1"><Target className="w-3 h-3 text-[#C9A961]" /> الرسالة</h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedMember.mission}</p>
              </div>
            )}

            {/* Qualifications */}
            {qualifications.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2 flex items-center gap-1"><Star className="w-3 h-3 text-[#C9A961]" /> المؤهلات</h5>
                <ul className="space-y-1">
                  {qualifications.map((q, i) => (<li key={i} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-[#C9A961] mt-0.5">•</span> {q}</li>))}
                </ul>
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <h5 className="text-xs font-bold text-[#0A1F44] mb-2 flex items-center gap-1"><Briefcase className="w-3 h-3 text-[#C9A961]" /> الإنجازات</h5>
                <ul className="space-y-1">
                  {achievements.map((a, i) => (<li key={i} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-[#C9A961] mt-0.5">•</span> {a}</li>))}
                </ul>
              </div>
            )}

            {/* Contact */}
            {(selectedMember.email || selectedMember.linkedin) && (
              <div className="flex items-center gap-3 pt-2">
                {selectedMember.email && <a href={`mailto:${selectedMember.email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0A1F44]"><Mail className="w-3 h-3" /> بريد</a>}
                {selectedMember.linkedin && <a href={selectedMember.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0A1F44]"><Linkedin className="w-3 h-3" /> لينكدإن</a>}
                {selectedMember.phone && <a href={`tel:${selectedMember.phone}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0A1F44]"><Phone className="w-3 h-3" /> هاتف</a>}
              </div>
            )}
          </div>
        )
      }

      // === LIST VIEW for team — founder first with crown ===
      if (team.length === 0) return <p className="text-sm text-gray-500 text-center py-8">لا يوجد أعضاء فريق حالياً</p>

      // Sort: founder first, then leaders, then team
      const sorted = [...team].sort((a, b) => {
        const order = { founder: 0, leader: 1, team: 2 }
        return (order[a.role as keyof typeof order] || 3) - (order[b.role as keyof typeof order] || 3)
      })

      return (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 mb-2 text-center">اضغط على أي عضو لعرض التفاصيل</p>
          {sorted.map((member) => (
            <button key={member.id} onClick={() => setSelectedMember(member)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right relative ${
                member.role === 'founder'
                  ? 'bg-gradient-to-l from-[#C9A961]/10 to-[#F5E5B3]/10 border border-[#C9A961]/30 hover:border-[#C9A961]/50'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}>
              <div className="relative flex-shrink-0">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className={`w-12 h-12 rounded-full object-cover ${member.role === 'founder' ? 'border-2 border-[#C9A961]' : ''}`} />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${member.role === 'founder' ? 'bg-[#C9A961]' : 'bg-[#0A1F44]'}`}>
                    <span className={`font-bold text-sm ${member.role === 'founder' ? 'text-[#0A1F44]' : 'text-[#C9A961]'}`}>{member.name?.charAt(0)}</span>
                  </div>
                )}
                {member.role === 'founder' && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C9A961] rounded-full flex items-center justify-center text-[10px]">👑</div>
                )}
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  {member.role === 'founder' && <span className="text-[9px] bg-[#C9A961] text-[#0A1F44] px-2 py-0.5 rounded-full font-bold flex-shrink-0">★ المؤسس</span>}
                  {member.role === 'leader' && <span className="text-[9px] bg-blue-500/15 text-blue-600 px-2 py-0.5 rounded-full font-bold flex-shrink-0">قيادي</span>}
                  <h4 className="font-bold text-[#0A1F44] text-sm">{member.name}</h4>
                </div>
                {member.title && <p className="text-xs text-gray-500 mt-0.5">{member.title}</p>}
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )
    }

    // === ABOUT ===
    if (cardId === 'about') {
      return (
        <div className="space-y-3">
          {[
            { icon: Eye, title: 'رؤيتنا', text: settings.about_vision || 'لم تتم إضافة رؤيتنا بعد.' },
            { icon: Target, title: 'رسالتنا', text: settings.about_mission || 'لم تتم إضافة رسالتنا بعد.' },
            { icon: Heart, title: 'قيمنا', text: settings.about_values || 'لم تتم إضافة قيمنا بعد.' },
            { icon: Users, title: 'فريقنا', text: settings.about_team || 'لم تتم إضافة فريقنا بعد.' },
          ].map((item, i) => {
            const ItemIcon = item.icon
            return (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center flex-shrink-0">
                  <ItemIcon className="w-5 h-5 text-[#C9A961]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#0A1F44] text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.text}</p>
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
        { key: 'facebook', name: 'فيسبوك', enabled: settings.social_facebook_enabled, url: settings.social_facebook, color: '#1877F2',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
        { key: 'telegram', name: 'تيليجرام', enabled: settings.social_telegram_enabled, url: settings.social_telegram, color: '#0088cc',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg> },
        { key: 'whatsapp', name: 'واتساب', enabled: settings.social_whatsapp_enabled, url: settings.social_whatsapp, color: '#25D366',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297.149-1.255.362-1.255.362l-.02.02c-.297-.149-1.255-.362-1.255-.362-.49.139-.614.471-.021.789.595.316 1.123.767 1.437 1.387.314.62.349 1.392.07 2.068-.279.676-.84 1.215-1.55 1.508-.71.293-1.523.335-2.282.124-.76-.211-1.443-.67-1.962-1.295-.52-.625-.852-1.392-.955-2.21-.103-.818.021-1.646.356-2.388.335-.742.873-1.375 1.547-1.817.674-.442 1.465-.672 2.27-.66.805.012 1.602.264 2.27.715.674.442 1.215 1.083 1.547 1.817.335.742.459 1.571.356 2.388-.103.818-.435 1.585-.955 2.21-.52.625-1.202 1.084-1.962 1.295-.76.211-1.573.169-2.282-.124-.71-.293-1.271-.832-1.55-1.508-.279-.676-.244-1.448.07-2.068.314-.62.842-1.071 1.437-1.387.593-.318 1.459-.127 1.95-.421z M12.02 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12.02 0zm.01 21.82c-5.42 0-9.82-4.4-9.82-9.82S6.6 2.18 12.02 2.18s9.82 4.4 9.82 9.82-4.4 9.82-9.82 9.82z"/></svg> },
        { key: 'sms', name: 'رسائل نصية', enabled: settings.social_sms_enabled, url: settings.social_sms, color: '#34A853',
          icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-5c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zm-6 0c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1z"/></svg> },
      ]
      const activeSocials = socials.filter((s) => s.enabled && s.url)
      if (activeSocials.length === 0) return <p className="text-sm text-gray-500 text-center py-8">لم تتم إضافة روابط التواصل بعد.</p>
      return (
        <div className="grid grid-cols-2 gap-3">
          {activeSocials.map((s) => {
            const href = s.key === 'telegram' ? (s.url.startsWith('http') ? s.url : `https://t.me/${s.url.replace('@', '')}`)
              : s.key === 'whatsapp' ? (s.url.startsWith('http') ? s.url : `https://wa.me/${s.url.replace(/[^0-9]/g, '')}`)
              : s.key === 'sms' ? `sms:${s.url}` : s.url
            return (
              <a key={s.key} href={href} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:shadow-md"
                style={{ borderColor: s.color + '40', backgroundColor: s.color + '08' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color }}>{s.icon}</div>
                <span className="text-xs font-semibold text-gray-700">{s.name}</span>
              </a>
            )
          })}
        </div>
      )
    }

    // === POLICIES ===
    const fieldMap: Record<string, string> = { privacy: 'policy_privacy', terms: 'policy_terms', refund: 'policy_refund', support: 'policy_support' }
    const content = settings[fieldMap[cardId]] || 'هذا المحتوى قيد التحضير. سيتم تحديثه قريباً.'
    return (
      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  return (
    <Dialog open={!!cardId} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0A1F44] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#C9A961]" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#0A1F44]">{m.title}</DialogTitle>
          </div>
        </DialogHeader>
        {getContent()}
        {['privacy', 'terms', 'refund', 'support'].includes(cardId) && settings.email && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2">لأي استفسار بخصوص {m.title}</p>
            <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1F44]/5 border border-[#C9A961]/20 text-sm font-medium text-[#0A1F44] hover:bg-[#0A1F44]/10 transition-colors">
              <Mail className="w-4 h-4 text-[#C9A961]" /> راسلنا
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
