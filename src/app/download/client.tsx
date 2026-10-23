'use client'

/**
 * ============================================================================
 * FIA ACADEMY — صفحة تحميل التطبيق الرسمية (/download)
 * ============================================================================
 * صفحة فاخرة سينمائية بالهوية الكاملة للأكاديمية (كحلي داكن × ذهبي):
 *  • سماء متحركة بنجوم تتلألأ + هالات ضوئية (Aurora) بلا أي مكتبات — CSS فقط
 *  • زر تنزيل ذهبي نابض بالضوء → الرابط الثابت للأحدث على GitHub
 *  • رقم الإصدار وحجم الملف يُجلبان حياً من GitHub API مع قيم احتياطية
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

const APK_URL =
  'https://github.com/ForexYemeni/FIA-Academy-App/releases/latest/download/FIA-Academy.apk'

const FALLBACK_VERSION = '2.7.1'
const FALLBACK_DATE = '2026-10-23T00:14:14Z'

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

  // جلب أحدث إصدار وحجمه من GitHub — بقيم احتياطية عند أي فشل
  useEffect(() => {
    let alive = true
    try {
      const cached = sessionStorage.getItem('fia-apk-meta')
      if (cached) {
        const c = JSON.parse(cached)
        if (c?.version) setVersion(c.version)
        if (c?.size) setSize(c.size)
        if (c?.updated) setUpdated(c.updated)
      }
    } catch {}
    fetch('https://api.github.com/repos/ForexYemeni/FIA-Academy-App/releases/latest')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('api'))))
      .then((d) => {
        if (!alive || !d) return
        const v = String(d.tag_name || '').replace(/^v/, '') || FALLBACK_VERSION
        const asset = Array.isArray(d.assets)
          ? d.assets.find((a: any) => a.name === 'FIA-Academy.apk') || d.assets[0]
          : null
        const s = asset?.size ? formatSize(asset.size) : ''
        const dt = d.published_at ? formatDate(d.published_at) : ''
        setVersion(v)
        if (s) setSize(s)
        if (dt) setUpdated(dt)
        try {
          sessionStorage.setItem(
            'fia-apk-meta',
            JSON.stringify({ version: v, size: s, updated: dt })
          )
        } catch {}
      })
      .catch(() => {
        if (!alive) return
        setVersion((cur) => cur || FALLBACK_VERSION)
      })
    return () => {
      alive = false
    }
  }, [])

  // توليد رمز QR للرابط
  useEffect(() => {
    QRCode.toDataURL(APK_URL, {
      margin: 1,
      width: 640,
      errorCorrectionLevel: 'M',
      color: { dark: '#101a33', light: '#ffffff' },
    })
      .then((url) => setQr(url))
      .catch(() => setQr(''))
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
              التطبيق موقّع رسمياً من الأكاديمية وآمن 100% — وإن كان لديك إصدار قديم لم يكتمل التثبيت فوقه فأزِله أولاً ثم ثبّت من جديد
            </p>
          </div>
        </div>

        {/* === التذييل === */}
        <p className="fia-dl-footer">
          نحو مستقبل أفضل معاً ✦ أكاديمية المستقبل الدولية
        </p>
      </div>

      {/* === الأنماط — CSS خالص بلا مكتبات === */}
      <style jsx global>{`
        .fia-dl-root {
          min-height: 100vh;
          background:
            radial-gradient(1200px 700px at 80% -10%, #1b2c55 0%, transparent 60%),
            radial-gradient(900px 600px at 10% 110%, #17244a 0%, transparent 55%),
            linear-gradient(180deg, #0b1226 0%, #0d1630 55%, #0b1226 100%);
          color: #f4f1e6;
          overflow-x: hidden;
          position: relative;
          font-family: var(--font-cairo), 'Cairo', sans-serif;
        }
        .fia-dl-sky {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .fia-dl-star {
          position: absolute;
          border-radius: 50%;
          background: #e9dfae;
          opacity: 0.65;
          box-shadow: 0 0 6px 1px rgba(233, 223, 174, 0.55);
          animation: fia-dl-twinkle 3s ease-in-out infinite;
        }
        @keyframes fia-dl-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 0.95; transform: scale(1.15); }
        }
        .fia-dl-aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.35;
          animation: fia-dl-float 14s ease-in-out infinite;
        }
        .fia-dl-aurora-1 {
          width: 480px; height: 480px;
          background: radial-gradient(circle, #c9a227 0%, transparent 65%);
          top: -140px; left: -120px;
        }
        .fia-dl-aurora-2 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, #2f4a8a 0%, transparent 65%);
          bottom: -120px; right: -100px;
          animation-delay: -5s;
        }
        .fia-dl-aurora-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #d4af37 0%, transparent 60%);
          top: 40%; left: 55%;
          opacity: 0.18;
          animation-delay: -9s;
        }
        @keyframes fia-dl-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-28px) scale(1.06); }
        }
        .fia-dl-wrap {
          position: relative;
          z-index: 1;
          max-width: 680px;
          margin: 0 auto;
          padding: 56px 20px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .fia-dl-logo {
          width: 96px; height: 96px;
          border-radius: 24px;
          object-fit: contain;
          background: #fff;
          padding: 8px;
          box-shadow:
            0 0 0 2px rgba(212, 175, 55, 0.55),
            0 12px 42px rgba(212, 175, 55, 0.28),
            0 4px 18px rgba(0, 0, 0, 0.45);
          animation: fia-dl-rise 0.9s ease both;
        }
        .fia-dl-title {
          margin: 20px 0 6px;
          font-size: clamp(24px, 5.5vw, 34px);
          font-weight: 800;
          color: #f4e9c8;
          letter-spacing: 0.2px;
          text-shadow: 0 2px 22px rgba(212, 175, 55, 0.35);
          animation: fia-dl-rise 0.9s 0.1s ease both;
        }
        .fia-dl-sub {
          margin: 0 0 18px;
          font-size: clamp(14px, 3.6vw, 17px);
          color: #b9c3dd;
          animation: fia-dl-rise 0.9s 0.18s ease both;
        }
        @keyframes fia-dl-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fia-dl-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-bottom: 26px;
          animation: fia-dl-rise 0.9s 0.26s ease both;
        }
        .fia-dl-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: #e9dfae;
          background: rgba(212, 175, 55, 0.10);
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 999px;
          padding: 6px 14px;
          backdrop-filter: blur(6px);
        }
        /* === الزر الذهبي === */
        .fia-dl-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 16px 34px;
          border-radius: 18px;
          text-decoration: none;
          background: linear-gradient(135deg, #f0d67a 0%, #d4af37 38%, #b8912a 100%);
          color: #14203d;
          box-shadow:
            0 10px 34px rgba(212, 175, 55, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.55);
          transition: transform 0.15s ease, box-shadow 0.25s ease;
          animation: fia-dl-rise 0.9s 0.34s ease both;
        }
        .fia-dl-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 16px 44px rgba(212, 175, 55, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        .fia-dl-btn-press { transform: scale(0.97); }
        .fia-dl-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 18px;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.5) 48%, transparent 62%);
          background-size: 250% 100%;
          animation: fia-dl-shine 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes fia-dl-shine {
          0% { background-position: 220% 0; }
          55%, 100% { background-position: -120% 0; }
        }
        .fia-dl-btn-icon { width: 26px; height: 26px; flex: none; }
        .fia-dl-btn-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.35; }
        .fia-dl-btn-text strong { font-size: 18px; font-weight: 800; }
        .fia-dl-btn-text small { font-size: 12px; font-weight: 700; opacity: 0.8; }
        /* === الميزات === */
        .fia-dl-features {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin: 30px 0 34px;
          animation: fia-dl-rise 0.9s 0.42s ease both;
        }
        .fia-dl-feature {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #dfe6f5;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 10px 16px;
          backdrop-filter: blur(8px);
        }
        .fia-dl-feature-icon { width: 17px; height: 17px; color: #d4af37; }
        /* === البطاقات === */
        .fia-dl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
          width: 100%;
          animation: fia-dl-rise 0.9s 0.5s ease both;
        }
        .fia-dl-card {
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(212, 175, 55, 0.22);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
          text-align: center;
        }
        .fia-dl-card-head {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 800;
          font-size: 15px;
          color: #f4e9c8;
          margin-bottom: 14px;
        }
        .fia-dl-qr {
          width: 168px; height: 168px;
          border-radius: 14px;
          background: #fff;
          padding: 8px;
          margin: 0 auto;
          display: block;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
        }
        .fia-dl-qr-placeholder {
          background: linear-gradient(135deg, #1b2c55, #101a33);
          animation: fia-dl-twinkle 2.4s ease-in-out infinite;
        }
        .fia-dl-card-note { font-size: 11.5px; color: #8f9ab5; margin: 12px 0 0; }
        .fia-dl-steps {
          list-style: none;
          margin: 0; padding: 0;
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fia-dl-steps li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          color: #dfe6f5;
          line-height: 1.6;
        }
        .fia-dl-steps li span {
          flex: none;
          width: 24px; height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.16);
          border: 1px solid rgba(212, 175, 55, 0.45);
          color: #e9dfae;
          font-weight: 800;
          font-size: 12px;
          margin-top: 2px;
        }
        .fia-dl-footer {
          margin: 36px 0 0;
          font-size: 12.5px;
          color: #7f8aa8;
          letter-spacing: 0.4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .fia-dl-star, .fia-dl-aurora, .fia-dl-btn::before { animation: none !important; }
        }
      `}</style>
    </main>
  )
}
