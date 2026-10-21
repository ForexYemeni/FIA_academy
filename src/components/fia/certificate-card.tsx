/**
 * ============================================================================
 * FIA ACADEMY — LUXURY CERTIFICATE COMPONENT
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
 * TECHNICAL:
 *   - All colors are INLINE HEX values (NOT Tailwind classes), so html-to-image
 *     can serialize them without hitting the oklch()/lab() parsing bug that
 *     breaks html2canvas v1.4.1 under Tailwind 4.
 *   - The component is fully self-contained — no inherited colors from body.
 *   - Width 1000 × height 700 (landscape) → exported at pixelRatio 2 gives
 *     2000×1400 PNG, which is print-quality at A4 landscape (297×210mm).
 *   - QR Code is loaded from /api/qr-code (returns PNG with CORS headers).
 *   - Logo is loaded from /fia/logo-certificate.png (same origin, CORS OK).
 *
 * USAGE:
 *   <CertificateCard certificate={cert} ref={certRef} />
 *
 * The ref points to the root certificate element so the parent can pass it
 * to html-to-image.toPng() for export.
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
        [position === 'tl' || position === 'tr' ? 'top' : 'bottom']: 14,
        [position === 'tl' || position === 'bl' ? 'left' : 'right']: 14,
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
          width: 1000,
          height: 700,
          margin: '0 auto',
          position: 'relative',
          background: COLOR.IVORY,
          fontFamily:
            "'Cairo', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
          // Outer gold frame
          padding: 14,
          backgroundImage: `linear-gradient(135deg, ${COLOR.GOLD} 0%, ${COLOR.GOLD_BRIGHT} 25%, ${COLOR.GOLD_LIGHT} 50%, ${COLOR.GOLD_BRIGHT} 75%, ${COLOR.GOLD} 100%)`,
          borderRadius: 12,
          boxShadow: `0 8px 32px ${COLOR.SHADOW_NAVY}, 0 0 0 1px ${COLOR.GOLD_DARK}40`,
        }}
      >
        {/* Inner navy frame */}
        <div
          style={{
            width: '100%',
            height: '100%',
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

          {/* Cream content area */}
          <div
            style={{
              width: '100%',
              height: '100%',
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
                height: '100%',
                padding: '36px 56px 28px 56px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                color: COLOR.NAVY,
              }}
            >
              {/* ===== TOP: LOGO + ACADEMY IDENTITY ===== */}
              <div style={{ width: '100%' }}>
                <img
                  src={logoSrc}
                  alt="FIA Logo"
                  crossOrigin="anonymous"
                  style={{
                    width: 88,
                    height: 88,
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
                    gap: 14,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 2,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: COLOR.NAVY,
                      lineHeight: 1.2,
                      letterSpacing: '0.5px',
                      textShadow: `0 1px 2px ${COLOR.SHADOW_NAVY}`,
                    }}
                  >
                    أكاديمية المستقبل الدولية
                  </span>
                  <div
                    style={{
                      width: 48,
                      height: 2,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 11,
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
                    gap: 8,
                    padding: '6px 22px',
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${COLOR.GOLD_PALE}, ${COLOR.CREAM})`,
                    border: `1.5px solid ${COLOR.GOLD}`,
                    marginTop: 14,
                    boxShadow: `0 2px 8px ${COLOR.SHADOW_GOLD}`,
                  }}
                >
                  <Award size={14} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: COLOR.NAVY,
                      letterSpacing: '0.5px',
                    }}
                  >
                    شهادة إكمال معتمدة
                  </span>
                  <Award size={14} color={COLOR.GOLD_DARK} strokeWidth={2.5} />
                </div>
              </div>

              {/* Gold separator */}
              <div
                style={{
                  width: '70%',
                  height: 2,
                  background: `linear-gradient(to right, transparent, ${COLOR.GOLD}, transparent)`,
                  borderRadius: 1,
                  margin: '12px 0',
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
                  padding: '8px 0',
                }}
              >
                <p
                  style={{
                    fontSize: 15,
                    color: COLOR.NAVY,
                    opacity: 0.7,
                    margin: '0 0 8px 0',
                    fontWeight: 600,
                  }}
                >
                  تشهد أكاديمية المستقبل الدولية بأن
                </p>

                {/* Student name — the most prominent element */}
                <h2
                  style={{
                    fontSize: 46,
                    fontWeight: 900,
                    color: COLOR.NAVY,
                    margin: '0 0 12px 0',
                    textShadow: `0 2px 6px ${COLOR.SHADOW_NAVY}`,
                    lineHeight: 1.1,
                    letterSpacing: '0.5px',
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
                    gap: 10,
                    marginBottom: 14,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 1.5,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                  <Sparkles size={16} color={COLOR.GOLD} strokeWidth={2} />
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: COLOR.GOLD,
                      boxShadow: `0 0 6px ${COLOR.GOLD}`,
                    }}
                  />
                  <Sparkles size={16} color={COLOR.GOLD} strokeWidth={2} />
                  <div
                    style={{
                      width: 80,
                      height: 1.5,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      borderRadius: 1,
                    }}
                  />
                </div>

                <p
                  style={{
                    fontSize: 14,
                    color: COLOR.NAVY,
                    opacity: 0.7,
                    margin: '0 0 6px 0',
                    fontWeight: 600,
                  }}
                >
                  قد أتمّ بنجاح جميع متطلبات دورة
                </p>

                {/* Course title — second most prominent element */}
                <h3
                  style={{
                    fontSize: 22,
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
                        marginTop: 12,
                      }}
                    >
                      <Shield
                        size={11}
                        color={COLOR.GOLD_DARK}
                        strokeWidth={2.5}
                      />
                      <span
                        style={{
                          fontSize: 11,
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
                  gap: 10,
                  width: '90%',
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
                  gap: 24,
                  paddingTop: 12,
                }}
              >
                {/* QR code — left side */}
                <div
                  style={{
                    textAlign: 'center',
                    flexShrink: 0,
                    width: 120,
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
                        width: 80,
                        height: 80,
                        display: 'block',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 9,
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
                    gap: 18,
                    alignItems: 'center',
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  {/* Cert number */}
                  <div style={{ textAlign: 'center', minWidth: 90 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                        boxShadow: `0 2px 5px ${COLOR.SHADOW_NAVY}`,
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
                        fontSize: 8,
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
                        fontSize: 12,
                        color: COLOR.NAVY,
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
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Issue date */}
                  <div style={{ textAlign: 'center', minWidth: 110 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                        boxShadow: `0 2px 5px ${COLOR.SHADOW_NAVY}`,
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
                        fontSize: 8,
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
                        fontSize: 11,
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
                      background: `${COLOR.GOLD}40`,
                    }}
                  />

                  {/* Status */}
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: COLOR.NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                        boxShadow: `0 2px 5px ${COLOR.SHADOW_NAVY}`,
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
                        fontSize: 8,
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
                        fontSize: 12,
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
                    width: 140,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: COLOR.NAVY,
                      opacity: 0.6,
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
                      fontSize: 11,
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
                      width: 110,
                      height: 1.5,
                      background: COLOR.NAVY,
                      opacity: 0.4,
                      margin: '0 auto',
                      borderRadius: 1,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 8,
                      color: COLOR.NAVY,
                      opacity: 0.5,
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
                  paddingTop: 14,
                  marginTop: 10,
                  borderTop: `1px solid ${COLOR.GOLD}30`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
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
