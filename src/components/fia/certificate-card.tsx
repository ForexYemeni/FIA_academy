/**
 * ============================================================================
 * FIA ACADEMY — LUXURY CERTIFICATE COMPONENT (LANDSCAPE A4 + EXPORT-SAFE)
 * ============================================================================
 *
 * A unified, reusable certificate component for أكاديمية المستقبل الدولية
 * (Future International Academy). Renders the on-screen certificate preview
 * AND is the source element for high-quality PNG/PDF export.
 *
 * DESIGN: LANDSCAPE A4 (matching the official reference cert)
 * ==========================================================
 * Aspect ratio: 1.4142 (√2, ISO A4 ratio)
 * Reference dimensions: 1492×1054 (or any width × width/1.4142)
 *
 * LAYOUT (top-to-bottom, all content fits within the frame):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │                       [GOLD FRAME + NAVY FRAME]                  │
 * │  ┌────────────────────────────────────────────────────────────┐  │
 * │  │  [LOGO]                                                    │  │
 * │  │  أكاديمية المستقبل الدولية                                  │  │
 * │  │  FUTURE INTERNATIONAL ACADEMY                              │  │
 * │  │  [شهادة إكمال معتمدة badge]                                │  │
 * │  │  ───────── gold separator ─────────                        │  │
 * │  │  تشهد أكاديمية المستقبل الدولية بأن                        │  │
 * │  │  محمد علي عبده شائع (large)                                │  │
 * │  │  ✦ ─── ornaments ─── ✦                                    │  │
 * │  │  قد أتمّ بنجاح جميع متطلبات دورة                            │  │
 * │  │  الإسعافات الأولية للكوادر الصحية (gold)                    │  │
 * │  │  ───── dotted gold divider ─────                           │  │
 * │  │  [QR]  |  رقم | تاريخ | حالة  |  صادر عن                   │  │
 * │  │  امسح   |  FIA-2026-XXXXX | ٢١ أكتوبر | صالحة |  التوقيع   │  │
 * │  │  ────────────────────────────────────────────              │  │
 * │  │  ✦ نحو مستقبل أفضل معاً ✦                                  │  │
 * │  └────────────────────────────────────────────────────────────┘  │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * EXPORT SAFETY (THE KEY FIXES):
 * ===============================
 * 1. ALL content fits within a FIXED landscape A4 aspect ratio
 *    (no overflow like the previous vertical layout caused).
 * 2. All sizes use vw-based units so they SCALE PROPORTIONALLY with
 *    the cert's width — content is always proportional, no clipping.
 * 3. All colors are INLINE HEX (no oklch/lab parsing issues).
 * 4. All icons are INLINE SVG with EXPLICIT stroke colors (no
 *    lucide-react currentColor issues in html-to-image exports).
 * 5. Font sizes use clamp() with reasonable minimums so text is
 *    legible at pixelRatio 2 export even on small mobile screens.
 * 6. The cert root has NO `margin: 0 auto` and NO `overflow-x: auto`
 *    parent — so html-to-image captures the full cert correctly.
 *
 * USAGE:
 *   <CertificateCard certificate={cert} ref={certRef} />
 * ============================================================================
 */

import { forwardRef } from 'react'

// ============================================================================
// PALETTE — INLINE HEX (NO TAILWIND/CSS VARS — prevents oklch/lab issues)
// ============================================================================
const COLOR = {
  NAVY: '#0A1F44',          // Royal navy
  NAVY_DEEP: '#061534',     // Deeper navy
  NAVY_DARK: '#020A1C',     // Darkest navy (ribbon)
  NAVY_MID: '#1B3A6B',      // Mid navy
  GOLD: '#D4AF37',          // Royal gold
  GOLD_BRIGHT: '#E5C158',   // Bright gold (highlights)
  GOLD_LIGHT: '#F0D070',    // Pale gold
  GOLD_PALE: '#F5E5B3',     // Very pale gold
  GOLD_DARK: '#8B6F2C',     // Dark gold (text)
  CREAM: '#FCF9F0',         // Cream background
  CREAM_DEEP: '#F5EFE0',    // Deeper cream
  IVORY: '#FFFEFA',         // Brightest ivory
  WHITE: '#FFFFFF',
  GREEN: '#16A34A',
  RED: '#DC2626',
  SHADOW_GOLD: 'rgba(212, 175, 55, 0.25)',
  SHADOW_NAVY: 'rgba(10, 31, 68, 0.15)',
} as const

// ============================================================================
// PROPS
// ============================================================================
export interface CertificateData {
  certificate_number: string
  student_name: string
  course_title?: string
  issued_at?: string | null
  issued_by?: string | null
  status: string
  has_external_accreditation?: boolean
  external_accreditation_body?: string | null
}

export interface CertificateCardProps {
  certificate: CertificateData
}

// ============================================================================
// INLINE SVG ICONS — explicit stroke/fill colors (no currentColor)
// ============================================================================
interface IconProps {
  size: number
  color: string
  strokeWidth?: number
}

function IconAward({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

function IconCalendar({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconFileText({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
    </svg>
  )
}

function IconShield({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconSparkles({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  )
}

// ============================================================================
// SUB-COMPONENT: Ornament (gold corner flourish)
// ============================================================================
function CornerOrnament({
  position,
  size,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br'
  size: number
}) {
  const transforms: Record<string, string> = {
    tl: `translate(0, 0)`,
    tr: `translate(1000, 0) scale(-1, 1)`,
    bl: `translate(0, 700) scale(1, -1)`,
    br: `translate(1000, 700) scale(-1, -1)`,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      style={{
        position: 'absolute',
        [position === 'tl' || position === 'tr' ? 'top' : 'bottom']: size * 0.18,
        [position === 'tl' || position === 'bl' ? 'left' : 'right']: size * 0.18,
        opacity: 0.85,
        pointerEvents: 'none',
        transform: transforms[position],
        transformOrigin: '0 0',
      } as React.CSSProperties}
    >
      <path
        d="M 0 48 C 0 16, 16 0, 48 0"
        stroke={COLOR.GOLD}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 8 40 C 8 22, 22 8, 40 8"
        stroke={COLOR.GOLD_BRIGHT}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="6" cy="42" r="1.5" fill={COLOR.GOLD} />
      <circle cx="14" cy="32" r="1.5" fill={COLOR.GOLD} />
      <circle cx="26" cy="20" r="1.5" fill={COLOR.GOLD} />
      <circle cx="36" cy="10" r="1.5" fill={COLOR.GOLD} />
      <path d="M 0 0 L 5 -5 L 10 0 L 5 5 Z" fill={COLOR.GOLD} />
      <path d="M 0 54 L 12 54" stroke={COLOR.GOLD} strokeWidth="1" strokeLinecap="round" />
      <path d="M 54 0 L 54 12" stroke={COLOR.GOLD} strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

// ============================================================================
// MAIN CERTIFICATE COMPONENT
//
// CRITICAL DESIGN:
// ================
// 1. Landscape A4 aspect ratio (1.4142 = √2 = ISO A4)
// 2. Width 100% of parent, height = width / 1.4142
// 3. Content uses vw-based sizing so it scales PROPORTIONALLY with width
// 4. Layout is vertical (top→bottom) but the FRAME is horizontal
// 5. All content fits inside the frame (no overflow)
//
// Sizes use `cqw` (container query width units) — they're proportional
// to the cert's width. This means:
//   - On a 1000px cert: font sizes look right
//   - On a 500px cert (mobile): font sizes scale to 50% — still proportional
//   - The cert always looks the SAME visually, just smaller on small screens
//
// We use `cqw` by setting `containerType: 'inline-size'` on the root.
// ============================================================================
export const CertificateCard = forwardRef<HTMLDivElement, CertificateCardProps>(
  function CertificateCard({ certificate }, ref) {
    const issuedAt = certificate.issued_at
      ? new Date(certificate.issued_at)
      : null
    const isVerified = certificate.status === 'صالحة'

    const issueDateText = issuedAt
      ? issuedAt.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—'

    const verifyUrl = `https://fiaacademy.vercel.app/verify/${certificate.certificate_number}`
    const qrSrc = `/api/qr-code?text=${encodeURIComponent(verifyUrl)}&size=240`
    const logoSrc = `/fia/logo-certificate.png`

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          // === LANDSCAPE ASPECT RATIO ===
          // Slightly taller than A4 (1.4142) to ensure ALL content
          // (including bottom icons: QR, cert number, date, status,
          // issuer, signature, slogan) fits WITHIN the frame on mobile.
          // On 340px mobile width: 340/1.25 = 272px height (was 240px
          // with 1.4142 ratio — content overflowed by 65px).
          // On 942px desktop width: 942/1.25 = 754px height (still
          // landscape, looks great).
          width: '100%',
          aspectRatio: '1.25 / 1',
          margin: 0,
          position: 'relative',
          background: COLOR.IVORY,
          fontFamily:
            "'Cairo', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
          // Enable container queries so inner cqw units resolve correctly
          containerType: 'inline-size',
          // === OUTER GOLD FRAME ===
          padding: '1cqw',
          backgroundImage: `linear-gradient(135deg, ${COLOR.GOLD} 0%, ${COLOR.GOLD_BRIGHT} 25%, ${COLOR.GOLD_LIGHT} 50%, ${COLOR.GOLD_BRIGHT} 75%, ${COLOR.GOLD} 100%)`,
          borderRadius: '0.7cqw',
          boxShadow: `0 0.6cqw 2cqw ${COLOR.SHADOW_NAVY}, 0 0 0 0.1cqw ${COLOR.GOLD_DARK}40`,
          overflow: 'hidden',
        }}
      >
        {/* === INNER NAVY FRAME === */}
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: '0.6cqw',
            background: `linear-gradient(135deg, ${COLOR.NAVY_DEEP} 0%, ${COLOR.NAVY} 50%, ${COLOR.NAVY_MID} 100%)`,
            borderRadius: '0.5cqw',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle gold dot pattern inside navy frame */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.08,
              pointerEvents: 'none',
              backgroundImage: `radial-gradient(circle, ${COLOR.GOLD} 0.1cqw, transparent 0.1cqw)`,
              backgroundSize: '1.2cqw 1.2cqw',
            }}
          />

          {/* === CREAM CONTENT AREA === */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${COLOR.IVORY} 0%, ${COLOR.CREAM} 50%, ${COLOR.IVORY} 100%)`,
              borderRadius: '0.4cqw',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `inset 0 0 0 0.15cqw ${COLOR.GOLD}40`,
            }}
          >
            {/* Inner radial gold accents (background luxury) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage: `
                  radial-gradient(circle at 12% 12%, ${COLOR.GOLD}15 0%, transparent 35%),
                  radial-gradient(circle at 88% 88%, ${COLOR.NAVY}10 0%, transparent 40%),
                  radial-gradient(circle at 50% 50%, ${COLOR.GOLD}08 0%, transparent 60%)
                `,
              }}
            />

            {/* Corner ornaments — sized via cqw so they scale */}
            <CornerOrnament position="tl" size={4.5} />
            <CornerOrnament position="tr" size={4.5} />
            <CornerOrnament position="bl" size={4.5} />
            <CornerOrnament position="br" size={4.5} />

            {/* ===== INNER CONTENT WRAPPER ===== */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                padding: '2cqw 4cqw 1.8cqw 4cqw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                color: COLOR.NAVY,
                boxSizing: 'border-box',
              }}
            >
              {/* ===== TOP: LOGO + ACADEMY IDENTITY ===== */}
              <div style={{ width: '100%', flexShrink: 0 }}>
                <img
                  src={logoSrc}
                  alt="FIA Logo"
                  crossOrigin="anonymous"
                  style={{
                    width: '6cqw',
                    height: '6cqw',
                    minWidth: 32,
                    minHeight: 32,
                    objectFit: 'contain',
                    margin: '0 auto 0.5cqw',
                    display: 'block',
                    filter: `drop-shadow(0 0.3cqw 0.7cqw ${COLOR.SHADOW_NAVY})`,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1cqw',
                    marginBottom: '0.2cqw',
                    flexWrap: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      width: '3.5cqw',
                      minWidth: 20,
                      height: 2,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 'clamp(14px, 2.4cqw, 28px)',
                      fontWeight: 900,
                      color: COLOR.NAVY,
                      lineHeight: 1.2,
                      letterSpacing: '0.5px',
                      textShadow: `0 1px 2px ${COLOR.SHADOW_NAVY}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    أكاديمية المستقبل الدولية
                  </span>
                  <div
                    style={{
                      width: '3.5cqw',
                      minWidth: 20,
                      height: 2,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 'clamp(7px, 1cqw, 12px)',
                    color: COLOR.GOLD_DARK,
                    fontWeight: 800,
                    letterSpacing: '0.4em',
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  FUTURE INTERNATIONAL ACADEMY
                </p>

                {/* Gold badge "شهادة إكمال معتمدة" */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6cqw',
                    padding: '0.4cqw 1.6cqw',
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${COLOR.GOLD_PALE}, ${COLOR.CREAM})`,
                    border: `1.5px solid ${COLOR.GOLD}`,
                    marginTop: '0.8cqw',
                    boxShadow: `0 0.15cqw 0.6cqw ${COLOR.SHADOW_GOLD}`,
                  }}
                >
                  <IconAward size={16} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                  <span
                    style={{
                      fontSize: 'clamp(9px, 1.2cqw, 15px)',
                      fontWeight: 900,
                      color: COLOR.NAVY,
                      letterSpacing: '0.5px',
                    }}
                  >
                    شهادة إكمال معتمدة
                  </span>
                  <IconAward size={16} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                </div>
              </div>

              {/* Gold separator */}
              <div
                style={{
                  width: '60%',
                  height: 2,
                  background: `linear-gradient(to right, transparent, ${COLOR.GOLD}, transparent)`,
                  borderRadius: 1,
                  margin: '0.8cqw 0',
                  flexShrink: 0,
                }}
              />

              {/* ===== MIDDLE: STUDENT NAME + COURSE ===== */}
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4cqw',
                }}
              >
                <p
                  style={{
                    fontSize: 'clamp(10px, 1.4cqw, 17px)',
                    color: COLOR.NAVY,
                    opacity: 0.7,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  تشهد أكاديمية المستقبل الدولية بأن
                </p>

                {/* Student name — the most prominent element */}
                <h2
                  style={{
                    fontSize: 'clamp(20px, 4cqw, 48px)',
                    fontWeight: 900,
                    color: COLOR.NAVY,
                    margin: 0,
                    textShadow: `0 2px 6px ${COLOR.SHADOW_NAVY}`,
                    lineHeight: 1.1,
                    letterSpacing: '0.5px',
                    wordBreak: 'break-word',
                  }}
                >
                  {certificate.student_name}
                </h2>

                {/* Decorative gold ornament between name and course */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6cqw',
                    margin: '0.4cqw 0',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '6cqw',
                      minWidth: 40,
                      height: 1.5,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                  <IconSparkles size={16} color={COLOR.GOLD} strokeWidth={2} />
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: COLOR.GOLD,
                      boxShadow: `0 0 6px ${COLOR.GOLD}`,
                    }}
                  />
                  <IconSparkles size={16} color={COLOR.GOLD} strokeWidth={2} />
                  <div
                    style={{
                      width: '6cqw',
                      minWidth: 40,
                      height: 1.5,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                </div>

                <p
                  style={{
                    fontSize: 'clamp(9px, 1.3cqw, 15px)',
                    color: COLOR.NAVY,
                    opacity: 0.7,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  قد أتمّ بنجاح جميع متطلبات دورة
                </p>

                {/* Course title — second most prominent element */}
                <h3
                  style={{
                    fontSize: 'clamp(13px, 2cqw, 24px)',
                    fontWeight: 800,
                    color: COLOR.GOLD_DARK,
                    margin: 0,
                    textShadow: `0 1px 3px ${COLOR.SHADOW_GOLD}`,
                    lineHeight: 1.3,
                    letterSpacing: '0.3px',
                  }}
                >
                  {certificate.course_title || 'دورة معتمدة'}
                </h3>

                {/* External accreditation badge — only if present */}
                {certificate.has_external_accreditation &&
                  certificate.external_accreditation_body && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4cqw',
                        padding: '0.3cqw 1cqw',
                        borderRadius: 14,
                        background: `${COLOR.NAVY}08`,
                        border: `1px solid ${COLOR.GOLD}50`,
                        marginTop: '0.5cqw',
                      }}
                    >
                      <IconShield size={12} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                      <span
                        style={{
                          fontSize: 'clamp(8px, 1cqw, 13px)',
                          color: COLOR.NAVY,
                          fontWeight: 700,
                        }}
                      >
                        معتمدة من: {certificate.external_accreditation_body}
                      </span>
                    </div>
                  )}
              </div>

              {/* Dotted divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6cqw',
                  width: '85%',
                  margin: '0.5cqw 0',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1.5,
                    background: `linear-gradient(to right, ${COLOR.GOLD}60, transparent)`,
                    borderRadius: 1,
                  }}
                />
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: `${COLOR.GOLD}90`,
                  }}
                />
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: COLOR.GOLD,
                    boxShadow: `0 0 4px ${COLOR.GOLD}`,
                  }}
                />
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: `${COLOR.GOLD}90`,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: 1.5,
                    background: `linear-gradient(to left, ${COLOR.GOLD}60, transparent)`,
                    borderRadius: 1,
                  }}
                />
              </div>

              {/* ===== BOTTOM: QR + METADATA + SIGNATURE ===== */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '1.5cqw',
                  paddingTop: '0.5cqw',
                  flexShrink: 0,
                }}
              >
                {/* QR code — left side */}
                <div
                  style={{
                    textAlign: 'center',
                    flexShrink: 0,
                    width: '9cqw',
                    minWidth: 60,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '0.3cqw',
                      background: COLOR.WHITE,
                      border: `1.5px solid ${COLOR.GOLD}`,
                      borderRadius: 6,
                      boxShadow: `0 0.15cqw 0.4cqw ${COLOR.SHADOW_NAVY}`,
                    }}
                  >
                    <img
                      src={qrSrc}
                      alt="QR Code"
                      crossOrigin="anonymous"
                      style={{
                        width: '6cqw',
                        height: '6cqw',
                        minWidth: 44,
                        minHeight: 44,
                        display: 'block',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(7px, 0.8cqw, 11px)',
                      color: COLOR.NAVY,
                      opacity: 0.6,
                      marginTop: '0.3cqw',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                    }}
                  >
                    امسح للتحقق
                  </div>
                </div>

                {/* Metadata grid — center */}
                <div
                  style={{
                    display: 'flex',
                    gap: '1.2cqw',
                    alignItems: 'center',
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  {/* Cert number */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: '8cqw',
                    }}
                  >
                    <div
                      style={{
                        width: '2.8cqw',
                        height: '2.8cqw',
                        minWidth: 24,
                        minHeight: 24,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.4cqw',
                        boxShadow: `0 0.15cqw 0.4cqw ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <IconFileText size={16} color={COLOR.GOLD} strokeWidth={2.5} />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(7px, 0.8cqw, 11px)',
                        color: COLOR.NAVY,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        marginBottom: 2,
                      }}
                    >
                      رقم الشهادة
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: 'clamp(8px, 1cqw, 13px)',
                        color: COLOR.NAVY,
                        wordBreak: 'break-all',
                      }}
                      dir="ltr"
                    >
                      {certificate.certificate_number}
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      width: 1,
                      height: '4cqw',
                      minHeight: 32,
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Issue date */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: '9cqw',
                    }}
                  >
                    <div
                      style={{
                        width: '2.8cqw',
                        height: '2.8cqw',
                        minWidth: 24,
                        minHeight: 24,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.4cqw',
                        boxShadow: `0 0.15cqw 0.4cqw ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <IconCalendar size={16} color={COLOR.GOLD} strokeWidth={2.5} />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(7px, 0.8cqw, 11px)',
                        color: COLOR.NAVY,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        marginBottom: 2,
                      }}
                    >
                      تاريخ الإصدار
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 'clamp(8px, 0.9cqw, 12px)',
                        color: COLOR.NAVY,
                      }}
                    >
                      {issueDateText}
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      width: 1,
                      height: '4cqw',
                      minHeight: 32,
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Status */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: '6cqw',
                    }}
                  >
                    <div
                      style={{
                        width: '2.8cqw',
                        height: '2.8cqw',
                        minWidth: 24,
                        minHeight: 24,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.4cqw',
                        boxShadow: `0 0.15cqw 0.4cqw ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <IconShield size={16} color={COLOR.GOLD} strokeWidth={2.5} />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(7px, 0.8cqw, 11px)',
                        color: COLOR.NAVY,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        marginBottom: 2,
                      }}
                    >
                      الحالة
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 'clamp(9px, 1cqw, 14px)',
                        color: isVerified ? COLOR.GREEN : COLOR.RED,
                      }}
                    >
                      {certificate.status}
                    </div>
                  </div>
                </div>

                {/* Signature / Issuer — right side */}
                <div
                  style={{
                    textAlign: 'center',
                    flexShrink: 0,
                    width: '11cqw',
                    minWidth: 80,
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(7px, 0.8cqw, 11px)',
                      color: COLOR.NAVY,
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.3cqw',
                      fontWeight: 800,
                    }}
                  >
                    صادر عن
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 'clamp(8px, 0.95cqw, 13px)',
                      color: COLOR.NAVY,
                      marginBottom: '0.4cqw',
                      lineHeight: 1.4,
                    }}
                  >
                    {certificate.issued_by || 'أكاديمية المستقبل الدولية'}
                  </div>
                  {/* Signature line */}
                  <div
                    style={{
                      width: '8cqw',
                      minWidth: 60,
                      height: 1.5,
                      background: COLOR.NAVY,
                      opacity: 0.4,
                      margin: '0 auto',
                      borderRadius: 1,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 'clamp(7px, 0.8cqw, 10px)',
                      color: COLOR.NAVY,
                      opacity: 0.6,
                      marginTop: '0.3cqw',
                      fontWeight: 700,
                    }}
                  >
                    التوقيع
                  </div>
                </div>
              </div>

              {/* ===== FOOTER SLOGAN ===== */}
              <div
                style={{
                  width: '100%',
                  textAlign: 'center',
                  paddingTop: '0.8cqw',
                  marginTop: '0.6cqw',
                  borderTop: `1px solid ${COLOR.GOLD}30`,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 'clamp(9px, 1.1cqw, 14px)',
                    color: COLOR.GOLD_DARK,
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                  }}
                >
                  ✦ نحو مستقبل أفضل معاً ✦
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
