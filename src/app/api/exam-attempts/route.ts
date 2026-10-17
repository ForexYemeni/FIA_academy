import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/exam-attempts?user_id=...&course_id=... — list user's attempts
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    const courseId = req.nextUrl.searchParams.get('course_id')
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    let query = supabaseAdmin.from('exam_attempts').select('*').eq('user_id', userId)
    if (courseId) query = query.eq('course_id', courseId)
    query = query.order('started_at', { ascending: false })
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — start a new attempt (returns the question_ids list, NO answers)
export async function POST(req: NextRequest) {
  try {
    const { user_id, course_id, lesson_id, question_ids, ip_address, user_agent } = await req.json()
    if (!user_id || !course_id || !question_ids) {
      return NextResponse.json({ error: 'user_id, course_id, question_ids required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .insert({
        user_id,
        course_id,
        lesson_id: lesson_id || null,
        question_ids,
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

// PUT — submit the attempt (calculate score)
export async function PUT(req: NextRequest) {
  try {
    const { id, answers, tab_switches } = await req.json()
    if (!id || !answers) {
      return NextResponse.json({ error: 'id and answers required' }, { status: 400 })
    }

    // Fetch the attempt + the questions to grade
    const { data: attempt, error: fetchErr } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    if (!attempt) return NextResponse.json({ error: 'المحاولة غير موجودة' }, { status: 404 })

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
    const passed = score >= 60 // default pass mark

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
    return NextResponse.json({
      ...data,
      correct_count: correct,
      total_questions: (questions || []).length,
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
