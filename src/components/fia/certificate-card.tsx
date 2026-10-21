/**
 * ============================================================================
 * FIA ACADEMY — LUXURY CERTIFICATE COMPONENT (MAGICAL EDITION)
 * ============================================================================
 *
 * A unified, reusable certificate component for أكاديمية المستقبل الدولية
 * (Future International Academy). Renders the on-screen certificate preview
 * AND is the source element for high-quality PNG/PDF export.
 *
 * DESIGN: LANDSCAPE A4 (1.4142 = √2 = ISO A4 ratio)
 * ===================================================
 *
 * MAGICAL / ARTISTIC ELEMENTS (the "لمسة فنية وابداعية"):
 * ====================================================
 * 1. Ornate gold corner flourishes with multi-layered filigree
 * 2. Top ribbon banner «شهادة إكمال معتمدة» draped in gold
 * 3. Decorative star ornaments flanking student name
 * 4. Arabic-style guilloché security pattern (subtle background)
 * 5. Diagonal FIA watermark (large, low-opacity, behind content)
 * 6. Circular official seal stamp with 8 stars
 * 7. Calligraphic signature line with cursive script
 * 8. Two-tone gold gradient frames with shimmering accents
 * 9. Decorative dotted/dashed gold dividers with diamond center
 * 10. Royal emblem above academy name (crown-style)
 *
 * EXPORT SAFETY (preserved from previous fixes):
 * ==============================================
 * - All colors are INLINE HEX (no oklch/lab parsing issues)
 * - All icons are INLINE SVG with EXPLICIT stroke colors (no currentColor)
 * - Uses cqw (container query width) units so content scales PROPORTIONALLY
 * - aspectRatio: 1.4142/1 locks landscape A4 orientation
 * - All content fits within the frame (no overflow)
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
  NAVY: '#0A1F44',
  NAVY_DEEP: '#061534',
  NAVY_DARK: '#020A1C',
  NAVY_MID: '#1B3A6B',
  GOLD: '#D4AF37',
  GOLD_BRIGHT: '#E5C158',
  GOLD_LIGHT: '#F0D070',
  GOLD_PALE: '#F5E5B3',
  GOLD_VERY_PALE: '#FAF3DC',
  GOLD_DARK: '#8B6F2C',
  GOLD_DEEP: '#6B5421',
  CREAM: '#FCF9F0',
  CREAM_DEEP: '#F5EFE0',
  IVORY: '#FFFEFA',
  WHITE: '#FFFFFF',
  GREEN: '#16A34A',
  RED: '#DC2626',
  SHADOW_GOLD: 'rgba(212, 175, 55, 0.25)',
  SHADOW_NAVY: 'rgba(10, 31, 68, 0.15)',
  SHADOW_DEEP: 'rgba(10, 31, 68, 0.35)',
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

function IconCalendar({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconFileText({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
    </svg>
  )
}

function IconShield({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconSparkles({ size, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  )
}

// ============================================================================
// SUB-COMPONENTS — Magical decorative elements
// ============================================================================

// Elaborate corner ornament — multi-layered gold filigree
function LuxuryCornerOrnament({ position, size }: { position: 'tl' | 'tr' | 'bl' | 'br'; size: number }) {
  const transforms: Record<string, string> = {
    tl: 'translate(0, 0)',
    tr: 'translate(1000, 0) scale(-1, 1)',
    bl: 'translate(0, 700) scale(1, -1)',
    br: 'translate(1000, 700) scale(-1, -1)',
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      style={{
        position: 'absolute',
        [position === 'tl' || position === 'tr' ? 'top' : 'bottom']: size * 0.15,
        [position === 'tl' || position === 'bl' ? 'left' : 'right']: size * 0.15,
        opacity: 0.95,
        pointerEvents: 'none',
        transform: transforms[position],
        transformOrigin: '0 0',
        filter: `drop-shadow(0 1px 2px ${COLOR.SHADOW_NAVY})`,
      } as React.CSSProperties}
    >
      {/* Outer filigree — large flowing curve */}
      <path d="M 0 60 C 0 25, 25 0, 60 0" stroke={COLOR.GOLD} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Middle curve — accent line */}
      <path d="M 5 55 C 5 30, 30 5, 55 5" stroke={COLOR.GOLD_BRIGHT} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Inner curve — delicate */}
      <path d="M 12 48 C 12 32, 32 12, 48 12" stroke={COLOR.GOLD_LIGHT} strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Decorative beads along outer curve */}
      <circle cx="3" cy="50" r="2" fill={COLOR.GOLD} />
      <circle cx="15" cy="40" r="1.5" fill={COLOR.GOLD_BRIGHT} />
      <circle cx="28" cy="28" r="2" fill={COLOR.GOLD} />
      <circle cx="40" cy="15" r="1.5" fill={COLOR.GOLD_BRIGHT} />
      <circle cx="50" cy="3" r="2" fill={COLOR.GOLD} />
      {/* Central ornate diamond at corner */}
      <path d="M 0 0 L 8 -8 L 16 0 L 8 8 Z" fill={COLOR.GOLD} />
      <path d="M 0 0 L 8 -8 L 16 0 L 8 8 Z" fill="none" stroke={COLOR.GOLD_DARK} strokeWidth="0.5" />
      <circle cx="8" cy="0" r="2" fill={COLOR.GOLD_BRIGHT} />
      {/* Small accent flourishes */}
      <path d="M 0 65 L 0 75 M 0 65 L 10 65" stroke={COLOR.GOLD} strokeWidth="1" strokeLinecap="round" />
      <path d="M 65 0 L 75 0 M 65 0 L 65 10" stroke={COLOR.GOLD} strokeWidth="1" strokeLinecap="round" />
      {/* Inner decorative petals */}
      <path d="M 20 20 Q 25 15, 30 20 Q 25 25, 20 20" fill={COLOR.GOLD_PALE} opacity="0.7" />
    </svg>
  )
}

// Royal crown emblem (above academy name)
function CrownEmblem({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 60 36"
      style={{
        display: 'block',
        margin: '0 auto 0.3cqw',
        filter: `drop-shadow(0 2px 3px ${COLOR.SHADOW_NAVY})`,
      }}
    >
      {/* Crown base */}
      <rect x="10" y="22" width="40" height="6" rx="1" fill={COLOR.GOLD} stroke={COLOR.GOLD_DARK} strokeWidth="0.5" />
      {/* Crown peaks */}
      <path d="M 10 22 L 15 8 L 22 22 L 30 4 L 38 22 L 45 8 L 50 22 Z" fill={COLOR.GOLD} stroke={COLOR.GOLD_DARK} strokeWidth="0.5" strokeLinejoin="round" />
      {/* Jewels on peaks */}
      <circle cx="15" cy="8" r="2" fill={COLOR.NAVY} stroke={COLOR.GOLD} strokeWidth="0.5" />
      <circle cx="30" cy="4" r="2.5" fill={COLOR.NAVY} stroke={COLOR.GOLD} strokeWidth="0.5" />
      <circle cx="45" cy="8" r="2" fill={COLOR.NAVY} stroke={COLOR.GOLD} strokeWidth="0.5" />
      {/* Decorative dots on base */}
      <circle cx="20" cy="25" r="1" fill={COLOR.GOLD_BRIGHT} />
      <circle cx="30" cy="25" r="1.2" fill={COLOR.GOLD_BRIGHT} />
      <circle cx="40" cy="25" r="1" fill={COLOR.GOLD_BRIGHT} />
      {/* Base accent */}
      <rect x="10" y="28" width="40" height="2" fill={COLOR.GOLD_DARK} opacity="0.5" />
    </svg>
  )
}

// Official seal stamp — circular with stars around perimeter
function OfficialSeal({ size }: { size: number }) {
  const stars = 8
  const starRadius = size * 0.42
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        display: 'block',
        filter: `drop-shadow(0 2px 4px ${COLOR.SHADOW_NAVY})`,
      }}
    >
      {/* Outer ring */}
      <circle cx="50" cy="50" r="48" fill="none" stroke={COLOR.NAVY} strokeWidth="2" />
      {/* Middle ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke={COLOR.GOLD} strokeWidth="1" />
      {/* Inner background */}
      <circle cx="50" cy="50" r="42" fill={COLOR.NAVY} />
      {/* Decorative inner ring */}
      <circle cx="50" cy="50" r="38" fill="none" stroke={COLOR.GOLD} strokeWidth="0.8" strokeDasharray="2 1" />
      {/* 8 stars around perimeter */}
      {Array.from({ length: stars }).map((_, i) => {
        const angle = (i / stars) * Math.PI * 2 - Math.PI / 2
        const x = 50 + Math.cos(angle) * starRadius
        const y = 50 + Math.sin(angle) * starRadius
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path
              d="M 0 -3 L 0.9 -0.9 L 3 0 L 0.9 0.9 L 0 3 L -0.9 0.9 L -3 0 L -0.9 -0.9 Z"
              fill={COLOR.GOLD}
            />
          </g>
        )
      })}
      {/* Center emblem — FIA monogram */}
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill={COLOR.GOLD}
        fontFamily="serif"
      >
        FIA
      </text>
      {/* Small decorative line under FIA */}
      <line x1="35" y1="52" x2="65" y2="52" stroke={COLOR.GOLD} strokeWidth="0.5" />
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="6"
        fontWeight="700"
        fill={COLOR.GOLD_PALE}
        fontFamily="serif"
        letterSpacing="1"
      >
        OFFICIAL SEAL
      </text>
      {/* Tiny decorative dots */}
      <circle cx="50" cy="68" r="1" fill={COLOR.GOLD} />
    </svg>
  )
}

// Signature script element — calligraphic
function SignatureScript({ width, color }: { width: number; color: string }) {
  return (
    <svg
      width={width}
      height={width * 0.3}
      viewBox="0 0 200 60"
      style={{
        display: 'block',
        margin: '0 auto',
      }}
    >
      {/* Calligraphic signature-like flourish */}
      <path
        d="M 20 35 Q 30 20, 40 35 Q 45 45, 50 35 Q 55 25, 60 30 Q 65 35, 70 28 Q 75 22, 80 32 Q 85 42, 90 30 Q 95 22, 100 28 Q 105 35, 110 25 Q 115 18, 120 30 Q 125 40, 130 28 Q 135 20, 140 32 Q 145 42, 150 30 L 155 35"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Underline flourish */}
      <path
        d="M 25 48 Q 50 46, 80 48 Q 110 50, 140 47 Q 150 46, 155 48"
        stroke={color}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Initial decorative dot */}
      <circle cx="18" cy="35" r="2" fill={color} opacity="0.8" />
    </svg>
  )
}

// Decorative diamond ornament (for dividers)
function DiamondOrnament({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path d="M 10 2 L 18 10 L 10 18 L 2 10 Z" fill={color} stroke={color} strokeWidth="0.5" />
      <path d="M 10 5 L 15 10 L 10 15 L 5 10 Z" fill={COLOR.WHITE} opacity="0.3" />
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
          // === LANDSCAPE A4 ASPECT RATIO ===
          width: '100%',
          aspectRatio: '1.4142 / 1',
          margin: 0,
          position: 'relative',
          background: COLOR.IVORY,
          fontFamily: "'Cairo', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
          containerType: 'inline-size',
          // === OUTER GOLD FRAME — multi-stop gradient for shimmer ===
          padding: '1cqw',
          backgroundImage: `linear-gradient(135deg, ${COLOR.GOLD_DEEP} 0%, ${COLOR.GOLD} 15%, ${COLOR.GOLD_BRIGHT} 30%, ${COLOR.GOLD_LIGHT} 50%, ${COLOR.GOLD_BRIGHT} 70%, ${COLOR.GOLD} 85%, ${COLOR.GOLD_DEEP} 100%)`,
          borderRadius: '0.6cqw',
          boxShadow: `
            0 0.6cqw 2cqw ${COLOR.SHADOW_NAVY},
            0 0 0 1px ${COLOR.GOLD_DARK},
            inset 0 0 0 1px ${COLOR.GOLD_PALE}
          `,
          overflow: 'hidden',
        }}
      >
        {/* === INNER NAVY FRAME — double border === */}
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: '0.3cqw',
            background: `linear-gradient(135deg, ${COLOR.NAVY_DARK} 0%, ${COLOR.NAVY_DEEP} 30%, ${COLOR.NAVY} 60%, ${COLOR.NAVY_MID} 100%)`,
            borderRadius: '0.4cqw',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `inset 0 0 0 1px ${COLOR.GOLD}80`,
          }}
        >
          {/* === GOLD INNER BORDER (thin elegant line) === */}
          <div
            style={{
              width: '100%',
              height: '100%',
              padding: '0.3cqw',
              background: `linear-gradient(135deg, ${COLOR.GOLD} 0%, ${COLOR.GOLD_BRIGHT} 50%, ${COLOR.GOLD} 100%)`,
              borderRadius: '0.3cqw',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* === CREAM CONTENT AREA === */}
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${COLOR.IVORY} 0%, ${COLOR.CREAM} 40%, ${COLOR.CREAM_DEEP} 70%, ${COLOR.IVORY} 100%)`,
                borderRadius: '0.2cqw',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `inset 0 0 0 0.1cqw ${COLOR.GOLD}30`,
              }}
            >
              {/* === SUBTLE GUILOCHÉ SECURITY PATTERN (background) === */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.04,
                  pointerEvents: 'none',
                  backgroundImage: `
                    repeating-linear-gradient(45deg, ${COLOR.NAVY} 0, ${COLOR.NAVY} 1px, transparent 1px, transparent 8px),
                    repeating-linear-gradient(-45deg, ${COLOR.NAVY} 0, ${COLOR.NAVY} 1px, transparent 1px, transparent 8px),
                    repeating-linear-gradient(0deg, ${COLOR.GOLD} 0, ${COLOR.GOLD} 1px, transparent 1px, transparent 12px),
                    repeating-linear-gradient(90deg, ${COLOR.GOLD} 0, ${COLOR.GOLD} 1px, transparent 1px, transparent 12px)
                  `,
                }}
              />

              {/* === DIAGONAL FIA WATERMARK (large, behind content) === */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-35deg)',
                  fontSize: '20cqw',
                  fontWeight: 900,
                  color: COLOR.NAVY,
                  opacity: 0.04,
                  letterSpacing: '0.1em',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  fontFamily: 'serif',
                  zIndex: 0,
                }}
              >
                FIA
              </div>

              {/* === RADIAL GOLD ACCENTS === */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundImage: `
                    radial-gradient(circle at 10% 10%, ${COLOR.GOLD}20 0%, transparent 30%),
                    radial-gradient(circle at 90% 90%, ${COLOR.NAVY}15 0%, transparent 35%),
                    radial-gradient(circle at 50% 50%, ${COLOR.GOLD}08 0%, transparent 50%)
                  `,
                  zIndex: 0,
                }}
              />

              {/* === CORNER ORNAMENTS === */}
              <LuxuryCornerOrnament position="tl" size={9} />
              <LuxuryCornerOrnament position="tr" size={9} />
              <LuxuryCornerOrnament position="bl" size={9} />
              <LuxuryCornerOrnament position="br" size={9} />

              {/* ===== INNER CONTENT WRAPPER ===== */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  padding: '2.2cqw 4cqw 1.8cqw 4cqw',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  color: COLOR.NAVY,
                  boxSizing: 'border-box',
                  zIndex: 1,
                }}
              >
                {/* ===== TOP: CROWN + LOGO + ACADEMY IDENTITY ===== */}
                <div style={{ width: '100%', flexShrink: 0 }}>
                  {/* Royal crown emblem above logo */}
                  <CrownEmblem size={6} />

                  <img
                    src={logoSrc}
                    alt="FIA Logo"
                    crossOrigin="anonymous"
                    style={{
                      width: '5.5cqw',
                      height: '5.5cqw',
                      minWidth: 40,
                      minHeight: 40,
                      objectFit: 'contain',
                      margin: '0 auto 0.4cqw',
                      display: 'block',
                      filter: `drop-shadow(0 0.3cqw 0.7cqw ${COLOR.SHADOW_NAVY})`,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.8cqw',
                      marginBottom: '0.2cqw',
                      flexWrap: 'nowrap',
                    }}
                  >
                    <div
                      style={{
                        width: '3cqw',
                        minWidth: 18,
                        height: 2,
                        background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                        borderRadius: 1,
                        flexShrink: 0,
                      }}
                    />
                    {/* Small diamond accent */}
                    <DiamondOrnament size={6} color={COLOR.GOLD} />
                    <span
                      style={{
                        fontSize: 'clamp(13px, 2.2cqw, 26px)',
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
                    <DiamondOrnament size={6} color={COLOR.GOLD} />
                    <div
                      style={{
                        width: '3cqw',
                        minWidth: 18,
                        height: 2,
                        background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                        borderRadius: 1,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 'clamp(6px, 0.9cqw, 11px)',
                      color: COLOR.GOLD_DARK,
                      fontWeight: 800,
                      letterSpacing: '0.4em',
                      margin: 0,
                      textTransform: 'uppercase',
                    }}
                  >
                    FUTURE INTERNATIONAL ACADEMY
                  </p>

                  {/* RIBBON BANNER — «شهادة إكمال معتمدة» draped */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5cqw',
                      padding: '0.5cqw 2cqw',
                      borderRadius: 4,
                      background: `linear-gradient(135deg, ${COLOR.NAVY_DARK} 0%, ${COLOR.NAVY} 50%, ${COLOR.NAVY_MID} 100%)`,
                      border: `1.5px solid ${COLOR.GOLD}`,
                      marginTop: '0.8cqw',
                      boxShadow: `
                        0 0.3cqw 0.8cqw ${COLOR.SHADOW_NAVY},
                        inset 0 1px 0 ${COLOR.GOLD}30
                      `,
                      position: 'relative',
                    }}
                  >
                    <IconAward size={16} color={COLOR.GOLD} strokeWidth={2.5} />
                    <span
                      style={{
                        fontSize: 'clamp(9px, 1.2cqw, 15px)',
                        fontWeight: 900,
                        color: COLOR.GOLD,
                        letterSpacing: '0.8px',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      شهادة إكمال معتمدة
                    </span>
                    <IconAward size={16} color={COLOR.GOLD} strokeWidth={2.5} />
                  </div>
                </div>

                {/* === ORNATE GOLD SEPARATOR === */}
                <div
                  style={{
                    width: '80%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5cqw',
                    margin: '0.6cqw 0 0.4cqw',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1.5,
                      background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                    }}
                  />
                  <DiamondOrnament size={5} color={COLOR.GOLD} />
                  <div style={{ width: 8, height: 1.5, background: COLOR.GOLD }} />
                  <DiamondOrnament size={8} color={COLOR.GOLD} />
                  <div style={{ width: 8, height: 1.5, background: COLOR.GOLD }} />
                  <DiamondOrnament size={5} color={COLOR.GOLD} />
                  <div
                    style={{
                      flex: 1,
                      height: 1.5,
                      background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                    }}
                  />
                </div>

                {/* ===== MIDDLE: STUDENT NAME + COURSE ===== */}
                <div
                  style={{
                    width: '100%',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3cqw',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'clamp(10px, 1.3cqw, 16px)',
                      color: COLOR.NAVY,
                      opacity: 0.75,
                      margin: 0,
                      fontWeight: 600,
                      fontStyle: 'italic',
                    }}
                  >
                    تشهد أكاديمية المستقبل الدولية بأن
                  </p>

                  {/* Decorative stars flanking student name */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.8cqw',
                      width: '100%',
                    }}
                  >
                    <IconSparkles size={18} color={COLOR.GOLD} strokeWidth={2} />
                    {/* Student name — the most prominent element */}
                    <h2
                      style={{
                        fontSize: 'clamp(19px, 3.8cqw, 46px)',
                        fontWeight: 900,
                        color: COLOR.NAVY,
                        margin: 0,
                        textShadow: `0 2px 6px ${COLOR.SHADOW_NAVY}, 0 0 30px ${COLOR.GOLD}20`,
                        lineHeight: 1.1,
                        letterSpacing: '0.5px',
                        wordBreak: 'break-word',
                        background: `linear-gradient(180deg, ${COLOR.NAVY} 0%, ${COLOR.NAVY_MID} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: COLOR.NAVY,
                        backgroundClip: 'text',
                      }}
                    >
                      {certificate.student_name}
                    </h2>
                    <IconSparkles size={18} color={COLOR.GOLD} strokeWidth={2} />
                  </div>

                  {/* Ornamental divider */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5cqw',
                      margin: '0.3cqw 0',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        width: '5cqw',
                        minWidth: 30,
                        height: 1,
                        background: `linear-gradient(to right, transparent, ${COLOR.GOLD})`,
                      }}
                    />
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: COLOR.GOLD,
                        boxShadow: `0 0 6px ${COLOR.GOLD}`,
                      }}
                    />
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: COLOR.GOLD_BRIGHT }} />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: COLOR.GOLD, boxShadow: `0 0 6px ${COLOR.GOLD}` }} />
                    <div
                      style={{
                        width: '5cqw',
                        minWidth: 30,
                        height: 1,
                        background: `linear-gradient(to left, transparent, ${COLOR.GOLD})`,
                      }}
                    />
                  </div>

                  <p
                    style={{
                      fontSize: 'clamp(9px, 1.2cqw, 14px)',
                      color: COLOR.NAVY,
                      opacity: 0.75,
                      margin: 0,
                      fontWeight: 600,
                      fontStyle: 'italic',
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
                      padding: '0.2cqw 1.5cqw',
                      borderBottom: `2px solid ${COLOR.GOLD}40`,
                      borderTop: `2px solid ${COLOR.GOLD}40`,
                    }}
                  >
                    {certificate.course_title || 'دورة معتمدة'}
                  </h3>

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

                {/* === ORNATE DOTTED DIVIDER === */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5cqw',
                    width: '85%',
                    margin: '0.4cqw 0',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundImage: `repeating-linear-gradient(to right, ${COLOR.GOLD}60 0, ${COLOR.GOLD}60 3px, transparent 3px, transparent 6px)`,
                    }}
                  />
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: `${COLOR.GOLD}90` }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR.GOLD, boxShadow: `0 0 4px ${COLOR.GOLD}` }} />
                  <DiamondOrnament size={7} color={COLOR.GOLD} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR.GOLD, boxShadow: `0 0 4px ${COLOR.GOLD}` }} />
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: `${COLOR.GOLD}90` }} />
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundImage: `repeating-linear-gradient(to right, ${COLOR.GOLD}60 0, ${COLOR.GOLD}60 3px, transparent 3px, transparent 6px)`,
                    }}
                  />
                </div>

                {/* ===== BOTTOM: QR + METADATA + SEAL + SIGNATURE ===== */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '1.2cqw',
                    paddingTop: '0.3cqw',
                    flexShrink: 0,
                  }}
                >
                  {/* QR code — left side */}
                  <div
                    style={{
                      textAlign: 'center',
                      flexShrink: 0,
                      width: '8.5cqw',
                      minWidth: 56,
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
                          width: '5.5cqw',
                          height: '5.5cqw',
                          minWidth: 40,
                          minHeight: 40,
                          display: 'block',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(6px, 0.75cqw, 10px)',
                        color: COLOR.NAVY,
                        opacity: 0.6,
                        marginTop: '0.2cqw',
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
                      gap: '1cqw',
                      alignItems: 'center',
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    {/* Cert number */}
                    <div style={{ textAlign: 'center', minWidth: '7.5cqw' }}>
                      <div
                        style={{
                          width: '2.6cqw',
                          height: '2.6cqw',
                          minWidth: 22,
                          minHeight: 22,
                          borderRadius: 8,
                          background: `linear-gradient(135deg, ${COLOR.NAVY} 0%, ${COLOR.NAVY_MID} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.3cqw',
                          boxShadow: `0 0.15cqw 0.4cqw ${COLOR.SHADOW_NAVY}, inset 0 1px 0 ${COLOR.GOLD}40`,
                          border: `1px solid ${COLOR.GOLD}60`,
                        }}
                      >
                        <IconFileText size={14} color={COLOR.GOLD} strokeWidth={2.5} />
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(6px, 0.75cqw, 10px)',
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
                          fontSize: 'clamp(7px, 0.95cqw, 12px)',
                          color: COLOR.NAVY,
                          wordBreak: 'break-all',
                        }}
                        dir="ltr"
                      >
                        {certificate.certificate_number}
                      </div>
                    </div>

                    <div style={{ width: 1, height: '3.5cqw', minHeight: 28, background: `${COLOR.GOLD}40` }} />

                    {/* Issue date */}
                    <div style={{ textAlign: 'center', minWidth: '8.5cqw' }}>
                      <div
                        style={{
                          width: '2.6cqw',
                          height: '2.6cqw',
                          minWidth: 22,
                          minHeight: 22,
                          borderRadius: 8,
                          background: `linear-gradient(135deg, ${COLOR.NAVY} 0%, ${COLOR.NAVY_MID} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.3cqw',
                          boxShadow: `0 0.15cqw 0.4cqw ${COLOR.SHADOW_NAVY}, inset 0 1px 0 ${COLOR.GOLD}40`,
                          border: `1px solid ${COLOR.GOLD}60`,
                        }}
                      >
                        <IconCalendar size={14} color={COLOR.GOLD} strokeWidth={2.5} />
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(6px, 0.75cqw, 10px)',
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
                          fontSize: 'clamp(7px, 0.85cqw, 11px)',
                          color: COLOR.NAVY,
                        }}
                      >
                        {issueDateText}
                      </div>
                    </div>

                    <div style={{ width: 1, height: '3.5cqw', minHeight: 28, background: `${COLOR.GOLD}40` }} />

                    {/* Status */}
                    <div style={{ textAlign: 'center', minWidth: '6cqw' }}>
                      <div
                        style={{
                          width: '2.6cqw',
                          height: '2.6cqw',
                          minWidth: 22,
                          minHeight: 22,
                          borderRadius: 8,
                          background: `linear-gradient(135deg, ${COLOR.NAVY} 0%, ${COLOR.NAVY_MID} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.3cqw',
                          boxShadow: `0 0.15cqw 0.4cqw ${COLOR.SHADOW_NAVY}, inset 0 1px 0 ${COLOR.GOLD}40`,
                          border: `1px solid ${COLOR.GOLD}60`,
                        }}
                      >
                        <IconShield size={14} color={COLOR.GOLD} strokeWidth={2.5} />
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(6px, 0.75cqw, 10px)',
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
                          fontSize: 'clamp(8px, 0.95cqw, 13px)',
                          color: isVerified ? COLOR.GREEN : COLOR.RED,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: isVerified ? `${COLOR.GREEN}15` : `${COLOR.RED}15`,
                          border: `1px solid ${isVerified ? COLOR.GREEN : COLOR.RED}40`,
                          display: 'inline-block',
                        }}
                      >
                        {certificate.status}
                      </div>
                    </div>
                  </div>

                  {/* Official seal + Signature — right side */}
                  <div
                    style={{
                      textAlign: 'center',
                      flexShrink: 0,
                      width: '10cqw',
                      minWidth: 70,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.3cqw',
                    }}
                  >
                    {/* Official seal stamp */}
                    <OfficialSeal size={36} />
                    {/* Issuer name */}
                    <div
                      style={{
                        fontSize: 'clamp(6px, 0.75cqw, 10px)',
                        color: COLOR.NAVY,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 800,
                      }}
                    >
                      صادر عن
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 'clamp(7px, 0.85cqw, 11px)',
                        color: COLOR.NAVY,
                        lineHeight: 1.3,
                      }}
                    >
                      {certificate.issued_by || 'أكاديمية المستقبل الدولية'}
                    </div>
                    {/* Calligraphic signature */}
                    <SignatureScript width={60} color={COLOR.NAVY} />
                    <div
                      style={{
                        fontSize: 'clamp(6px, 0.7cqw, 9px)',
                        color: COLOR.NAVY,
                        opacity: 0.6,
                        fontWeight: 700,
                        marginTop: '-2px',
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
                    paddingTop: '0.5cqw',
                    marginTop: '0.4cqw',
                    borderTop: `1px solid ${COLOR.GOLD}30`,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5cqw',
                  }}
                >
                  <IconSparkles size={10} color={COLOR.GOLD} strokeWidth={2.5} />
                  <span
                    style={{
                      fontSize: 'clamp(8px, 1cqw, 13px)',
                      color: COLOR.GOLD_DARK,
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                    }}
                  >
                    نحو مستقبل أفضل معاً
                  </span>
                  <IconSparkles size={10} color={COLOR.GOLD} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
