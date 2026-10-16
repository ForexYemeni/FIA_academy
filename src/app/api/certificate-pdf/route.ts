import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'
import os from 'os'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { Buffer } from 'buffer'

export const runtime = 'nodejs'
export const maxDuration = 60

// === ULTRA-PREMIUM CERTIFICATE PALETTE ===
const NAVY = '#0A1F44'         // Deep navy blue (primary)
const NAVY_DEEP = '#051429'    // Even deeper navy (background)
const NAVY_DARK = '#020A15'    // Darkest navy (plaque/ribbon)
const NAVY_MID = '#1B3A6B'     // Mid navy
const GOLD = '#C9A961'         // Royal gold (primary accent)
const GOLD_BRIGHT = '#E5C77E'  // Bright gold (highlights)
const GOLD_PALE = '#F5E5B3'    // Pale gold
const GOLD_DARK = '#8B6F2C'    // Dark gold (text)
const IVORY = '#FBF7EC'        // Premium ivory background
const IVORY_DEEP = '#F0E8D2'   // Deeper ivory
const CREAM = '#FDFAF0'        // Inner card cream
const EMERALD = '#1B7E3A'      // Valid status green
const EMERALD_LIGHT = '#D4EDDA'
const CRIMSON = '#A02424'      // Revoked status red
const CRIMSON_LIGHT = '#F8D7DA'
const GRAY_DARK = '#2C2C2C'    // Body text gray
const GRAY = '#6B6B6B'
const WHITE = '#FFFFFF'
const SIG_BLUE = '#0047AB'     // Signature royal blue ink

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
      bcid: 'code128', text: certNumber, scale: 2, height: 18,
      includetext: false, paddingwidth: 3, paddingheight: 3,
      backgroundcolor: 'FFFFFF', foregroundcolor: '0A1F44',
    })
  } catch (e: any) {
    const canvas = createCanvas(200, 50)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 200, 50)
    ctx.fillStyle = NAVY
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
    type: 'png', width: 200, margin: 1,
    color: { dark: NAVY, light: WHITE },
  })
}

// ============== Helper: Draw sophisticated corner ornament (PNG) ==============
// Premium geometric ornament: gold filigree with circles and curves
function drawCornerOrnament(ctx: any, x: number, y: number, scale: number, mx: number, my: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(mx, my)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Outer filigree curve
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2 * scale
  ctx.beginPath()
  ctx.moveTo(0, 36 * scale)
  ctx.bezierCurveTo(0, 12 * scale, 12 * scale, 0, 36 * scale, 0)
  ctx.stroke()

  // Inner curve
  ctx.strokeStyle = GOLD_BRIGHT
  ctx.lineWidth = 1.2 * scale
  ctx.beginPath()
  ctx.moveTo(6 * scale, 30 * scale)
  ctx.bezierCurveTo(6 * scale, 16 * scale, 16 * scale, 6 * scale, 30 * scale, 6 * scale)
  ctx.stroke()

  // Decorative dots along the curve
  ctx.fillStyle = GOLD
  const dots = [[2, 32], [10, 22], [22, 10], [32, 2]]
  dots.forEach(([dx, dy]) => {
    ctx.beginPath()
    ctx.arc(dx * scale, dy * scale, 1.5 * scale, 0, Math.PI * 2)
    ctx.fill()
  })

  // Central decorative diamond at corner pivot
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(4 * scale, -4 * scale)
  ctx.lineTo(8 * scale, 0)
  ctx.lineTo(4 * scale, 4 * scale)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// ============== Helper: Draw premium corner ornament (PDF) ==============
function drawCornerOrnamentPDF(doc: any, x: number, y: number, mx: number, my: number) {
  doc.save()
  doc.translate(x, y)
  doc.scale(mx, my)
  doc.lineCap('round').lineJoin('round')

  doc.lineWidth(2).strokeColor(GOLD)
  doc.moveTo(0, 36).bezierCurveTo(0, 12, 12, 0, 36, 0)
  doc.stroke()

  doc.lineWidth(1.2).strokeColor(GOLD_BRIGHT)
  doc.moveTo(6, 30).bezierCurveTo(6, 16, 16, 6, 30, 6)
  doc.stroke()

  doc.fillColor(GOLD)
  ;[[2, 32], [10, 22], [22, 10], [32, 2]].forEach(([dx, dy]) => {
    doc.circle(dx, dy, 1.5).fill(GOLD)
  })

  // Central diamond
  doc.polygon([0, 0], [4, -4], [8, 0], [4, 4]).fill(GOLD)
  doc.restore()
}

// ============== Helper: Draw signature strokes (PNG) — same as the extracted image ==============
function drawGelPenSignature(ctx: any, startX: number, centerY: number, width: number, scale: number) {
  const ink = SIG_BLUE
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const steps = 200
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps, t2 = (i + 1) / steps
    const x1 = startX + width * t1, x2 = startX + width * t2
    const y1 = centerY + Math.sin(t1 * Math.PI * 5) * 10 * scale + Math.sin(t1 * Math.PI * 11) * 4 * scale + Math.cos(t1 * Math.PI * 3) * 7 * scale
    const y2 = centerY + Math.sin(t2 * Math.PI * 5) * 10 * scale + Math.sin(t2 * Math.PI * 11) * 4 * scale + Math.cos(t2 * Math.PI * 3) * 7 * scale
    const pressure = Math.abs(y2 - y1) > 0.15 ? 3.5 : 2
    ctx.strokeStyle = ink; ctx.lineWidth = pressure * scale
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  }
  // Small left flourish
  ctx.strokeStyle = ink; ctx.lineWidth = 2.5 * scale
  ctx.beginPath()
  ctx.moveTo(startX - 8 * scale, centerY - 12 * scale)
  ctx.bezierCurveTo(startX - 16 * scale, centerY - 28 * scale, startX + 4 * scale, centerY - 30 * scale, startX + 6 * scale, centerY - 14 * scale)
  ctx.stroke()
  // Small right end flourish
  ctx.lineWidth = 3 * scale
  ctx.beginPath()
  ctx.moveTo(startX + width, centerY)
  ctx.bezierCurveTo(startX + width + 16 * scale, centerY - 16 * scale, startX + width + 22 * scale, centerY + 4 * scale, startX + width + 8 * scale, centerY + 6 * scale)
  ctx.stroke()
  // Underscore
  const usStartX = startX - 4 * scale, usEndX = startX + width + 10 * scale
  const usY = centerY + 24 * scale
  for (let i = 0; i < 100; i++) {
    const t1 = i / 100, t2 = (i + 1) / 100
    const x1 = usStartX + (usEndX - usStartX) * t1, x2 = usStartX + (usEndX - usStartX) * t2
    const y1 = usY + Math.sin(t1 * Math.PI * 3) * 1.5 * scale, y2 = usY + Math.sin(t2 * Math.PI * 3) * 1.5 * scale
    const pressure = t1 < 0.1 || t1 > 0.9 ? 1.2 : 2
    ctx.lineWidth = pressure * scale
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  }
  // Initial dot
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.arc(startX - 14 * scale, centerY - 8 * scale, 1.8 * scale, 0, Math.PI * 2)
  ctx.fill()
}

// ============== Helper: Draw signature (PDF) ==============
function drawGelPenSignaturePDF(doc: any, startX: number, centerY: number, width: number) {
  const ink = SIG_BLUE
  const steps = 200
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps, t2 = (i + 1) / steps
    const x1 = startX + width * t1, x2 = startX + width * t2
    const y1 = centerY + Math.sin(t1 * Math.PI * 5) * 10 + Math.sin(t1 * Math.PI * 11) * 4 + Math.cos(t1 * Math.PI * 3) * 7
    const y2 = centerY + Math.sin(t2 * Math.PI * 5) * 10 + Math.sin(t2 * Math.PI * 11) * 4 + Math.cos(t2 * Math.PI * 3) * 7
    const pressure = Math.abs(y2 - y1) > 0.15 ? 3.5 : 2
    doc.lineWidth(pressure).strokeColor(ink)
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke()
  }
  doc.lineWidth(2.5).strokeColor(ink)
  doc.moveTo(startX - 8, centerY - 12)
  doc.bezierCurveTo(startX - 16, centerY - 28, startX + 4, centerY - 30, startX + 6, centerY - 14)
  doc.stroke()
  doc.lineWidth(3)
  doc.moveTo(startX + width, centerY)
  doc.bezierCurveTo(startX + width + 16, centerY - 16, startX + width + 22, centerY + 4, startX + width + 8, centerY + 6)
  doc.stroke()
  const usStartX = startX - 4, usEndX = startX + width + 10
  const usY = centerY + 24
  for (let i = 0; i < 100; i++) {
    const t1 = i / 100, t2 = (i + 1) / 100
    const x1 = usStartX + (usEndX - usStartX) * t1, x2 = usStartX + (usEndX - usStartX) * t2
    const y1 = usY + Math.sin(t1 * Math.PI * 3) * 1.5, y2 = usY + Math.sin(t2 * Math.PI * 3) * 1.5
    const pressure = t1 < 0.1 || t1 > 0.9 ? 1.2 : 2
    doc.lineWidth(pressure).strokeColor(ink)
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke()
  }
  doc.circle(startX - 14, centerY - 8, 1.8).fill(ink)
}

// ============== ULTRA-PREMIUM PNG CERTIFICATE ==============
async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string, founderSignature?: string | null, signatoryName?: string | null, signatoryPosition?: string | null): Promise<Buffer> {
  registerFontsForCanvas()

  const scale = 2
  const pageW = 842 * scale, pageH = 595 * scale
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

  // ===== OUTER BACKGROUND: Deep navy with subtle radial gradient =====
  fill(NAVY_DEEP); ctx.fillRect(0, 0, pageW, pageH)
  const bgGrad = ctx.createRadialGradient(cx, pageH / 2, 100 * scale, cx, pageH / 2, pageW)
  bgGrad.addColorStop(0, NAVY)
  bgGrad.addColorStop(1, NAVY_DEEP)
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, pageW, pageH)

  // ===== Subtle geometric pattern on outer navy (very faint diamonds) =====
  ctx.save()
  ctx.globalAlpha = 0.06
  fill(GOLD)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      const x = col * 80 * scale + (row % 2 ? 40 * scale : 0)
      const y = row * 80 * scale
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-2 * scale, -2 * scale, 4 * scale, 4 * scale)
      ctx.restore()
    }
  }
  ctx.restore()

  // ===== INNER IVORY CARD (with shadow) =====
  const cardPad = 28 * scale
  const cardX = cardPad, cardY = cardPad
  const cardW = pageW - 2 * cardPad, cardH = pageH - 2 * cardPad

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 20 * scale
  ctx.shadowOffsetY = 6 * scale
  fillRoundRect(cardX, cardY, cardW, cardH, 16 * scale, IVORY)
  ctx.restore()

  // Subtle inner gradient on cream
  const innerGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH)
  innerGrad.addColorStop(0, CREAM)
  innerGrad.addColorStop(1, IVORY)
  fillRoundRect(cardX, cardY, cardW, cardH, 16 * scale, '#000')
  ctx.fillStyle = innerGrad
  roundRect(cardX, cardY, cardW, cardH, 16 * scale)
  ctx.fill()

  // ===== TRIPLE GOLD FRAME (premium multi-line border) =====
  strokeRoundRect(cardX + 8 * scale, cardY + 8 * scale, cardW - 16 * scale, cardH - 16 * scale, 12 * scale, GOLD, 2.5 * scale)
  strokeRoundRect(cardX + 16 * scale, cardY + 16 * scale, cardW - 32 * scale, cardH - 32 * scale, 8 * scale, GOLD_BRIGHT, 1 * scale)
  strokeRoundRect(cardX + 22 * scale, cardY + 22 * scale, cardW - 44 * scale, cardH - 44 * scale, 6 * scale, GOLD, 0.5 * scale)

  // ===== CORNER ORNAMENTS (4 corners, premium geometric filigree) =====
  const cornerInset = 28 * scale
  drawCornerOrnament(ctx, cardX + cornerInset, cardY + cornerInset, scale, 1, 1)
  drawCornerOrnament(ctx, cardX + cardW - cornerInset, cardY + cornerInset, scale, -1, 1)
  drawCornerOrnament(ctx, cardX + cornerInset, cardY + cardH - cornerInset, scale, 1, -1)
  drawCornerOrnament(ctx, cardX + cardW - cornerInset, cardY + cardH - cornerInset, scale, -1, -1)

  // ===== TOP-LEFT FIA monogram badge (premium academic seal) =====
  const sealSize = 60 * scale
  const sealX = cardX + 50 * scale, sealY = cardY + 50 * scale
  // Outer gold ring
  fillRoundRect(sealX - sealSize / 2, sealY - sealSize / 2, sealSize, sealSize, sealSize / 2, NAVY_DARK)
  strokeRoundRect(sealX - sealSize / 2, sealY - sealSize / 2, sealSize, sealSize, sealSize / 2, GOLD, 2.5 * scale)
  // Inner gold accent ring
  strokeRoundRect(sealX - sealSize / 2 + 5 * scale, sealY - sealSize / 2 + 5 * scale, sealSize - 10 * scale, sealSize - 10 * scale, (sealSize - 10 * scale) / 2, GOLD_BRIGHT, 0.8 * scale)
  // FIA text inside seal
  setFont(18, 'bold')
  fill(GOLD_BRIGHT)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('FIA', sealX, sealY)

  // ===== LOGO (top-right) =====
  const logoSize = 75 * scale
  const logoX = cardX + cardW - logoSize - 50 * scale
  const logoY = cardY + 45 * scale
  const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-fia.png')
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath)
    const logoImg = await loadImage(logoBuffer)
    // White rounded background with gold frame
    fillRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 10 * scale, WHITE)
    strokeRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 10 * scale, GOLD, 2 * scale)
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
  }

  // ===== HEADER: Institution name (large, centered, navy) =====
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'

  // Arabic institution name — large prestigious
  setFont(34, 'bold')
  fill(NAVY)
  ctx.fillText('أكاديمية المستقبل الدولية', cx, cardY + 80 * scale)

  // English subtitle — gold, tracked
  ctx.direction = 'ltr'
  setFont(12, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('F U T U R E   I N T E R N A T I O N A L   A C A D E M Y', cx, cardY + 115 * scale)

  // ===== PREMIUM ORNAMENTAL DIVIDER (gold double-line with center diamond + side dots) =====
  const dividerY = cardY + 145 * scale
  // Upper thin gold line
  stroke(GOLD, 1.5 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 130 * scale, dividerY - 3 * scale)
  ctx.lineTo(cx - 16 * scale, dividerY - 3 * scale)
  ctx.moveTo(cx + 16 * scale, dividerY - 3 * scale)
  ctx.lineTo(cx + 130 * scale, dividerY - 3 * scale)
  ctx.stroke()
  // Lower thin gold line
  ctx.beginPath()
  ctx.moveTo(cx - 130 * scale, dividerY + 3 * scale)
  ctx.lineTo(cx - 16 * scale, dividerY + 3 * scale)
  ctx.moveTo(cx + 16 * scale, dividerY + 3 * scale)
  ctx.lineTo(cx + 130 * scale, dividerY + 3 * scale)
  ctx.stroke()
  // Central diamond
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, dividerY - 8 * scale)
  ctx.lineTo(cx + 8 * scale, dividerY)
  ctx.lineTo(cx, dividerY + 8 * scale)
  ctx.lineTo(cx - 8 * scale, dividerY)
  ctx.closePath()
  ctx.fill()
  // Side decorative dots
  ctx.beginPath()
  ctx.arc(cx - 18 * scale, dividerY, 2 * scale, 0, Math.PI * 2)
  ctx.arc(cx + 18 * scale, dividerY, 2 * scale, 0, Math.PI * 2)
  ctx.fill()

  // ===== CERTIFICATE TITLE (شهادة إتمام + CERTIFICATE OF COMPLETION) =====
  // Arabic title — large, navy, prestigious
  ctx.direction = 'rtl'
  setFont(28, 'bold')
  fill(NAVY)
  ctx.fillText('شهادة إتمام', cx, cardY + 185 * scale)
  // English subtitle — small gold
  ctx.direction = 'ltr'
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('C E R T I F I C A T E   O F   C O M P L E T I O N', cx, cardY + 215 * scale)

  // ===== CERTIFICATION STATEMENT =====
  ctx.direction = 'rtl'
  setFont(14, 'regular')
  fill(GRAY_DARK)
  ctx.fillText('تشهد أكاديمية المستقبل الدولية بأن', cx, cardY + 245 * scale)

  // ===== RECIPIENT NAME — LARGEST element, focal point — AUTO-FIT for long names =====
  // Start at 38pt; if too long, shrink to fit within 80% of card width
  let nameFontSize = 38
  setFont(nameFontSize, 'black')
  let nameWidth = ctx.measureText(cert.student_name || 'طالب').width
  const maxNameWidth = (cardW - 200 * scale)
  while (nameWidth > maxNameWidth && nameFontSize > 20) {
    nameFontSize -= 2
    setFont(nameFontSize, 'black')
    nameWidth = ctx.measureText(cert.student_name || 'طالب').width
  }
  fill(NAVY)
  ctx.fillText(cert.student_name || 'طالب', cx, cardY + 290 * scale)

  // Decorative gold underline under recipient name
  stroke(GOLD, 1 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 80 * scale, cardY + 320 * scale)
  ctx.lineTo(cx + 80 * scale, cardY + 320 * scale)
  ctx.stroke()
  // Small center diamond under name
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, cardY + 316 * scale)
  ctx.lineTo(cx + 4 * scale, cardY + 320 * scale)
  ctx.lineTo(cx, cardY + 324 * scale)
  ctx.lineTo(cx - 4 * scale, cardY + 320 * scale)
  ctx.closePath()
  ctx.fill()

  // ===== COMPLETION STATEMENT =====
  ctx.direction = 'rtl'
  setFont(14, 'regular')
  fill(GRAY_DARK)
  ctx.fillText('قد أتم بنجاح متطلبات دورة', cx, cardY + 345 * scale)

  // ===== LUXURIOUS COURSE PLAQUE (dark navy with metallic-gold borders) =====
  // AUTO-FIT: shrink course title font if too long to fit in plaque
  const plaqueY = cardY + 380 * scale
  const plaqueH = 40 * scale
  let courseFontSize = 20
  setFont(courseFontSize, 'bold')
  const courseText = cert.course_title || 'دورة معتمدة'
  // Determine plaque width based on initial measurement
  let textWidth = ctx.measureText(courseText).width
  const plaquePadX = 50 * scale
  const maxPlaqueWidth = cardW - 100 * scale  // maximum plaque width
  // Shrink font if text + padding exceeds max plaque width
  while (textWidth + 100 * scale + plaquePadX * 2 > maxPlaqueWidth && courseFontSize > 11) {
    courseFontSize -= 1
    setFont(courseFontSize, 'bold')
    textWidth = ctx.measureText(courseText).width
  }
  const plaqueW = Math.max(textWidth + 100 * scale + plaquePadX * 2, 320 * scale)
  const plaqueX = cx - plaqueW / 2

  // Outer shadow for depth
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 8 * scale
  ctx.shadowOffsetY = 3 * scale
  fill(NAVY_DARK)
  ctx.beginPath()
  ctx.moveTo(plaqueX + 18 * scale, plaqueY)
  ctx.lineTo(plaqueX + plaqueW - 18 * scale, plaqueY)
  ctx.lineTo(plaqueX + plaqueW, plaqueY + plaqueH / 2)
  ctx.lineTo(plaqueX + plaqueW - 18 * scale, plaqueY + plaqueH)
  ctx.lineTo(plaqueX + 18 * scale, plaqueY + plaqueH)
  ctx.lineTo(plaqueX, plaqueY + plaqueH / 2)
  ctx.closePath(); ctx.fill()
  ctx.restore()

  // Metallic gold border (thick outer)
  stroke(GOLD, 2.5 * scale)
  ctx.beginPath()
  ctx.moveTo(plaqueX + 18 * scale, plaqueY)
  ctx.lineTo(plaqueX + plaqueW - 18 * scale, plaqueY)
  ctx.lineTo(plaqueX + plaqueW, plaqueY + plaqueH / 2)
  ctx.lineTo(plaqueX + plaqueW - 18 * scale, plaqueY + plaqueH)
  ctx.lineTo(plaqueX + 18 * scale, plaqueY + plaqueH)
  ctx.lineTo(plaqueX, plaqueY + plaqueH / 2)
  ctx.closePath(); ctx.stroke()
  // Inner thin gold accent
  stroke(GOLD_BRIGHT, 0.6 * scale)
  ctx.beginPath()
  ctx.moveTo(plaqueX + 22 * scale, plaqueY + 4 * scale)
  ctx.lineTo(plaqueX + plaqueW - 22 * scale, plaqueY + 4 * scale)
  ctx.lineTo(plaqueX + plaqueW - 5 * scale, plaqueY + plaqueH / 2)
  ctx.lineTo(plaqueX + plaqueW - 22 * scale, plaqueY + plaqueH - 4 * scale)
  ctx.lineTo(plaqueX + 22 * scale, plaqueY + plaqueH - 4 * scale)
  ctx.lineTo(plaqueX + 5 * scale, plaqueY + plaqueH / 2)
  ctx.closePath(); ctx.stroke()

  // Course title inside plaque — bright gold
  fill(GOLD_BRIGHT)
  ctx.fillText(courseText, cx, plaqueY + plaqueH / 2 + 1 * scale)

  // ===== 3 INFO BOXES — UNIFIED PROFESSIONAL DESIGN (all same shape/size) =====
  const boxesY = cardY + 425 * scale
  const boxesH = 42 * scale
  const boxW = 200 * scale
  const boxGap = 14 * scale
  const totalBoxesW = 3 * boxW + 2 * boxGap
  const boxesStartX = cx - totalBoxesW / 2
  const iconSize = 28 * scale
  const iconPad = 11 * scale

  // Helper: draw one info box (unified design)
  const drawInfoBox = (x: number, icon: string, label: string, value: string, valueColor: string, boxBgColor: string = WHITE, boxBorderColor: string = GOLD) => {
    fillRoundRect(x, boxesY, boxW, boxesH, 8 * scale, boxBgColor)
    strokeRoundRect(x, boxesY, boxW, boxesH, 8 * scale, boxBorderColor, 1.5 * scale)
    // Icon circle
    fillRoundRect(x + iconPad, boxesY + (boxesH - iconSize) / 2, iconSize, iconSize, iconSize / 2, boxBorderColor === GOLD ? NAVY : boxBorderColor)
    setFont(11, 'bold'); fill(GOLD_BRIGHT); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(icon, x + iconPad + iconSize / 2, boxesY + boxesH / 2 + 1 * scale)
    // Label + value (right side, RTL)
    ctx.direction = 'rtl'; setFont(8, 'regular'); fill(GRAY); ctx.textAlign = 'right'
    ctx.fillText(label, x + boxW - 12 * scale, boxesY + 13 * scale)
    setFont(11, 'bold'); fill(valueColor)
    ctx.fillText(value, x + boxW - 12 * scale, boxesY + 30 * scale)
  }

  // Box 1: Date
  drawInfoBox(boxesStartX, '📅', 'تاريخ الإصدار', issueDate, NAVY)
  // Box 2: Issuer
  const box2X = boxesStartX + boxW + boxGap
  drawInfoBox(box2X, '🎓', 'الجهة المصدرة', 'أكاديمية المستقبل الدولية', NAVY)
  // Box 3: Status
  const box3X = boxesStartX + 2 * (boxW + boxGap)
  const isRevoked = cert.status === 'ملغاة' || cert.status === 'ملغي'
  const statusColor = isRevoked ? CRIMSON : EMERALD
  const statusBgColor = isRevoked ? CRIMSON_LIGHT : EMERALD_LIGHT
  const statusText = isRevoked ? 'ملغي' : 'صالح'
  drawInfoBox(box3X, isRevoked ? '✕' : '✓', 'الحالة', statusText, statusColor, statusBgColor, statusColor)

  // ===== BOTTOM ROW: 3 EQUAL COLUMNS (QR / Cert ID / Signature) — INSIDE inner gold frame =====
  // Layout uses 3 equal columns within the inner gold frame area, with consistent spacing
  const innerLeft = cardX + 32 * scale  // inside inner gold frame
  const innerRight = cardX + cardW - 32 * scale
  const innerW = innerRight - innerLeft
  const colW = innerW / 3
  const colGap = 8 * scale
  const bottomY = cardY + 478 * scale

  // --- QR (left column) ---
  const qrBuffer = await generateQR(verifyUrl)
  const qrImg = await loadImage(qrBuffer)
  const qrSize = 38 * scale
  const qrColCenterX = innerLeft + colW / 2 - colGap / 2
  const qrY = bottomY + 2 * scale
  // White card for QR
  fillRoundRect(qrColCenterX - qrSize / 2 - 4 * scale, qrY - 4 * scale, qrSize + 8 * scale, qrSize + 8 * scale, 4 * scale, WHITE)
  strokeRoundRect(qrColCenterX - qrSize / 2 - 4 * scale, qrY - 4 * scale, qrSize + 8 * scale, qrSize + 8 * scale, 4 * scale, GOLD, 1.2 * scale)
  ctx.drawImage(qrImg, qrColCenterX - qrSize / 2, qrY, qrSize, qrSize)
  // QR label
  ctx.direction = 'rtl'; setFont(9, 'bold'); fill(NAVY); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('امسح للتحقق', qrColCenterX, qrY + qrSize + 14 * scale)

  // --- Cert ID (center column) — barcode + cert number inside white card ---
  const certColCenterX = innerLeft + colW + colGap / 2 + colW / 2 - colGap / 2
  const barcodeBuffer = await generateBarcode(cert.certificate_number)
  const barcodeImg = await loadImage(barcodeBuffer)
  const barcodeW = 100 * scale
  const barcodeH = 20 * scale
  const barcodeX = certColCenterX - barcodeW / 2
  const barcodeY = bottomY + 4 * scale
  const barcodeCardH = barcodeH + 28 * scale
  // White card containing barcode + cert number
  fillRoundRect(barcodeX - 6 * scale, barcodeY - 6 * scale, barcodeW + 12 * scale, barcodeCardH, 4 * scale, WHITE)
  strokeRoundRect(barcodeX - 6 * scale, barcodeY - 6 * scale, barcodeW + 12 * scale, barcodeCardH, 4 * scale, GOLD, 1.2 * scale)
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeW, barcodeH)
  ctx.direction = 'ltr'; setFont(9, 'bold'); fill(NAVY)
  ctx.fillText(cert.certificate_number, certColCenterX, barcodeY + barcodeH + 8 * scale)
  setFont(7, 'regular'); fill(GRAY)
  ctx.fillText('CERTIFICATE ID', certColCenterX, barcodeY + barcodeH + 16 * scale)

  // --- SIGNATURE (right column) — EMPTY by default, drawn only if signature_image provided ---
  const sigColCenterX = innerLeft + 2 * colW + colGap + colW / 2 - colGap / 2
  const sigAreaW = colW - 20 * scale
  const sigAreaX = sigColCenterX - sigAreaW / 2

  // Top label
  ctx.direction = 'rtl'; setFont(10, 'bold'); fill(NAVY); ctx.textAlign = 'center'
  ctx.fillText('توقيع الجهة المانوحة', sigColCenterX, bottomY + 4 * scale)

  // Signature image (only if provided from admin dashboard)
  let signatureDrawn = false
  if (founderSignature) {
    try {
      const sigImgBuf = await fetch(founderSignature).then(r => r.arrayBuffer())
      const sigImg = await loadImage(Buffer.from(sigImgBuf))
      const sigImgW = 100 * scale
      const sigImgH = 28 * scale
      ctx.drawImage(sigImg, sigColCenterX - sigImgW / 2, bottomY + 10 * scale, sigImgW, sigImgH)
      signatureDrawn = true
    } catch {}
  }
  // No fallback — area remains EMPTY

  // Thin gold signature line
  stroke(GOLD, 1 * scale)
  ctx.beginPath()
  ctx.moveTo(sigAreaX + 5 * scale, bottomY + 42 * scale)
  ctx.lineTo(sigAreaX + sigAreaW - 5 * scale, bottomY + 42 * scale)
  ctx.stroke()

  // Signatory name + position — ONLY shown if signature is approved
  if (signatureDrawn && signatoryName) {
    setFont(11, 'bold'); fill(NAVY)
    ctx.fillText(signatoryName, sigColCenterX, bottomY + 50 * scale)
  }
  if (signatureDrawn && signatoryPosition) {
    setFont(8, 'regular'); fill(GRAY_DARK)
    ctx.fillText(signatoryPosition, sigColCenterX, bottomY + 60 * scale)
  }

  // ===== WATERMARK REMOVED (was interfering with text readability) =====

  return await canvas.encode('png')
}

// ============== PDF CERTIFICATE (matching PNG design) ==============
async function generateCertificatePDF(cert: any, issueDate: string, verifyUrl: string, founderSignature?: string | null, signatoryName?: string | null, signatoryPosition?: string | null): Promise<Buffer> {
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
        else doc.font(weight === 'regular' ? 'Helvetica' : 'Helvetica-Bold', size)
      }

      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      const pageW = 842, pageH = 595, cx = pageW / 2

      const roundRectPath = (x: number, y: number, w: number, h: number, r: number) => {
        doc.path(`M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`)
      }

      // ===== OUTER BACKGROUND =====
      doc.rect(0, 0, pageW, pageH).fill(NAVY_DEEP)

      // ===== INNER IVORY CARD (with shadow) =====
      const cardPad = 28, cardX = cardPad, cardY = cardPad
      const cardW = pageW - 2 * cardPad, cardH = pageH - 2 * cardPad

      // Shadow
      doc.save()
      doc.fillColor('rgba(0,0,0,0.5)')
      roundRectPath(cardX + 2, cardY + 3, cardW, cardH, 16)
      doc.fill()
      doc.restore()
      // Card fill
      doc.save()
      roundRectPath(cardX, cardY, cardW, cardH, 16)
      doc.fill(IVORY)
      doc.restore()

      // TRIPLE GOLD FRAME
      doc.save()
      doc.lineWidth(2.5).strokeColor(GOLD)
      roundRectPath(cardX + 8, cardY + 8, cardW - 16, cardH - 16, 12)
      doc.stroke()
      doc.restore()
      doc.save()
      doc.lineWidth(1).strokeColor(GOLD_BRIGHT)
      roundRectPath(cardX + 16, cardY + 16, cardW - 32, cardH - 32, 8)
      doc.stroke()
      doc.restore()
      doc.save()
      doc.lineWidth(0.5).strokeColor(GOLD)
      roundRectPath(cardX + 22, cardY + 22, cardW - 44, cardH - 44, 6)
      doc.stroke()
      doc.restore()

      // Corner ornaments
      const cornerInset = 28
      drawCornerOrnamentPDF(doc, cardX + cornerInset, cardY + cornerInset, 1, 1)
      drawCornerOrnamentPDF(doc, cardX + cardW - cornerInset, cardY + cornerInset, -1, 1)
      drawCornerOrnamentPDF(doc, cardX + cornerInset, cardY + cardH - cornerInset, 1, -1)
      drawCornerOrnamentPDF(doc, cardX + cardW - cornerInset, cardY + cardH - cornerInset, -1, -1)

      // ===== FIA SEAL (top-left) =====
      const sealSize = 60, sealX = cardX + 50, sealY = cardY + 50
      doc.save()
      roundRectPath(sealX - sealSize / 2, sealY - sealSize / 2, sealSize, sealSize, sealSize / 2)
      doc.fill(NAVY_DARK)
      doc.lineWidth(2.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      setFont(18, 'bold')
      doc.fillColor(GOLD_BRIGHT).text('FIA', sealX - 30, sealY - 12, { width: 60, align: 'center' })

      // ===== LOGO (top-right) =====
      const logoSize = 75
      const logoX = cardX + cardW - logoSize - 50
      const logoY = cardY + 45
      const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-fia.png')
      if (fs.existsSync(logoPath)) {
        doc.save()
        roundRectPath(logoX - 6, logoY - 6, logoSize + 12, logoSize + 12, 10)
        doc.fill(WHITE)
        doc.lineWidth(2).strokeColor(GOLD)
        doc.stroke()
        doc.restore()
        doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize })
      }

      // ===== HEADER: Institution name =====
      setFont(34, 'bold')
      doc.fillColor(NAVY).text('أكاديمية المستقبل الدولية', cx - 350, cardY + 65, { width: 700, align: 'center' })
      setFont(12, 'bold')
      doc.fillColor(GOLD_DARK).text('F U T U R E   I N T E R N A T I O N A L   A C A D E M Y', cx - 350, cardY + 108, { width: 700, align: 'center' })

      // Ornamental divider
      const dividerY = cardY + 145
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.moveTo(cx - 130, dividerY - 3).lineTo(cx - 16, dividerY - 3).stroke()
      doc.moveTo(cx + 16, dividerY - 3).lineTo(cx + 130, dividerY - 3).stroke()
      doc.moveTo(cx - 130, dividerY + 3).lineTo(cx - 16, dividerY + 3).stroke()
      doc.moveTo(cx + 16, dividerY + 3).lineTo(cx + 130, dividerY + 3).stroke()
      doc.polygon([cx, dividerY - 8], [cx + 8, dividerY], [cx, dividerY + 8], [cx - 8, dividerY]).fill(GOLD)

      // CERTIFICATE TITLE
      setFont(28, 'bold')
      doc.fillColor(NAVY).text('شهادة إتمام', cx - 350, cardY + 170, { width: 700, align: 'center' })
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('C E R T I F I C A T E   O F   C O M P L E T I O N', cx - 350, cardY + 205, { width: 700, align: 'center' })

      // CERTIFICATION STATEMENT
      setFont(14, 'regular')
      doc.fillColor(GRAY_DARK).text('تشهد أكاديمية المستقبل الدولية بأن', cx - 350, cardY + 238, { width: 700, align: 'center' })

      // RECIPIENT NAME — largest with AUTO-FIT for long names
      let nameFontSize = 38
      setFont(nameFontSize, 'black')
      let nameWidth = doc.widthOfString(cert.student_name || 'طالب')
      const maxNameWidth = 600
      while (nameWidth > maxNameWidth && nameFontSize > 20) {
        nameFontSize -= 2
        setFont(nameFontSize, 'black')
        nameWidth = doc.widthOfString(cert.student_name || 'طالب')
      }
      doc.fillColor(NAVY).text(cert.student_name || 'طالب', cx - 350, cardY + 273, { width: 700, align: 'center' })

      // Gold underline under recipient name
      doc.lineWidth(1).strokeColor(GOLD)
      doc.moveTo(cx - 80, cardY + 320).lineTo(cx + 80, cardY + 320).stroke()
      doc.polygon([cx, 316], [cx + 4, 320], [cx, 324], [cx - 4, 320]).fill(GOLD)

      // COMPLETION STATEMENT
      setFont(14, 'regular')
      doc.fillColor(GRAY_DARK).text('قد أتم بنجاح متطلبات دورة', cx - 350, cardY + 340, { width: 700, align: 'center' })

      // COURSE PLAQUE — with AUTO-FIT for long course names
      const plaqueY = cardY + 380, plaqueH = 40
      let courseFontSize = 20
      setFont(courseFontSize, 'bold')
      const courseText = cert.course_title || 'دورة معتمدة'
      let textWidth = doc.widthOfString(courseText)
      const plaquePadX = 50
      const maxPlaqueWidth = cardW - 100
      while (textWidth + 100 + plaquePadX * 2 > maxPlaqueWidth && courseFontSize > 11) {
        courseFontSize -= 1
        setFont(courseFontSize, 'bold')
        textWidth = doc.widthOfString(courseText)
      }
      const plaqueW = Math.max(textWidth + 100 + plaquePadX * 2, 320)
      const plaqueX = cx - plaqueW / 2

      doc.save()
      doc.fillColor(NAVY_DARK)
      doc.path(`M ${plaqueX + 18},${plaqueY} L ${plaqueX + plaqueW - 18},${plaqueY} L ${plaqueX + plaqueW},${plaqueY + plaqueH / 2} L ${plaqueX + plaqueW - 18},${plaqueY + plaqueH} L ${plaqueX + 18},${plaqueY + plaqueH} L ${plaqueX},${plaqueY + plaqueH / 2} Z`)
      doc.fill()
      doc.restore()
      doc.save()
      doc.lineWidth(2.5).strokeColor(GOLD)
      doc.path(`M ${plaqueX + 18},${plaqueY} L ${plaqueX + plaqueW - 18},${plaqueY} L ${plaqueX + plaqueW},${plaqueY + plaqueH / 2} L ${plaqueX + plaqueW - 18},${plaqueY + plaqueH} L ${plaqueX + 18},${plaqueY + plaqueH} L ${plaqueX},${plaqueY + plaqueH / 2} Z`)
      doc.stroke()
      doc.restore()
      doc.fillColor(GOLD_BRIGHT).text(courseText, plaqueX, plaqueY + 16, { width: plaqueW, align: 'center' })

      // 3 INFO BOXES — UNIFIED PROFESSIONAL DESIGN (all same shape/size)
      const boxesY = cardY + 425, boxesH = 42, boxW = 200, boxGap = 14
      const totalBoxesW = 3 * boxW + 2 * boxGap
      const boxesStartX = cx - totalBoxesW / 2
      const iconSize = 28, iconPad = 11

      // Helper: draw one info box (unified design)
      const drawInfoBoxPDF = (x: number, icon: string, label: string, value: string, valueColor: string, boxBgColor: string = WHITE, boxBorderColor: string = GOLD) => {
        doc.save()
        roundRectPath(x, boxesY, boxW, boxesH, 8)
        doc.fill(boxBgColor)
        doc.lineWidth(1.5).strokeColor(boxBorderColor)
        doc.stroke()
        doc.restore()
        // Icon circle
        doc.save()
        roundRectPath(x + iconPad, boxesY + (boxesH - iconSize) / 2, iconSize, iconSize, iconSize / 2)
        doc.fill(boxBorderColor === GOLD ? NAVY : boxBorderColor)
        doc.restore()
        setFont(11, 'bold')
        doc.fillColor(GOLD_BRIGHT).text(icon, x + iconPad, boxesY + (boxesH - iconSize) / 2 + 5, { width: iconSize, align: 'center' })
        // Label + value
        setFont(8, 'regular')
        doc.fillColor(GRAY).text(label, x + iconPad + iconSize + 5, boxesY + 11, { width: boxW - iconPad - iconSize - 18, align: 'right' })
        setFont(11, 'bold')
        doc.fillColor(valueColor).text(value, x + iconPad + iconSize + 5, boxesY + 26, { width: boxW - iconPad - iconSize - 18, align: 'right' })
      }

      drawInfoBoxPDF(boxesStartX, '📅', 'تاريخ الإصدار', issueDate, NAVY)
      const box2X = boxesStartX + boxW + boxGap
      drawInfoBoxPDF(box2X, '🎓', 'الجهة المصدرة', 'أكاديمية المستقبل الدولية', NAVY)
      const box3X = boxesStartX + 2 * (boxW + boxGap)
      const isRevoked = cert.status === 'ملغاة' || cert.status === 'ملغي'
      const statusColor = isRevoked ? CRIMSON : EMERALD
      const statusBgColor = isRevoked ? CRIMSON_LIGHT : EMERALD_LIGHT
      const statusText = isRevoked ? 'ملغي' : 'صالح'
      drawInfoBoxPDF(box3X, isRevoked ? '✕' : '✓', 'الحالة', statusText, statusColor, statusBgColor, statusColor)

      // ===== BOTTOM ROW: 3 EQUAL COLUMNS (QR / Cert ID / Signature) — INSIDE inner gold frame =====
      const innerLeft = cardX + 32, innerRight = cardX + cardW - 32
      const innerW = innerRight - innerLeft
      const colW = innerW / 3, colGap = 8
      const bottomY = cardY + 478

      // QR (left column)
      const qrBuffer = await generateQR(verifyUrl)
      const qrSize = 38
      const qrColCenterX = innerLeft + colW / 2 - colGap / 2
      const qrY = bottomY + 2
      doc.save()
      roundRectPath(qrColCenterX - qrSize / 2 - 4, qrY - 4, qrSize + 8, qrSize + 8, 4)
      doc.fill(WHITE)
      doc.lineWidth(1.2).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(qrBuffer, qrColCenterX - qrSize / 2, qrY, { width: qrSize, height: qrSize })
      setFont(9, 'bold')
      doc.fillColor(NAVY).text('امسح للتحقق', qrColCenterX - 30, qrY + qrSize + 2, { width: 60, align: 'center' })

      // Cert ID (center column)
      const certColCenterX = innerLeft + colW + colGap / 2 + colW / 2 - colGap / 2
      const barcodeBuffer = await generateBarcode(cert.certificate_number)
      const barcodeW = 100, barcodeH = 20
      const barcodeX = certColCenterX - barcodeW / 2
      const barcodeY = bottomY + 4
      const barcodeCardH = barcodeH + 28
      doc.save()
      roundRectPath(barcodeX - 6, barcodeY - 6, barcodeW + 12, barcodeCardH, 4)
      doc.fill(WHITE)
      doc.lineWidth(1.2).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeW, height: barcodeH })
      setFont(9, 'bold')
      doc.fillColor(NAVY).text(cert.certificate_number, certColCenterX - 60, barcodeY + barcodeH + 2, { width: 120, align: 'center' })
      setFont(7, 'regular')
      doc.fillColor(GRAY).text('CERTIFICATE ID', certColCenterX - 60, barcodeY + barcodeH + 12, { width: 120, align: 'center' })

      // Signature (right column) — EMPTY by default
      const sigColCenterX = innerLeft + 2 * colW + colGap + colW / 2 - colGap / 2
      const sigAreaW = colW - 20
      const sigAreaX = sigColCenterX - sigAreaW / 2
      setFont(10, 'bold')
      doc.fillColor(NAVY).text('توقيع الجهة المانوحة', sigAreaX, bottomY + 2, { width: sigAreaW, align: 'center' })

      // Signature image (only if provided)
      let signatureDrawn = false
      if (founderSignature) {
        try {
          const sigRes = await fetch(founderSignature)
          const sigBuf = await sigRes.arrayBuffer()
          const sigPath = path.join(os.tmpdir(), `sig-${Date.now()}.png`)
          fs.writeFileSync(sigPath, Buffer.from(sigBuf))
          if (fs.existsSync(sigPath)) {
            doc.image(sigPath, sigColCenterX - 50, bottomY + 10, { width: 100, height: 28 })
            fs.unlinkSync(sigPath)
            signatureDrawn = true
          }
        } catch {}
      }
      // No fallback signature

      // Thin gold signature line
      doc.lineWidth(1).strokeColor(GOLD)
      doc.moveTo(sigAreaX + 5, bottomY + 42).lineTo(sigAreaX + sigAreaW - 5, bottomY + 42).stroke()

      // Signatory name + position — ONLY shown if signature is approved
      if (signatureDrawn && signatoryName) {
        setFont(11, 'bold')
        doc.fillColor(NAVY).text(signatoryName, sigAreaX, bottomY + 48, { width: sigAreaW, align: 'center' })
      }
      if (signatureDrawn && signatoryPosition) {
        setFont(8, 'regular')
        doc.fillColor(GRAY_DARK).text(signatoryPosition, sigAreaX, bottomY + 58, { width: sigAreaW, align: 'center' })
      }

      // WATERMARK REMOVED (was interfering with text readability)

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

    const issueDate = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ar-EG')
    const verifyUrl = `https://fiaacademy.vercel.app/?verify=${encodeURIComponent(cert.certificate_number)}#verify`

    // Fetch founder's signature, signatory name & position from founder bio (added via admin dashboard)
    // The signature is OPTIONAL — area remains EMPTY if no signature has been added/approved by admin
    let founderSignature: string | null = null
    let signatoryName: string | null = null
    let signatoryPosition: string | null = null
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
            signatoryName = extra.signatory_name || founder.name || null
            signatoryPosition = extra.signatory_position || 'المدير التنفيذي'
          }
        }
      }
    } catch {}

    if (format === 'png') {
      const pngBytes = await generateCertificatePNG(cert, issueDate, verifyUrl, founderSignature, signatoryName, signatoryPosition)
      const headers = new Headers()
      headers.set('Content-Type', 'image/png')
      headers.set('Content-Disposition', `inline; filename="FIA-Certificate-${cert.certificate_number}.png"`)
      headers.set('Cache-Control', 'public, max-age=3600')
      return new NextResponse(pngBytes, { status: 200, headers })
    } else {
      const pdfBytes = await generateCertificatePDF(cert, issueDate, verifyUrl, founderSignature, signatoryName, signatoryPosition)
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
