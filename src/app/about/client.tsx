'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Eye, Target, Heart, Users, Award, Shield, GraduationCap, Building2,
  Stethoscope, HeartPulse, Globe, BookOpen, Quote, ArrowRight,
} from 'lucide-react'

export default function AboutClient({ settings, founder, team }: { settings: any; founder: any; team: any[] }) {
  // Real professional content — defaults if admin hasn't filled these in yet
  const vision = settings.about_vision?.trim() ||
    'أن نكون الأكاديمية الرائدة في التعليم الطبي المستمر في اليمن والمنطقة العربية، ندرب كوادر صحية مؤهّلة قادرة على تقديم رعاية صحية آمنة وعالية الجودة، ونساهم في رفع مستوى الممارسة الطبية وفقًا لأحدث المعايير الدولية.'
  const mission = settings.about_mission?.trim() ||
    'تقديم تعليم طبي معتمد وعملي يربط المعرفة النظرية بالممارسة السريرية الفعلية، عبر نخبة من الاستشاريين والمدربين المعتمدين، باستخدام أحدث الوسائل التعليمية والتقنية، وبأسعار في متناول الكوادر الصحية المحلية.'
  const values = settings.about_values?.trim() ||
    '• الجودة: نموّل المحتوى التعليمي وفق معايير دولية معتمدة\n• المصداقية: نلتزم بالشفافية والموضوعية العلمية\n• العدالة: نوفّر فرص التعليم لكل الكوادر الصحية بلا تمييز\n• التطوير المستمر: نراجع محتوانا بشكل دوري ليواكب التطور الطبي\n• الممارسة الآمنة: نربط التعليم بسلامة المرضى\n• المسؤولية الاجتماعية: نساهم في رفع جودة الرعاية الصحية في المجتمع'
  const teamText = settings.about_team?.trim() ||
    'فريق أكاديمية المستقبل الدولية نخبة من الاستشاريين والأخصائيين والمعتمدين في مختلف التخصصات الطبية والصحية، يجمعهم الإيمان بأهمية التعليم المستمر وأثره المباشر على جودة الرعاية الصحية وحياة المرضى.'

  // ✅ REAL stats — fetched live from the academy database (no fabricated numbers)
  const [realStats, setRealStats] = useState<{ courses: number; trainers: number; certs: number; reviews: number } | null>(null)
  useEffect(() => {
    const num = (d: any) => (Array.isArray(d) ? d.length : 0)
    Promise.all([
      fetch('/api/courses').then((r) => r.json()).catch(() => []),
      fetch('/api/trainers').then((r) => r.json()).catch(() => []),
      fetch('/api/certificates').then((r) => r.json()).catch(() => []),
      fetch('/api/reviews').then((r) => r.json()).catch(() => []),
    ]).then(([c, t, certs, revs]) => {
      setRealStats({ courses: num(c), trainers: num(t), certs: num(certs), reviews: num(revs) })
    })
  }, [])

  const stats = [
    { icon: GraduationCap, value: realStats ? `${realStats.certs}` : '…', label: 'شهادة معتمدة صادرة' },
    { icon: BookOpen, value: realStats ? `${realStats.courses}` : '…', label: 'دورة تدريبية' },
    { icon: Award, value: realStats ? `${realStats.trainers}` : '…', label: 'مدرب معتمد' },
    { icon: Shield, value: realStats ? `${realStats.reviews}` : '…', label: 'تقييم من المتدربين' },
  ]

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="relative bg-gradient-to-br from-navy to-navy-light text-white py-20 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="container relative mx-auto px-4 lg:px-6 text-center max-w-4xl">
          <Badge className="bg-gold/15 text-gold border-gold/30 mb-4">من نحن</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {settings.academy_name || 'أكاديمية المستقبل الدولية'}
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            منصة التعليم الطبي المعتمدة الأولى في اليمن. نقدّم دورات تدريبية متخصصة بمعايير دولية،
            لإعداد كوادر صحية مؤهّلة قادرة على تقديم رعاية آمنة ومتطورة.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a href="/#courses" className="bg-gold hover:bg-gold-light text-navy px-6 py-3 rounded-lg font-bold text-sm inline-flex items-center gap-2">
              تصفح دوراتنا <ArrowRight className="w-4 h-4 rotate-180" />
            </a>
            <a href="/contact" className="border border-gold/30 text-gold hover:bg-gold/10 px-6 py-3 rounded-lg font-bold text-sm inline-flex items-center gap-2">
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 -mt-12 relative z-10">
        <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <Card key={i} className="p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-navy flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <div className="text-3xl font-bold text-navy">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">رسالتنا</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">رؤيتنا ورسالتنا</h2>
            <p className="text-muted-foreground text-lg">قيمنا التي نلتزم بها في كل ما نقدّمه</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Eye, title: 'رؤيتنا', text: vision, color: 'bg-navy' },
              { icon: Target, title: 'رسالتنا', text: mission, color: 'bg-gold' },
              { icon: Heart, title: 'قيمنا', text: values, color: 'bg-navy-light' },
            ].map((b, i) => {
              const Icon = b.icon
              return (
                <Card key={i} className="p-8 hover:shadow-xl transition-shadow">
                  <div className={`w-14 h-14 rounded-2xl ${b.color} flex items-center justify-center mb-5`}>
                    <Icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="font-bold text-navy text-xl mb-3">{b.title}</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{b.text}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {founder && (
        <section className="py-16 bg-gradient-to-b from-navy/5 to-white">
          <div className="container mx-auto px-4 lg:px-6 max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">المؤسس التنفيذي</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-navy">كلمة المؤسس</h2>
            </div>
            <Card className="p-8 md:p-12 max-w-4xl mx-auto border-2 border-gold/20">
              <div className="grid md:grid-cols-3 gap-8 items-center">
                <div className="text-center">
                  <div className="relative inline-block">
                    {founder.avatar ? (
                      <img
                        src={founder.avatar}
                        alt={founder.name}
                        className="w-40 h-40 rounded-2xl object-cover border-4 border-gold/40 shadow-xl mx-auto"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-navy to-navy-light border-4 border-gold/40 flex items-center justify-center mx-auto shadow-xl">
                        <span className="text-6xl text-gold font-bold">{founder.name?.charAt(0) || 'F'}</span>
                      </div>
                    )}
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-gold rounded-full flex items-center justify-center text-xl">👑</div>
                  </div>
                  <h3 className="font-bold text-navy text-xl mt-4">{founder.name}</h3>
                  {founder.title && <p className="text-gold text-sm font-semibold mt-1">{founder.title}</p>}
                  {founder.specialization && <p className="text-xs text-muted-foreground mt-1">{founder.specialization}</p>}
                </div>
                <div className="md:col-span-2">
                  {founder.bio && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-gold uppercase mb-2 tracking-wide">النبذة المهنية</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{founder.bio}</p>
                    </div>
                  )}
                  {founder.vision && (
                    <div className="bg-navy/5 border-r-4 border-gold p-4 rounded-lg">
                      <Quote className="w-6 h-6 text-gold mb-2" />
                      <p className="text-navy italic leading-relaxed text-sm">{founder.vision}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      <section className="py-16 bg-navy text-white">
        <div className="container mx-auto px-4 lg:px-6 text-center max-w-5xl">
          <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">تخصصاتنا</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">ماذا ندرّب؟</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Stethoscope, label: 'الطب الباطني' },
              { icon: HeartPulse, label: 'الإنعاش القلبي' },
              { icon: Shield, label: 'مكافحة العدوى' },
              { icon: Heart, label: 'صحة الأم والطفل' },
              { icon: Building2, label: 'إدارة المنشآت' },
              { icon: Globe, label: 'الصيدلة السريرية' },
              { icon: GraduationCap, label: 'التعليم الطبي' },
              { icon: Users, label: 'التمريض' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="bg-white/5 border border-gold/20 rounded-xl p-6 hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gold/15 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <p className="text-sm font-bold">{s.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">انضم إلى رحلتنا التعليمية</h2>
          <p className="text-muted-foreground text-lg mb-8">
            ابدأ مسيرتك في التعلّم المستمر اليوم — اختر دورتك واحترف تخصصك
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/#courses" className="bg-navy hover:bg-navy-light text-white px-8 py-3 rounded-lg font-bold text-sm">
              تصفح الدورات
            </a>
            <a href="/contact" className="border border-navy/30 text-navy hover:bg-navy/5 px-8 py-3 rounded-lg font-bold text-sm">
              تواصل معنا
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
