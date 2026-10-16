'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Shield, Award, Users, Clock, BookOpen, GraduationCap, Stethoscope,
  HeartPulse, Pill, Syringe, Baby, Hospital, CheckCircle2, Star, Phone, Mail, MapPin, X, Building2,
} from 'lucide-react'

type Course = {
  id: string
  title: string
  short_description?: string
  price: number
  currency?: string
  duration_hours?: number
  level?: string
  rating?: number
  enrolled?: number
  cover?: string
  price_type?: string
  status: string
}

type Trainer = {
  id: string
  name: string
  title?: string
  specialization?: string
  bio?: string
  avatar?: string
  courses_count?: number
  years_experience?: number
  email?: string
  phone?: string
}

export function PublicSite({ onLoginClick }: { onLoginClick: () => void }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null)
  const [founder, setFounder] = useState<any>(null)
  const [partners, setPartners] = useState<any[]>([])
  const [licenses, setLicenses] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [verifyNumber, setVerifyNumber] = useState('')

  useEffect(() => {
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/trainers').then((r) => r.json()).then((d) => setTrainers(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/team?role=founder').then((r) => r.json()).then((d) => { if (Array.isArray(d) && d.length > 0) setFounder(d[0]) }).catch(() => {})
    fetch('/api/partners').then((r) => r.json()).then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/licenses').then((r) => r.json()).then((d) => setLicenses(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/site-settings').then((r) => r.json()).then(setSettings).catch(() => {})
  }, [])

  const verify = () => {
    if (!verifyNumber.trim()) {
      toast.error('أدخل رقم الشهادة')
      return
    }
    // Redirect to standalone verify page
    window.location.href = `/?verify=${encodeURIComponent(verifyNumber.trim())}#verify`
  }

  // Visibility toggles — controlled from admin dashboard
  const showPartners = settings.show_partners === true
  const showLicenses = settings.show_licenses === true

  return (
    <div className="flex-1">
      {/* HERO */}
      <section id="home" className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-fia-radial" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="container relative mx-auto px-4 lg:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-right">
              <Badge className="bg-gold/15 text-gold border-gold/30 hover:bg-gold/20">
                <Award className="w-4 h-4 ml-1" /> معتمدة دولياً
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                منصة التعليم الطبي
                <br />
                <span className="text-fia-gradient">المعتمدة</span> الأولى في اليمن
              </h1>
              <p className="text-lg text-white/80 leading-relaxed max-w-xl mx-auto lg:mx-0">
                نُقدّم دورات تدريبية احترافية في الإنعاش القلبي الرئوي، التمريض السريري، مكافحة العدوى، طب الطوارئ، صحة الأم والطفل، الصيدلة السريرية وإدارة المنشآت الصحية — بشهادات قابلة للتحقق.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button onClick={onLoginClick} className="bg-gold hover:bg-gold-light text-navy font-semibold text-base h-12 px-6">
                  ابدأ التعلّم الآن
                </Button>
                <a href="#courses">
                  <Button variant="outline" className="bg-transparent border-gold/30 text-gold hover:bg-gold/10 hover:text-gold-light h-12 px-6 w-full sm:w-auto">
                    استكشف الدورات
                  </Button>
                </a>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-6">
                <Stat value={`${courses.length}`} label="دورة تدريبية" />
                <Stat value={`${trainers.length}`} label="مدرب معتمد" />
                <Stat value={founder ? '1' : '0'} label="المؤسس" />
              </div>
            </div>
            <div className="relative">
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute -inset-4 bg-gold/20 blur-3xl rounded-full" />
                <Card className="relative bg-white/10 backdrop-blur-md border-gold/30 p-8 glow-gold">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gold flex items-center justify-center">
                      <GraduationCap className="w-8 h-8 text-navy" />
                    </div>
                    <div>
                      <div className="font-bold text-xl">شهادة معتمدة</div>
                      <div className="text-gold text-sm">بعد إتمام كل دورة</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Feature icon={Shield} text="شهادات قابلة للتحقق إلكترونياً" />
                    <Feature icon={Clock} text="وصول مدى الحياة للمحتوى" />
                    <Feature icon={Users} text="مدربون من نخبة الأطباء" />
                    <Feature icon={Award} text="اعتمادات من وزارية ودولية" />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="relative">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0 80L60 70C120 60 240 40 360 35C480 30 600 40 720 45C840 50 960 50 1080 45C1200 40 1320 30 1380 25L1440 20V80H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">من نحن</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">الأكاديمية الطبية الرائدة في اليمن</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              أكاديمية المستقبل الدولية (FIA) هي منصة تعليم طبي معتمدة تهدف إلى رفع كفاءة الكوادر الصحية في اليمن والعالم العربي من خلال دورات احترافية تلتزم بأعلى المعايير الدولية.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <VisionCard icon={Award} title="رؤيتنا" text="أن نكون المرجع الأول للتعليم الطبي المستمر في المنطقة" />
            <VisionCard icon={HeartPulse} title="رسالتنا" text="تمكين الكوادر الصحية بمعارف ومهارات تخدم المرضى" />
            <VisionCard icon={Shield} title="قيمنا" text="الجودة، النزاهة، الاحترافية، والالتزام بالمعايير" />
            <VisionCard icon={Users} title="فريقنا" text="نخبة من الاستشاريين والمحاضرين المعتمدين" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureBig
              icon={Stethoscope}
              title="محتوى طبي متخصص"
              text="مناهج علمية حديثة مبنية على أحدث الإرشادات الدولية (AHA، WHO، ATLS) ومصممة بالتعاون مع استشاريين متخصصين."
            />
            <FeatureBig
              icon={GraduationCap}
              title="شهادات موثوقة"
              text="شهادات قابلة للتحقق إلكترونياً عبر رقم الشهادة، معتمدة من وزارات وهيئات صحية معترف بها."
            />
            <FeatureBig
              icon={Clock}
              title="مرونة في التعلّم"
              text="ادرس في وقتك ومن أي مكان. وصول مدى الحياة للمحتوى التعليمي بما يشمل الفيديوهات والمواد المصورة والملفاتات المرجعية."
            />
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section id="courses" className="py-20 bg-gradient-to-b from-white to-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">دوراتنا</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">برامج تدريبية معتمدة</h2>
            <p className="text-muted-foreground text-lg">
              اختر من بين مجموعة واسعة من الدورات الطبية والصحية المعتمدة
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.length > 0 ? (
              courses.map((c) => <CourseCard key={c.id} course={c} onEnroll={onLoginClick} />)
            ) : (
              <div className="col-span-full text-center py-10 text-muted-foreground">جاري تحميل الدورات...</div>
            )}
          </div>
        </div>
      </section>

      {/* FOUNDER SECTION — Professional, separate from trainers */}
      {founder && (
        <section className="py-20 bg-gradient-to-b from-navy to-navy-light text-white">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">المؤسس التنفيذي</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{founder.name}</h2>
              <p className="text-gold text-lg font-semibold">{founder.title}</p>
            </div>
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8 items-start">
                {/* Founder photo */}
                <div className="text-center md:text-right">
                  <div className="relative inline-block">
                    {founder.avatar ? (
                      <img src={founder.avatar} alt={founder.name} className="w-44 h-44 rounded-full object-cover border-4 border-gold/40 mx-auto shadow-xl" />
                    ) : (
                      <div className="w-44 h-44 rounded-full bg-white/10 border-4 border-gold/40 flex items-center justify-center mx-auto shadow-xl">
                        <span className="text-6xl text-gold font-bold">{founder.name?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute -top-2 right-1/2 translate-x-1/2 text-3xl">👑</div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      ★ المؤسس
                    </div>
                  </div>
                </div>

                {/* Founder info */}
                <div className="md:col-span-2 space-y-4">
                  {founder.bio && (
                    <div>
                      <h3 className="text-gold text-sm font-bold mb-1">النبذة المهنية</h3>
                      <p className="text-white/80 text-sm leading-relaxed">{founder.bio}</p>
                    </div>
                  )}
                  {founder.vision && (
                    <div className="bg-white/5 border border-gold/20 rounded-lg p-4">
                      <h3 className="text-gold text-sm font-bold mb-1">🎯 الرؤية</h3>
                      <p className="text-white/80 text-sm leading-relaxed">{founder.vision}</p>
                    </div>
                  )}
                  {founder.mission && (
                    <div className="bg-white/5 border border-gold/20 rounded-lg p-4">
                      <h3 className="text-gold text-sm font-bold mb-1">🚀 الرسالة</h3>
                      <p className="text-white/80 text-sm leading-relaxed">{founder.mission}</p>
                    </div>
                  )}
                  {founder.qualifications && founder.qualifications !== 'null' && founder.qualifications !== '[]' && (
                    <div>
                      <h3 className="text-gold text-sm font-bold mb-2">🎓 المؤهلات العلمية</h3>
                      <div className="flex flex-wrap gap-2">
                        {(() => { try { return JSON.parse(founder.qualifications) } catch { return [] } })().map((q: string, i: number) => (
                          <Badge key={i} className="bg-white/10 text-white border-gold/20">{q}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {founder.achievements && founder.achievements !== 'null' && founder.achievements !== '[]' && (
                    <div>
                      <h3 className="text-gold text-sm font-bold mb-2">🏆 الإنجازات</h3>
                      <ul className="space-y-1">
                        {(() => { try { return JSON.parse(founder.achievements) } catch { return [] } })().map((a: string, i: number) => (
                          <li key={i} className="text-white/80 text-sm flex items-start gap-2">
                            <span className="text-gold flex-shrink-0">•</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TRAINERS — separate from founder */}
      <section id="trainers" className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">الفريق التدريبي</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">نخبة من الخبراء</h2>
            <p className="text-muted-foreground text-lg">تعلّم على يد أمهر الاستشاريين في مختلف التخصصات — اضغط على أي مدرب لمعرفة المزيد عنه</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trainers.length > 0 ? (
              trainers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTrainer(t)}
                  className="text-center focus:outline-none"
                >
                  <Card className="p-6 text-center card-hover hover:border-gold/40 hover:shadow-lg transition-all cursor-pointer h-full">
                    <div className="relative mx-auto w-28 h-28 mb-4">
                      {t.avatar ? (
                        <img src={t.avatar} alt={t.name} className="w-full h-full rounded-full object-cover border-4 border-gold/30" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-navy flex items-center justify-center text-gold text-3xl font-bold">
                          {t.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-navy text-lg">{t.name}</h3>
                    <p className="text-gold text-sm font-semibold mb-2">{t.title}</p>
                    <p className="text-muted-foreground text-xs mb-3">{t.specialization}</p>
                    <div className="flex justify-around text-center pt-3 border-t border-border">
                      <div>
                        <div className="font-bold text-navy">{t.courses_count || 0}</div>
                        <div className="text-xs text-muted-foreground">دورة</div>
                      </div>
                      <div>
                        <div className="font-bold text-navy">{t.years_experience || 0}+</div>
                        <div className="text-xs text-muted-foreground">سنوات خبرة</div>
                      </div>
                    </div>
                  </Card>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-10 text-muted-foreground">جاري تحميل المدربين...</div>
            )}
          </div>
        </div>
      </section>

      {/* Trainer detail dialog — shows the same professional bio saved from admin / trainer dashboard */}
      <TrainerDetailDialog
        trainer={selectedTrainer}
        onClose={() => setSelectedTrainer(null)}
      />

      {/* PARTNERS — shown only if admin enabled show_partners */}
      {showPartners && (
        <section id="partners" className="py-20 bg-gradient-to-b from-navy to-navy-light text-white scroll-mt-20">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">شركاؤنا</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">معتمدون من الجهات الموثوقة</h2>
              <p className="text-white/70 text-lg">نتعاون مع أبرز المؤسسات الصحية المحلية والدولية</p>
            </div>

            {partners.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map((p) => {
                  // Only show partners whose status is "نشط" on the public site
                  if (p.status !== 'نشط') return null
                  return (
                    <Card key={p.id} className="bg-white/5 border-gold/20 p-6 card-hover group">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
                          {p.logo || '🤝'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white mb-1 text-lg">{p.name}</h3>
                          {p.description && (
                            <p className="text-white/60 text-sm leading-relaxed">{p.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {p.since && (
                              <Badge variant="outline" className="border-gold/30 text-gold text-xs">
                                شريك منذ {p.since}
                              </Badge>
                            )}
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                              <CheckCircle2 className="w-3 h-3 ml-1" /> شراكة فعّالة
                            </Badge>
                          </div>
                          {p.website && (
                            <a
                              href={p.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-3 text-gold hover:text-gold-light text-xs font-medium transition-colors"
                              dir="ltr"
                            >
                              <Award className="w-3.5 h-3.5" />
                              زيارة الموقع الرسمي
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-white/50">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">سيتم عرض الشركاء هنا فور إضافتهم من حساب الإدارة</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* LICENSES — shown only if admin enabled show_licenses */}
      {showLicenses && (
        <section id="licenses" className="py-20 bg-white scroll-mt-20">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">التراخيص والاعتمادات</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">اعتمادات رسمية موثقة</h2>
              <p className="text-muted-foreground text-lg">تراخيصنا الرسمية من الجهات الصحية والتعليمية المعتمدة</p>
            </div>

            {licenses.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {licenses.map((l) => {
                  // Only show licenses whose status is "ساري" on the public site
                  if (l.status !== 'ساري') return null
                  return (
                    <Card key={l.id} className="p-6 card-hover border-2 border-gold/20 hover:border-gold/40 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center flex-shrink-0">
                            <Shield className="w-6 h-6 text-gold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-navy text-lg leading-tight">{l.issuing_body}</div>
                            {l.type && <div className="text-gold text-sm font-semibold mt-0.5">{l.type}</div>}
                          </div>
                        </div>
                        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3 ml-1" /> ساري
                        </Badge>
                      </div>

                      {l.number && (
                        <div className="bg-muted/40 rounded-lg p-3 mb-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">رقم الترخيص</span>
                          <span className="font-mono text-navy font-bold text-sm" dir="ltr">{l.number}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
                        {l.issued_at && (
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">إصدار:</span>
                            <span dir="ltr" className="font-medium text-navy">{l.issued_at}</span>
                          </span>
                        )}
                        {l.expires_at && (
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">ينتهي:</span>
                            <span dir="ltr" className="font-medium text-navy">{l.expires_at}</span>
                          </span>
                        )}
                      </div>

                      {l.verification_url && (
                        <a
                          href={l.verification_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 w-full justify-center bg-navy hover:bg-navy-light text-gold px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          تحقق من صحة الترخيص
                        </a>
                      )}
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">سيتم عرض التراخيص هنا فور إضافتها من حساب الإدارة</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* VERIFY CERTIFICATE — DISABLED: certificate feature temporarily removed */}
      {/* <section id="verify" className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          <div className="text-center mb-10">
            <Badge className="bg-navy/5 text-navy border-navy/10 mb-3">التحقق من الشهادة</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">تحقق من صحة الشهادة</h2>
            <p className="text-muted-foreground text-lg">أدخل رقم الشهادة للتحقق من صحة الاعتماد</p>
          </div>

          <Card className="p-6 md:p-8">
            <div className="space-y-4">
              <div>
                <Label htmlFor="certNum" className="text-navy font-semibold">رقم الشهادة</Label>
                <Input
                  id="certNum"
                  value={verifyNumber}
                  onChange={(e) => setVerifyNumber(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') verify() }}
                  placeholder="FIA-2026-XXXXX"
                  className="mt-1 text-base"
                  dir="ltr"
                />
              </div>
              <Button onClick={verify} className="w-full bg-navy hover:bg-navy-light text-white h-12">
                تحقق الآن
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                سيتم فتح صفحة تحقق احترافية تعرض الشهادة كاملة
              </p>
            </div>
          </Card>
        </div>
      </section> */}

      {/* CONTACT */}
      <section id="contact" className="py-20 bg-gradient-to-b from-muted/30 to-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">تواصل معنا</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">نحن هنا لخدمتك</h2>
            <p className="text-muted-foreground text-lg">فريقنا جاهز للإجابة على استفساراتك</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-8 text-center card-hover">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-navy flex items-center justify-center mb-4">
                <Phone className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-bold text-navy mb-2">اتصل بنا</h3>
              <a href={`tel:${settings.phone}`} className="text-gold hover:underline" dir="ltr">{settings.phone || '+967 700 000 000'}</a>
            </Card>
            <Card className="p-8 text-center card-hover">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-navy flex items-center justify-center mb-4">
                <Mail className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-bold text-navy mb-2">راسلنا</h3>
              <a href={`mailto:${settings.email}`} className="text-gold hover:underline" dir="ltr">{settings.email || 'info@fia.edu'}</a>
            </Card>
            <Card className="p-8 text-center card-hover">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-navy flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-bold text-navy mb-2">زورنا</h3>
              <p className="text-muted-foreground">{settings.address || 'صنعاء، الجمهورية اليمنية'}</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

// Trainer detail dialog — shows the same professional bio saved from admin / trainer dashboard
function TrainerDetailDialog({ trainer, onClose }: { trainer: Trainer | null; onClose: () => void }) {
  return (
    <Dialog open={!!trainer} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {trainer && (
          <>
            {/* Header — gradient navy banner with avatar */}
            <div className="relative bg-gradient-to-br from-navy to-navy-light p-8 pb-6 text-center">
              <button
                onClick={onClose}
                className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative mx-auto w-32 h-32 mb-4">
                {trainer.avatar ? (
                  <img
                    src={trainer.avatar}
                    alt={trainer.name}
                    className="w-full h-full rounded-full object-cover border-4 border-gold/40 shadow-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white/10 border-4 border-gold/40 flex items-center justify-center text-gold text-5xl font-bold shadow-xl">
                    {trainer.name?.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  ★ مدرب معتمد
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{trainer.name}</h2>
              {trainer.title && (
                <p className="text-gold text-sm font-semibold mb-2">{trainer.title}</p>
              )}
              {trainer.specialization && (
                <p className="text-white/70 text-xs">{trainer.specialization}</p>
              )}
            </div>

            {/* Body — bio + stats */}
            <div className="p-6 space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-navy">{trainer.courses_count || 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">دورة معتمدة</div>
                </div>
                <div className="bg-navy/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-navy">{trainer.years_experience || 0}+</div>
                  <div className="text-[10px] text-muted-foreground mt-1">سنوات خبرة</div>
                </div>
                <div className="bg-gold/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gold">★</div>
                  <div className="text-[10px] text-muted-foreground mt-1">مدرب معتمد</div>
                </div>
              </div>

              {/* Complete professional bio — preserves line breaks exactly as written */}
              {trainer.bio && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-gold rounded-full" />
                    <h3 className="font-bold text-navy text-sm">النبذة التعريفية الكاملة</h3>
                  </div>
                  <div className="bg-gradient-to-br from-navy/[0.02] to-gold/[0.04] border border-gold/15 rounded-lg p-5">
                    <pre
                      className="whitespace-pre-wrap font-sans text-sm text-navy/80 leading-relaxed"
                      dir="rtl"
                      style={{ fontFamily: 'inherit' }}
                    >
                      {trainer.bio}
                    </pre>
                  </div>
                </div>
              )}

              {!trainer.bio && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  لا توجد نبذة تعريفية لهذا المدرب بعد.
                </div>
              )}

              {/* Contact info (if available) */}
              {(trainer.phone || trainer.email) && (
                <div className="border-t border-border pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-navy mb-2">معلومات التواصل</h4>
                  {trainer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
                      <Phone className="w-4 h-4 text-gold" /> {trainer.phone}
                    </div>
                  )}
                  {trainer.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
                      <Mail className="w-4 h-4 text-gold" /> {trainer.email}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="px-6 pb-6">
              <Button
                onClick={onClose}
                className="w-full bg-navy hover:bg-navy-light text-white"
              >
                إغلاق
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-extrabold text-gold">{value}</div>
      <div className="text-xs md:text-sm text-white/70">{label}</div>
    </div>
  )
}

function Feature({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-3 text-white/90">
      <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <span className="text-sm">{text}</span>
    </div>
  )
}

function VisionCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card className="p-5 text-center card-hover">
      <div className="w-12 h-12 mx-auto rounded-xl bg-navy flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-gold" />
      </div>
      <h3 className="font-bold text-navy mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{text}</p>
    </Card>
  )
}

function FeatureBig({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card className="p-8 card-hover">
      <div className="w-14 h-14 rounded-2xl bg-gold/15 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-navy" />
      </div>
      <h3 className="font-bold text-navy text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
    </Card>
  )
}

function CourseCard({ course, onEnroll }: { course: Course; onEnroll: () => void }) {
  return (
    <Card className="overflow-hidden card-hover group">
      <div className="relative h-44 overflow-hidden bg-navy">
        {course.cover ? (
          <img
            src={course.cover}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-gold/30" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className="bg-navy/80 text-gold border-gold/30">{course.level || 'متوسط'}</Badge>
        </div>
        {course.price_type === 'مجانية' && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-green-500 text-white">مجانية</Badge>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-navy text-base mb-2 line-clamp-2 min-h-[2.5rem]">{course.title}</h3>
        <p className="text-muted-foreground text-xs mb-4 line-clamp-2">{course.short_description}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {course.duration_hours || 0} ساعة
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {course.enrolled || 0}
          </span>
          <span className="flex items-center gap-1 text-gold">
            <Star className="w-3.5 h-3.5 fill-current" />
            {course.rating || 0}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="font-bold text-navy">
            {course.price_type === 'مجانية' || course.price === 0 ? (
              <span className="text-green-600">مجانية</span>
            ) : (
              <span>{course.price.toLocaleString()} {course.currency || 'ر.ي'}</span>
            )}
          </div>
          <Button onClick={onEnroll} size="sm" className="bg-navy hover:bg-navy-light text-white">
            اشترك
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-green-700 font-semibold text-xs">{label}</dt>
      <dd className={`text-navy ${mono ? 'font-mono' : 'font-medium'}`} dir={mono ? 'ltr' : 'rtl'}>{value}</dd>
    </div>
  )
}
