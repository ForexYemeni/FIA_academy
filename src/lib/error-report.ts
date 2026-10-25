// 👑 v10.6 — مراقبة الأخطاء الحية (طرف العميل)
// ============================================================================
// يلتقط كل أعطال الواجهة (أخطاء غير مُعالَجة + وعود مرفوضة + فشل موارد)
// ويرسلها للإدارة كإشعار حي عبر /api/error-reports — بذكاء مضاد للفيضان:
//   • بصمة الخطأ (message+أول سطر تتبع) لا تُرسل مرتين خلال 60 دقيقة
//   • سقف صارم: 12 تقريراً كحد أقصى كل 5 دقائق في الجلسة كلها
//   • أخطاء الإضافات/الشبكة المنخفضة تُتجاهل بهدوء (noise filter)
// ============================================================================

const DEDUP_KEY = 'fia-error-dedup-v1'
const WINDOW_MS = 60 * 60 * 1000 // بصمة واحدة كل ساعة
const MAX_PER_WINDOW = 12
let sentCount = 0
let windowStart = Date.now()

type DedupMap = Record<string, number>

function readDedup(): DedupMap {
  try { return JSON.parse(localStorage.getItem(DEDUP_KEY) || '{}') } catch { return {} }
}
function writeDedup(map: DedupMap) {
  try { localStorage.setItem(DEDUP_KEY, JSON.stringify(map)) } catch {}
}

function fingerprint(message: string, stack: string): string {
  const seed = `${message}|${(stack || '').split('\n').slice(0, 2).join('|')}`
  let h1 = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i)
    h1 = Math.imul(h1, 0x01000193)
  }
  return (h1 >>> 0).toString(16).padStart(8, '0')
}

// ضجيج مُستبعد — لا قيمة لإشعارات الإدارة به
const NOISE = [
  /ResizeObserver loop/i,
  /Script error\.?$/i,
  /ERR_NETWORK_CHANGED/i,
  /net::ERR/i,
  /Load failed/i,
  /scheduler\.flush/i,
  /Non-Error promise rejection/i,
]

function report(message: string, stack: string, severity: 'critical' | 'error' | 'warning') {
  try {
    // نافذة العدّ
    const now = Date.now()
    if (now - windowStart > 5 * 60 * 1000) {
      windowStart = now
      sentCount = 0
    }
    if (sentCount >= MAX_PER_WINDOW) return

    // ضجيج؟
    if (NOISE.some((re) => re.test(message) || re.test(stack || ''))) return

    // تكرار؟
    const fp = fingerprint(message, stack)
    const dedup = readDedup()
    if (dedup[fp] && now - dedup[fp] < WINDOW_MS) return
    dedup[fp] = now
    // نظّف البصمات الأقدم من 24 ساعة
    for (const k of Object.keys(dedup)) {
      if (now - dedup[k] > 24 * 60 * 60 * 1000) delete dedup[k]
    }
    writeDedup(dedup)

    sentCount++
    fetch('/api/error-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack,
        url: location.href.slice(0, 300),
        severity,
        fingerprint: fp,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

/** يُركَّب مرة واحدة في طبقة التجربة الملكية — يلتقط كل شيء ويرسل بهدوء */
export function installErrorWatcher() {
  if (typeof window === 'undefined') return
  const w = window as any
  if (w.__fiaErrorWatcher) return
  w.__fiaErrorWatcher = true

  window.addEventListener('error', (e: ErrorEvent) => {
    if (e?.error) {
      report(e.error.message || String(e.error), e.error.stack || '', 'error')
    } else if (e?.message) {
      report(e.message, '', 'warning')
    }
  }, { passive: true })

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const r: any = e?.reason
    if (r instanceof Error) report(r.message, r.stack || '', 'error')
    else if (r) report(String(r).slice(0, 400), '', 'warning')
  }, { passive: true })
}
