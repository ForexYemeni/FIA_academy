/**
 * ============================================================================
 * FIA ACADEMY — LUXURY CERTIFICATE COMPONENT (RESPONSIVE + EXPORT-SAFE)
 * ============================================================================
 *
 * A unified, reusable certificate component for أكاديمية المستقبل الدولية
 * (Future International Academy). Renders the on-screen certificate preview
 * AND is the source element for high-quality PNG/PDF export.
 *
 * DESIGN IDENTITY (per brand spec):
 *   - Outer frame: luxury gold gradient
 *   - Inner frame: royal navy
 *   - Background: cream / ivory
 *   - Logo: official FIA logo (from /fia/logo-certificate.png)
 *   - Arabic name: «أكاديمية المستقبل الدولية»
 *   - English name: "FUTURE INTERNATIONAL ACADEMY"
 *   - Gold badge: «شهادة إكمال معتمدة»
 *   - Gold ornaments and dividers
 *   - Footer slogan: «نحو مستقبل أفضل معاً»
 *
 * TECHNICAL — RESPONSIVE + EXPORT-SAFE:
 * =====================================
 *
 * CRITICAL — HEIGHT HANDLING (THE KEY FIX):
 * =========================================
 * The previous version used `aspectRatio: '10 / 7'` to lock the cert to a
 * fixed 10:7 aspect ratio. This caused a CRITICAL bug:
 *
 *   - On mobile (e.g. 340px wide cert), aspect-ratio forced height=238px
 *   - But the actual content (logo + name + course + QR + metadata +
 *     signature + slogan) needed ~390px of vertical space
 *   - Result: content OVERFLOWED the cert frame — the bottom section
 *     (QR, cert number, date, status, issuer, signature, slogan) was
 *     pushed OUTSIDE the cert frame, below it
 *   - When html-to-image exported the cert element, it captured only
 *     the cert frame area (340×238) — the overflowing bottom content
 *     was NOT included in the export
 *
 * THE FIX:
 *   - Removed `aspectRatio: '10 / 7'`
 *   - Root div uses `width: 100%` + `height: auto` — the cert grows
 *     vertically to fit ALL content
 *   - Added `minHeight` to ensure a reasonable minimum size on very
 *     small screens
 *   - Inner content uses `flex` layout with natural spacing instead
 *     of forced `justifyContent: space-between` (which stretched
 *     content to fill the locked aspect ratio)
 *
 * EXPORT SAFETY:
 *   - All colors are INLINE HEX values (NOT Tailwind classes), so
 *     html-to-image can serialize them without hitting the oklch()/lab()
 *     parsing bug that broke html2canvas v1.4.1 under Tailwind 4.
 *   - All icons are INLINE SVG with EXPLICIT stroke={COLOR.X} (NOT
 *     lucide-react's stroke="currentColor") — this guarantees the
 *     icons appear in the exported PNG/PDF (lucide-react's currentColor
 *     doesn't cascade properly in html-to-image's SVG foreignObject
 *     serialization).
 *   - All font sizes use clamp() with reasonable minimums so text is
 *     legible at pixelRatio 2 export even on small mobile screens.
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
  GRAY_DARK: '#2C2C2C',
  GRAY: '#6B6B6B',
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
  size = 48,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br'
  size?: number
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
        [position === 'tl' || position === 'tr' ? 'top' : 'bottom']: 8,
        [position === 'tl' || position === 'bl' ? 'left' : 'right']: 8,
        opacity: 0.85,
        pointerEvents: 'none',
        transform: transforms[position],
        transformOrigin: '0 0',
      } as React.CSSProperties}
    >
      {/* Outer filigree curve */}
      <path
        d="M 0 48 C 0 16, 16 0, 48 0"
        stroke={COLOR.GOLD}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Inner curve */}
      <path
        d="M 8 40 C 8 22, 22 8, 40 8"
        stroke={COLOR.GOLD_BRIGHT}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Decorative dots */}
      <circle cx="6" cy="42" r="1.5" fill={COLOR.GOLD} />
      <circle cx="14" cy="32" r="1.5" fill={COLOR.GOLD} />
      <circle cx="26" cy="20" r="1.5" fill={COLOR.GOLD} />
      <circle cx="36" cy="10" r="1.5" fill={COLOR.GOLD} />
      {/* Central diamond */}
      <path d="M 0 0 L 5 -5 L 10 0 L 5 5 Z" fill={COLOR.GOLD} />
      {/* Outer small accent line */}
      <path
        d="M 0 54 L 12 54"
        stroke={COLOR.GOLD}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M 54 0 L 54 12"
        stroke={COLOR.GOLD}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ============================================================================
// MAIN CERTIFICATE COMPONENT
//
// CRITICAL IMPLEMENTATION NOTES:
//
// 1. The root div uses `width: 100%` (NOT fixed 1000px) — adapts to parent.
//
// 2. **HEIGHT: auto** (NOT aspect-ratio). The previous version used
//    `aspectRatio: '10 / 7'` which forced the cert to a fixed height
//    regardless of content. On mobile this caused content to OVERFLOW
//    the cert frame — the bottom section (QR, number, date, status,
//    issuer, signature, slogan) was pushed OUTSIDE the cert, and was
//    therefore missing from the exported PNG/PDF. Now the cert grows
//    vertically to fit ALL content naturally.
//
// 3. Inner content uses `display: flex; flex-direction: column` with
//    natural spacing (gap) instead of `justifyContent: space-between`
//    which previously stretched content to fill the locked aspect ratio.
//
// 4. All inner sizes use px with min-width/min-height — NOT percentages
//    of the cert dimensions (which were unreliable when height was
//    locked by aspect-ratio). Using fixed px sizes ensures icons,
//    text, and containers always render at the intended size.
//
// 5. All colors are INLINE HEX — no oklch/lab regression.
//
// 6. All icons are INLINE SVG with explicit stroke colors — no
//    lucide-react currentColor issues in exports.
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
          // === RESPONSIVE WIDTH ===
          width: '100%',
          // === AUTO HEIGHT — grows to fit content ===
          // (Previously used aspectRatio: '10 / 7' which caused overflow
          // on mobile. Now removed — cert grows vertically as needed.)
          minHeight: 480,
          margin: 0,
          position: 'relative',
          background: COLOR.IVORY,
          fontFamily:
            "'Cairo', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
          // === OUTER GOLD FRAME ===
          padding: 14,
          backgroundImage: `linear-gradient(135deg, ${COLOR.GOLD} 0%, ${COLOR.GOLD_BRIGHT} 25%, ${COLOR.GOLD_LIGHT} 50%, ${COLOR.GOLD_BRIGHT} 75%, ${COLOR.GOLD} 100%)`,
          borderRadius: 12,
          boxShadow: `0 8px 32px ${COLOR.SHADOW_NAVY}, 0 0 0 1px ${COLOR.GOLD_DARK}40`,
          overflow: 'hidden',
        }}
      >
        {/* === INNER NAVY FRAME === */}
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: 'inherit',
            padding: 8,
            background: `linear-gradient(135deg, ${COLOR.NAVY_DEEP} 0%, ${COLOR.NAVY} 50%, ${COLOR.NAVY_MID} 100%)`,
            borderRadius: 8,
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
              backgroundImage: `radial-gradient(circle, ${COLOR.GOLD} 1px, transparent 1px)`,
              backgroundSize: '14px 14px',
            }}
          />

          {/* === CREAM CONTENT AREA === */}
          <div
            style={{
              width: '100%',
              minHeight: 'inherit',
              background: `linear-gradient(135deg, ${COLOR.IVORY} 0%, ${COLOR.CREAM} 50%, ${COLOR.IVORY} 100%)`,
              borderRadius: 5,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `inset 0 0 0 1.5px ${COLOR.GOLD}40`,
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

            {/* Corner ornaments */}
            <CornerOrnament position="tl" size={48} />
            <CornerOrnament position="tr" size={48} />
            <CornerOrnament position="bl" size={48} />
            <CornerOrnament position="br" size={48} />

            {/* ===== INNER CONTENT WRAPPER ===== */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                // Natural padding — fixed px (NOT %) so it doesn't
                // depend on the parent dimensions
                padding: '28px 40px 24px 40px',
                display: 'flex',
                flexDirection: 'column',
                // Natural spacing — let content flow, no forced stretch
                gap: 14,
                alignItems: 'center',
                textAlign: 'center',
                color: COLOR.NAVY,
                boxSizing: 'border-box',
              }}
            >
              {/* ===== TOP: LOGO + ACADEMY IDENTITY ===== */}
              <div style={{ width: '100%' }}>
                <img
                  src={logoSrc}
                  alt="FIA Logo"
                  crossOrigin="anonymous"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'contain',
                    margin: '0 auto 8px',
                    display: 'block',
                    filter: `drop-shadow(0 4px 10px ${COLOR.SHADOW_NAVY})`,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    marginBottom: 4,
                    flexWrap: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 2,
                      minWidth: 36,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 'clamp(16px, 3vw, 28px)',
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
                      width: 36,
                      height: 2,
                      minWidth: 36,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 'clamp(8px, 1.2vw, 12px)',
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
                    gap: 8,
                    padding: '6px 18px',
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${COLOR.GOLD_PALE}, ${COLOR.CREAM})`,
                    border: `1.5px solid ${COLOR.GOLD}`,
                    marginTop: 12,
                    boxShadow: `0 2px 8px ${COLOR.SHADOW_GOLD}`,
                  }}
                >
                  <IconAward size={18} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                  <span
                    style={{
                      fontSize: 'clamp(11px, 1.4vw, 15px)',
                      fontWeight: 900,
                      color: COLOR.NAVY,
                      letterSpacing: '0.5px',
                    }}
                  >
                    شهادة إكمال معتمدة
                  </span>
                  <IconAward size={18} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                </div>
              </div>

              {/* Gold separator */}
              <div
                style={{
                  width: '70%',
                  height: 2,
                  background: `linear-gradient(to right, transparent, ${COLOR.GOLD}, transparent)`,
                  borderRadius: 1,
                  margin: '4px 0',
                }}
              />

              {/* ===== MIDDLE: STUDENT NAME + COURSE ===== */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <p
                  style={{
                    fontSize: 'clamp(11px, 1.6vw, 16px)',
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
                    fontSize: 'clamp(22px, 4.8vw, 48px)',
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
                    gap: 8,
                    margin: '6px 0',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 1.5,
                      minWidth: 64,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                  <IconSparkles size={18} color={COLOR.GOLD} strokeWidth={2} />
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: COLOR.GOLD,
                      boxShadow: `0 0 6px ${COLOR.GOLD}`,
                    }}
                  />
                  <IconSparkles size={18} color={COLOR.GOLD} strokeWidth={2} />
                  <div
                    style={{
                      width: 64,
                      height: 1.5,
                      minWidth: 64,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                </div>

                <p
                  style={{
                    fontSize: 'clamp(11px, 1.5vw, 15px)',
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
                    fontSize: 'clamp(15px, 2.4vw, 24px)',
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
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 14,
                        background: `${COLOR.NAVY}08`,
                        border: `1px solid ${COLOR.GOLD}50`,
                        marginTop: 8,
                      }}
                    >
                      <IconShield size={14} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                      <span
                        style={{
                          fontSize: 'clamp(10px, 1.2vw, 13px)',
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
                  gap: 8,
                  width: '85%',
                  margin: '6px 0',
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
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: `${COLOR.GOLD}90`,
                  }}
                />
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: COLOR.GOLD,
                    boxShadow: `0 0 4px ${COLOR.GOLD}`,
                  }}
                />
                <div
                  style={{
                    width: 5,
                    height: 5,
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
                  gap: 12,
                  paddingTop: 8,
                }}
              >
                {/* QR code — left side */}
                <div
                  style={{
                    textAlign: 'center',
                    flexShrink: 0,
                    width: 100,
                    minWidth: 100,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      padding: 5,
                      background: COLOR.WHITE,
                      border: `1.5px solid ${COLOR.GOLD}`,
                      borderRadius: 6,
                      boxShadow: `0 2px 6px ${COLOR.SHADOW_NAVY}`,
                    }}
                  >
                    <img
                      src={qrSrc}
                      alt="QR Code"
                      crossOrigin="anonymous"
                      style={{
                        width: 70,
                        height: 70,
                        minWidth: 70,
                        minHeight: 70,
                        display: 'block',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      color: COLOR.NAVY,
                      opacity: 0.6,
                      marginTop: 4,
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
                    gap: 12,
                    alignItems: 'center',
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  {/* Cert number */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: 80,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        minHeight: 32,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                        boxShadow: `0 2px 5px ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <IconFileText size={18} color={COLOR.GOLD} strokeWidth={2.5} />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(9px, 0.9vw, 11px)',
                        color: COLOR.NAVY,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        marginBottom: 3,
                      }}
                    >
                      رقم الشهادة
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: 'clamp(10px, 1.2vw, 13px)',
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
                      height: 56,
                      minHeight: 56,
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Issue date */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: 100,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        minHeight: 32,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                        boxShadow: `0 2px 5px ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <IconCalendar size={18} color={COLOR.GOLD} strokeWidth={2.5} />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(9px, 0.9vw, 11px)',
                        color: COLOR.NAVY,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        marginBottom: 3,
                      }}
                    >
                      تاريخ الإصدار
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 'clamp(10px, 1.1vw, 12px)',
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
                      height: 56,
                      minHeight: 56,
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Status */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: 70,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        minHeight: 32,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                        boxShadow: `0 2px 5px ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <IconShield size={18} color={COLOR.GOLD} strokeWidth={2.5} />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(9px, 0.9vw, 11px)',
                        color: COLOR.NAVY,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        marginBottom: 3,
                      }}
                    >
                      الحالة
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 'clamp(11px, 1.2vw, 14px)',
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
                    width: 120,
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      color: COLOR.NAVY,
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 4,
                      fontWeight: 800,
                    }}
                  >
                    صادر عن
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 'clamp(10px, 1.1vw, 13px)',
                      color: COLOR.NAVY,
                      marginBottom: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    {certificate.issued_by || 'أكاديمية المستقبل الدولية'}
                  </div>
                  {/* Signature line */}
                  <div
                    style={{
                      width: 90,
                      minWidth: 90,
                      height: 1.5,
                      background: COLOR.NAVY,
                      opacity: 0.4,
                      margin: '0 auto',
                      borderRadius: 1,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 'clamp(9px, 0.9vw, 10px)',
                      color: COLOR.NAVY,
                      opacity: 0.6,
                      marginTop: 4,
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
                  paddingTop: 12,
                  marginTop: 8,
                  borderTop: `1px solid ${COLOR.GOLD}30`,
                }}
              >
                <span
                  style={{
                    fontSize: 'clamp(11px, 1.3vw, 14px)',
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
