'use client'

/**
 * ============================================================================
 * أكاديمية المستقبل الدولية — صفحة تحميل التطبيق الرسمية (/download)
 * ============================================================================
 * صفحة فاخرة سينمائية بالهوية الكاملة للأكاديمية (كحلي داكن × ذهبي):
 *  • سماء متحركة بنجوم تتلألأ + هالات ضوئية (Aurora) بلا أي مكتبات — CSS فقط
 *  • زر تنزيل ذهبي نابض بالضوء → ملف التطبيق الرسمي المستضاف على الموقع
 *  • رقم الإصدار وحجم الملف يُجلبان حياً مع قيم احتياطية معتمدة
 *  • رمز QR للرابط (مكتبة qrcode الموجودة أصلاً) لمشاركة سريعة
 *  • خطوات التثبيت الثلاث بتصميم زجاجي
 * ============================================================================
 */

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  CalendarDays,
  Download,
  Bell,
  Award,
  GraduationCap,
  QrCode as QrIcon,
  Smartphone,
  ShieldCheck,
  Star,
} from 'lucide-react'

const APK_URL = '/apk/Future-International-Academy-v2.9.2.apk'

// 🧾 بيانات الإصدار الرسمي — تُحدّث مع كل إصدار جديد من التطبيق
// v2.9.2 (versionCode 23) — التوقيع الأصلي للأكاديمية استُعيد وأُعيد إصدارها به:
// خصوصية «مكتبتي» الكاملة + إصلاح كامل لاستقرار الإقلاع
// ✔ تُثبّت مباشرة فوق التطبيق الأصلي (v2.9.1 فما دون) دون أي حذف — نفس التوقيع
const FALLBACK_VERSION = '2.9.2'
const FALLBACK_DATE = '2026-10-25T21:35:00Z'

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

// تنسيق تاريخ ISO إلى عربي قرص (بتوقيت UTC لثبات التاريخ على كل الأجهزة)
function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  } catch {
    return ''
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} ميجابايت`
}

export default function DownloadClient() {
  // قيم معروضة فوراً من الثوابت المعتمدة، ثم تُنقّح حياً من GitHub إن توفر
  const [version, setVersion] = useState<string | null>(FALLBACK_VERSION)
  const [updated, setUpdated] = useState<string | null>(formatDate(FALLBACK_DATE))
  const [size, setSize] = useState<string | null>(null)
  const [qr, setQr] = useState<string>('')
  const [pressed, setPressed] = useState(false)

  // جلب حجم ملف التطبيق المستضاف على الموقع نفسه — بقيم ثابتة للإصدار والتاريخ
  useEffect(() => {
    let alive = true
    try {
      const cached = sessionStorage.getItem('academy-apk-meta')
      if (cached) {
        const c = JSON.parse(cached)
        if (c?.size) setSize(c.size)
      }
    } catch {}
    try {
      fetch(APK_URL, { method: 'HEAD' })
        .then((r) => {
          if (!alive || !r.ok) return
          const len = Number(r.headers.get('content-length') || 0)
          const s = len ? formatSize(len) : ''
          if (s) {
            setSize(s)
            try { sessionStorage.setItem('academy-apk-meta', JSON.stringify({ size: s })) } catch {}
          }
        })
        .catch(() => {})
    } catch {}
    return () => {
      alive = false
    }
  }, [])

  // توليد رمز QR للرابط المطلق الحالي (يعمل من أي جهاز)
  useEffect(() => {
    let alive = true
    try {
      const abs = `${window.location.origin}${APK_URL}`
      QRCode.toDataURL(abs, {
        margin: 1,
        width: 640,
        errorCorrectionLevel: 'M',
        color: { dark: '#101a33', light: '#ffffff' },
      })
        .then((url) => { if (alive) setQr(url) })
        .catch(() => { if (alive) setQr('') })
    } catch {}
    return () => {
      alive = false
    }
  }, [])

  return (
    <main className="fia-dl-root" dir="rtl">
      {/* === السماء: نجوم + هالات === */}
      <div className="fia-dl-sky" aria-hidden="true">
        <div className="fia-dl-aurora fia-dl-aurora-1" />
        <div className="fia-dl-aurora fia-dl-aurora-2" />
        <div className="fia-dl-aurora fia-dl-aurora-3" />
        {Array.from({ length: 42 }).map((_, i) => {
          const top = (i * 37 + 13) % 100
          const left = (i * 53 + 29) % 100
          const delay = (i % 9) * 0.7
          const dur = 2.6 + (i % 5) * 0.9
          const sz = i % 7 === 0 ? 3 : 2
          return (
            <span
              key={i}
              className="fia-dl-star"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: sz,
                height: sz,
                animationDelay: `${delay}s`,
                animationDuration: `${dur}s`,
              }}
            />
          )
        })}
      </div>

      <div className="fia-dl-wrap">
        {/* === الشعار والعنوان === */}
        <img
          src="/fia/logo-fia.png"
          alt="شعار أكاديمية المستقبل الدولية"
          className="fia-dl-logo"
          width={96}
          height={96}
        />
        <h1 className="fia-dl-title">أكاديمية المستقبل الدولية</h1>
        <p className="fia-dl-sub">
          الأكاديمية كاملة في جيبك — بحضورٍ فاخرٍ يليق بك
        </p>

        {/* === شارة الإصدار === */}
        <div className="fia-dl-chips">
          <span className="fia-dl-chip">
            <ShieldCheck className="w-4 h-4" />
            {version ? `الإصدار ${version}` : 'أحدث إصدار'}
          </span>
          {updated && (
            <span className="fia-dl-chip">
              <CalendarDays className="w-4 h-4" />
              {`آخر تحديث: ${updated}`}
            </span>
          )}
          {size && (
            <span className="fia-dl-chip">
              <Smartphone className="w-4 h-4" />
              {size}
            </span>
          )}
          <span className="fia-dl-chip">
            <Star className="w-4 h-4" />
            أندرويد 8.0+
          </span>
        </div>

        {/* === زر التنزيل الذهبي === */}
        <a
          href={APK_URL}
          className={`fia-dl-btn ${pressed ? 'fia-dl-btn-press' : ''}`}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
        >
          <span className="fia-dl-btn-glow" aria-hidden="true" />
          <Download className="fia-dl-btn-icon" />
          <span className="fia-dl-btn-text">
            <strong>تحميل التطبيق الآن</strong>
            <small>نسخة أندرويد الرسمية — مجانية</small>
          </span>
        </a>

        {/* 👑 بطاقة دليل التحديث الفاخرة — v2.9.2 بالتوقيع الأصلي */}
        <div className="fia-dl-guide">
          <div className="fia-dl-guide-head">
            <ShieldCheck className="fia-dl-guide-icon" />
            <div>
              <strong>دليل التحديث الذكي — v2.9.2</strong>
              <span>التوقيع الأصلي للأكاديمية — التحديث المباشر يعمل دون أي حذف</span>
            </div>
          </div>
          <div className="fia-dl-guide-rows">
            <div className="fia-dl-guide-row">
              <span className="fia-dl-guide-badge fia-dl-badge-gold">الحالة ١</span>
              <p>لديك التطبيق الأصلي (v2.9.1 أو أقدم)؟ — <strong>ثبّت v2.9.2 فوقه مباشرة دون أي حذف</strong> — نفس التوقيع الرسمي، وبياناتك ودوراتك تظل كما هي تماماً.</p>
            </div>
            <div className="fia-dl-guide-row">
              <span className="fia-dl-guide-badge">الحالة ٢</span>
              <p>ثبّتَ التجريبية <strong>v2.9.2 أو v2.9.3</strong> القديمتين (أيام الإصلاح الأولى)؟ — أزلها <strong>مرة واحدة</strong> ثم ثبّت هذه النسخة الرسمية، وبعدها كل التحديثات تتم بضغطة واحدة.</p>
            </div>
          </div>
          <p className="fia-dl-guide-note">
            إن ظهرت رسالة النظام القياسية عند التنزيل («قد يكون هذا الملف ضاراً») فهذا تنبيه أندرويد الاعتيادي لأي تطبيق خارج المتجر — اختر «الاحتفاظ على أي حال» فالتطبيق موقّع بنفس شهادة الأكاديمية الأصلية (42dfab26…) وآمن بالكامل.
          </p>
        </div>

        {/* === الميزات === */}
        <div className="fia-dl-features">
          <div className="fia-dl-feature">
            <Bell className="fia-dl-feature-icon" />
            <span>إشعارات فورية حتى والتطبيق مغلق</span>
          </div>
          <div className="fia-dl-feature">
            <Award className="fia-dl-feature-icon" />
            <span>شهادات معتمدة بضغطة واحدة</span>
          </div>
          <div className="fia-dl-feature">
            <GraduationCap className="fia-dl-feature-icon" />
            <span>دورات وامتحانات تفاعلية</span>
          </div>
        </div>

        {/* === بطاقة QR + خطوات التثبيت === */}
        <div className="fia-dl-grid">
          <div className="fia-dl-card">
            <div className="fia-dl-card-head">
              <QrIcon className="w-5 h-5" />
              امسح للتحميل
            </div>
            {qr ? (
              <img
                src={qr}
                alt="رمز QR لتحميل التطبيق"
                className="fia-dl-qr"
                width={168}
                height={168}
              />
            ) : (
              <div className="fia-dl-qr fia-dl-qr-placeholder" />
            )}
            <p className="fia-dl-card-note">وجّه كاميرا هاتفك نحو الرمز</p>
          </div>

          <div className="fia-dl-card">
            <div className="fia-dl-card-head">
              <Smartphone className="w-5 h-5" />
              خطوات التثبيت
            </div>
            <ol className="fia-dl-steps">
              <li>
                <span>1</span>حمّل ملف APK من الزر أو رمز QR
              </li>
              <li>
                <span>2</span>افتح الملف واسمح بالتثبيت من «مصادر غير معروفة»
              </li>
              <li>
                <span>3</span>سجّل دخولك واستمتع — كل شيء سيكون كما حفظته
              </li>
            </ol>
            <p className="fia-dl-card-note">
              التطبيق موقّع رسمياً من الأكاديمية وآمن 100% — تحذيرات المتصفح القياسية أثناء تنزيل ملفات APK طبيعية وتُتجاهَل بأمان
            </p>
          </div>
        </div>

        {/* === التذييل === */}
        <p className="fia-dl-footer">
          نحو مستقبل أفضل معاً ✦ أكاديمية المستقبل الدولية
        </p>
      </div>

      {/* 👑 v10.2 — الأنماط نُقلت إلى download.css الحقيقي المُخدَم عبر <link> — صفر وميض أبيض (FOUC) */}
    </main>
  )
}
