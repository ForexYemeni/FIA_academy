/**
 * ============================================================================
 * FIA ACADEMY — SERVER-SIDE CERTIFICATE RENDERER (v2.8)
 * ============================================================================
 *
 * يرسم شهادة أكاديمية المستقبل الدولية على الخادم عبر @napi-rs/canvas
 * بخط Cairo الحقيقي — **مطابقة 1:1 لتصميم certificate-card.tsx المعروض
 * داخل التطبيق والموقع** (نفس الإطارات، نفس الشارة، نفس الأيقونات،
 * نفس التوزيع، ونفس أحجام النصوص الفعلية على شاشة الهاتف).
 *
 * المقياس المرجعي: 380 وحدة عرض (نسبة 1.1:1 مثل البطاقة) — عند هذا العرض
 * تسود حدود clamp الدنيا في البطاقة تماماً كما تظهر على الهاتف، فتبدو
 * الشهادة المحفوظة مطابقة للمعاينة الفاخرة في التطبيق.
 *
 * لماذا الخادم؟ داخل WebView أندرويد تفشل مكتبات الالتقاط المحلية
 * (html2canvas / html-to-image) في دمج الخطوط وترسم العربية متداخلة،
 * بينما الخادم يرسم بخط Cairo المسجّل من ملفات TTF → نتيجة حرفية
 * ثابتة على كل الأجهزة وبأعلى دقة (3040×2760).
 * ============================================================================
 */

import fs from 'fs'
import path from 'path'
import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type SKRSContext2D,
} from '@napi-rs/canvas'
import QRCode from 'qrcode'

// ============================================================================
// PALETTE — مطابقة حرفياً لثوابت certificate-card.tsx
// ============================================================================
const NAVY = '#0A1F44'
const NAVY_DEEP = '#061534'
const NAVY_MID = '#1B3A6B'
const GOLD = '#D4AF37'
const GOLD_BRIGHT = '#E5C158'
const GOLD_LIGHT = '#F0D070'
const GOLD_PALE = '#F5E5B3'
const GOLD_DARK = '#8B6F2C'
const CREAM = '#FCF9F0'
const IVORY = '#FFFEFA'
const WHITE = '#FFFFFF'
const GREEN = '#16A34A'
const RED = '#DC2626'

// ============================================================================
// FONTS
// ============================================================================
function getFontPaths() {
  const candidates = [path.join(process.cwd(), '.fonts')].filter((p) =>
    fs.existsSync(p)
  )
  const fontsDir = candidates[0] || path.join(process.cwd(), '.fonts')
  return {
    regular: path.join(fontsDir, 'Cairo-Regular.ttf'),
    bold: path.join(fontsDir, 'Cairo-Bold.ttf'),
    black: path.join(fontsDir, 'Cairo-Black.ttf'),
  }
}

let fontsRegistered = false
function registerFonts() {
  if (fontsRegistered) return
  try {
    const fonts = getFontPaths()
    if (fs.existsSync(fonts.regular))
      GlobalFonts.registerFromPath(fonts.regular, 'Cairo')
    if (fs.existsSync(fonts.bold))
      GlobalFonts.registerFromPath(fonts.bold, 'Cairo-Bold')
    if (fs.existsSync(fonts.black))
      GlobalFonts.registerFromPath(fonts.black, 'Cairo-Black')
    fontsRegistered = true
  } catch {
    /* ignore */
  }
}

// ============================================================================
// CANVAS HELPERS
// ============================================================================
type Ctx = SKRSContext2D

function roundRectPath(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

function fillRR(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string | CanvasGradient
) {
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fillStyle = color
  ctx.fill()
}

function strokeRR(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  lw: number
) {
  roundRectPath(ctx, x, y, w, h, r)
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.stroke()
}

/** نجمة رباعية ذهبية مملوءة (بديل رمز ✦ في التذييل) */
function drawStar4(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  const ri = r * 0.38
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx + ri * 0.2, cy - ri * 0.2, cx + r, cy)
  ctx.quadraticCurveTo(cx + ri * 0.2, cy + ri * 0.2, cx, cy + r)
  ctx.quadraticCurveTo(cx - ri * 0.2, cy + ri * 0.2, cx - r, cy)
  ctx.quadraticCurveTo(cx - ri * 0.2, cy - ri * 0.2, cx, cy - r)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

/** نجمة Sparkles مفرّغة بأسلوب lucide (أيقونة الزخرفة وسط الشهادة) */
function iconSparkleAt(
  ctx: Ctx,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const r = size * 0.5
  const ri = r * 0.36
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx + ri * 0.2, cy - ri * 0.2, cx + r, cy)
  ctx.quadraticCurveTo(cx + ri * 0.2, cy + ri * 0.2, cx, cy + r)
  ctx.quadraticCurveTo(cx - ri * 0.2, cy + ri * 0.2, cx - r, cy)
  ctx.quadraticCurveTo(cx - ri * 0.2, cy - ri * 0.2, cx, cy - r)
  ctx.closePath()
  ctx.strokeStyle = color
  ctx.lineWidth = size * 0.11
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
}

// ============================================================================
// INLINE VECTOR ICONS — نفس أيقونات lucide المستخدمة في certificate-card
// ============================================================================
interface IconOpts {
  size: number
  color: string
  sw?: number
}

function iconAward(ctx: Ctx, cx: number, cy: number, o: IconOpts) {
  const s = o.size / 24
  ctx.save()
  ctx.translate(cx - 12 * s, cy - 12 * s)
  ctx.scale(s, s)
  ctx.strokeStyle = o.color
  ctx.lineWidth = (o.sw ?? 2) / s
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.arc(12, 8, 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(15.477, 12.89)
  ctx.lineTo(17, 22)
  ctx.lineTo(12, 19)
  ctx.lineTo(7, 22)
  ctx.lineTo(8.523, 12.89)
  ctx.stroke()
  ctx.restore()
}

function iconCalendar(ctx: Ctx, cx: number, cy: number, o: IconOpts) {
  const s = o.size / 24
  ctx.save()
  ctx.translate(cx - 12 * s, cy - 12 * s)
  ctx.scale(s, s)
  ctx.strokeStyle = o.color
  ctx.lineWidth = (o.sw ?? 2) / s
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(5, 4)
  ctx.lineTo(19, 4)
  ctx.quadraticCurveTo(21, 4, 21, 6)
  ctx.lineTo(21, 20)
  ctx.quadraticCurveTo(21, 22, 19, 22)
  ctx.lineTo(5, 22)
  ctx.quadraticCurveTo(3, 22, 3, 20)
  ctx.lineTo(3, 6)
  ctx.quadraticCurveTo(3, 4, 5, 4)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(16, 2)
  ctx.lineTo(16, 6)
  ctx.moveTo(8, 2)
  ctx.lineTo(8, 6)
  ctx.moveTo(3, 10)
  ctx.lineTo(21, 10)
  ctx.stroke()
  ctx.restore()
}

function iconShield(ctx: Ctx, cx: number, cy: number, o: IconOpts) {
  const s = o.size / 24
  ctx.save()
  ctx.translate(cx - 12 * s, cy - 12 * s)
  ctx.scale(s, s)
  ctx.strokeStyle = o.color
  ctx.lineWidth = (o.sw ?? 2) / s
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(20, 13)
  ctx.bezierCurveTo(20, 18, 16.5, 20.5, 12.34, 21.95)
  ctx.bezierCurveTo(12.12, 22.02, 11.88, 22.02, 11.67, 21.94)
  ctx.bezierCurveTo(7.5, 20.5, 4, 18, 4, 13)
  ctx.lineTo(4, 6)
  ctx.quadraticCurveTo(4, 5, 5, 5)
  ctx.bezierCurveTo(7, 5, 9.5, 3.8, 11.24, 2.28)
  ctx.bezierCurveTo(11.71, 1.86, 12.29, 1.86, 12.76, 2.28)
  ctx.bezierCurveTo(14.51, 3.81, 17, 5, 19, 5)
  ctx.quadraticCurveTo(20, 5, 20, 6)
  ctx.closePath()
  ctx.lineTo(20, 13)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(9, 12)
  ctx.lineTo(11, 14)
  ctx.lineTo(15, 10)
  ctx.stroke()
  ctx.restore()
}

function iconFileText(ctx: Ctx, cx: number, cy: number, o: IconOpts) {
  const s = o.size / 24
  ctx.save()
  ctx.translate(cx - 12 * s, cy - 12 * s)
  ctx.scale(s, s)
  ctx.strokeStyle = o.color
  ctx.lineWidth = (o.sw ?? 2) / s
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(14, 2)
  ctx.lineTo(6, 2)
  ctx.quadraticCurveTo(4, 2, 4, 4)
  ctx.lineTo(4, 20)
  ctx.quadraticCurveTo(4, 22, 6, 22)
  ctx.lineTo(18, 22)
  ctx.quadraticCurveTo(20, 22, 20, 20)
  ctx.lineTo(20, 8)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(14, 2)
  ctx.lineTo(14, 5)
  ctx.quadraticCurveTo(14, 7, 16, 7)
  ctx.lineTo(20, 7)
  ctx.moveTo(10, 9)
  ctx.lineTo(8, 9)
  ctx.moveTo(16, 13)
  ctx.lineTo(8, 13)
  ctx.moveTo(16, 17)
  ctx.lineTo(8, 17)
  ctx.stroke()
  ctx.restore()
}

// ============================================================================
// ORNAMENT — نفس زخرفة الزوايا في CornerOrnament (viewBox 60×60)
// ============================================================================
function drawOrnament(
  ctx: Ctx,
  pivotX: number,
  pivotY: number,
  box: number,
  mx: number,
  my: number
) {
  const k = box / 60
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.translate(pivotX, pivotY)
  ctx.scale(mx * k, my * k)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 48)
  ctx.bezierCurveTo(0, 16, 16, 0, 48, 0)
  ctx.stroke()

  ctx.strokeStyle = GOLD_BRIGHT
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(8, 40)
  ctx.bezierCurveTo(8, 22, 22, 8, 40, 8)
  ctx.stroke()

  ctx.fillStyle = GOLD
  ;[
    [6, 42],
    [14, 32],
    [26, 20],
    [36, 10],
  ].forEach(([dx, dy]) => {
    ctx.beginPath()
    ctx.arc(dx, dy, 1.5, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(5, -5)
  ctx.lineTo(10, 0)
  ctx.lineTo(5, 5)
  ctx.closePath()
  ctx.fill()

  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 54)
  ctx.lineTo(12, 54)
  ctx.moveTo(54, 0)
  ctx.lineTo(54, 12)
  ctx.stroke()

  ctx.restore()
}

// ============================================================================
// TEXT HELPERS
// ============================================================================
type Weight = 'regular' | 'bold' | 'black'
const familyOf = (w: Weight) =>
  w === 'black' ? 'Cairo-Black' : w === 'bold' ? 'Cairo-Bold' : 'Cairo'

function setFont(ctx: Ctx, size: number, weight: Weight, U: number) {
  ctx.font = `${size * U}px ${familyOf(weight)}`
}

function textWidth(
  ctx: Ctx,
  text: string,
  size: number,
  weight: Weight,
  U: number
) {
  setFont(ctx, size, weight, U)
  return ctx.measureText(text).width / U
}

/** تصغير تلقائي حتى يدخل النص في العرض الأقصى */
function fitFont(
  ctx: Ctx,
  text: string,
  startSize: number,
  minSize: number,
  weight: Weight,
  maxWidth: number,
  U: number
): number {
  let size = startSize
  while (size > minSize && textWidth(ctx, text, size, weight, U) > maxWidth) {
    size -= 0.25
  }
  return size
}

// ============================================================================
// MAIN PNG RENDERER — مطابق لتصميم certificate-card.tsx
// مقياس التصميم: 380×345 وحدة (نسبة 1.1) — الحدود الدنيا للـ clamp مسيطرة
// ============================================================================
export interface CertRenderData {
  certificate_number: string
  student_name: string
  course_title?: string | null
  issued_at?: string | null
  status: string
  has_external_accreditation?: boolean
  external_accreditation_body?: string | null
}

export async function renderCertificatePNG(
  cert: CertRenderData,
  issueDate: string,
  verifyUrl: string,
  founderSignature?: string | null,
  signatoryName?: string | null,
  signatoryPosition?: string | null
): Promise<Buffer> {
  registerFonts()

  // ==== مقياس الرسم ====
  const U = 8 // بكسل لكل وحدة تصميم → لوحة 3040×2760
  const W = 380 * U
  const H = 345 * U
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const cx = W / 2

  // ============================================================
  // ثوابت التخطيط (بوحدات التصميم — كلها من certificate-card.tsx)
  // ============================================================
  const GOLD_PAD = 3.8 // 1cqw
  const NAVY_PAD = 2.28 // 0.6cqw
  const CREAM_IN = GOLD_PAD + NAVY_PAD // 6.08
  const PAD_TOP = 7.6 // 2cqw
  const PAD_SIDE = 15.2 // 4cqw
  const PAD_BOTTOM = 6.84 // 1.8cqw

  const creamX = CREAM_IN * U
  const creamY = CREAM_IN * U
  const creamW = W - 2 * creamX
  const creamH = H - 2 * creamY

  const LOGO = 32 // min-clamp
  const ACADEMY_FS = 14 // min-clamp
  const ENGLISH_FS = 7 // min-clamp
  const BADGE_FS = 9 // min-clamp
  const LEAD_FS = 10 // min-clamp («تشهد»)
  const NAME_FS = 20 // min-clamp
  const DONE_FS = 9 // min-clamp («قد أتمّ»)
  const COURSE_FS = 13 // min-clamp
  const LABEL_FS = 7 // min-clamp (تسميات البطاقات السفلية)
  const NUM_FS = 8 // min-clamp (رقم الشهادة)
  const DATE_FS = 8 // min-clamp (التاريخ)
  const STATUS_FS = 9 // min-clamp (الحالة)
  const SLOGAN_FS = 9 // min-clamp
  const QR_IMG = 44 // min-clamp
  const CHIP = 24 // min-clamp (مربع الأيقونة)
  const META_DIV_H = 32 // min-clamp (فاصل عمودي)
  const SIG_COL_W = 80 // min-clamp (عمود التوقيع)
  const ORN_BOX = 4.5 * 3.8 // 4.5cqw زخرفة الزوايا

  // ------------------------------------------------------------------
  // 1) الإطار الذهبي الخارجي (تدرج 135°)
  // ------------------------------------------------------------------
  const goldGrad = ctx.createLinearGradient(0, 0, W, H)
  goldGrad.addColorStop(0, GOLD)
  goldGrad.addColorStop(0.25, GOLD_BRIGHT)
  goldGrad.addColorStop(0.5, GOLD_LIGHT)
  goldGrad.addColorStop(0.75, GOLD_BRIGHT)
  goldGrad.addColorStop(1, GOLD)
  fillRR(ctx, 0, 0, W, H, 2.66 * U, goldGrad)

  // ------------------------------------------------------------------
  // 2) الإطار الكحلي + النقاط الذهبية الخافتة
  // ------------------------------------------------------------------
  const navyGrad = ctx.createLinearGradient(0, 0, W, H)
  navyGrad.addColorStop(0, NAVY_DEEP)
  navyGrad.addColorStop(0.5, NAVY)
  navyGrad.addColorStop(1, NAVY_MID)
  const nX = GOLD_PAD * U
  fillRR(ctx, nX, nX, W - 2 * nX, H - 2 * nX, 1.9 * U, navyGrad)
  ctx.save()
  roundRectPath(ctx, nX, nX, W - 2 * nX, H - 2 * nX, 1.9 * U)
  ctx.clip()
  ctx.globalAlpha = 0.08
  ctx.fillStyle = GOLD
  const dotGap = 4.56 * U // 1.2cqw
  for (let dy = nX; dy < H - nX; dy += dotGap) {
    for (let dx = nX; dx < W - nX; dx += dotGap) {
      ctx.beginPath()
      ctx.arc(dx, dy, 0.38 * U, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // ------------------------------------------------------------------
  // 3) منطقة المحتوى الكريمية + الحلقة الذهبية + الهالات
  // ------------------------------------------------------------------
  const creamGrad = ctx.createLinearGradient(0, 0, W, H)
  creamGrad.addColorStop(0, IVORY)
  creamGrad.addColorStop(0.5, CREAM)
  creamGrad.addColorStop(1, IVORY)
  fillRR(ctx, creamX, creamY, creamW, creamH, 1.52 * U, creamGrad)
  ctx.save()
  ctx.globalAlpha = 0.25
  strokeRR(
    ctx,
    creamX + 0.28 * U,
    creamY + 0.28 * U,
    creamW - 0.56 * U,
    creamH - 0.56 * U,
    1.3 * U,
    GOLD,
    0.56 * U
  )
  ctx.restore()

  const halo1 = ctx.createRadialGradient(
    creamX + creamW * 0.12,
    creamY + creamH * 0.12,
    0,
    creamX + creamW * 0.12,
    creamY + creamH * 0.12,
    creamW * 0.35
  )
  halo1.addColorStop(0, 'rgba(212, 175, 55, 0.08)')
  halo1.addColorStop(1, 'rgba(212, 175, 55, 0)')
  ctx.fillStyle = halo1
  ctx.fillRect(creamX, creamY, creamW, creamH)

  const halo2 = ctx.createRadialGradient(
    creamX + creamW * 0.88,
    creamY + creamH * 0.88,
    0,
    creamX + creamW * 0.88,
    creamY + creamH * 0.88,
    creamW * 0.4
  )
  halo2.addColorStop(0, 'rgba(10, 31, 68, 0.06)')
  halo2.addColorStop(1, 'rgba(10, 31, 68, 0)')
  ctx.fillStyle = halo2
  ctx.fillRect(creamX, creamY, creamW, creamH)

  const halo3 = ctx.createRadialGradient(cx, H / 2, 0, cx, H / 2, creamW * 0.6)
  halo3.addColorStop(0, 'rgba(212, 175, 55, 0.03)')
  halo3.addColorStop(1, 'rgba(212, 175, 55, 0)')
  ctx.fillStyle = halo3
  ctx.fillRect(creamX, creamY, creamW, creamH)

  // ------------------------------------------------------------------
  // 4) زخارف الزوايا الأربع
  // ------------------------------------------------------------------
  const ornInset = ORN_BOX * 0.18 * U
  drawOrnament(ctx, creamX + ornInset, creamY + ornInset, ORN_BOX * U, 1, 1)
  drawOrnament(
    ctx,
    creamX + creamW - ornInset,
    creamY + ornInset,
    ORN_BOX * U,
    -1,
    1
  )
  drawOrnament(
    ctx,
    creamX + ornInset,
    creamY + creamH - ornInset,
    ORN_BOX * U,
    1,
    -1
  )
  drawOrnament(
    ctx,
    creamX + creamW - ornInset,
    creamY + creamH - ornInset,
    ORN_BOX * U,
    -1,
    -1
  )

  // ------------------------------------------------------------------
  // 5) الترويسة: الشعار + اسم الأكاديمية + العنوان الإنجليزي + الشارة
  // ------------------------------------------------------------------
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let y = creamY + PAD_TOP * U

  // الشعار (32u) ببطاقة بيضاء وظل خفيف
  try {
    const logoPath = path.join(
      process.cwd(),
      'public',
      'fia',
      'logo-certificate.png'
    )
    if (fs.existsSync(logoPath)) {
      const logoS = LOGO * U
      ctx.save()
      ctx.shadowColor = 'rgba(10, 31, 68, 0.18)'
      ctx.shadowBlur = 2.2 * U
      ctx.shadowOffsetY = 1 * U
      fillRR(ctx, cx - logoS / 2, y, logoS, logoS, 5 * U, WHITE)
      ctx.restore()
      const logoImg = await loadImage(fs.readFileSync(logoPath))
      ctx.save()
      roundRectPath(ctx, cx - logoS / 2, y, logoS, logoS, 5 * U)
      ctx.clip()
      ctx.drawImage(logoImg, cx - logoS / 2, y, logoS, logoS)
      ctx.restore()
    }
  } catch {
    /* الشعار اختياري */
  }
  y += LOGO * U + 1.52 * U

  // اسم الأكاديمية (14 Black) + خطان ذهبيان جانبيان (20u، min-clamp)
  ctx.direction = 'rtl'
  const academyText = 'أكاديمية المستقبل الدولية'
  setFont(ctx, ACADEMY_FS, 'black', U)
  ctx.fillStyle = NAVY
  const academyCY = y + 9.5 * U
  ctx.fillText(academyText, cx, academyCY)
  const sideLineW = 20 * U
  const sideGap = 3.04 * U // 0.8cqw
  const gradL = ctx.createLinearGradient(
    cx - sideGap - sideLineW,
    0,
    cx - sideGap,
    0
  )
  gradL.addColorStop(0, 'rgba(212,175,55,0)')
  gradL.addColorStop(1, GOLD)
  ctx.fillStyle = gradL
  ctx.fillRect(cx - sideGap - sideLineW, academyCY - 1 * U, sideLineW, 2 * U)
  const gradR = ctx.createLinearGradient(
    cx + sideGap,
    0,
    cx + sideGap + sideLineW,
    0
  )
  gradR.addColorStop(0, GOLD)
  gradR.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = gradR
  ctx.fillRect(cx + sideGap, academyCY - 1 * U, sideLineW, 2 * U)
  y += 19 * U + 0.76 * U

  // العنوان الإنجليزي (7 Bold)
  ctx.direction = 'ltr'
  setFont(ctx, ENGLISH_FS, 'bold', U)
  ctx.fillStyle = GOLD_DARK
  ctx.fillText(
    'F U T U R E   I N T E R N A T I O N A L   A C A D E M Y',
    cx,
    y + 5 * U
  )
  y += 10 * U

  // شارة «شهادة إكمال معتمدة» — حبة ذهبية فاتحة بإطار ذهبي
  y += 2.44 * U
  ctx.direction = 'rtl'
  const badgeText = 'شهادة إكمال معتمدة'
  setFont(ctx, BADGE_FS, 'black', U)
  const bTextW = ctx.measureText(badgeText).width
  const badgeIconS = 16 * U
  const badgePadX = 4.88 * U // 1.6cqw
  const badgeGap = 1.83 * U // 0.6cqw
  const badgeW = bTextW + 2 * badgeIconS + 2 * badgeGap + 2 * badgePadX
  const badgeH = 18.5 * U
  const badgeX = cx - badgeW / 2
  const badgeGrad = ctx.createLinearGradient(
    badgeX,
    y,
    badgeX + badgeW,
    y + badgeH
  )
  badgeGrad.addColorStop(0, GOLD_PALE)
  badgeGrad.addColorStop(1, CREAM)
  ctx.save()
  ctx.shadowColor = 'rgba(212, 175, 55, 0.25)'
  ctx.shadowBlur = 2 * U
  ctx.shadowOffsetY = 0.6 * U
  fillRR(ctx, badgeX, y, badgeW, badgeH, badgeH / 2, badgeGrad)
  ctx.restore()
  strokeRR(ctx, badgeX, y, badgeW, badgeH, badgeH / 2, GOLD, 1.5 * U)
  const badgeCy = y + badgeH / 2
  iconAward(ctx, badgeX + badgePadX + badgeIconS / 2, badgeCy, {
    size: badgeIconS,
    color: GOLD_DARK,
    sw: 2.5,
  })
  iconAward(ctx, badgeX + badgeW - badgePadX - badgeIconS / 2, badgeCy, {
    size: badgeIconS,
    color: GOLD_DARK,
    sw: 2.5,
  })
  ctx.fillStyle = NAVY
  ctx.fillText(badgeText, cx, badgeCy)
  y += badgeH

  // ------------------------------------------------------------------
  // 6) فاصل ذهبي (60%)
  // ------------------------------------------------------------------
  y += 2.44 * U + 1 * U
  const sepW = (creamW * 60) / 100
  const sepGrad = ctx.createLinearGradient(cx - sepW / 2, 0, cx + sepW / 2, 0)
  sepGrad.addColorStop(0, 'rgba(212,175,55,0)')
  sepGrad.addColorStop(0.5, GOLD)
  sepGrad.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = sepGrad
  ctx.fillRect(cx - sepW / 2, y - 0.75 * U, sepW, 1.5 * U)

  // ------------------------------------------------------------------
  // تخطيط الصف السفلي (مواقع ثابتة من أسفل الكريم)
  // ------------------------------------------------------------------
  const borderTopY = creamY + creamH - PAD_BOTTOM * U - 12 * U - 2.44 * U
  const rowBottom = borderTopY - 1.83 * U
  const rowH = 61 * U
  const rowTop = rowBottom - rowH

  // ------------------------------------------------------------------
  // 7) الكتلة الوسطى: «تشهد» + الاسم + الزخرفة + الدورة + الاعتماد
  // ------------------------------------------------------------------
  const midTop = y + 2.44 * U
  const midBottom = rowTop - 12 * U
  const midH = midBottom - midTop

  const leadText = 'تشهد أكاديمية المستقبل الدولية بأن'
  const nameText = cert.student_name || 'طالب'
  const doneText = 'قد أتمّ بنجاح متطلبات دورة'
  const courseText = cert.course_title || 'دورة معتمدة'

  const nameSize = fitFont(
    ctx,
    nameText,
    NAME_FS,
    11,
    'black',
    (creamW - 60 * U) / U,
    U
  )
  const courseSize = fitFont(
    ctx,
    courseText,
    COURSE_FS,
    8,
    'bold',
    (creamW - 60 * U) / U,
    U
  )

  const blockH = 14 + 26 + 16 + 12 + 17 + 4 * 1.22
  let my = midTop + (midH - blockH * U) / 2 + 3 * U

  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  setFont(ctx, LEAD_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.7)'
  ctx.fillText(leadText, cx, my + 7 * U)
  my += 14 * U + 1.22 * U

  // الاسم — العنصر الأبرز
  ctx.save()
  ctx.shadowColor = 'rgba(10, 31, 68, 0.15)'
  ctx.shadowBlur = 5 * U
  ctx.shadowOffsetY = 1.6 * U
  setFont(ctx, nameSize, 'black', U)
  ctx.fillStyle = NAVY
  ctx.fillText(nameText, cx, my + 13 * U)
  ctx.restore()
  my += 26 * U + 1.22 * U

  // زخرفة: خط — نجمة — نقطة — نجمة — خط
  const ornY = my + 8 * U
  const ornSpan = 40 * U
  const gradO1 = ctx.createLinearGradient(
    cx - ornSpan - 4.88 * U,
    0,
    cx - 4.88 * U,
    0
  )
  gradO1.addColorStop(0, 'rgba(212,175,55,0)')
  gradO1.addColorStop(1, GOLD)
  ctx.fillStyle = gradO1
  ctx.fillRect(cx - ornSpan - 4.88 * U, ornY - 0.75 * U, ornSpan, 1.5 * U)
  const gradO2 = ctx.createLinearGradient(
    cx + 4.88 * U,
    0,
    cx + ornSpan + 4.88 * U,
    0
  )
  gradO2.addColorStop(0, GOLD)
  gradO2.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = gradO2
  ctx.fillRect(cx + 4.88 * U, ornY - 0.75 * U, ornSpan, 1.5 * U)
  iconSparkleAt(ctx, cx - 18 * U, ornY, 15 * U, GOLD)
  ctx.save()
  ctx.shadowColor = GOLD
  ctx.shadowBlur = 5 * U
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.arc(cx, ornY, 2.6 * U, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  iconSparkleAt(ctx, cx + 18 * U, ornY, 15 * U, GOLD)
  my += 16 * U + 1.22 * U

  setFont(ctx, DONE_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.7)'
  ctx.fillText(doneText, cx, my + 6 * U)
  my += 12 * U + 1.22 * U

  // اسم الدورة — ذهبي داكن
  setFont(ctx, courseSize, 'bold', U)
  ctx.save()
  ctx.shadowColor = 'rgba(212, 175, 55, 0.25)'
  ctx.shadowBlur = 2.5 * U
  ctx.shadowOffsetY = 0.8 * U
  ctx.fillStyle = GOLD_DARK
  ctx.fillText(courseText, cx, my + 8.5 * U)
  ctx.restore()
  my += 17 * U

  // شارة الاعتماد الخارجي (إن وُجدت)
  if (cert.has_external_accreditation && cert.external_accreditation_body) {
    const accText = `معتمدة من: ${cert.external_accreditation_body}`
    const accSize = fitFont(ctx, accText, 8, 6, 'bold', (creamW - 100 * U) / U, U)
    setFont(ctx, accSize, 'bold', U)
    const accW = ctx.measureText(accText).width + 28 * U
    const accH = 14 * U
    const accY = my + 2 * U
    ctx.save()
    ctx.globalAlpha = 0.03
    fillRR(ctx, cx - accW / 2, accY, accW, accH, 7 * U, NAVY)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = 0.31
    strokeRR(ctx, cx - accW / 2, accY, accW, accH, 7 * U, GOLD, 1 * U)
    ctx.restore()
    iconShield(ctx, cx - accW / 2 + 11 * U, accY + accH / 2, {
      size: 12 * U,
      color: GOLD_DARK,
      sw: 2.5,
    })
    ctx.direction = 'rtl'
    ctx.fillStyle = NAVY
    ctx.fillText(accText, cx + 5 * U, accY + accH / 2)
  }

  // ------------------------------------------------------------------
  // 8) فاصل منقّط فوق الصف السفلي
  // ------------------------------------------------------------------
  const dotY = rowTop - 4.55 * U
  const dotSpan = (creamW * 85) / 100 / 2 - 9 * U
  const gradD1 = ctx.createLinearGradient(
    cx - dotSpan - 9 * U,
    0,
    cx - 9 * U,
    0
  )
  gradD1.addColorStop(0, 'rgba(212,175,55,0.38)')
  gradD1.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = gradD1
  ctx.fillRect(cx - dotSpan - 9 * U, dotY - 0.75 * U, dotSpan, 1.5 * U)
  const gradD2 = ctx.createLinearGradient(
    cx + 9 * U,
    0,
    cx + dotSpan + 9 * U,
    0
  )
  gradD2.addColorStop(0, 'rgba(212,175,55,0)')
  gradD2.addColorStop(1, 'rgba(212,175,55,0.38)')
  ctx.fillStyle = gradD2
  ctx.fillRect(cx + 9 * U, dotY - 0.75 * U, dotSpan, 1.5 * U)
  ctx.fillStyle = 'rgba(212, 175, 55, 0.56)'
  ctx.beginPath()
  ctx.arc(cx - 9 * U, dotY, 2 * U, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.shadowColor = GOLD
  ctx.shadowBlur = 4 * U
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.arc(cx, dotY, 3 * U, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = 'rgba(212, 175, 55, 0.56)'
  ctx.beginPath()
  ctx.arc(cx + 9 * U, dotY, 2 * U, 0, Math.PI * 2)
  ctx.fill()

  // ------------------------------------------------------------------
  // 9أ) عمود التوقيع (يسار) — صادر عن + خط + التوقيع (+ صورة التوقيع)
  // ------------------------------------------------------------------
  const sigCX = creamX + PAD_SIDE * U + (SIG_COL_W / 2) * U
  const sigW = SIG_COL_W * U
  ctx.direction = 'rtl'
  setFont(ctx, LABEL_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.7)'
  ctx.fillText('صادر عن', sigCX, rowTop + 4 * U)
  const issuerText = 'أكاديمية المستقبل الدولية'
  const issuerSize = fitFont(
    ctx,
    issuerText,
    8,
    5.5,
    'bold',
    (sigW - 4 * U) / U,
    U
  )
  setFont(ctx, issuerSize, 'bold', U)
  ctx.fillStyle = NAVY
  ctx.fillText(issuerText, sigCX, rowTop + 15 * U)

  // صورة توقيع المؤسس (إن وُجدت من لوحة الإدارة)
  let sigDrawn = false
  if (founderSignature) {
    try {
      const res = await fetch(founderSignature)
      if (res.ok) {
        const sigBuf = Buffer.from(await res.arrayBuffer())
        const sigImg = await loadImage(sigBuf)
        const boxW = 56 * U
        const boxH = 16 * U
        const ratio = sigImg.width / sigImg.height
        let dw = boxW
        let dh = boxW / ratio
        if (dh > boxH) {
          dh = boxH
          dw = boxH * ratio
        }
        ctx.drawImage(
          sigImg,
          sigCX - dw / 2,
          rowTop + 21 * U + (boxH - dh) / 2,
          dw,
          dh
        )
        sigDrawn = true
      }
    } catch {
      /* التوقيع اختياري */
    }
  }
  if (sigDrawn && signatoryName) {
    const snSize = fitFont(ctx, signatoryName, 7, 5.5, 'bold', sigW / U, U)
    setFont(ctx, snSize, 'bold', U)
    ctx.fillStyle = NAVY
    ctx.fillText(signatoryName, sigCX, rowTop + 41 * U)
  }
  if (sigDrawn && signatoryPosition) {
    const spSize = fitFont(ctx, signatoryPosition, 6.5, 5, 'bold', sigW / U, U)
    setFont(ctx, spSize, 'bold', U)
    ctx.fillStyle = 'rgba(10, 31, 68, 0.7)'
    ctx.fillText(signatoryPosition, sigCX, rowTop + 49 * U)
  }
  ctx.globalAlpha = 0.4
  ctx.fillStyle = NAVY
  ctx.fillRect(sigCX - 30 * U, rowTop + 52 * U, 60 * U, 1.5 * U)
  ctx.globalAlpha = 1
  setFont(ctx, LABEL_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.6)'
  ctx.fillText('التوقيع', sigCX, rowTop + 58.5 * U)

  // ------------------------------------------------------------------
  // 9ب) عمود QR (يمين)
  // ------------------------------------------------------------------
  const qrCX = creamX + creamW - PAD_SIDE * U - (SIG_COL_W / 2) * U
  const qrCard = (QR_IMG + 2 * 0.915 + 2 * 1.5) * U
  const qrCardY = rowTop + 1 * U
  try {
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      width: 480,
      margin: 0,
      color: { dark: NAVY, light: WHITE },
    })
    const qrImg = await loadImage(qrBuffer)
    ctx.save()
    ctx.shadowColor = 'rgba(10, 31, 68, 0.15)'
    ctx.shadowBlur = 1.4 * U
    ctx.shadowOffsetY = 0.5 * U
    fillRR(ctx, qrCX - qrCard / 2, qrCardY, qrCard, qrCard, 6 * U, WHITE)
    ctx.restore()
    strokeRR(ctx, qrCX - qrCard / 2, qrCardY, qrCard, qrCard, 6 * U, GOLD, 1.5 * U)
    ctx.drawImage(
      qrImg,
      qrCX - (QR_IMG * U) / 2,
      qrCardY + qrCard / 2 - (QR_IMG * U) / 2,
      QR_IMG * U,
      QR_IMG * U
    )
  } catch {
    /* QR اختياري */
  }
  ctx.direction = 'rtl'
  setFont(ctx, LABEL_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.6)'
  ctx.fillText('امسح للتحقق', qrCX, qrCardY + qrCard + 6 * U)

  // ------------------------------------------------------------------
  // 9ج) البيانات المركزية (رقم / تاريخ / حالة) — بنفس ترتيب البطاقة
  // ------------------------------------------------------------------
  const metaGap = 2.28 * U // 0.6cqw بين المجموعات
  const numText = cert.certificate_number || ''
  const dateText = issueDate || '—'
  const statusText = cert.status || ''
  const isVerified = cert.status === 'صالحة'

  setFont(ctx, NUM_FS, 'bold', U)
  const numW = Math.max(ctx.measureText(numText).width, CHIP * U)
  setFont(ctx, DATE_FS, 'bold', U)
  const dateW = Math.max(ctx.measureText(dateText).width, CHIP * U)
  setFont(ctx, STATUS_FS, 'bold', U)
  const stW = Math.max(ctx.measureText(statusText).width, CHIP * U)
  const divW = 1 * U
  const totalMetaW = numW + dateW + stW + 2 * divW + 4 * metaGap
  let gx = cx - totalMetaW / 2

  const chipTop = rowTop + 12 * U
  const chipCY = chipTop + (CHIP * U) / 2
  const drawChip = (
    gxC: number,
    icon: (c: Ctx, x: number, y: number, o: IconOpts) => void
  ) => {
    ctx.save()
    ctx.shadowColor = 'rgba(10, 31, 68, 0.15)'
    ctx.shadowBlur = 1.4 * U
    ctx.shadowOffsetY = 0.5 * U
    fillRR(ctx, gxC - (CHIP * U) / 2, chipTop, CHIP * U, CHIP * U, 8 * U, NAVY)
    ctx.restore()
    icon(ctx, gxC, chipCY, { size: 16 * U, color: GOLD, sw: 2.5 })
  }

  // (1) رقم الشهادة
  const numCX = gx + numW / 2
  drawChip(numCX, iconFileText)
  setFont(ctx, LABEL_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.7)'
  ctx.direction = 'rtl'
  ctx.fillText('رقم الشهادة', numCX, chipTop + CHIP * U + 6 * U)
  ctx.direction = 'ltr'
  setFont(ctx, NUM_FS, 'bold', U)
  ctx.fillStyle = NAVY
  ctx.fillText(numText, numCX, chipTop + CHIP * U + 16.5 * U)

  gx += numW + metaGap
  ctx.fillStyle = 'rgba(212, 175, 55, 0.4)'
  ctx.fillRect(gx, chipCY - (META_DIV_H * U) / 2, divW, META_DIV_H * U)
  gx += divW + metaGap

  // (2) تاريخ الإصدار
  const dateCX = gx + dateW / 2
  drawChip(dateCX, iconCalendar)
  ctx.direction = 'rtl'
  setFont(ctx, LABEL_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.7)'
  ctx.fillText('تاريخ الإصدار', dateCX, chipTop + CHIP * U + 6 * U)
  setFont(ctx, DATE_FS, 'bold', U)
  ctx.fillStyle = NAVY
  ctx.fillText(dateText, dateCX, chipTop + CHIP * U + 16.5 * U)

  gx += dateW + metaGap
  ctx.fillStyle = 'rgba(212, 175, 55, 0.4)'
  ctx.fillRect(gx, chipCY - (META_DIV_H * U) / 2, divW, META_DIV_H * U)
  gx += divW + metaGap

  // (3) الحالة
  const stCX = gx + stW / 2
  drawChip(stCX, iconShield)
  ctx.direction = 'rtl'
  setFont(ctx, LABEL_FS, 'bold', U)
  ctx.fillStyle = 'rgba(10, 31, 68, 0.7)'
  ctx.fillText('الحالة', stCX, chipTop + CHIP * U + 6 * U)
  setFont(ctx, STATUS_FS, 'bold', U)
  ctx.fillStyle = isVerified ? GREEN : RED
  ctx.fillText(statusText, stCX, chipTop + CHIP * U + 16.5 * U)

  // ------------------------------------------------------------------
  // 10) التذييل: خط علوي + «نحو مستقبل أفضل معاً» بنجمتين
  // ------------------------------------------------------------------
  ctx.globalAlpha = 0.19
  ctx.fillStyle = GOLD
  ctx.fillRect(creamX + 30 * U, borderTopY, creamW - 60 * U, 1 * U)
  ctx.globalAlpha = 1
  ctx.direction = 'rtl'
  setFont(ctx, SLOGAN_FS, 'bold', U)
  ctx.fillStyle = GOLD_DARK
  const sloganText = 'نحو مستقبل أفضل معاً'
  const sloganCY = borderTopY + 2.44 * U + 6 * U
  ctx.fillText(sloganText, cx, sloganCY)
  const sloganW = ctx.measureText(sloganText).width
  drawStar4(ctx, cx - sloganW / 2 - 9 * U, sloganCY, 4 * U, GOLD)
  drawStar4(ctx, cx + sloganW / 2 + 9 * U, sloganCY, 4 * U, GOLD)

  return await canvas.encode('png')
}

// ============================================================================
// PDF — صفحة واحدة تحمل نفس صورة PNG المرسومة (تطابق تام بلا جهد مزدوج)
// ============================================================================
export async function renderCertificatePDF(
  cert: CertRenderData,
  issueDate: string,
  verifyUrl: string,
  founderSignature?: string | null,
  signatoryName?: string | null,
  signatoryPosition?: string | null
): Promise<Buffer> {
  const PNGDocument = (await import('pdfkit')).default as any
  const pngBuffer = await renderCertificatePNG(
    cert,
    issueDate,
    verifyUrl,
    founderSignature,
    signatoryName,
    signatoryPosition
  )

  // صفحة بنسبة 1.1:1 مطابقة للصورة تماماً (عرض A4 أفقي)
  const pageW = 842
  const pageH = Math.round(pageW / 1.1) // 765
  const doc = new PNGDocument({
    size: [pageW, pageH],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `FIA Certificate — ${cert.certificate_number}`,
      Author: 'FIA — Future International Academy',
      Subject: 'Verified Professional Certificate',
    },
  })

  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })
  doc.image(pngBuffer, 0, 0, { width: pageW, height: pageH })
  doc.end()
  return await done
}
