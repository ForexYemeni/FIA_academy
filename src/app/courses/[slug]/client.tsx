'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Star, BookOpen, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'

interface CourseDetailClientProps {
  course: any
}

export default function CourseDetailClient({ course }: CourseDetailClientProps) {
  const user = useAuth((s) => s.user)
  const [modules, setModules] = useState<any[]>([])
  const [enrolled, setEnrolled] = useState(false)

  useEffect(() => {
    fetch(`/api/modules?course_id=${course.id}`)
      .then((r) => r.json())
      .then((d) => setModules(Array.isArray(d) ? d : []))
      .catch(() => {})
    if (user) {
      fetch(`/api/enrollments?user_id=${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          const all = Array.isArray(d) ? d : []
          setEnrolled(all.some((e: any) => e.course_id === course.id))
        })
        .catch(() => {})
    }
  }, [course.id, user])

  const handleEnroll = () => {
    if (!user) {
      // Send to home for login
      window.location.href = '/'
      return
    }
    fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, course_id: course.id }),
    })
      .then((r) => r.json())
      .then(() => setEnrolled(true))
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Hero — course header */}
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-16">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">{course.level || 'متوسط'}</Badge>
              <h1 className="text-3xl md:text-5xl font-bold mb-4">{course.title}</h1>
              {course.short_description && (
                <p className="text-white/80 text-lg mb-6">{course.short_description}</p>
              )}
              <div className="flex flex-wrap gap-6 text-sm text-white/70 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold" /> {course.duration_hours || 0} ساعة
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold" /> {course.enrolled || 0} متدرب
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-gold fill-current" /> {course.rating || 0}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-gold">
                  {course.price_type === 'مجانية' || course.price === 0 ? 'مجانية' : `${course.price?.toLocaleString()} ${course.currency || 'ر.ي'}`}
                </span>
                {!enrolled ? (
                  <Button onClick={handleEnroll} size="lg" className="bg-gold hover:bg-gold-light text-navy font-bold">
                    اشترك الآن
                  </Button>
                ) : (
                  <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white">
                    <CheckCircle2 className="w-5 h-5 ml-2" /> مسجّل
                  </Button>
                )}
              </div>
            </div>
            {course.cover && (
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Body — description + modules */}
      <div className="container mx-auto px-4 lg:px-6 py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {course.description && (
              <div>
                <h2 className="text-2xl font-bold text-navy mb-4">نظرة عامة على الدورة</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{course.description}</p>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-navy mb-4">منهج الدورة</h2>
              {modules.length === 0 ? (
                <p className="text-gray-500">سيتم تحديث المنهج قريباً</p>
              ) : (
                <div className="space-y-3">
                  {modules.map((m, i) => (
                    <Card key={m.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center text-gold font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-navy">{m.title}</h3>
                          {m.description && <p className="text-xs text-gray-500 mt-1">{m.description}</p>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <Card className="p-6 sticky top-24">
              <h3 className="font-bold text-navy mb-4">معلومات الدورة</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">المستوى</span>
                  <span className="font-bold text-navy">{course.level || 'متوسط'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">المدة</span>
                  <span className="font-bold text-navy">{course.duration_hours || 0} ساعة</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">عدد الوحدات</span>
                  <span className="font-bold text-navy">{course.modules_count || 0}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">عدد الدروس</span>
                  <span className="font-bold text-navy">{course.lessons_count || 0}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">درجة النجاح</span>
                  <span className="font-bold text-navy">{course.pass_score || 60}%</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
