// Validate both course data files: structure + inline exam JSON
import { courseA } from './courseA-data.mjs'
import { courseB } from './courseB-data.mjs'

function validate(c, name) {
  const lessons = c.modules.flatMap((m) => m.lessons)
  let ok = true
  for (const l of lessons) {
    if (!l.title || !l.lesson_type || !l.content) { console.log(`✗ ${name} درس ناقص:`, l.title); ok = false }
    if (l.lesson_type === 'exam') {
      try {
        const j = JSON.parse(l.content)
        if (!Array.isArray(j)) throw new Error('not array')
        for (const q of j) {
          if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) {
            throw new Error('bad question: ' + q.question?.slice(0, 30))
          }
        }
      } catch (e) { console.log(`✗ ${name} exam JSON:`, e.message); ok = false }
    }
  }
  console.log(`${ok ? '✓' : '✗'} ${name}: ${c.modules.length} وحدة / ${lessons.length} درساً / أسئلة الامتحان سليمة`)
  return ok
}
const a = validate(courseA, 'A (الإدارة)')
const b = validate(courseB, 'B (المستخدمون)')
process.exit(a && b ? 0 : 1)
