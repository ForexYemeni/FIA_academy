// ============================================================================
// إنشاء الدورتين الملكيتين عبر واجهة الإنتاج الحقيقية (فيُنشر تلجرام مرة
// واحدة بشكل فاخر كما في أي دورة) + التسجيل التلقائي + بنك الأسئلة
// ============================================================================
import pg from 'pg'

const SITE = 'https://fiaacademy.vercel.app'
const pool = new pg.Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.tzquudmfazysjogorrxz', password: 'm773057153M',
  ssl: { rejectUnauthorized: false }, max: 1,
})

const { courseA } = await import('./courseA-data.mjs')
const { courseB } = await import('./courseB-data.mjs')

const MODULES_SEP = '\n\n===FIA_MODULES===\n'
const mid = (i) => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}`
const lid = (i) => `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}`

function serializeModules(course) {
  const modules = course.modules.map((m, mi) => {
    const moduleId = mid(mi)
    const lessons = m.lessons.map((l, li) => ({
      id: lid(`${mi}_${li}`),
      module_id: moduleId,
      title: l.title,
      lesson_type: l.lesson_type,
      content: l.content,
      video_url: l.video_url || null,
      pdf_url: l.pdf_url || null,
      duration_minutes: l.duration_minutes || 5,
      position: li,
      is_preview: !!l.is_preview,
    }))
    return { id: moduleId, course_id: null, title: m.title, description: m.description || '', position: mi, lessons }
  })
  return modules
}

async function createCourse(course) {
  // عدم التكرار: تحقق من الـ slug أولاً
  const check = await fetch(`${SITE}/api/courses?slug=${course.slug}`)
  if (check.ok) {
    const existing = await check.json()
    if (existing && existing.id) {
      console.log(`SKIP (موجودة مسبقاً): ${course.title} → ${existing.id}`)
      return existing
    }
  }

  const modules = serializeModules(course)
  const lessonsCount = modules.reduce((a, m) => a + m.lessons.length, 0)
  const body = {
    title: course.title,
    slug: course.slug,
    short_description: course.short_description,
    description: `${course.description}${MODULES_SEP}${JSON.stringify(modules)}`,
    category: course.category,
    specialization: course.specialization,
    level: course.level,
    price_type: course.price_type,
    price: course.price,
    currency: course.currency,
    duration_hours: course.duration_hours,
    modules_count: modules.length,
    lessons_count: lessonsCount,
    pass_score: course.pass_score,
    attempts: course.attempts,
    exam_duration_minutes: course.exam_duration_minutes,
    retake_fee: course.retake_fee,
    max_retakes: course.max_retakes,
    certificate_type: course.certificate_type,
    cover: course.cover,
    status: course.status,
    visibility: course.visibility,
    featured: course.featured,
    trainer_id: null,
  }

  const res = await fetch(`${SITE}/api/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || !data?.id) {
    console.error('CREATE FAILED:', course.title, res.status, JSON.stringify(data).slice(0, 300))
    process.exit(1)
  }
  console.log(`CREATED: ${course.title} → ${data.id} (${modules.length} وحدة، ${lessonsCount} درساً)`)
  return data
}

async function enrollAll(courseId, opts) {
  // opts: { usersRoles: string[]|null, includeTrainers: bool }
  let targets = []
  const rolesFilter = opts.usersRoles ? opts.usersRoles.map((r) => `'${r}'`).join(',') : null

  if (rolesFilter) {
    const { rows } = await pool.query(`SELECT id FROM users WHERE role IN (${rolesFilter})`)
    targets.push(...rows.map((r) => r.id))
  }
  if (opts.includeTrainers) {
    const { rows } = await pool.query('SELECT id FROM trainers')
    targets.push(...rows.map((r) => r.id))
  }
  // استبعاد من سبق تسجيله في هذه الدورة (أي دفعة موجودة)
  const { rows: already } = await pool.query('SELECT user_id FROM payments WHERE course_id = $1', [courseId])
  const done = new Set(already.map((r) => r.user_id))
  targets = targets.filter((id) => id && !done.has(id))

  for (const userId of targets) {
    await pool.query(
      `INSERT INTO payments (amount, currency, method, status, reference, date, user_id, course_id)
       VALUES (0, 'ر.ي', 'تسجيل مجاني ملكي — دليل الأكاديمية', 'مكتمل', 'GUIDE-FREE', now(), $1, $2)`,
      [userId, courseId]
    )
  }
  console.log(`ENROLLED ${targets.length} مستخدماً جديداً في ${courseId}`)
  return targets.length
}

async function insertExamQuestions(courseId, questions) {
  const { rows: exist } = await pool.query('SELECT count(*)::int AS n FROM exam_questions WHERE course_id = $1', [courseId])
  if (exist[0].n > 0) { console.log(`SKIP exam questions (${exist[0].n} موجودة)`); return }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    await pool.query(
      `INSERT INTO exam_questions (course_id, question_type, prompt, options, correct_answer, explanation, difficulty, points, status)
       VALUES ($1, 'mcq', $2, $3, $4, $5, 'متوسط', 1, 'نشط')`,
      [courseId, q.question, JSON.stringify(q.options), JSON.stringify(q.answer), q.explanation || null]
    )
  }
  console.log(`EXAM QUESTIONS: أُضيف ${questions.length} سؤالاً للدورة ${courseId}`)
}

async function refreshEnrolledCount(courseId) {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM payments WHERE course_id = $1', [courseId])
  await pool.query('UPDATE courses SET enrolled = $1, updated_at = now() WHERE id = $2', [rows[0].n, courseId])
  console.log(`ENROLLED COUNT ${courseId} → ${rows[0].n}`)
}

// ===== التنفيذ =====
const A = await createCourse(courseA)
const B = await createCourse(courseB)

// التسجيل: دورة الإدارة للمدراء فقط — دورة الاستخدام للجميع
await enrollAll(A.id, { usersRoles: ['admin'], includeTrainers: false })
await enrollAll(B.id, { usersRoles: null, includeTrainers: true })

// بنك أسئلة الاختبار الرسمي لدورة الاستخدام (يظهر في تبويب الاختبارات للمتدربين)
const examB = [
  { question: 'ما أول ما يظهر لك بعد الاشتراك الناجح في دورة مجانية؟', options: ['رسالة فاتورة للسداد', 'الدورة تظهر في «دوراتي» وتُفتح دروسها لك', 'طلب كلمة مرور جديدة', 'إلغاء الاشتراك التلقائي'], explanation: 'الدورات المجانية تُفتح فوراً وتظهر في «دوراتي».', },
  { question: 'كيف يُسجَّل إكمال درس الفيديو؟', options: ['بضغط زر «فهمت» يدوياً', 'عند مشاهدة الفيديو حتى النهاية', 'بإغلاق الصفحة', 'لا يُسجل إكمال للفيديو'], explanation: 'المشاهدة حتى النهاية تُكمل الدرس تلقائياً.' },
  { question: 'قبل أي تسجيلٍ في دورة مدفوعة، ما الطقوس الذكية الموصى بها؟', options: ['الدفع فوراً بدون قراءة', 'قراءة المنهج + تجربة الدرس المجاني + قراءة التقييمات', 'سؤال الأصدقاء فقط', 'اختيار أرخص دورة دائماً'], explanation: 'ثلاث دقائق من التدقيق توفر ندم الطويل.' },
  { question: 'ماذا تفعل عند رفض طلب الدفع رغم تحويلك؟', options: ['تدفع من جديد فوراً', 'تراسل «تواصل معنا» برقم الحوالة', 'تنشئ حساباً جديداً', 'تنسى الأمر'], explanation: 'رقم الحوالة هو بصمة مالك ويُحل الموضوع فوراً.' },
  { question: 'ما درجة النجاح الافتراضية في اختبار هذه الدورة؟', options: ['50%', '70%', '100%', 'لا يوجد اختبار'], explanation: 'النجاح من 70% في هذه الدورة.' },
  { question: 'أين تجد أرشيف إشعاراتك كاملاً؟', options: ['في بريدك الإلكتروني فقط', 'في جرس الإشعارات أعلى الشاشة', 'في المنتدى', 'في ملفك الشخصي'], explanation: 'الجرس يفتح كل إشعار بتفاصيله وزر انتقال مباشر.' },
  { question: 'كيف يستفيد المتدرب من «المعاينة المجانية» لأول درس؟', options: ['لا فائدة منها', 'يتذوق جودة الدورة قبل التسجيل أو الشراء', 'يفتح كل الدروس', 'تحصل على خصم'], explanation: 'المعاينة المجانية أقوى أداة إقناع في صفحة الدورة.' },
  { question: 'في قسم «أرباحي» للمدرب، كيف تُعرض الأرصدة؟', options: ['بعملة واحدة مدمجة', 'بكل عملةٍ على حدة فلا يختلط الدولار بالريال', 'بالذهب الافتراضي', 'برصيد مخفي'], explanation: 'ما رُبح بعملةٍ يُسحب بعملتها.' },
  { question: 'ما الإرفاق الإلزامي في طلب سحب الأرباح؟', options: ['صورة الهوية الشخصية', 'لقطة إثبات للتحويل أو بيانات الحساب', 'شهادة الدورة', 'لا يلزم أي إرفاق'], explanation: 'الإثبات إلزامي لحماية المدرب والإدارة معاً.' },
  { question: 'أين يستطيع أي جهةٍ التحقق من شهادتك؟', options: ['في المنتدى', 'صفحة «تحقق الشهادة» بالموقع برقم الشهادة أو رمز QR', 'في تلجرام', 'لا يمكن التحقق'], explanation: 'كل شهادة تحمل رقماً فريداً يمكن التحقق منه فوراً.' },
]
await insertExamQuestions(B.id, examB)
// دورة الإدارة: أسئلتها الحية مدمجة في درس الاختبار التفاعلي نفسه
await refreshEnrolledCount(A.id)
await refreshEnrolledCount(B.id)

await pool.end()
console.log('\n✅ DONE — الدورتان الملكيتان جاهزتان')
console.log(`   الإدارة: ${A.id} (admin_only)`)
console.log(`   المستخدمون: ${B.id} (public)`)
