import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tgCourseCreated, tgCourseUpdated, tgCourseDeleted } from '@/lib/telegram'
import { notifyFollowersNewCourse, resolveTrainerProfileId } from '@/lib/notifications'
import { guardAdmin, guardStaff, getAuthUser } from '@/lib/api-auth'

// Modules and lessons are stored INLINE in the course's `description`
// field, after a `===FIA_MODULES===` separator. This is a legacy format
// inherited from the early single-table schema.
//
// When the course-dialog (or any other client) updates the course, the
// description it sends is just the user-visible text portion — the
// modules JSON is stripped from the form (so it doesn't appear in the
// textarea). If we naively overwrote `description` with that value, we
// would LOSE all modules and lessons.
//
// This PUT handler therefore:
//   1) Fetches the existing course description
//   2) Parses out the modules JSON portion (after `===FIA_MODULES===`)
//   3) Re-appends it to the new description before saving
//   4) Recomputes modules_count + lessons_count from the modules JSON
//      (so the body can't accidentally zero them out)

const MODULES_SEPARATOR = '\n\n===FIA_MODULES===\n'

function parseCourseContent(description: string | null | undefined): { description: string; modules: any[] } {
  if (!description) return { description: '', modules: [] }
  const idx = description.indexOf(MODULES_SEPARATOR)
  if (idx === -1) return { description, modules: [] }
  const desc = description.substring(0, idx)
  const jsonStr = description.substring(idx + MODULES_SEPARATOR.length)
  try {
    const modules = JSON.parse(jsonStr)
    if (Array.isArray(modules)) return { description: desc, modules }
  } catch {}
  return { description, modules: [] }
}

function serializeCourseContent(description: string, modules: any[]): string {
  if (!modules || modules.length === 0) return description || ''
  return `${description || ''}${MODULES_SEPARATOR}${JSON.stringify(modules)}`
}

function countModulesAndLessons(modules: any[]): { modules_count: number; lessons_count: number } {
  const modulesCount = modules.length
  const lessonsCount = modules.reduce((acc, m) => acc + ((m.lessons as any[]) || []).length, 0)
  return { modules_count: modulesCount, lessons_count: lessonsCount }
}

/**
 * 🛡️ تعقيم الدورة للعامة — يستبدل JSON الوحدات الكامل (روابط الفيديو/PDF
 * ومحتوى الدروس وإجابات الاختبارات) بمعاينة مناهج آمنة (عناوين فقط)،
 * فلا يسرّب أي زائر محتوى مدفوعاً قبل الدفع.
 */
function sanitizeCourseForPublic(c: any): any {
  if (!c) return c
  const { description, ...rest } = c
  const { description: text, modules } = parseCourseContent(description || '')
  const safeModules = (modules || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description || '',
    position: m.position,
    lessons: ((m.lessons as any[]) || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      lesson_type: l.lesson_type || l.type,
      duration_minutes: l.duration_minutes,
      position: l.position,
      is_preview: !!l.is_preview,
    })),
  }))
  return { ...rest, description: text, __curriculum__: safeModules }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    const isAdmin = authUser?.role === 'admin'
    const slug = req.nextUrl.searchParams.get('slug')
    if (slug) {
      const { data, error } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })
      // 🛡️ الدورات السرية للإدارة — الرابط العام يظهر «غير موجودة» لأي غير إدارة
      if (data.visibility === 'admin_only' && !isAdmin) {
        return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })
      }
      // 🛡️ المحتوى الكامل للإدارة فقط — البقية معاينة مناهج آمنة
      if (!isAdmin) return NextResponse.json(sanitizeCourseForPublic(data))
      return NextResponse.json(data)
    }
    const includeDrafts = req.nextUrl.searchParams.get('include_drafts') === 'true'
    // 🛡️ المسودات والدورات السرية للإدارة حصراً — كانت كلمة واحدة تكشفها للجميع
    const effectiveDrafts = includeDrafts && isAdmin
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '0') || 0
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0
    let query = supabaseAdmin
      .from('courses')
      .select('*')
    // ⚡ Only show published courses to students/visitors.
    // Admins pass include_drafts=true to see ALL courses (published + drafts).
    // This is enforced at the API level so no student client can bypass it.
    if (!effectiveDrafts) {
      query = query.neq('status', 'مسودة')
      // 🛡️ دورات الإدارة السرية (visibility='admin_only') لا تظهر أبداً
      //    للمتدربين أو المدربين أو الزوار — فقط للإدارة في لوحتها.
      query = query.neq('visibility', 'admin_only')
    }
    // ⚡ Pagination: if limit is specified, apply range filtering
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    // 🛡️ القوائم العامة معقّمة — كوبونات التسجيل التلقائي للمسجلين فقط
    const rows = (data || []).map((c: any) => isAdmin ? c : sanitizeCourseForPublic(c))
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 🛡️ إنشاء الدورات: إدارة أو مدرب — لم يكن محمياً إطلاقاً!
    const g = await guardStaff(req)
    if (!g.ok) return g.res
    let body = await req.json()
    // المدرب ينشئ دورته باسمه هو حصراً
    if (g.user.role !== 'admin') body.trainer_id = g.user.id

    // === Duplicate-slug safety net ===
    // If the body doesn't include a slug, or the provided slug already
    // exists in the DB, we generate a unique ASCII slug as a fallback.
    // This prevents "duplicate key value violates unique constraint
    // courses_slug_key" errors when two courses get similar slugs.
    const ensureUniqueSlug = async (attempt: number): Promise<string> => {
      const base = body.slug || 'course'
      const suffix = `${Date.now().toString(36).slice(-6).toUpperCase()}${attempt ? '-' + attempt : ''}`
      return `${base}-${suffix}`.slice(0, 100)
    }

    let attempt = 0
    let data: any = null
    let error: any = null
    // Try up to 3 times with fresh slugs on duplicate-key conflict.
    while (attempt < 3) {
      const result = await supabaseAdmin
        .from('courses')
        .insert(body)
        .select()
        .single()
      data = result.data
      error = result.error
      if (!error) break
      // If it's a duplicate-slug error, regenerate slug and retry.
      if (/duplicate key|courses_slug_key|slug/i.test(error.message || '')) {
        attempt++
        body = { ...body, slug: await ensureUniqueSlug(attempt) }
        continue
      }
      // Other errors — break and surface to caller.
      break
    }
    if (error) throw error

    // Publish to Telegram — every new course gets announced on the channel.
    try {
      await tgCourseCreated(data.id)
    } catch {}

    // ROYAL v4.2 — notify ALL followers of this course's trainer:
    // "المدرب فلان أضاف دورة جديدة" (in-app + FCM push, non-fatal).
    try {
      const profileId = await resolveTrainerProfileId(data.trainer_id)
      if (profileId) {
        const { data: profile } = await supabaseAdmin
          .from('trainers').select('name').eq('id', profileId).maybeSingle()
        await notifyFollowersNewCourse(profileId, profile?.name || 'المدرب', data.title, data.slug)
      }
    } catch {}

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 🛡️ تعديل الدورات: إدارة أو مدرب الدورة نفسها
    const g = await guardStaff(req)
    if (!g.ok) return g.res
    const { id, description, ...otherUpdates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    if (g.user.role !== 'admin') {
      const { data: courseRow } = await supabaseAdmin
        .from('courses').select('trainer_id').eq('id', id).maybeSingle()
      let owns = courseRow?.trainer_id === g.user.id
      if (!owns && courseRow?.trainer_id) {
        const { data: tRow } = await supabaseAdmin
          .from('trainers').select('email, id').eq('id', courseRow.trainer_id).maybeSingle()
        owns = tRow?.email === g.user.email || tRow?.id === g.user.id
      }
      if (!owns) return NextResponse.json({ error: 'غير مصرح — هذه الدورة ليست لك' }, { status: 403 })
    }

    const updates: any = { ...otherUpdates }

    // === PRESERVE MODULES JSON WHEN DESCRIPTION IS UPDATED ===
    // The client sends only the user-visible description text. If the
    // existing course has modules stored inline after
    // `===FIA_MODULES===`, we MUST re-append that modules JSON to the
    // new description — otherwise we would silently delete all
    // modules and lessons.
    if (description !== undefined) {
      // Fetch existing course to read its current description (which
      // may contain the modules JSON).
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('courses')
        .select('description')
        .eq('id', id)
        .maybeSingle()
      if (fetchError) throw fetchError

      const existingDescription = existing?.description || ''
      const { modules } = parseCourseContent(existingDescription)

      // If the new description from the client does NOT contain the
      // modules separator, but the existing description DOES have
      // modules, we re-append the modules JSON to preserve them.
      let newDescription: string
      if (modules.length > 0 && typeof description === 'string' && !description.includes('===FIA_MODULES===')) {
        newDescription = serializeCourseContent(description, modules)
      } else {
        // Either no modules exist, or the client explicitly sent a
        // description that already contains the modules separator —
        // trust the client in that case.
        newDescription = description
      }
      updates.description = newDescription

      // Recompute modules_count + lessons_count from the preserved
      // modules so the body can't accidentally zero them out.
      const counts = countModulesAndLessons(modules)
      updates.modules_count = counts.modules_count
      updates.lessons_count = counts.lessons_count
    } else {
      // No description update — but still strip modules_count and
      // lessons_count from the body if they were set to 0 (which the
      // CourseDialog does), to avoid zeroing them out accidentally.
      if (otherUpdates.modules_count === 0 || otherUpdates.lessons_count === 0) {
        // Lookup existing modules to recompute
        const { data: existing } = await supabaseAdmin
          .from('courses')
          .select('description')
          .eq('id', id)
          .maybeSingle()
        const { modules } = parseCourseContent(existing?.description)
        const counts = countModulesAndLessons(modules)
        updates.modules_count = counts.modules_count
        updates.lessons_count = counts.lessons_count
      }
    }

    // === DEFENSIVE WRITE for new columns (original_price, auto_coupon_code,
    //     offer_type, offer_duration_value, offer_duration_unit, offer_price,
    //     offer_headline) ===
    // These columns were added by migrations 008 + 009. If the migration
    // hasn't been applied yet, OR if PostgREST's schema cache hasn't
    // refreshed, the update will fail with a "column not found" error.
    // We try WITH the new fields first; on column-error, retry without
    // them so the rest of the course can still be saved.
    const NEW_COLUMNS = [
      'original_price', 'auto_coupon_code',
      'offer_type', 'offer_duration_value', 'offer_duration_unit',
      'offer_price', 'offer_headline',
      'exam_duration_minutes', 'retake_fee', 'max_retakes',
    ]
    const hasNewColumns = NEW_COLUMNS.some((c) => c in updates)
    let data: any = null
    let error: any = null
    if (hasNewColumns) {
      const result = await supabaseAdmin
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      data = result.data
      error = result.error
      // If the error is about a missing column, retry without the new
      // columns. This handles both: (a) migration not yet applied, and
      // (b) PostgREST schema cache stale.
      if (error && /could not find the column|column .* does not exist|schema cache/i.test(error.message || '')) {
        const fallback: any = { ...updates }
        for (const c of NEW_COLUMNS) delete fallback[c]
        const retry = await supabaseAdmin
          .from('courses')
          .update(fallback)
          .eq('id', id)
          .select()
          .single()
        data = retry.data
        error = retry.error
      }
    } else {
      const result = await supabaseAdmin
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) throw error

    // Publish update notice to Telegram — every meaningful course update
    // is mirrored on the channel.
    try {
      await tgCourseUpdated(id)
    } catch {}

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 🛡️ حذف الدورات: إدارة أو مدرب الدورة نفسها — كان يحذف أي دورة أي زائر!
    const g = await guardStaff(req)
    if (!g.ok) return g.res
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    if (g.user.role !== 'admin') {
      const { data: courseRow } = await supabaseAdmin
        .from('courses').select('trainer_id').eq('id', id).maybeSingle()
      let owns = courseRow?.trainer_id === g.user.id
      if (!owns && courseRow?.trainer_id) {
        const { data: tRow } = await supabaseAdmin
          .from('trainers').select('email, id').eq('id', courseRow.trainer_id).maybeSingle()
        owns = tRow?.email === g.user.email || tRow?.id === g.user.id
      }
      if (!owns) return NextResponse.json({ error: 'غير مصرح — هذه الدورة ليست لك' }, { status: 403 })
    }

    // ====== CASCADE DELETE — remove ALL related rows ======
    // When a course is deleted, we must also delete:
    //   - payments/enrollments for this course (would otherwise orphan)
    //   - certificates for this course
    //   - certificate_requests for this course
    //   - reviews for this course
    //   - exam_questions + exam_attempts for this course
    //   - forum_topics for this course (if any)
    //   - lesson_progress rows for this course
    //   - course_progress rows for this course
    // The course row itself is deleted last. We use service_role
    // (supabaseAdmin) so RLS doesn't block us. Errors are swallowed
    // per-table because some tables/columns might not exist on every
    // install — we don't want to fail the whole delete because one
    // optional side-table is missing.
    const cascade = async (table: string, column: string) => {
      try {
        await supabaseAdmin.from(table).delete().eq(column, id)
      } catch {}
    }

    // 1) Enrollments/payments (stored in `payments` table creatively)
    await cascade('payments', 'course_id')
    // 2) Certificates
    await cascade('certificates', 'course_id')
    // 3) Certificate requests
    await cascade('certificate_requests', 'course_id')
    // 4) Reviews
    await cascade('reviews', 'course_id')
    // 5) Exam questions + attempts
    await cascade('exam_questions', 'course_id')
    await cascade('exam_attempts', 'course_id')
    // 6) Forum topics tied to this course
    await cascade('forum_topics', 'course_id')
    // 7) Progress tracking
    await cascade('lesson_progress', 'course_id')
    await cascade('course_progress', 'course_id')

    // 8) Fetch the course title BEFORE deleting (for the Telegram notification)
    let courseTitle = 'دورة'
    try {
      const { data: cRow } = await supabaseAdmin.from('courses').select('title').eq('id', id).maybeSingle()
      if (cRow?.title) courseTitle = cRow.title
    } catch {}

    // 9) Finally delete the course itself
    const { error } = await supabaseAdmin.from('courses').delete().eq('id', id)
    if (error) throw error

    // 10) Publish deletion notice to Telegram
    try {
      await tgCourseDeleted(courseTitle)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
