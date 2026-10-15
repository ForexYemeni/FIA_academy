import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'
import os from 'os'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { Buffer } from 'buffer'

// Force Node.js runtime
export const runtime = 'nodejs'
export const maxDuration = 60

// === Reference certificate palette ===
const NAVY_DEEP = '#001F3F'     // Outer background & ribbon fill & main text
const NAVY_DARK = '#00162B'      // Darker navy for shadow/depth
const NAVY = '#002147'
const GOLD = '#D4AF37'           // Main metallic gold (frame, icons, English subtitle)
const GOLD_BRIGHT = '#FFD700'    // Bright gold for ribbon text (high contrast on navy)
const GOLD_DARK = '#8B6428'
const GOLD_LIGHT = '#E5C77E'
const GOLD_PALE = '#F5E5B3'
const CREAM = '#FDFAF6'          // Inner canvas (warm ivory)
const CREAM_DEEP = '#F5EBD5'
const EMERALD = '#28A745'        // Valid status badge green
const LIGHT_GREEN = '#D4EDDA'
const GRAY_DARK = '#333333'      // Body text gray
const GRAY = '#666666'
const GRAY_BG = '#F3F4F6'
const WHITE = '#FFFFFF'
const SIG_BLUE = '#0047AB'      // Signature royal blue ink
const SIG_BLUE_LIGHT = '#1E5FBF'

function getFontPaths() {
  const candidates = [
    path.join(process.cwd(), '.fonts'),
    '/home/z/my-project/.fonts',
  ].filter(Boolean)
  const fontsDir = candidates.find((p) => fs.existsSync(p)) || candidates[0]
  return {
    regular: path.join(fontsDir, 'Cairo-Regular.ttf'),
    bold: path.join(fontsDir, 'Cairo-Bold.ttf'),
    black: path.join(fontsDir, 'Cairo-Black.ttf'),
  }
}

let fontsRegistered = false
function registerFontsForCanvas() {
  if (fontsRegistered) return
  try {
    const fonts = getFontPaths()
    if (fs.existsSync(fonts.regular)) GlobalFonts.registerFromPath(fonts.regular, 'Cairo')
    if (fs.existsSync(fonts.bold)) GlobalFonts.registerFromPath(fonts.bold, 'Cairo-Bold')
    if (fs.existsSync(fonts.black)) GlobalFonts.registerFromPath(fonts.black, 'Cairo-Black')
    fontsRegistered = true
  } catch (e) {}
}

async function generateBarcode(certNumber: string): Promise<Buffer> {
  try {
    const bwip = await import('bwip-js')
    return await (bwip.default || bwip).toBuffer({
      bcid: 'code128',
      text: certNumber,
      scale: 2,
      height: 20,
      includetext: false,
      paddingwidth: 3,
      paddingheight: 3,
      backgroundcolor: 'FFFFFF',
      foregroundcolor: '001F3F',
    })
  } catch (e: any) {
    const canvas = createCanvas(200, 50)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 200, 50)
    ctx.fillStyle = NAVY_DEEP
    let x = 5
    for (let i = 0; i < 40; i++) {
      const w = 1 + ((certNumber.charCodeAt(i % certNumber.length) * (i + 1)) % 4)
      if (i % 2 === 0) ctx.fillRect(x, 5, w, 40)
      x += w
    }
    return await canvas.encode('png')
  }
}

async function generateQR(url: string): Promise<Buffer> {
  return await QRCode.toBuffer(url, {
    type: 'png',
    width: 200,
    margin: 1,
    color: { dark: NAVY_DEEP, light: WHITE },
  })
}

// ============== Helper: Draw acanthus scroll corner ornament (PNG) ==============
function drawCornerOrnament(ctx: any, x: number, y: number, scale: number, mx: number, my: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(mx, my)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Main outer scroll curve (acanthus leaf-like)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2.5 * scale
  ctx.beginPath()
  ctx.moveTo(0, 40 * scale)
  ctx.bezierCurveTo(
    0, 15 * scale,
    15 * scale, 0,
    40 * scale, 0,
  )
  ctx.stroke()

  // Inner smaller scroll
  ctx.strokeStyle = GOLD_LIGHT
  ctx.lineWidth = 1.5 * scale
  ctx.beginPath()
  ctx.moveTo(8 * scale, 32 * scale)
  ctx.bezierCurveTo(
    8 * scale, 18 * scale,
    18 * scale, 8 * scale,
    32 * scale, 8 * scale,
  )
  ctx.stroke()

  // Scroll end curl (small spiral)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2 * scale
  ctx.beginPath()
  ctx.arc(38 * scale, 4 * scale, 4 * scale, 0, Math.PI * 1.6, false)
  ctx.stroke()

  // Decorative dots
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.arc(4 * scale, 36 * scale, 2 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(12 * scale, 22 * scale, 1.5 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(22 * scale, 12 * scale, 1.5 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ============== Helper: Draw gold ribbon sash (corner decoration) ==============
function drawGoldSash(ctx: any, x: number, y: number, w: number, h: number, angle: number, scale: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((angle * Math.PI) / 180)
  // Gradient gold
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, GOLD_DARK)
  grad.addColorStop(0.5, GOLD)
  grad.addColorStop(1, GOLD_LIGHT)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(w, h * 0.2)
  ctx.lineTo(w * 0.95, h)
  ctx.lineTo(-w * 0.05, h * 0.8)
  ctx.closePath()
  ctx.fill()
  // Highlight
  ctx.strokeStyle = GOLD_BRIGHT
  ctx.lineWidth = 1 * scale
  ctx.stroke()
  ctx.restore()
}

// ============== Helper: Draw a large gel-pen signature (PNG) ==============
// Royal blue ink with variable thickness to mimic real gel pen handwriting
function drawGelPenSignature(ctx: any, startX: number, centerY: number, width: number, scale: number) {
  const ink = SIG_BLUE
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // === Main signature flourish — multi-curve handwriting with variable pressure ===
  const steps = 200
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps
    const t2 = (i + 1) / steps
    const x1 = startX + width * t1
    const x2 = startX + width * t2
    // Multi-frequency wave for natural handwriting — REDUCED amplitudes (compact signature)
    const y1 = centerY
      + Math.sin(t1 * Math.PI * 5) * 10 * scale
      + Math.sin(t1 * Math.PI * 11) * 4 * scale
      + Math.cos(t1 * Math.PI * 3) * 7 * scale
    const y2 = centerY
      + Math.sin(t2 * Math.PI * 5) * 10 * scale
      + Math.sin(t2 * Math.PI * 11) * 4 * scale
      + Math.cos(t2 * Math.PI * 3) * 7 * scale
    // Pressure: thicker on downstrokes (variable gel pen pressure)
    const dy = y2 - y1
    const pressure = Math.abs(dy) > 0.15 ? 4 : 2.5
    ctx.strokeStyle = ink
    ctx.lineWidth = pressure * scale
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // === Small initial flourish (left side) — REDUCED to stay within bounds ===
  ctx.strokeStyle = ink
  ctx.lineWidth = 2.5 * scale
  ctx.beginPath()
  ctx.moveTo(startX - 8 * scale, centerY - 12 * scale)
  ctx.bezierCurveTo(
    startX - 16 * scale, centerY - 28 * scale,
    startX + 4 * scale, centerY - 30 * scale,
    startX + 6 * scale, centerY - 14 * scale,
  )
  ctx.stroke()

  // === Small end flourish (right side) — REDUCED to stay within card ===
  ctx.lineWidth = 3 * scale
  ctx.beginPath()
  ctx.moveTo(startX + width, centerY)
  ctx.bezierCurveTo(
    startX + width + 16 * scale, centerY - 16 * scale,
    startX + width + 22 * scale, centerY + 4 * scale,
    startX + width + 8 * scale, centerY + 6 * scale,
  )
  ctx.stroke()

  // === Underscore sweep (with pressure variation) — REDUCED length ===
  const usStartX = startX - 4 * scale
  const usEndX = startX + width + 10 * scale
  const usY = centerY + 24 * scale
  for (let i = 0; i < 100; i++) {
    const t1 = i / 100
    const t2 = (i + 1) / 100
    const x1 = usStartX + (usEndX - usStartX) * t1
    const x2 = usStartX + (usEndX - usStartX) * t2
    const y1 = usY + Math.sin(t1 * Math.PI * 3) * 2 * scale
    const y2 = usY + Math.sin(t2 * Math.PI * 3) * 2 * scale
    // Pressure: thicker in middle, thinner at ends
    const pressure = t1 < 0.1 || t1 > 0.9 ? 1.2 : 2
    ctx.lineWidth = pressure * scale
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // === Initial pen-flick dot ===
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.arc(startX - 14 * scale, centerY - 8 * scale, 1.8 * scale, 0, Math.PI * 2)
  ctx.fill()
}

// ============== Helper: Draw gel-pen signature (PDFKit) ==============
function drawGelPenSignaturePDF(doc: any, startX: number, centerY: number, width: number) {
  const ink = SIG_BLUE
  // Main flourish with variable pressure
  const steps = 200
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps
    const t2 = (i + 1) / steps
    const x1 = startX + width * t1
    const x2 = startX + width * t2
    const y1 = centerY
      + Math.sin(t1 * Math.PI * 5) * 10
      + Math.sin(t1 * Math.PI * 11) * 4
      + Math.cos(t1 * Math.PI * 3) * 7
    const y2 = centerY
      + Math.sin(t2 * Math.PI * 5) * 10
      + Math.sin(t2 * Math.PI * 11) * 4
      + Math.cos(t2 * Math.PI * 3) * 7
    const pressure = Math.abs(y2 - y1) > 0.15 ? 4 : 2.5
    doc.lineWidth(pressure).strokeColor(ink)
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke()
  }
  // Small left flourish — REDUCED
  doc.lineWidth(2.5).strokeColor(ink)
  doc.moveTo(startX - 8, centerY - 12)
  doc.bezierCurveTo(startX - 16, centerY - 28, startX + 4, centerY - 30, startX + 6, centerY - 14)
  doc.stroke()
  // Small right end flourish — REDUCED
  doc.lineWidth(3)
  doc.moveTo(startX + width, centerY)
  doc.bezierCurveTo(startX + width + 16, centerY - 16, startX + width + 22, centerY + 4, startX + width + 8, centerY + 6)
  doc.stroke()
  // Underscore — REDUCED length
  const usStartX = startX - 4
  const usEndX = startX + width + 10
  const usY = centerY + 24
  for (let i = 0; i < 100; i++) {
    const t1 = i / 100
    const t2 = (i + 1) / 100
    const x1 = usStartX + (usEndX - usStartX) * t1
    const x2 = usStartX + (usEndX - usStartX) * t2
    const y1 = usY + Math.sin(t1 * Math.PI * 3) * 2
    const y2 = usY + Math.sin(t2 * Math.PI * 3) * 2
    const pressure = t1 < 0.1 || t1 > 0.9 ? 1.2 : 2
    doc.lineWidth(pressure).strokeColor(ink)
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke()
  }
  // Initial dot
  doc.circle(startX - 14, centerY - 8, 1.8).fill(ink)
}

// ============== Helper: Draw corner ornament (PDF) ==============
function drawCornerOrnamentPDF(doc: any, x: number, y: number, mx: number, my: number) {
  doc.save()
  doc.translate(x, y)
  doc.scale(mx, my)
  doc.lineCap('round').lineJoin('round')

  // Main outer scroll curve
  doc.lineWidth(2.5).strokeColor(GOLD)
  doc.moveTo(0, 40)
  doc.bezierCurveTo(0, 15, 15, 0, 40, 0)
  doc.stroke()

  // Inner smaller scroll
  doc.lineWidth(1.5).strokeColor(GOLD_LIGHT)
  doc.moveTo(8, 32)
  doc.bezierCurveTo(8, 18, 18, 8, 32, 8)
  doc.stroke()

  // Scroll end curl
  doc.lineWidth(2).strokeColor(GOLD)
  doc.circle(38, 4, 4).dash(0, 0)
  // Approximation: draw small arc
  doc.moveTo(38 + 4, 4)
  doc.path(`M ${38 + 4},${4} A 4 4 0 1 1 ${38 - 4},${4}`)
  doc.stroke()

  // Dots
  doc.circle(4, 36, 2).fill(GOLD)
  doc.circle(12, 22, 1.5).fill(GOLD)
  doc.circle(22, 12, 1.5).fill(GOLD)
  doc.restore()
}

// ============== Modern PNG Certificate (reference-exact design) ==============
async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string, founderSignature?: string | null): Promise<Buffer> {
  registerFontsForCanvas()

  const scale = 2
  const pageW = 842 * scale
  const pageH = 595 * scale
  const canvas = createCanvas(pageW, pageH)
  const ctx = canvas.getContext('2d')

  // Helpers
  const fill = (c: string) => { ctx.fillStyle = c }
  const stroke = (c: string, w: number) => { ctx.strokeStyle = c; ctx.lineWidth = w }
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
  const fillRoundRect = (x: number, y: number, w: number, h: number, r: number, c: string) => {
    fill(c); roundRect(x, y, w, h, r); ctx.fill()
  }
  const strokeRoundRect = (x: number, y: number, w: number, h: number, r: number, c: string, lw: number) => {
    stroke(c, lw); roundRect(x, y, w, h, r); ctx.stroke()
  }
  const setFont = (size: number, weight: 'regular' | 'bold' | 'black' = 'regular') => {
    const family = weight === 'black' ? 'Cairo-Black' : weight === 'bold' ? 'Cairo-Bold' : 'Cairo'
    ctx.font = `${size * scale}px ${family}`
  }

  const cx = pageW / 2

  // ===== Outer Background: deep navy with subtle radial gradient =====
  fill(NAVY_DEEP)
  ctx.fillRect(0, 0, pageW, pageH)
  const bgGrad = ctx.createRadialGradient(cx, pageH / 2, 50 * scale, cx, pageH / 2, pageW * 0.7)
  bgGrad.addColorStop(0, NAVY)
  bgGrad.addColorStop(1, NAVY_DARK)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, pageW, pageH)

  // ===== Decorative gold sashes at top-left and bottom-right (3D layered effect) =====
  drawGoldSash(ctx, 20 * scale, 20 * scale, 60 * scale, 12 * scale, -25, scale)
  drawGoldSash(ctx, pageW - 80 * scale, pageH - 32 * scale, 60 * scale, 12 * scale, 155, scale)

  // ===== Inner cream card (with shadow) =====
  const cardPad = 35 * scale
  const cardX = cardPad
  const cardY = cardPad
  const cardW = pageW - 2 * cardPad
  const cardH = pageH - 2 * cardPad

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 15 * scale
  ctx.shadowOffsetY = 5 * scale
  fillRoundRect(cardX, cardY, cardW, cardH, 14 * scale, CREAM)
  ctx.restore()

  // ===== Double gold frame: thin outer + thick inner =====
  // Thin outer line
  strokeRoundRect(cardX + 6 * scale, cardY + 6 * scale, cardW - 12 * scale, cardH - 12 * scale, 10 * scale, GOLD, 1.5 * scale)
  // Thick inner line
  strokeRoundRect(cardX + 18 * scale, cardY + 18 * scale, cardW - 36 * scale, cardH - 36 * scale, 6 * scale, GOLD, 3.5 * scale)

  // ===== Corner ornaments (acanthus scrolls) =====
  const cornerInset = 24 * scale
  // Top-left
  drawCornerOrnament(ctx, cardX + cornerInset, cardY + cornerInset, scale, 1, 1)
  // Top-right (mirrored horizontally)
  drawCornerOrnament(ctx, cardX + cardW - cornerInset, cardY + cornerInset, scale, -1, 1)
  // Bottom-left (mirrored vertically)
  drawCornerOrnament(ctx, cardX + cornerInset, cardY + cardH - cornerInset, scale, 1, -1)
  // Bottom-right (mirrored both)
  drawCornerOrnament(ctx, cardX + cardW - cornerInset, cardY + cardH - cornerInset, scale, -1, -1)

  // ===== Logo (top-right interior) =====
  const logoSize = 80 * scale
  const logoX = cardX + cardW - logoSize - 35 * scale
  const logoY = cardY + 40 * scale
  const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-official.png')
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath)
    const logoImg = await loadImage(logoBuffer)
    // White rounded background
    fillRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 8 * scale, WHITE)
    strokeRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 8 * scale, GOLD, 1.5 * scale)
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
  } else {
    fillRoundRect(logoX, logoY, logoSize, logoSize, 10 * scale, NAVY)
    strokeRoundRect(logoX, logoY, logoSize, logoSize, 10 * scale, GOLD, 1.5 * scale)
    setFont(16, 'bold')
    fill(GOLD)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('FIA', logoX + logoSize / 2, logoY + logoSize / 2)
  }

  // ===== Main title block (centered, top) =====
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.direction = 'rtl'

  // Arabic main title — large navy
  setFont(38, 'bold')
  fill(NAVY_DEEP)
  ctx.fillText(cert.issued_by || 'أكاديمية المستقبل الدولية', cx, cardY + 80 * scale)

  // English subtitle — gold, all caps, tracked
  ctx.direction = 'ltr'
  setFont(13, 'bold')
  fill(GOLD)
  ctx.fillText('F U T U R E   I N T E R N A T I O N A L   A C A D E M Y', cx, cardY + 115 * scale)

  // ===== Gold divider line with center diamond =====
  const dividerY = cardY + 145 * scale
  stroke(GOLD, 1.5 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 110 * scale, dividerY)
  ctx.lineTo(cx - 14 * scale, dividerY)
  ctx.moveTo(cx + 14 * scale, dividerY)
  ctx.lineTo(cx + 110 * scale, dividerY)
  ctx.stroke()
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, dividerY - 7 * scale)
  ctx.lineTo(cx + 7 * scale, dividerY)
  ctx.lineTo(cx, dividerY + 7 * scale)
  ctx.lineTo(cx - 7 * scale, dividerY)
  ctx.closePath()
  ctx.fill()

  // ===== Certification statement (gray) =====
  ctx.direction = 'rtl'
  setFont(15, 'regular')
  fill(GRAY_DARK)
  ctx.fillText('تُشهد أكاديمية المستقبل الدولية بأن', cx, cardY + 175 * scale)

  // ===== Student name (LARGEST element — focal point) =====
  setFont(44, 'black')
  fill(NAVY_DEEP)
  ctx.fillText(cert.student_name || 'طالب', cx, cardY + 225 * scale)

  // Completion phrase
  setFont(15, 'regular')
  fill(GRAY_DARK)
  ctx.fillText('قد أتم بنجاح دورة', cx, cardY + 270 * scale)

  // ===== Course banner — hexagonal pointed ends + gold border + bright gold text =====
  // Layout positions carefully computed to avoid ANY overlap:
  //   ribbon 290-335 | diamond 353 | cards 380-430 | bottom row 440-515 (within cardH=525)
  const ribbonY = cardY + 290 * scale
  const ribbonH = 45 * scale
  setFont(22, 'bold')
  const courseText = cert.course_title || 'دورة معتمدة'
  const textW = ctx.measureText(courseText).width
  const ribbonPadX = 40 * scale
  const ribbonW = Math.max(textW + 100 * scale + ribbonPadX * 2, 300 * scale)
  const ribbonX = cx - ribbonW / 2

  // Ribbon fill — deep navy
  fill(NAVY_DEEP)
  ctx.beginPath()
  ctx.moveTo(ribbonX + 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX + 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX, ribbonY + ribbonH / 2)
  ctx.closePath()
  ctx.fill()

  // Ribbon gold border (thick)
  stroke(GOLD, 2.5 * scale)
  ctx.beginPath()
  ctx.moveTo(ribbonX + 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX + 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX, ribbonY + ribbonH / 2)
  ctx.closePath()
  ctx.stroke()

  // Inner thin accent border
  stroke(GOLD_LIGHT, 0.6 * scale)
  ctx.beginPath()
  ctx.moveTo(ribbonX + 22 * scale, ribbonY + 4 * scale)
  ctx.lineTo(ribbonX + ribbonW - 22 * scale, ribbonY + 4 * scale)
  ctx.lineTo(ribbonX + ribbonW - 5 * scale, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 22 * scale, ribbonY + ribbonH - 4 * scale)
  ctx.lineTo(ribbonX + 22 * scale, ribbonY + ribbonH - 4 * scale)
  ctx.lineTo(ribbonX + 5 * scale, ribbonY + ribbonH / 2)
  ctx.closePath()
  ctx.stroke()

  // Fleur-de-lis style gold ornaments at ribbon tips
  for (const tipX of [ribbonX + 8 * scale, ribbonX + ribbonW - 8 * scale]) {
    fill(GOLD)
    ctx.beginPath()
    ctx.moveTo(tipX, ribbonY + ribbonH / 2 - 5 * scale)
    ctx.lineTo(tipX + 3 * scale, ribbonY + ribbonH / 2)
    ctx.lineTo(tipX, ribbonY + ribbonH / 2 + 5 * scale)
    ctx.lineTo(tipX - 3 * scale, ribbonY + ribbonH / 2)
    ctx.closePath()
    ctx.fill()
  }

  // Course text inside ribbon — bright gold
  fill(GOLD_BRIGHT)
  ctx.fillText(courseText, cx, ribbonY + ribbonH / 2 + 1 * scale)

  // Small gold diamond below ribbon
  const belowRibbonY = ribbonY + ribbonH + 18 * scale
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, belowRibbonY - 4 * scale)
  ctx.lineTo(cx + 4 * scale, belowRibbonY)
  ctx.lineTo(cx, belowRibbonY + 4 * scale)
  ctx.lineTo(cx - 4 * scale, belowRibbonY)
  ctx.closePath()
  ctx.fill()

  // ===== Info cards row (3 cards with icons in gold circles) — positioned BELOW diamond with proper gap =====
  // Diamond at cardY+353, cards start at cardY+380 (27px gap, no overlap)
  const colsY = cardY + 380 * scale
  const colsH = 50 * scale
  const colW = 200 * scale
  const colGap = 15 * scale
  const totalColsW = 3 * colW + 2 * colGap
  const colsStartX = cx - totalColsW / 2

  // Card 1: Issue Date (left) — Calendar icon
  fillRoundRect(colsStartX, colsY, colW, colsH, 10 * scale, WHITE)
  strokeRoundRect(colsStartX, colsY, colW, colsH, 10 * scale, GOLD, 1.5 * scale)
  // Calendar icon in gold circle
  fillRoundRect(colsStartX + 10 * scale, colsY + 8 * scale, 34 * scale, 34 * scale, 17 * scale, GOLD)
  ctx.fillStyle = WHITE
  ctx.font = `${18 * scale}px Cairo-Bold`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('📅', colsStartX + 27 * scale, colsY + 25 * scale)
  // Label
  ctx.direction = 'rtl'
  setFont(10, 'regular')
  fill(GRAY)
  ctx.textAlign = 'right'
  ctx.fillText('تاريخ الإصدار', colsStartX + colW - 12 * scale, colsY + 15 * scale)
  setFont(13, 'bold')
  fill(NAVY_DEEP)
  ctx.fillText(issueDate, colsStartX + colW - 12 * scale, colsY + 34 * scale)

  // Card 2: Issuer (center) — Graduation cap icon
  const col2X = colsStartX + colW + colGap
  fillRoundRect(col2X, colsY, colW, colsH, 10 * scale, WHITE)
  strokeRoundRect(col2X, colsY, colW, colsH, 10 * scale, GOLD, 1.5 * scale)
  fillRoundRect(col2X + 10 * scale, colsY + 8 * scale, 34 * scale, 34 * scale, 17 * scale, GOLD)
  ctx.fillStyle = WHITE
  ctx.fillText('🎓', col2X + 27 * scale, colsY + 25 * scale)
  ctx.direction = 'rtl'
  setFont(10, 'regular')
  fill(GRAY)
  ctx.textAlign = 'right'
  ctx.fillText('الجهة المصدرة', col2X + colW - 12 * scale, colsY + 15 * scale)
  setFont(13, 'bold')
  fill(NAVY_DEEP)
  ctx.fillText('أكاديمية المستقبل الدولية', col2X + colW - 12 * scale, colsY + 34 * scale)

  // Card 3: Status (right) — Checkmark icon
  const col3X = colsStartX + 2 * (colW + colGap)
  fillRoundRect(col3X, colsY, colW, colsH, 10 * scale, WHITE)
  strokeRoundRect(col3X, colsY, colW, colsH, 10 * scale, GOLD, 1.5 * scale)
  fillRoundRect(col3X + 10 * scale, colsY + 8 * scale, 34 * scale, 34 * scale, 17 * scale, GOLD)
  ctx.fillStyle = WHITE
  ctx.fillText('✓', col3X + 27 * scale, colsY + 25 * scale)
  ctx.direction = 'rtl'
  setFont(10, 'regular')
  fill(GRAY)
  ctx.textAlign = 'right'
  ctx.fillText('الحالة', col3X + colW - 12 * scale, colsY + 15 * scale)
  // Green pill badge for status
  const badgeText = cert.status === 'صالحة' ? '✓ صالح' : cert.status || 'صالح'
  setFont(13, 'bold')
  const badgeW = ctx.measureText(badgeText).width + 24 * scale
  const badgeH = 22 * scale
  const badgeX = col3X + colW - 12 * scale - badgeW
  const badgeY = colsY + 28 * scale
  fillRoundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2, EMERALD)
  fill(WHITE)
  ctx.textAlign = 'center'
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 2 * scale)

  // ===== Bottom row: QR + Barcode + Signature (3-column) — positioned BELOW cards with proper gap =====
  // Cards end at cardY+430. Footer starts at cardY+425 (5px overlap is OK since cards have padding).
  // Founder title at bottomY+95 = cardY+520 (within cardH=525 with 5px margin).
  const bottomY = cardY + 425 * scale

  // === QR (left) — moved right to clear corner ornament (75*scale from card edge) ===
  const qrBuffer = await generateQR(verifyUrl)
  const qrImg = await loadImage(qrBuffer)
  const qrSize = 46 * scale  // slightly smaller
  const qrX = cardX + 75 * scale  // moved further away from corner ornament
  // White background
  fillRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, WHITE)
  strokeRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, GOLD, 1.5 * scale)
  ctx.drawImage(qrImg, qrX, bottomY, qrSize, qrSize)
  ctx.direction = 'rtl'
  setFont(11, 'bold')
  fill(NAVY_DEEP)
  ctx.textAlign = 'center'
  ctx.fillText('امسح للتحقق', qrX + qrSize / 2, bottomY + qrSize + 18 * scale)

  // === Barcode (center) with diamond flankers ===
  const barcodeBuffer = await generateBarcode(cert.certificate_number)
  const barcodeImg = await loadImage(barcodeBuffer)
  const barcodeW = 150 * scale
  const barcodeH = 28 * scale
  const barcodeX = cx - barcodeW / 2
  const barcodeY = bottomY + 5 * scale
  // White card background
  fillRoundRect(barcodeX - 12 * scale, barcodeY - 8 * scale, barcodeW + 24 * scale, barcodeH + 50 * scale, 4 * scale, WHITE)
  strokeRoundRect(barcodeX - 12 * scale, barcodeY - 8 * scale, barcodeW + 24 * scale, barcodeH + 50 * scale, 4 * scale, GOLD, 1.5 * scale)
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeW, barcodeH)
  ctx.direction = 'ltr'
  setFont(13, 'bold')
  fill(NAVY_DEEP)
  ctx.fillText(cert.certificate_number, cx, bottomY + barcodeH + 15 * scale)
  setFont(9, 'regular')
  fill(GRAY)
  ctx.fillText('CERTIFICATE ID', cx, bottomY + barcodeH + 30 * scale)

  // Diamond flankers on either side of barcode
  for (const flankX of [barcodeX - 30 * scale, barcodeX + barcodeW + 30 * scale]) {
    const flankY = bottomY + barcodeH / 2 + 5 * scale
    // Small horizontal gold line ending in diamond
    stroke(GOLD, 1.2 * scale)
    ctx.beginPath()
    ctx.moveTo(flankX - 6 * scale, flankY)
    ctx.lineTo(flankX + 4 * scale, flankY)
    ctx.stroke()
    fill(GOLD)
    ctx.beginPath()
    ctx.moveTo(flankX + 8 * scale, flankY - 4 * scale)
    ctx.lineTo(flankX + 12 * scale, flankY)
    ctx.lineTo(flankX + 8 * scale, flankY + 4 * scale)
    ctx.lineTo(flankX + 4 * scale, flankY)
    ctx.closePath()
    ctx.fill()
  }

  // === Signature block (right) — repositioned for proper professional spacing ===
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Narrower signature area (180 instead of 200) + clear margin from card edge to prevent overflow
  const sigAreaW = 180 * scale
  const sigAreaX = cardX + cardW - 35 * scale - sigAreaW

  // Label
  ctx.direction = 'rtl'
  setFont(11, 'bold')
  fill(GRAY)
  ctx.fillText('توقيع الجهة المانوحة', sigAreaX + sigAreaW / 2, bottomY + 5 * scale)

  // === Large gel-pen signature in royal blue — width-restricted to stay within card ===
  // Pass much narrower width (sigAreaW - 80*scale) to prevent right flourish from overflowing card edge
  const sigImgAreaY = bottomY + 18 * scale
  if (founderSignature) {
    try {
      const sigBuffer = await fetch(founderSignature).then(r => r.arrayBuffer())
      const sigImg = await loadImage(Buffer.from(sigBuffer))
      const sigImgH = 40 * scale  // smaller height
      const sigImgW = 120 * scale  // narrower to fit
      ctx.drawImage(sigImg, sigAreaX + (sigAreaW - sigImgW) / 2, sigImgAreaY, sigImgW, sigImgH)
    } catch {
      drawGelPenSignature(ctx, sigAreaX + 30 * scale, sigImgAreaY + 18 * scale, sigAreaW - 60 * scale, scale)
    }
  } else {
    drawGelPenSignature(ctx, sigAreaX + 30 * scale, sigImgAreaY + 18 * scale, sigAreaW - 60 * scale, scale)
  }

  // Founder name — bold navy, with clear gap from signature
  setFont(14, 'bold')
  fill(NAVY_DEEP)
  ctx.fillText('د. هاني الشافعي', sigAreaX + sigAreaW / 2, bottomY + 65 * scale)
  // Founder title — PROPER VERTICAL SPACING from name (gap = 30*scale = 60px for clean separation)
  setFont(10, 'regular')
  fill(NAVY_DEEP)
  ctx.fillText('المدير التنفيذي', sigAreaX + sigAreaW / 2, bottomY + 95 * scale)

  // ===== Watermark (very faint FIA diagonal) =====
  ctx.save()
  ctx.globalAlpha = 0.05
  ctx.translate(cx, pageH / 2)
  ctx.rotate(Math.PI / 4)
  setFont(140, 'black')
  fill(NAVY_DEEP)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('FIA', 0, 0)
  ctx.restore()

  return await canvas.encode('png')
}

// ============== PDF Certificate (matching PNG design) ==============
async function generateCertificatePDF(cert: any, issueDate: string, verifyUrl: string, founderSignature?: string | null): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const fonts = getFontPaths()
      const doc = new PDFDocument({
        size: [842, 595],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: `FIA Certificate — ${cert.certificate_number}`,
          Author: 'FIA — Future International Academy',
          Subject: 'Verified Professional Certificate',
        },
      })

      const fontExists = (weight: 'regular' | 'bold' | 'black' = 'regular') => {
        const p = weight === 'black' ? fonts.black : weight === 'bold' ? fonts.bold : fonts.regular
        return fs.existsSync(p) ? p : undefined
      }
      const setFont = (size: number, weight: 'regular' | 'bold' | 'black' = 'regular') => {
        const fp = fontExists(weight)
        if (fp) doc.font(fp, size)
        else {
          doc.font(weight === 'regular' ? 'Helvetica' : 'Helvetica-Bold', size)
        }
      }

      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      const pageW = 842
      const pageH = 595
      const cx = pageW / 2

      const roundRectPath = (x: number, y: number, w: number, h: number, r: number) => {
        doc.path(`M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`)
      }

      // ===== Outer Background: deep navy =====
      doc.rect(0, 0, pageW, pageH).fill(NAVY_DEEP)

      // ===== Inner cream card =====
      const cardPad = 35
      const cardX = cardPad
      const cardY = cardPad
      const cardW = pageW - 2 * cardPad
      const cardH = pageH - 2 * cardPad

      // Card fill (with simulated shadow)
      doc.save()
      doc.fillColor('rgba(0,0,0,0.5)')
      roundRectPath(cardX + 2, cardY + 3, cardW, cardH, 14)
      doc.fill()
      doc.restore()
      doc.save()
      roundRectPath(cardX, cardY, cardW, cardH, 14)
      doc.fill(CREAM)
      doc.restore()

      // Double gold frame: thin outer + thick inner
      doc.save()
      doc.lineWidth(1.5).strokeColor(GOLD)
      roundRectPath(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 10)
      doc.stroke()
      doc.restore()
      doc.save()
      doc.lineWidth(3.5).strokeColor(GOLD)
      roundRectPath(cardX + 18, cardY + 18, cardW - 36, cardH - 36, 6)
      doc.stroke()
      doc.restore()

      // Corner ornaments
      const cornerInset = 24
      drawCornerOrnamentPDF(doc, cardX + cornerInset, cardY + cornerInset, 1, 1)
      drawCornerOrnamentPDF(doc, cardX + cardW - cornerInset, cardY + cornerInset, -1, 1)
      drawCornerOrnamentPDF(doc, cardX + cornerInset, cardY + cardH - cornerInset, 1, -1)
      drawCornerOrnamentPDF(doc, cardX + cardW - cornerInset, cardY + cardH - cornerInset, -1, -1)

      // ===== Logo (top-right) =====
      const logoSize = 80
      const logoX = cardX + cardW - logoSize - 35
      const logoY = cardY + 40
      const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-official.png')
      if (fs.existsSync(logoPath)) {
        doc.save()
        roundRectPath(logoX - 6, logoY - 6, logoSize + 12, logoSize + 12, 8)
        doc.fill(WHITE)
        doc.lineWidth(1.5).strokeColor(GOLD)
        doc.stroke()
        doc.restore()
        doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize })
      } else {
        doc.save()
        roundRectPath(logoX, logoY, logoSize, logoSize, 10)
        doc.fill(NAVY)
        doc.restore()
        doc.save()
        doc.lineWidth(1.5).strokeColor(GOLD)
        roundRectPath(logoX, logoY, logoSize, logoSize, 10)
        doc.stroke()
        doc.restore()
        setFont(16, 'bold')
        doc.fillColor(GOLD).text('FIA', logoX, logoY + logoSize / 2 - 8, { width: logoSize, align: 'center' })
      }

      // ===== Main title block =====
      setFont(38, 'bold')
      doc.fillColor(NAVY_DEEP).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 350, cardY + 65, { width: 700, align: 'center' })

      setFont(13, 'bold')
      doc.fillColor(GOLD).text('F U T U R E   I N T E R N A T I O N A L   A C A D E M Y', cx - 350, cardY + 108, { width: 700, align: 'center' })

      // Divider
      const dividerY = cardY + 145
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx - 110, dividerY).lineTo(cx - 14, dividerY).stroke()
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx + 14, dividerY).lineTo(cx + 110, dividerY).stroke()
      doc.polygon([cx, dividerY - 7], [cx + 7, dividerY], [cx, dividerY + 7], [cx - 7, dividerY]).fill(GOLD)

      // Certification statement
      setFont(15, 'regular')
      doc.fillColor(GRAY_DARK).text('تُشهد أكاديمية المستقبل الدولية بأن', cx - 350, cardY + 168, { width: 700, align: 'center' })

      // Student name (LARGEST)
      setFont(44, 'black')
      doc.fillColor(NAVY_DEEP).text(cert.student_name || 'طالب', cx - 350, cardY + 200, { width: 700, align: 'center' })

      // Completion phrase
      setFont(15, 'regular')
      doc.fillColor(GRAY_DARK).text('قد أتم بنجاح دورة', cx - 350, cardY + 263, { width: 700, align: 'center' })

      // ===== Course banner (navy with gold border, pointed hexagon) =====
      const ribbonY = cardY + 290
      const ribbonH = 45
      setFont(22, 'bold')
      const courseText = cert.course_title || 'دورة معتمدة'
      const textW = doc.widthOfString(courseText)
      const ribbonPadX = 40
      const ribbonW = Math.max(textW + 100 + ribbonPadX * 2, 300)
      const ribbonX = cx - ribbonW / 2

      // Ribbon fill — deep navy
      doc.save()
      doc.fillColor(NAVY_DEEP)
      doc.path(`M ${ribbonX + 18},${ribbonY} L ${ribbonX + ribbonW - 18},${ribbonY} L ${ribbonX + ribbonW},${ribbonY + ribbonH / 2} L ${ribbonX + ribbonW - 18},${ribbonY + ribbonH} L ${ribbonX + 18},${ribbonY + ribbonH} L ${ribbonX},${ribbonY + ribbonH / 2} Z`)
      doc.fill()
      doc.restore()
      // Ribbon gold border (thick)
      doc.save()
      doc.lineWidth(2.5).strokeColor(GOLD)
      doc.path(`M ${ribbonX + 18},${ribbonY} L ${ribbonX + ribbonW - 18},${ribbonY} L ${ribbonX + ribbonW},${ribbonY + ribbonH / 2} L ${ribbonX + ribbonW - 18},${ribbonY + ribbonH} L ${ribbonX + 18},${ribbonY + ribbonH} L ${ribbonX},${ribbonY + ribbonH / 2} Z`)
      doc.stroke()
      doc.restore()
      // Course text — bright gold
      doc.fillColor(GOLD_BRIGHT).text(courseText, ribbonX, ribbonY + 16, { width: ribbonW, align: 'center' })

      // Small diamond below ribbon
      doc.polygon([cx, ribbonY + ribbonH + 12], [cx + 4, ribbonY + ribbonH + 18], [cx, ribbonY + ribbonH + 24], [cx - 4, ribbonY + ribbonH + 18]).fill(GOLD)

      // ===== Info cards row (3 cards with icons) =====
      // ===== Info cards row (3 cards with icons) — positioned BELOW diamond with proper gap =====
      const colsY = cardY + 380
      const colsH = 50
      const colW = 200
      const colGap = 15
      const totalColsW = 3 * colW + 2 * colGap
      const colsStartX = cx - totalColsW / 2

      // Card 1: Issue Date
      doc.save()
      roundRectPath(colsStartX, colsY, colW, colsH, 10)
      doc.fill(WHITE)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      // Gold circle icon
      doc.save()
      doc.circle(colsStartX + 30, colsY + 32, 20).fill(GOLD)
      doc.restore()
      setFont(11, 'regular')
      doc.fillColor(GRAY).text('تاريخ الإصدار', colsStartX + 70, colsY + 16, { width: colW - 80, align: 'right' })
      setFont(14, 'bold')
      doc.fillColor(NAVY_DEEP).text(issueDate, colsStartX + 70, colsY + 38, { width: colW - 80, align: 'right' })

      // Card 2: Issuer
      const col2X = colsStartX + colW + colGap
      doc.save()
      roundRectPath(col2X, colsY, colW, colsH, 10)
      doc.fill(WHITE)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.save()
      doc.circle(col2X + 30, colsY + 32, 20).fill(GOLD)
      doc.restore()
      setFont(11, 'regular')
      doc.fillColor(GRAY).text('الجهة المصدرة', col2X + 70, colsY + 16, { width: colW - 80, align: 'right' })
      setFont(14, 'bold')
      doc.fillColor(NAVY_DEEP).text('أكاديمية المستقبل الدولية', col2X + 70, colsY + 38, { width: colW - 80, align: 'right' })

      // Card 3: Status
      const col3X = colsStartX + 2 * (colW + colGap)
      doc.save()
      roundRectPath(col3X, colsY, colW, colsH, 10)
      doc.fill(WHITE)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.save()
      doc.circle(col3X + 30, colsY + 32, 20).fill(GOLD)
      doc.restore()
      setFont(11, 'regular')
      doc.fillColor(GRAY).text('الحالة', col3X + 70, colsY + 16, { width: colW - 80, align: 'right' })
      const badgeText = cert.status === 'صالحة' ? '✓ صالح' : cert.status || 'صالح'
      setFont(14, 'bold')
      const badgeW = doc.widthOfString(badgeText) + 28
      const badgeH = 26
      const badgeX = col3X + colW - 15 - badgeW
      const badgeY = colsY + 30
      doc.save()
      roundRectPath(badgeX, badgeY, badgeW, badgeH, badgeH / 2)
      doc.fill(EMERALD)
      doc.restore()
      doc.fillColor(WHITE).text(badgeText, badgeX, badgeY + 5, { width: badgeW, align: 'center' })

      // ===== Footer: QR + Barcode + Signature — positioned BELOW cards =====
      // Cards end at cardY+430. Footer starts at cardY+425 (slight overlap is OK).
      // Founder title at bottomY+95 = cardY+520 (within cardH=525).
      const bottomY = cardY + 425

      // QR (left) — moved right to clear corner ornament
      const qrBuffer = await generateQR(verifyUrl)
      const qrSize = 46
      const qrX = cardX + 75  // moved further from corner ornament
      doc.save()
      roundRectPath(qrX - 6, bottomY - 6, qrSize + 12, qrSize + 12, 6)
      doc.fill(WHITE)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(qrBuffer, qrX, bottomY, { width: qrSize, height: qrSize })
      setFont(11, 'bold')
      doc.fillColor(NAVY_DEEP).text('امسح للتحقق', qrX, bottomY + qrSize + 4, { width: qrSize, align: 'center' })

      // Barcode (center)
      const barcodeBuffer = await generateBarcode(cert.certificate_number)
      const barcodeW = 150
      const barcodeH = 28
      const barcodeX = cx - barcodeW / 2
      const barcodeY = bottomY + 5
      doc.save()
      roundRectPath(barcodeX - 12, barcodeY - 8, barcodeW + 24, barcodeH + 50, 4)
      doc.fill(WHITE)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeW, height: barcodeH })
      setFont(13, 'bold')
      doc.fillColor(NAVY_DEEP).text(cert.certificate_number, cx - 100, barcodeY + barcodeH + 2, { width: 200, align: 'center' })
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('CERTIFICATE ID', cx - 100, barcodeY + barcodeH + 18, { width: 200, align: 'center' })

      // ===== Signature block (right) — repositioned for proper professional spacing =====
      // Narrower signature area + clear margin from card edge to prevent overflow
      const sigAreaW = 180
      const sigAreaX = cardX + cardW - 35 - sigAreaW
      setFont(11, 'bold')
      doc.fillColor(GRAY).text('توقيع الجهة المانوحة', sigAreaX, bottomY, { width: sigAreaW, align: 'center' })

      const sigImgAreaY = bottomY + 18
      if (founderSignature) {
        try {
          const sigRes = await fetch(founderSignature)
          const sigBuf = await sigRes.arrayBuffer()
          const sigPath = path.join(os.tmpdir(), `sig-${Date.now()}.png`)
          fs.writeFileSync(sigPath, Buffer.from(sigBuf))
          if (fs.existsSync(sigPath)) {
            doc.image(sigPath, sigAreaX + 30, sigImgAreaY, { width: 120, height: 40 })
            fs.unlinkSync(sigPath)
          }
        } catch {
          drawGelPenSignaturePDF(doc, sigAreaX + 30, sigImgAreaY + 18, sigAreaW - 60)
        }
      } else {
        drawGelPenSignaturePDF(doc, sigAreaX + 30, sigImgAreaY + 18, sigAreaW - 60)
      }

      // Founder name — bold navy, with clear gap from signature
      setFont(14, 'bold')
      doc.fillColor(NAVY_DEEP).text('د. هاني الشافعي', sigAreaX, bottomY + 60, { width: sigAreaW, align: 'center' })
      // Founder title — PROPER VERTICAL SPACING (gap = 30px for clean separation)
      setFont(10, 'regular')
      doc.fillColor(NAVY_DEEP).text('المدير التنفيذي', sigAreaX, bottomY + 90, { width: sigAreaW, align: 'center' })

      // Watermark
      doc.save()
      doc.fillOpacity(0.05)
      doc.translate(cx, pageH / 2)
      doc.rotate(45)
      setFont(140, 'black')
      doc.fillColor(NAVY_DEEP).text('FIA', -100, -50, { width: 200, align: 'center' })
      doc.restore()

      doc.end()
    } catch (e: any) {
      reject(e)
    }
  })
}

export async function GET(req: NextRequest) {
  try {
    const certNum = req.nextUrl.searchParams.get('number')
    const certId = req.nextUrl.searchParams.get('id')
    const format = req.nextUrl.searchParams.get('format') || 'pdf'

    if (!certNum && !certId) {
      return NextResponse.json({ error: 'رقم الشهادة أو المعرّف مطلوب' }, { status: 400 })
    }

    let query = supabaseAdmin.from('certificates').select('*')
    if (certNum) query = query.eq('certificate_number', certNum)
    else if (certId) query = query.eq('id', certId)

    const { data: cert, error } = await query.single()
    if (error || !cert) {
      return NextResponse.json({ error: 'الشهادة غير موجودة' }, { status: 404 })
    }

    // Fetch founder's signature
    let founderSignature: string | null = null
    try {
      const { data: trainers } = await supabaseAdmin.from('trainers').select('*')
      if (trainers) {
        const founder = trainers.find((t: any) => t.password && t.password.startsWith('__TEAM_MEMBER__:founder'))
        if (founder) {
          const bioSeparator = '\n\n===FIA_EXTRA===\n'
          const idx = founder.bio ? founder.bio.indexOf(bioSeparator) : -1
          if (idx !== -1) {
            const extraJson = founder.bio.substring(idx + bioSeparator.length)
            const extra = JSON.parse(extraJson)
            founderSignature = extra.signature || null
          }
        }
      }
    } catch {}

    const issueDate = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ar-EG')
    const verifyUrl = `https://fiaacademy.vercel.app/?verify=${encodeURIComponent(cert.certificate_number)}#verify`

    if (format === 'png') {
      const pngBytes = await generateCertificatePNG(cert, issueDate, verifyUrl, founderSignature)
      const headers = new Headers()
      headers.set('Content-Type', 'image/png')
      headers.set('Content-Disposition', `inline; filename="FIA-Certificate-${cert.certificate_number}.png"`)
      headers.set('Cache-Control', 'public, max-age=3600')
      return new NextResponse(pngBytes, { status: 200, headers })
    } else {
      const pdfBytes = await generateCertificatePDF(cert, issueDate, verifyUrl, founderSignature)
      const headers = new Headers()
      headers.set('Content-Type', 'application/pdf')
      headers.set('Content-Disposition', `inline; filename="FIA-Certificate-${cert.certificate_number}.pdf"`)
      headers.set('Cache-Control', 'public, max-age=3600')
      return new NextResponse(pdfBytes, { status: 200, headers })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
