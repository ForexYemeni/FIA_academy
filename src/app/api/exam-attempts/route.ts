import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyExamGraded, notifyTrainerGradedExam } from '@/lib/notifications'

// ============================================================================
// EXAM ATTEMPTS API — v4 royal exam system
// ----------------------------------------------------------------------------
// GET  ?user_id=...               → this student's attempts (optionally &course_id=)
// GET  ?course_id=...&all=1       → ALL attempts of a course (trainer/admin views)
// GET  ?all=1                     → ALL attempts (admin views)
// POST {user_id, course_id}       → start/resume an attempt (SECURE: the server
//                                    itself fetches the course's active question
//                                    ids — the client can never inject them)
// PUT  {id, answers, ...}         → submit + auto-grade (pass mark = course.pass_score)
// PUT  {id, review:{score,note}}  → trainer/admin correction (final score + note)
// DELETE {id}                     → remove an attempt
// ============================================================================

// GET — list attempts
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const courseId = req.nextUrl.searchParams.get('course_id')
    const all = req.nextUrl.searchParams.get('all') === '1'
    const submittedOnly = req.nextUrl.searchParams.get('submitted') === '1'

    if (!all && !userId) {
      return NextResponse.json({ error: 'user_id required (or all=1)' }, { status: 400 })
    }

    let query = supabaseAdmin.from('exam_attempts').select('*')
    if (!all && userId) query = query.eq('user_id', userId)
    if (courseId) query = query.eq('course_id', courseId)
    if (submittedOnly) query = query.not('submitted_at', 'is', null)
    query = query.order('started_at', { ascending: false }).limit(500)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — start (or resume) a new attempt for a course's question bank
export async function POST(req: NextRequest) {
  try {
    const { user_id, course_id, ip_address, user_agent } = await req.json()
    if (!user_id || !course_id) {
      return NextResponse.json({ error: 'user_id و course_id مطلوبان' }, { status: 400 })
    }

    // 1) ENROLLMENT GATE — canonical enrollment rows live in the `payments`
    //    table (see /api/enrollments: free → amount=0 + status 'مكتمل',
    //    paid → 'قيد الانتظار' until the admin approves it to 'مكتمل',
    //    rejected → 'ملغي'). The legacy `enrollments` table is only filled by
    //    the online-payment webhook, so we check `payments` FIRST and fall
    //    back to `enrollments` — a real enrollment in either table grants access.
    const isApprovedStatus = (s: string) =>
      ['مكتمل', 'completed', 'paid', 'confirmed'].includes((s || '').trim().toLowerCase()) ||
      (s || '').trim() === 'مكتمل'
    const isRejectedStatus = (s: string) =>
      ['ملغي', 'cancelled', 'failed', 'rejected'].includes((s || '').trim().toLowerCase())
    const isPendingStatus = (s: string) =>
      ['قيد الانتظار', 'بانتظار', 'pending'].includes((s || '').trim().toLowerCase())

    const { data: paymentRows } = await supabaseAdmin
      .from('payments')
      .select('id, amount, status')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .order('date', { ascending: false })

    // Pick the most "advanced" payment row (same priority as /api/enrollments GET)
    const statusPriority: Record<string, number> = {
      'مكتمل': 3, 'completed': 3, 'paid': 3, 'confirmed': 3,
      'active': 2, 'قيد الانتظار': 1, 'بانتظار': 1, 'pending': 1,
    }
    const bestPayment = (paymentRows || []).reduce(
      (acc: any, r: any) => ((statusPriority[(r.status || '').trim()] || 0) > (statusPriority[(acc?.status || '').trim()] || 0) ? r : acc),
      null as any
    )

    let enrolled = false
    let paymentPending = false

    if (bestPayment) {
      const s = (bestPayment.status || '').trim()
      const isFree = !bestPayment.amount || bestPayment.amount === 0
      if (isApprovedStatus(s) || (isFree && !isRejectedStatus(s) && !isPendingStatus(s))) {
        enrolled = true
      } else if (isPendingStatus(s) || (!isApprovedStatus(s) && !isFree)) {
        // paid enrollment waiting for admin approval
        paymentPending = true
      }
    }

    // Fallback: the online-payment webhook flow writes to `enrollments`
    if (!enrolled && !paymentPending) {
      const { data: legacyRows } = await supabaseAdmin
        .from('enrollments')
        .select('id, payment_status, status')
        .eq('user_id', user_id)
        .eq('course_id', course_id)
        .limit(1)
      const legacy = (legacyRows || [])[0]
      if (legacy) {
        const ps = (legacy.payment_status || legacy.status || '').toString().trim().toLowerCase()
        if (ps === 'pending') paymentPending = true
        else if (ps && ps !== 'cancelled' && ps !== 'failed') enrolled = true
      }
    }

    if (!enrolled && !paymentPending) {
      return NextResponse.json({ error: 'أنت غير مسجل في هذه الدورة' }, { status: 403 })
    }
    if (paymentPending) {
      return NextResponse.json({ error: 'اشتراكك في الدورة بانتظار تأكيد الدفع' }, { status: 403 })
    }

    // 2) Fetch the course's ACTIVE question ids — SERVER-SIDE ONLY (anti-cheat)
    const { data: questions } = await supabaseAdmin
      .from('exam_questions')
      .select('id')
      .eq('course_id', course_id)
      .eq('status', 'نشط')
      .order('created_at', { ascending: true })

    const questionIds = (questions || []).map((q: any) => q.id)
    if (questionIds.length === 0) {
      return NextResponse.json({ error: 'لا توجد أسئلة متاحة لهذه الدورة بعد' }, { status: 400 })
    }

    // 3) Resume: if there is an unsubmitted attempt for this course, return it
    const { data: openAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .is('submitted_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (openAttempt) {
      // Refresh the question set in case the trainer added/removed questions
      const { data: updated } = await supabaseAdmin
        .from('exam_attempts')
        .update({ question_ids: questionIds })
        .eq('id', openAttempt.id)
        .select()
        .single()
      return NextResponse.json(updated || openAttempt)
    }

    // 4) Create the attempt
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .insert({
        user_id,
        course_id,
        lesson_id: null,
        question_ids: questionIds,
        answers: {},
        started_at: new Date().toISOString(),
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        tab_switches: 0,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT — submit & auto-grade, OR trainer/admin review-correction
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Fetch the attempt
    const { data: attempt, error: fetchErr } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !attempt) return NextResponse.json({ error: 'المحاولة غير موجودة' }, { status: 404 })

    // Course pass score (fallback 60)
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('pass_score')
      .eq('id', attempt.course_id)
      .maybeSingle()
    const passScore = typeof course?.pass_score === 'number' ? course.pass_score : 60

    // ============ TRAINER/ADMIN REVIEW-CORRECTION ============
    if (body.review) {
      const { score, note, reviewer_id, reviewer_name } = body.review || {}
      const finalScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))
      const finalPassed = finalScore >= passScore

      // Store the review metadata inside the answers JSON under a reserved key
      // (avoids any DB migration — answers is a JSONB column).
      const prevAnswers = (typeof attempt.answers === 'object' && attempt.answers !== null) ? attempt.answers : {}
      const prevReview = prevAnswers.__review__ || null
      const mergedAnswers = {
        ...prevAnswers,
        __review__: {
          by: reviewer_id || null,
          by_name: reviewer_name || 'المدرب',
          note: note || '',
          original_score: prevReview?.original_score ?? attempt.score ?? null,
          original_passed: prevReview?.original_passed ?? attempt.passed ?? null,
          at: new Date().toISOString(),
        },
      }

      const { data, error } = await supabaseAdmin
        .from('exam_attempts')
        .update({
          answers: mergedAnswers,
          score: finalScore,
          passed: finalPassed,
          submitted_at: attempt.submitted_at || new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // Notify the student about the correction (non-fatal)
      try {
        await notifyTrainerGradedExam(attempt.user_id, attempt.course_id, finalScore, finalPassed, note)
      } catch {}

      return NextResponse.json({ ...data, pass_score: passScore })
    }

    // ============ STUDENT SUBMIT + AUTO-GRADE ============
    const { answers, tab_switches } = body
    if (!answers) return NextResponse.json({ error: 'id and answers required' }, { status: 400 })
    if (attempt.submitted_at) {
      return NextResponse.json({ error: 'تم تسليم هذه المحاولة مسبقاً' }, { status: 400 })
    }

    const questionIds: string[] = Array.isArray(attempt.question_ids) ? attempt.question_ids : []
    const { data: questions } = await supabaseAdmin
      .from('exam_questions')
      .select('id, correct_answer, points')
      .in('id', questionIds)

    let correct = 0
    let totalPoints = 0
    let earnedPoints = 0
    for (const q of questions || []) {
      totalPoints += q.points || 1
      const userAnswer = answers[q.id]
      const correctAnswer = q.correct_answer
      // Compare — correct_answer can be: number (MCQ index), boolean (TF), string, or array
      let isCorrect = false
      if (typeof correctAnswer === 'number') {
        isCorrect = userAnswer === correctAnswer
      } else if (typeof correctAnswer === 'boolean') {
        isCorrect = userAnswer === correctAnswer
      } else if (Array.isArray(correctAnswer)) {
        isCorrect = Array.isArray(userAnswer) && userAnswer.length === correctAnswer.length
          && userAnswer.every((v: any) => correctAnswer.includes(v))
      } else {
        isCorrect = String(userAnswer || '').trim().toLowerCase() === String(correctAnswer || '').trim().toLowerCase()
      }
      if (isCorrect) {
        correct++
        earnedPoints += q.points || 1
      }
    }
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = score >= passScore

    const submittedAt = new Date().toISOString()
    const durationSeconds = attempt.started_at
      ? Math.round((new Date(submittedAt).getTime() - new Date(attempt.started_at).getTime()) / 1000)
      : 0

    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .update({
        answers,
        score,
        passed,
        submitted_at: submittedAt,
        duration_seconds: durationSeconds,
        tab_switches: tab_switches || 0,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Notify student + trainer + admins (non-fatal)
    try {
      await notifyExamGraded(attempt.user_id, attempt.course_id, score, passed)
    } catch {}

    return NextResponse.json({
      ...data,
      correct_count: correct,
      total_questions: (questions || []).length,
      pass_score: passScore,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('exam_attempts').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
