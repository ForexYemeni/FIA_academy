import { supabaseAdmin } from '@/lib/supabase'
import ExamRunnerClient from './client'

interface Props { params: Promise<{ attemptId: string }> }

// ⚡ v10.23-CPU — ISR مخزّن بدل force-dynamic (قشرة client — بيانات المحاولة تُجلب client-side عبر API مُصادَق كما هي) — خفض Fluid CPU
export const revalidate = 1800

export default async function Page({ params }: Props) {
  const { attemptId } = await params

  // Fetch the attempt + the actual questions (without correct_answer!)
  const { data: attempt } = await supabaseAdmin
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle()

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy text-white" dir="rtl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">المحاولة غير موجودة</h1>
          <a href="/" className="inline-block bg-gold text-navy px-6 py-3 rounded-lg font-bold">العودة للرئيسية</a>
        </div>
      </div>
    )
  }

  // Already submitted → show results page instead
  if (attempt.submitted_at) {
    // Resolve the student's name so the results view can create a proper
    // certificate request through the approval chain.
    const { data: studentUser } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', attempt.user_id)
      .maybeSingle()
    const { data: attemptCourse } = await supabaseAdmin
      .from('courses')
      .select('id, title, slug, pass_score, currency, retake_fee, exam_duration_minutes')
      .eq('id', attempt.course_id)
      .maybeSingle()
    return (
      <ExamRunnerClient
        attempt={attempt}
        questions={[]}
        course={attemptCourse || undefined}
        studentName={studentUser?.name || ''}
        mode="results"
      />
    )
  }
  // Fetch the actual questions — strip correct_answer to prevent client-side cheating
  const questionIds: string[] = Array.isArray(attempt.question_ids) ? attempt.question_ids : []
  const { data: questionRows } = await supabaseAdmin
    .from('exam_questions')
    .select('id, course_id, lesson_id, question_type, prompt, options, difficulty, points, status')
    .in('id', questionIds)
    .eq('status', 'نشط')

  // Also fetch course info (for the page title + pass score) + the student's
  // name (needed to create a proper certificate request after passing).
  const [{ data: course }, { data: studentUser }] = await Promise.all([
    supabaseAdmin.from('courses').select('id, title, slug, pass_score, currency, retake_fee, exam_duration_minutes').eq('id', attempt.course_id).maybeSingle(),
    supabaseAdmin.from('users').select('name').eq('id', attempt.user_id).maybeSingle(),
  ])

  return (
    <ExamRunnerClient
      attempt={attempt}
      questions={questionRows || []}
      course={course}
      studentName={studentUser?.name || ''}
      mode="exam"
      serverNow={Date.now()}
    />
  )
}
