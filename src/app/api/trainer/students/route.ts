import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { guardAuth } from '@/lib/api-auth'

/**
 * 👑 /api/trainer/students — سجل طلاب المدرب الملكي
 * GET: يرد بقوائم طلاب كل دورة من دورات المدرب الحي (هوية JWT) مع
 * تقدم كل طالب الحقيقي من course_progress (المزامنة الذهبية) وسقوطه
 * إلى علامة __PROGRESS__ القديمة — حتى يرى المدرب أولاً بأول من
 * سجّل، ومَن يدرس، ومَن أتم — وهو أساس الرسائل الجماعية.
 *
 * الإدارة ترى الكل. المدرب يرى طلاب دوراته فقط (مطابقة trainer_id
 * أو البريد كالنمط المتبع في مسار الدورات).
 */
export async function GET(req: NextRequest) {
  try {
    const g = await guardAuth(req)
    if (!g.ok) return g.res

    // 1) كل الدورات مع المدرب المرتبط
    const { data: allCourses, error: cErr } = await supabaseAdmin
      .from('courses')
      .select('id, title, trainer_id, status, visibility')
      .order('created_at', { ascending: false })
    if (cErr) throw cErr
    const courses = allCourses || []

    // 2) نطاق رؤية المدرب — دوراته هو فقط (إلا الإدارة)
    let scope = courses
    if (g.user.role !== 'admin') {
      const { data: profile } = await supabaseAdmin
        .from('trainers').select('id, email').eq('id', g.user.id).maybeSingle()
      const profileId = profile?.id || g.user.id
      const email = profile?.email || g.user.email
      const { data: byEmail } = email
        ? await supabaseAdmin.from('trainers').select('id').eq('email', email).maybeSingle()
        : { data: null }
      const ownIds = new Set(
        courses
          .filter((c: any) => c.trainer_id === profileId || (byEmail?.id && c.trainer_id === byEmail.id))
          .map((c: any) => c.id)
      )
      scope = courses.filter((c: any) => ownIds.has(c.id))
    }

    const courseIds = scope.map((c: any) => c.id)
    if (courseIds.length === 0) return NextResponse.json({ courses: [] })

    // 3) التسجيلات (دُفعة الدورات) — أفضل صف لكل (طالب، دورة)
    const PAGE = 1000
    let enrollments: any[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from('payments')
        .select('id, user_id, course_id, amount, currency, status, reference, date')
        .in('course_id', courseIds)
        .range(from, from + PAGE - 1)
      if (error) throw error
      enrollments.push(...(data || []))
      if ((data || []).length < PAGE) break
    }

    const best = new Map<string, any>()
    for (const p of enrollments) {
      const key = `${p.user_id}::${p.course_id}`
      const cur = best.get(key)
      const rank = (s: string) => (s === 'مكتمل' || s === 'completed' ? 3 : s === 'قيد الانتظار' || s === 'pending' ? 1 : 2)
      if (!cur || rank(p.status || '') > rank(cur.status || '')) best.set(key, p)
    }
    const rows = Array.from(best.values())

    // 4) أسماء الطلاب (users)
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)))
    const nameMap = new Map<string, any>()
    for (let i = 0; i < userIds.length; i += 100) {
      const chunk = userIds.slice(i, i + 100)
      const { data: us } = await supabaseAdmin
        .from('users').select('id, name, avatar, phone').in('id', chunk)
      for (const u of us || []) nameMap.set(u.id, u)
    }

    // 5) التقدم الذهبي من course_progress
    const progressMap = new Map<string, number>()
    for (let i = 0; i < userIds.length; i += 100) {
      const chunk = userIds.slice(i, i + 100)
      const { data: cps } = await supabaseAdmin
        .from('course_progress').select('user_id, course_id, progress_percent').in('user_id', chunk)
      for (const cp of cps || []) progressMap.set(`${cp.user_id}::${cp.course_id}`, cp.progress_percent || 0)
    }

    // 6) التجميع النهائي
    const result = scope.map((c: any) => {
      const students = rows
        .filter((r: any) => r.course_id === c.id)
        .map((r: any) => {
          const u = nameMap.get(r.user_id)
          const refProgress = Number(String(r.reference || '').match(/__PROGRESS__:(\d+)/)?.[1] || 0)
          const progress = Math.max(progressMap.get(`${r.user_id}::${r.course_id}`) || 0, refProgress)
          const approved = r.status === 'مكتمل' || r.status === 'completed' || Number(r.amount) === 0
          return {
            user_id: r.user_id,
            name: u?.name || 'عضو',
            avatar: u?.avatar || null,
            phone: u?.phone || null,
            progress,
            status: approved ? (progress >= 100 ? 'مكتمل' : 'نشط') : 'بانتظار',
            enrolled_at: r.date,
            amount: r.amount || 0,
            currency: r.currency || 'ر.ي',
          }
        })
        .sort((a: any, b: any) => b.progress - a.progress)

      return {
        course_id: c.id,
        course_title: c.title,
        course_status: c.status,
        students_count: students.length,
        completed_count: students.filter((s: any) => s.progress >= 100).length,
        pending_count: students.filter((s: any) => s.status === 'بانتظار').length,
        students,
      }
    })

    return NextResponse.json({ courses: result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ' }, { status: 500 })
  }
}
