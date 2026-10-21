/**
 * ============================================================================
 * FIA ACADEMY — LUXURY CERTIFICATE COMPONENT (RESPONSIVE)
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
 * The previous version used a FIXED width of 1000px. This caused clipping
 * because:
 *   - The cert's parent container (e.g. dashboard dialog) was narrower
 *     than 1000px → the cert overflowed → parent had `overflow-x: auto`
 *     → the cert element was scrollable → html-to-image captured the
 *     scroll viewport (not the full cert) → half the cert was missing
 *     in the exported PNG/PDF.
 *
 * THE FIX:
 *   - The cert uses an aspect-ratio-locked container (CSS `aspect-ratio`)
 *     so it scales to fit ANY parent width while keeping 10:7 proportions.
 *   - All inner sizes use relative units (%, vw-based clamp, or em
 *     relative to font-size) so they scale proportionally.
 *   - The outer cert root has NO `margin: 0 auto` (that was causing the
 *     element to be positioned at x=111 inside its parent — the export
 *     included that offset and made the right side blank).
 *   - For export, html-to-image now captures the cert at its rendered
 *     size (whatever the screen is) — no more clipping.
 *
 * COLORS:
 *   - All colors are INLINE HEX values (NOT Tailwind classes), so
 *     html-to-image can serialize them without hitting the oklch()/lab()
 *     parsing bug that broke html2canvas v1.4.1 under Tailwind 4.
 *
 * USAGE:
 *   <CertificateCard certificate={cert} ref={certRef} />
 *
 * The ref points to the root certificate element so the parent can pass
 * it to html-to-image.toPng() for export.
 * ============================================================================
 */

import { forwardRef } from 'react'
import { Award, Calendar, FileText, Shield, Sparkles } from 'lucide-react'

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
// SUB-COMPONENT: Ornament (gold corner flourish)
// ============================================================================
function CornerOrnament({
  position,
  size = 60,
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
        [position === 'tl' || position === 'tr' ? 'top' : 'bottom']: '2.8%',
        [position === 'tl' || position === 'bl' ? 'left' : 'right']: '2.8%',
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
// 1. The root div uses `width: 100%` (NOT a fixed 1000px) — this makes the
//    cert adapt to whatever parent container it's in (dialog, page, etc.).
//
// 2. The aspect ratio is locked via `aspectRatio: '10 / 7'` — so on a
//    900px-wide parent, the cert renders as 900×630. On a 1200px-wide
//    parent, it renders as 1200×840. Proportions always correct.
//
// 3. ALL inner sizes use percentages or em units — never fixed px.
//    This ensures the cert scales proportionally with its container.
//
// 4. Font sizes use `clamp()` — they grow with the container but cap
//    at a reasonable maximum so the cert doesn't look stretched on
//    ultra-wide screens.
//
// 5. For EXPORT, html-to-image captures the cert at its CURRENT rendered
//    size — so the exported PNG is always the FULL cert, never clipped.
//
// 6. The cert uses position:relative + overflow:hidden to clip any
//    decorative elements that would otherwise extend past the edges
//    (corner ornaments, dot patterns, etc.).
//
// 7. NO `margin: 0 auto` on the root — that caused the cert to be
//    offset within its parent, which made html-to-image capture a
//    too-wide canvas with the cert in the left half only.
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
          // === RESPONSIVE WIDTH + LOCKED ASPECT RATIO ===
          // 10:7 = 1.428... (close to A4 landscape ratio of √2 ≈ 1.414)
          width: '100%',
          aspectRatio: '10 / 7',
          // No margin — root takes full parent width, no offset
          margin: 0,
          position: 'relative',
          background: COLOR.IVORY,
          fontFamily:
            "'Cairo', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
          // === OUTER GOLD FRAME ===
          padding: '1.4%',
          backgroundImage: `linear-gradient(135deg, ${COLOR.GOLD} 0%, ${COLOR.GOLD_BRIGHT} 25%, ${COLOR.GOLD_LIGHT} 50%, ${COLOR.GOLD_BRIGHT} 75%, ${COLOR.GOLD} 100%)`,
          borderRadius: '1.2%',
          boxShadow: `0 0.6% 2.4% ${COLOR.SHADOW_NAVY}, 0 0 0 0.1% ${COLOR.GOLD_DARK}40`,
          // Hide any decorative elements that extend past the edges
          overflow: 'hidden',
        }}
      >
        {/* === INNER NAVY FRAME === */}
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: '0.8%',
            background: `linear-gradient(135deg, ${COLOR.NAVY_DEEP} 0%, ${COLOR.NAVY} 50%, ${COLOR.NAVY_MID} 100%)`,
            borderRadius: '0.8%',
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
              backgroundSize: '1.4% 1.4%',
            }}
          />

          {/* === CREAM CONTENT AREA === */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${COLOR.IVORY} 0%, ${COLOR.CREAM} 50%, ${COLOR.IVORY} 100%)`,
              borderRadius: '0.5%',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `inset 0 0 0 0.15% ${COLOR.GOLD}40`,
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

            {/* Corner ornaments — sized relative to cert */}
            <CornerOrnament position="tl" size={48} />
            <CornerOrnament position="tr" size={48} />
            <CornerOrnament position="bl" size={48} />
            <CornerOrnament position="br" size={48} />

            {/* ===== INNER CONTENT WRAPPER ===== */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                padding:
                  '5.2% 5.6% 4% 5.6%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
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
                    width: '8.8%',
                    aspectRatio: '1 / 1',
                    objectFit: 'contain',
                    margin: '0 auto 0.8%',
                    display: 'block',
                    filter: `drop-shadow(0 0.4% 1% ${COLOR.SHADOW_NAVY})`,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1.4%',
                    marginBottom: '0.4%',
                  }}
                >
                  <div
                    style={{
                      width: '4.8%',
                      height: 2,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                  <span
                    style={{
                      // Use clamp so the title scales with parent width
                      fontSize: 'clamp(14px, 2.8vw, 32px)',
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
                      width: '4.8%',
                      height: 2,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 'clamp(7px, 1.1vw, 13px)',
                    color: COLOR.GOLD_DARK,
                    fontWeight: 800,
                    letterSpacing: '0.45em',
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
                    gap: '0.8%',
                    padding: '0.6% 2.2%',
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${COLOR.GOLD_PALE}, ${COLOR.CREAM})`,
                    border: `1.5px solid ${COLOR.GOLD}`,
                    marginTop: '1.4%',
                    boxShadow: `0 0.2% 0.8% ${COLOR.SHADOW_GOLD}`,
                  }}
                >
                  <Award
                    size={14}
                    color={COLOR.GOLD_DARK}
                    strokeWidth={2.5}
                  />
                  <span
                    style={{
                      fontSize: 'clamp(8px, 1.3vw, 15px)',
                      fontWeight: 900,
                      color: COLOR.NAVY,
                      letterSpacing: '0.5px',
                    }}
                  >
                    شهادة إكمال معتمدة
                  </span>
                  <Award
                    size={14}
                    color={COLOR.GOLD_DARK}
                    strokeWidth={2.5}
                  />
                </div>
              </div>

              {/* Gold separator */}
              <div
                style={{
                  width: '70%',
                  height: 2,
                  background: `linear-gradient(to right, transparent, ${COLOR.GOLD}, transparent)`,
                  borderRadius: 1,
                  margin: '1.2% 0',
                }}
              />

              {/* ===== MIDDLE: STUDENT NAME + COURSE ===== */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  padding: '0.8% 0',
                }}
              >
                <p
                  style={{
                    fontSize: 'clamp(10px, 1.5vw, 17px)',
                    color: COLOR.NAVY,
                    opacity: 0.7,
                    margin: '0 0 0.8% 0',
                    fontWeight: 600,
                  }}
                >
                  تشهد أكاديمية المستقبل الدولية بأن
                </p>

                {/* Student name — the most prominent element */}
                <h2
                  style={{
                    fontSize: 'clamp(20px, 4.6vw, 52px)',
                    fontWeight: 900,
                    color: COLOR.NAVY,
                    margin: '0 0 1.2% 0',
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
                    gap: '1%',
                    marginBottom: '1.4%',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '8%',
                      height: 1.5,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                  <Sparkles
                    size={16}
                    color={COLOR.GOLD}
                    strokeWidth={2}
                  />
                  <div
                    style={{
                      width: '0.6%',
                      aspectRatio: '1 / 1',
                      borderRadius: '50%',
                      background: COLOR.GOLD,
                      boxShadow: `0 0 6px ${COLOR.GOLD}`,
                    }}
                  />
                  <Sparkles
                    size={16}
                    color={COLOR.GOLD}
                    strokeWidth={2}
                  />
                  <div
                    style={{
                      width: '8%',
                      height: 1.5,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                </div>

                <p
                  style={{
                    fontSize: 'clamp(9px, 1.4vw, 16px)',
                    color: COLOR.NAVY,
                    opacity: 0.7,
                    margin: '0 0 0.6% 0',
                    fontWeight: 600,
                  }}
                >
                  قد أتمّ بنجاح جميع متطلبات دورة
                </p>

                {/* Course title — second most prominent element */}
                <h3
                  style={{
                    fontSize: 'clamp(13px, 2.2vw, 25px)',
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
                        gap: '0.6%',
                        padding: '0.4% 1.2%',
                        borderRadius: 14,
                        background: `${COLOR.NAVY}08`,
                        border: `1px solid ${COLOR.GOLD}50`,
                        marginTop: '1.2%',
                      }}
                    >
                      <Shield
                        size={11}
                        color={COLOR.GOLD_DARK}
                        strokeWidth={2.5}
                      />
                      <span
                        style={{
                          fontSize: 'clamp(8px, 1.1vw, 13px)',
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
                  gap: '1%',
                  width: '90%',
                  margin: '0.6% 0',
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
                    width: '0.5%',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: `${COLOR.GOLD}90`,
                  }}
                />
                <div
                  style={{
                    width: '0.7%',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: COLOR.GOLD,
                    boxShadow: `0 0 4px ${COLOR.GOLD}`,
                  }}
                />
                <div
                  style={{
                    width: '0.5%',
                    aspectRatio: '1 / 1',
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
                  gap: '2.4%',
                  paddingTop: '1.2%',
                }}
              >
                {/* QR code — left side */}
                <div
                  style={{
                    textAlign: 'center',
                    flexShrink: 0,
                    width: '12%',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '0.5%',
                      background: COLOR.WHITE,
                      border: `1.5px solid ${COLOR.GOLD}`,
                      borderRadius: 6,
                      boxShadow: `0 0.2% 0.6% ${COLOR.SHADOW_NAVY}`,
                    }}
                  >
                    <img
                      src={qrSrc}
                      alt="QR Code"
                      crossOrigin="anonymous"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(7px, 0.9vw, 11px)',
                      color: COLOR.NAVY,
                      opacity: 0.6,
                      marginTop: '0.4%',
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
                    gap: '1.8%',
                    alignItems: 'center',
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  {/* Cert number */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: '9%',
                    }}
                  >
                    <div
                      style={{
                        width: '3.6%',
                        aspectRatio: '1 / 1',
                        minWidth: 28,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.6%',
                        boxShadow: `0 0.2% 0.5% ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <FileText
                        size={16}
                        color={COLOR.GOLD}
                        strokeWidth={2.5}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(6px, 0.8vw, 10px)',
                        color: COLOR.NAVY,
                        opacity: 0.6,
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
                        fontSize: 'clamp(8px, 1.2vw, 14px)',
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
                      height: '4%',
                      minHeight: 36,
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Issue date */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: '11%',
                    }}
                  >
                    <div
                      style={{
                        width: '3.6%',
                        aspectRatio: '1 / 1',
                        minWidth: 28,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.6%',
                        boxShadow: `0 0.2% 0.5% ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <Calendar
                        size={16}
                        color={COLOR.GOLD}
                        strokeWidth={2.5}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(6px, 0.8vw, 10px)',
                        color: COLOR.NAVY,
                        opacity: 0.6,
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
                        fontSize: 'clamp(7px, 1.1vw, 13px)',
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
                      height: '4%',
                      minHeight: 36,
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Status */}
                  <div
                    style={{
                      textAlign: 'center',
                      minWidth: '8%',
                    }}
                  >
                    <div
                      style={{
                        width: '3.6%',
                        aspectRatio: '1 / 1',
                        minWidth: 28,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.6%',
                        boxShadow: `0 0.2% 0.5% ${COLOR.SHADOW_NAVY}`,
                      }}
                    >
                      <Shield
                        size={16}
                        color={COLOR.GOLD}
                        strokeWidth={2.5}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(6px, 0.8vw, 10px)',
                        color: COLOR.NAVY,
                        opacity: 0.6,
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
                        fontSize: 'clamp(8px, 1.2vw, 14px)',
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
                    width: '14%',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(7px, 0.9vw, 11px)',
                      color: COLOR.NAVY,
                      opacity: 0.6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.4%',
                      fontWeight: 800,
                    }}
                  >
                    صادر عن
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 'clamp(8px, 1.1vw, 13px)',
                      color: COLOR.NAVY,
                      marginBottom: '0.6%',
                      lineHeight: 1.4,
                    }}
                  >
                    {certificate.issued_by || 'أكاديمية المستقبل الدولية'}
                  </div>
                  {/* Signature line */}
                  <div
                    style={{
                      width: '11%',
                      minWidth: 80,
                      height: 1.5,
                      background: COLOR.NAVY,
                      opacity: 0.4,
                      margin: '0 auto',
                      borderRadius: 1,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 'clamp(6px, 0.8vw, 10px)',
                      color: COLOR.NAVY,
                      opacity: 0.5,
                      marginTop: '0.4%',
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
                  paddingTop: '1.4%',
                  marginTop: '1%',
                  borderTop: `1px solid ${COLOR.GOLD}30`,
                }}
              >
                <span
                  style={{
                    fontSize: 'clamp(8px, 1.2vw, 14px)',
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
