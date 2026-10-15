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

// === Reference-inspired luxurious palette ===
// Background canvas: deep navy; inner card: ivory; gold accents; signature: royal blue ink
const NAVY_DEEP = '#0B1D3A'       // Outer background (deep royal navy)
const NAVY = '#0F2B5C'             // Primary text & ribbon fill (dark royal blue)
const NAVY_LIGHT = '#1A3A6E'
const NAVY_BLACK = '#0A1929'       // Ribbon deep navy
const GOLD = '#C5A059'            // Main metallic gold
const GOLD_DARK = '#8B6428'
const GOLD_LIGHT = '#E5C77E'      // Light gold for highlights
const GOLD_PALE = '#F5E5B3'
const CREAM = '#FDFBF7'           // Ivory inner canvas
const CREAM_DEEP = '#F5EBD5'
const EMERALD = '#10B981'
const LIGHT_GREEN = '#D1FAE5'
const GRAY_DARK = '#1F2937'
const GRAY = '#374151'
const GRAY_LIGHT = '#9CA3AF'
const GRAY_BG = '#F3F4F6'
const WHITE = '#FFFFFF'
const SIG_BLUE = '#1E40AF'       // Royal blue ink for signature (gel pen look)
const SIG_BLUE_LIGHT = '#2563EB'

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
      foregroundcolor: '0F172A',
    })
  } catch (e: any) {
    // Fallback simple barcode
    const canvas = createCanvas(200, 50)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 200, 50)
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
    type: 'png',
    width: 200,
    margin: 1,
    color: { dark: NAVY, light: WHITE },
  })
}

// ============== Helper: Draw a large gel-pen style signature (PNG canvas) ==============
// Mimics a real handwritten signature with royal blue ink and variable thickness
function drawGelPenSignature(ctx: any, startX: number, centerY: number, width: number, scale: number) {
  const ink = SIG_BLUE
  const steps = 200
  // === Main signature flourish (left-to-right with curves) ===
  // Variable stroke width to mimic pen pressure (thicker on downstrokes)
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps
    const t2 = (i + 1) / steps
    const x1 = startX + width * t1
    const x2 = startX + width * t2
    // Multi-frequency wave for natural handwriting
    const y1 = centerY
      + Math.sin(t1 * Math.PI * 5) * 14 * scale
      + Math.sin(t1 * Math.PI * 11) * 5 * scale
      + Math.cos(t1 * Math.PI * 3) * 9 * scale
    const y2 = centerY
      + Math.sin(t2 * Math.PI * 5) * 14 * scale
      + Math.sin(t2 * Math.PI * 11) * 5 * scale
      + Math.cos(t2 * Math.PI * 3) * 9 * scale
    // Pressure: thicker on "down" strokes (when y is increasing)
    const dy = y2 - y1
    const pressure = Math.abs(dy) > 0.1 ? 3.5 : 2.2
    ctx.strokeStyle = ink
    ctx.lineWidth = pressure * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // === Initial large loop (left side flourish) ===
  ctx.strokeStyle = ink
  ctx.lineWidth = 3 * scale
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(startX - 8 * scale, centerY - 12 * scale)
  ctx.bezierCurveTo(
    startX - 18 * scale, centerY - 35 * scale,
    startX + 5 * scale, centerY - 40 * scale,
    startX + 8 * scale, centerY - 15 * scale,
  )
  ctx.stroke()

  // === End flourish: large loop on the right ===
  ctx.lineWidth = 3.5 * scale
  ctx.beginPath()
  ctx.moveTo(startX + width, centerY)
  ctx.bezierCurveTo(
    startX + width + 25 * scale, centerY - 25 * scale,
    startX + width + 35 * scale, centerY + 5 * scale,
    startX + width + 12 * scale, centerY + 8 * scale,
  )
  ctx.stroke()

  // === Underscore — long horizontal sweep with variable pressure ===
  const usStartX = startX - 5 * scale
  const usEndX = startX + width + 15 * scale
  const usY = centerY + 28 * scale
  for (let i = 0; i < 100; i++) {
    const t1 = i / 100
    const t2 = (i + 1) / 100
    const x1 = usStartX + (usEndX - usStartX) * t1
    const x2 = usStartX + (usEndX - usStartX) * t2
    // Slight curve + pressure variation
    const y1 = usY + Math.sin(t1 * Math.PI * 3) * 1.5 * scale
    const y2 = usY + Math.sin(t2 * Math.PI * 3) * 1.5 * scale
    const pressure = t1 < 0.1 || t1 > 0.9 ? 1 : 2
    ctx.lineWidth = pressure * scale
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // === Two parallel small dots at start (decorative pen-flick) ===
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.arc(startX - 15 * scale, centerY - 8 * scale, 1.5 * scale, 0, Math.PI * 2)
  ctx.fill()
}

// ============== Helper: Draw gel-pen signature (PDFKit) ==============
function drawGelPenSignaturePDF(doc: any, startX: number, centerY: number, width: number) {
  const ink = SIG_BLUE
  const steps = 200
  // Main signature line — variable thickness
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps
    const t2 = (i + 1) / steps
    const x1 = startX + width * t1
    const x2 = startX + width * t2
    const y1 = centerY
      + Math.sin(t1 * Math.PI * 5) * 14
      + Math.sin(t1 * Math.PI * 11) * 5
      + Math.cos(t1 * Math.PI * 3) * 9
    const y2 = centerY
      + Math.sin(t2 * Math.PI * 5) * 14
      + Math.sin(t2 * Math.PI * 11) * 5
      + Math.cos(t2 * Math.PI * 3) * 9
    const dy = Math.abs(y2 - y1)
    const pressure = dy > 0.1 ? 3.5 : 2.2
    doc.lineWidth(pressure).strokeColor(ink)
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke()
  }
  // Initial left flourish
  doc.lineWidth(3).strokeColor(ink)
  doc.moveTo(startX - 8, centerY - 12)
  doc.bezierCurveTo(startX - 18, centerY - 35, startX + 5, centerY - 40, startX + 8, centerY - 15)
  doc.stroke()
  // End right flourish
  doc.lineWidth(3.5)
  doc.moveTo(startX + width, centerY)
  doc.bezierCurveTo(startX + width + 25, centerY - 25, startX + width + 35, centerY + 5, startX + width + 12, centerY + 8)
  doc.stroke()
  // Underscore
  const usStartX = startX - 5
  const usEndX = startX + width + 15
  const usY = centerY + 28
  for (let i = 0; i < 100; i++) {
    const t1 = i / 100
    const t2 = (i + 1) / 100
    const x1 = usStartX + (usEndX - usStartX) * t1
    const x2 = usStartX + (usEndX - usStartX) * t2
    const y1 = usY + Math.sin(t1 * Math.PI * 3) * 1.5
    const y2 = usY + Math.sin(t2 * Math.PI * 3) * 1.5
    const pressure = t1 < 0.1 || t1 > 0.9 ? 1 : 2
    doc.lineWidth(pressure).strokeColor(ink)
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke()
  }
  // Initial dot
  doc.circle(startX - 15, centerY - 8, 1.5).fill(ink)
}

// ============== Modern PNG Certificate (reference-style) ==============
async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string, founderSignature?: string | null): Promise<Buffer> {
  registerFontsForCanvas()

  const scale = 2
  // A4 landscape: 842 x 595
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

  // ===== Background: deep navy (outer canvas) =====
  fill(NAVY_DEEP)
  ctx.fillRect(0, 0, pageW, pageH)

  // Subtle radial gold gradient overlay on outer navy for richness
  const bgGrad = ctx.createRadialGradient(cx, pageH / 2, 50 * scale, cx, pageH / 2, pageW)
  bgGrad.addColorStop(0, NAVY_DEEP)
  bgGrad.addColorStop(1, NAVY_BLACK)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, pageW, pageH)

  // ===== Inner ivory card (with rounded corners) =====
  const cardPad = 30 * scale
  const cardX = cardPad
  const cardY = cardPad
  const cardW = pageW - 2 * cardPad
  const cardH = pageH - 2 * cardPad

  // Shadow under the card
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 12 * scale
  ctx.shadowOffsetY = 4 * scale
  fillRoundRect(cardX, cardY, cardW, cardH, 14 * scale, CREAM)
  ctx.restore()

  // Gold double frame: outer thick + inner thin
  strokeRoundRect(cardX, cardY, cardW, cardH, 14 * scale, GOLD, 4 * scale)
  strokeRoundRect(cardX + 8 * scale, cardY + 8 * scale, cardW - 16 * scale, cardH - 16 * scale, 10 * scale, GOLD, 1.5 * scale)
  // Even thinner inner accent line for triple-frame luxury effect
  strokeRoundRect(cardX + 14 * scale, cardY + 14 * scale, cardW - 28 * scale, cardH - 28 * scale, 8 * scale, GOLD_LIGHT, 0.5 * scale)

  // ===== Corner ornaments (Art Nouveau / Arabesque leaf-like flourishes) =====
  const cornerSize = 30 * scale
  const cornerInset = 20 * scale
  const drawCorner = (x: number, y: number, sx: number, sy: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sx, sy)
    stroke(GOLD, 2 * scale)
    // Leaf-like curve
    ctx.beginPath()
    ctx.moveTo(0, cornerSize)
    ctx.bezierCurveTo(0, cornerSize * 0.3, cornerSize * 0.3, 0, cornerSize, 0)
    ctx.stroke()
    // Inner small leaf
    stroke(GOLD_LIGHT, 1 * scale)
    ctx.beginPath()
    ctx.moveTo(cornerSize * 0.2, cornerSize * 0.8)
    ctx.bezierCurveTo(cornerSize * 0.3, cornerSize * 0.4, cornerSize * 0.5, cornerSize * 0.25, cornerSize * 0.8, cornerSize * 0.2)
    ctx.stroke()
    // Small decorative dot
    fill(GOLD)
    ctx.beginPath()
    ctx.arc(cornerSize * 0.15, cornerSize * 0.85, 2 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // Top-left
  drawCorner(cardX + cornerInset, cardY + cornerInset, 1, 1)
  // Top-right (mirrored)
  drawCorner(cardX + cardW - cornerInset, cardY + cornerInset, -1, 1)
  // Bottom-left (mirrored)
  drawCorner(cardX + cornerInset, cardY + cardH - cornerInset, 1, -1)
  // Bottom-right (mirrored)
  drawCorner(cardX + cardW - cornerInset, cardY + cardH - cornerInset, -1, -1)

  // ===== Logo (top-right interior) — official FIA logo image =====
  const logoSize = 75 * scale
  const logoX = cardX + cardW - logoSize - 25 * scale
  const logoY = cardY + 30 * scale
  const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-official.png')
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath)
    const logoImg = await loadImage(logoBuffer)
    // White rounded background for the logo
    fillRoundRect(logoX - 5 * scale, logoY - 5 * scale, logoSize + 10 * scale, logoSize + 10 * scale, 8 * scale, WHITE)
    strokeRoundRect(logoX - 5 * scale, logoY - 5 * scale, logoSize + 10 * scale, logoSize + 10 * scale, 8 * scale, GOLD, 1.5 * scale)
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
  } else {
    // Fallback: navy circle with gold FIA
    fillRoundRect(logoX, logoY, logoSize, logoSize, 10 * scale, NAVY)
    strokeRoundRect(logoX, logoY, logoSize, logoSize, 10 * scale, GOLD, 1.5 * scale)
    setFont(16, 'bold')
    fill(GOLD)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('FIA', logoX + logoSize / 2, logoY + logoSize / 2)
  }

  // ===== Title block (centered, top) =====
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // English subtitle (gold, small caps style)
  setFont(13, 'bold')
  fill(GOLD)
  ctx.fillText('CERTIFICATE OF COMPLETION', cx, cardY + 50 * scale)

  // Main Arabic academy name (large navy)
  ctx.direction = 'rtl'
  setFont(36, 'bold')
  fill(NAVY)
  ctx.fillText(cert.issued_by || 'أكاديمية المستقبل الدولية', cx, cardY + 95 * scale)

  // English academy name subtitle (gold, small)
  ctx.direction = 'ltr'
  setFont(13, 'bold')
  fill(GOLD)
  ctx.fillText('FUTURE INTERNATIONAL ACADEMY', cx, cardY + 128 * scale)

  // ===== Decorative diamond divider =====
  const dividerY = cardY + 155 * scale
  stroke(GOLD, 1.5 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 110 * scale, dividerY)
  ctx.lineTo(cx - 14 * scale, dividerY)
  ctx.moveTo(cx + 14 * scale, dividerY)
  ctx.lineTo(cx + 110 * scale, dividerY)
  ctx.stroke()
  // Center diamond
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, dividerY - 7 * scale)
  ctx.lineTo(cx + 7 * scale, dividerY)
  ctx.lineTo(cx, dividerY + 7 * scale)
  ctx.lineTo(cx - 7 * scale, dividerY)
  ctx.closePath()
  ctx.fill()
  // Two side dots
  ctx.beginPath()
  ctx.arc(cx - 18 * scale, dividerY, 2 * scale, 0, Math.PI * 2)
  ctx.arc(cx + 18 * scale, dividerY, 2 * scale, 0, Math.PI * 2)
  ctx.fill()

  // ===== Award statement (gray, bold) =====
  ctx.direction = 'rtl'
  setFont(15, 'bold')
  fill(GRAY_DARK)
  ctx.fillText('تشهد أكاديمية المستقبل الدولية بأن', cx, cardY + 185 * scale)

  // ===== Student name (LARGEST element, navy, bold) =====
  setFont(42, 'black')
  fill(NAVY)
  ctx.fillText(cert.student_name || 'طالب', cx, cardY + 235 * scale)

  // Sub-text under name
  setFont(15, 'bold')
  fill(GRAY_DARK)
  ctx.fillText('قد أتم بنجاح دراسة متطلبات دورة', cx, cardY + 275 * scale)

  // ===== Course ribbon banner (dark navy with gold border, pointed ends) =====
  const ribbonY = cardY + 305 * scale
  const ribbonH = 50 * scale
  const ribbonPadX = 30 * scale
  setFont(22, 'bold')
  const courseText = cert.course_title || 'دورة معتمدة'
  const textW = ctx.measureText(courseText).width
  const ribbonW = textW + 80 * scale + ribbonPadX * 2

  // Draw ribbon with pointed/angled ends (hexagonal/fishtail shape)
  const ribbonX = cx - ribbonW / 2
  fill(NAVY_BLACK)
  ctx.beginPath()
  // Top-left angled
  ctx.moveTo(ribbonX + 15 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW - 15 * scale, ribbonY)
  // Right point
  ctx.lineTo(ribbonX + ribbonW, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 15 * scale, ribbonY + ribbonH)
  // Bottom-left angled
  ctx.lineTo(ribbonX + 15 * scale, ribbonY + ribbonH)
  // Left point
  ctx.lineTo(ribbonX, ribbonY + ribbonH / 2)
  ctx.closePath()
  ctx.fill()
  // Gold border for ribbon
  stroke(GOLD, 2 * scale)
  ctx.beginPath()
  ctx.moveTo(ribbonX + 15 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW - 15 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 15 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX + 15 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX, ribbonY + ribbonH / 2)
  ctx.closePath()
  ctx.stroke()
  // Inner thin accent line
  stroke(GOLD_LIGHT, 0.5 * scale)
  ctx.beginPath()
  ctx.moveTo(ribbonX + 18 * scale, ribbonY + 4 * scale)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY + 4 * scale)
  ctx.lineTo(ribbonX + ribbonW - 6 * scale, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY + ribbonH - 4 * scale)
  ctx.lineTo(ribbonX + 18 * scale, ribbonY + ribbonH - 4 * scale)
  ctx.lineTo(ribbonX + 6 * scale, ribbonY + ribbonH / 2)
  ctx.closePath()
  ctx.stroke()
  // Course title inside ribbon (gold)
  fill(GOLD)
  ctx.fillText(courseText, cx, ribbonY + ribbonH / 2 + 1 * scale)

  // ===== 3 info cards row =====
  const colsY = cardY + 380 * scale
  const colsH = 60 * scale
  const colW = 180 * scale
  const colGap = 18 * scale
  const totalColsW = 3 * colW + 2 * colGap
  const colsStartX = cx - totalColsW / 2

  // Col 1: Issue Date (left)
  fillRoundRect(colsStartX, colsY, colW, colsH, 8 * scale, CREAM_DEEP)
  strokeRoundRect(colsStartX, colsY, colW, colsH, 8 * scale, GOLD, 1.2 * scale)
  ctx.direction = 'rtl'
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('تاريخ الإصدار', colsStartX + colW / 2, colsY + 18 * scale)
  setFont(14, 'bold')
  fill(NAVY)
  ctx.fillText(issueDate, colsStartX + colW / 2, colsY + 42 * scale)

  // Col 2: Issuer (center)
  const col2X = colsStartX + colW + colGap
  fillRoundRect(col2X, colsY, colW, colsH, 8 * scale, CREAM_DEEP)
  strokeRoundRect(col2X, colsY, colW, colsH, 8 * scale, GOLD, 1.2 * scale)
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('الجهة المصدرة', cx, colsY + 18 * scale)
  setFont(14, 'bold')
  fill(NAVY)
  ctx.fillText('أكاديمية المستقبل الدولية', cx, colsY + 42 * scale)

  // Col 3: Status (right)
  const col3X = colsStartX + 2 * (colW + colGap)
  fillRoundRect(col3X, colsY, colW, colsH, 8 * scale, CREAM_DEEP)
  strokeRoundRect(col3X, colsY, colW, colsH, 8 * scale, GOLD, 1.2 * scale)
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('الحالة', col3X + colW / 2, colsY + 18 * scale)
  // Green pill badge for status
  const badgeText = cert.status === 'صالحة' ? '● صالحة' : cert.status || 'صالحة'
  setFont(14, 'bold')
  const badgeW = ctx.measureText(badgeText).width + 30 * scale
  const badgeH = 26 * scale
  const badgeX = col3X + colW / 2 - badgeW / 2
  const badgeY = colsY + 30 * scale
  fillRoundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2, LIGHT_GREEN)
  strokeRoundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2, EMERALD, 1.2 * scale)
  fill(EMERALD)
  ctx.fillText(badgeText, col3X + colW / 2, badgeY + badgeH / 2 + 2 * scale)

  // ===== Bottom: QR + Barcode + Signature (3-column footer) =====
  const bottomY = cardY + cardH - 140 * scale

  // --- QR (left) ---
  const qrBuffer = await generateQR(verifyUrl)
  const qrImg = await loadImage(qrBuffer)
  const qrSize = 50 * scale
  const qrX = cardX + 35 * scale
  // White card background
  fillRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, WHITE)
  strokeRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, GOLD, 1.5 * scale)
  ctx.drawImage(qrImg, qrX, bottomY, qrSize, qrSize)
  ctx.direction = 'rtl'
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('امسح للتحقق', qrX + qrSize / 2, bottomY + qrSize + 20 * scale)

  // --- Barcode (center) ---
  const barcodeBuffer = await generateBarcode(cert.certificate_number)
  const barcodeImg = await loadImage(barcodeBuffer)
  const barcodeW = 150 * scale
  const barcodeH = 28 * scale
  const barcodeX = cx - barcodeW / 2
  const barcodeY = bottomY + 5 * scale
  // White card background for barcode
  fillRoundRect(barcodeX - 12 * scale, barcodeY - 8 * scale, barcodeW + 24 * scale, barcodeH + 50 * scale, 4 * scale, WHITE)
  strokeRoundRect(barcodeX - 12 * scale, barcodeY - 8 * scale, barcodeW + 24 * scale, barcodeH + 50 * scale, 4 * scale, GOLD, 0.8 * scale)
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeW, barcodeH)
  ctx.direction = 'ltr'
  setFont(13, 'bold')
  fill(NAVY)
  ctx.fillText(cert.certificate_number, cx, bottomY + barcodeH + 15 * scale)
  setFont(9, 'regular')
  fill(GRAY_DARK)
  ctx.fillText('CERTIFICATE ID', cx, bottomY + barcodeH + 30 * scale)

  // --- Signature block (right) — LARGE with royal blue gel-pen signature ---
  const sigBoxW = 220 * scale
  const sigBoxH = 130 * scale
  const sigBoxX = cardX + cardW - 35 * scale - sigBoxW
  const sigBoxY = bottomY - 10 * scale

  // Signature block background (cream deep with gold border)
  fillRoundRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 8 * scale, CREAM_DEEP)
  strokeRoundRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 8 * scale, GOLD, 1.5 * scale)
  // Inner accent
  strokeRoundRect(sigBoxX + 4 * scale, sigBoxY + 4 * scale, sigBoxW - 8 * scale, sigBoxH - 8 * scale, 5 * scale, GOLD_LIGHT, 0.5 * scale)

  // Top label inside signature box
  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  setFont(12, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('توقيع الجهة المانوحة', sigBoxX + sigBoxW / 2, sigBoxY + 15 * scale)

  // === LARGE GEL-PEN SIGNATURE ===
  // Founder signature image if available, otherwise the gel-pen flourish
  const sigImgAreaY = sigBoxY + 30 * scale
  if (founderSignature) {
    try {
      const sigBuffer = await fetch(founderSignature).then(r => r.arrayBuffer())
      const sigImg = await loadImage(Buffer.from(sigBuffer))
      const sigImgH = 55 * scale
      const sigImgW = 180 * scale
      ctx.drawImage(sigImg, sigBoxX + (sigBoxW - sigImgW) / 2, sigImgAreaY, sigImgW, sigImgH)
    } catch {
      drawGelPenSignature(ctx, sigBoxX + 25 * scale, sigImgAreaY + 28 * scale, sigBoxW - 50 * scale, scale)
    }
  } else {
    drawGelPenSignature(ctx, sigBoxX + 25 * scale, sigImgAreaY + 28 * scale, sigBoxW - 50 * scale, scale)
  }

  // Founder name (large, navy, bold) — clearly separated
  setFont(16, 'bold')
  fill(NAVY)
  ctx.fillText('د. هاني الشافعي', sigBoxX + sigBoxW / 2, sigBoxY + 100 * scale)
  // Founder title (gold)
  setFont(12, 'regular')
  fill(GOLD_DARK)
  ctx.fillText('المدير التنفيذي', sigBoxX + sigBoxW / 2, sigBoxY + 118 * scale)

  // ===== Watermark (very subtle — diagonal FIA on inner card) =====
  ctx.save()
  ctx.globalAlpha = 0.04
  ctx.translate(cx, pageH / 2)
  ctx.rotate(Math.PI / 4)
  setFont(140, 'black')
  fill(NAVY)
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

      // ===== Background: deep navy =====
      doc.rect(0, 0, pageW, pageH).fill(NAVY_DEEP)

      // ===== Inner ivory card =====
      const cardPad = 30
      const cardX = cardPad
      const cardY = cardPad
      const cardW = pageW - 2 * cardPad
      const cardH = pageH - 2 * cardPad

      // Card shadow (simulated)
      doc.save()
      doc.fillColor('rgba(0,0,0,0.4)')
      roundRectPath(cardX, cardY, cardW, cardH, 14)
      doc.fill()
      doc.restore()

      // Card fill
      doc.save()
      roundRectPath(cardX, cardY, cardW, cardH, 14)
      doc.fill(CREAM)
      doc.restore()

      // Gold double frame
      doc.save()
      doc.lineWidth(4).strokeColor(GOLD)
      roundRectPath(cardX, cardY, cardW, cardH, 14)
      doc.stroke()
      doc.restore()
      doc.save()
      doc.lineWidth(1.5).strokeColor(GOLD)
      roundRectPath(cardX + 8, cardY + 8, cardW - 16, cardH - 16, 10)
      doc.stroke()
      doc.restore()
      doc.save()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT)
      roundRectPath(cardX + 14, cardY + 14, cardW - 28, cardH - 28, 8)
      doc.stroke()
      doc.restore()

      // Corner ornaments (simplified — leaf-like curves)
      const cornerInset = 20
      const cornerSize = 30
      const drawCornerPDF = (x: number, y: number, mx: number, my: number) => {
        doc.save()
        doc.translate(x, y)
        doc.scale(mx, my)
        doc.lineWidth(2).strokeColor(GOLD)
        doc.moveTo(0, cornerSize)
        doc.bezierCurveTo(0, cornerSize * 0.3, cornerSize * 0.3, 0, cornerSize, 0)
        doc.stroke()
        // Small decorative dot
        doc.circle(cornerSize * 0.15, cornerSize * 0.85, 2).fill(GOLD)
        doc.restore()
      }
      drawCornerPDF(cardX + cornerInset, cardY + cornerInset, 1, 1)
      drawCornerPDF(cardX + cardW - cornerInset, cardY + cornerInset, -1, 1)
      drawCornerPDF(cardX + cornerInset, cardY + cardH - cornerInset, 1, -1)
      drawCornerPDF(cardX + cardW - cornerInset, cardY + cardH - cornerInset, -1, -1)

      // ===== Logo (top-right) =====
      const logoSize = 75
      const logoX = cardX + cardW - logoSize - 25
      const logoY = cardY + 30
      const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-official.png')
      if (fs.existsSync(logoPath)) {
        doc.save()
        roundRectPath(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10, 8)
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

      // ===== Title block =====
      setFont(13, 'bold')
      doc.fillColor(GOLD).text('CERTIFICATE OF COMPLETION', cx - 350, cardY + 42, { width: 700, align: 'center' })

      setFont(36, 'bold')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 350, cardY + 75, { width: 700, align: 'center' })

      setFont(13, 'bold')
      doc.fillColor(GOLD).text('FUTURE INTERNATIONAL ACADEMY', cx - 350, cardY + 118, { width: 700, align: 'center' })

      // Divider with center diamond
      const dividerY = cardY + 155
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx - 110, dividerY).lineTo(cx - 14, dividerY).stroke()
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx + 14, dividerY).lineTo(cx + 110, dividerY).stroke()
      doc.polygon([cx, dividerY - 7], [cx + 7, dividerY], [cx, dividerY + 7], [cx - 7, dividerY]).fill(GOLD)

      // Award statement
      setFont(15, 'bold')
      doc.fillColor(GRAY_DARK).text('تشهد أكاديمية المستقبل الدولية بأن', cx - 350, cardY + 178, { width: 700, align: 'center' })

      // Student name (LARGEST)
      setFont(42, 'black')
      doc.fillColor(NAVY).text(cert.student_name || 'طالب', cx - 350, cardY + 215, { width: 700, align: 'center' })

      setFont(15, 'bold')
      doc.fillColor(GRAY_DARK).text('قد أتم بنجاح دراسة متطلبات دورة', cx - 350, cardY + 270, { width: 700, align: 'center' })

      // ===== Course ribbon banner (navy with gold border, pointed ends) =====
      const ribbonY = cardY + 305
      const ribbonH = 50
      setFont(22, 'bold')
      const courseText = cert.course_title || 'دورة معتمدة'
      const textW = doc.widthOfString(courseText)
      const ribbonW = textW + 80 + 60

      const ribbonX = cx - ribbonW / 2
      // Ribbon fill
      doc.save()
      doc.fillColor(NAVY_BLACK)
      doc.path(`M ${ribbonX + 15},${ribbonY} L ${ribbonX + ribbonW - 15},${ribbonY} L ${ribbonX + ribbonW},${ribbonY + ribbonH / 2} L ${ribbonX + ribbonW - 15},${ribbonY + ribbonH} L ${ribbonX + 15},${ribbonY + ribbonH} L ${ribbonX},${ribbonY + ribbonH / 2} Z`)
      doc.fill()
      doc.restore()
      // Ribbon gold border
      doc.save()
      doc.lineWidth(2).strokeColor(GOLD)
      doc.path(`M ${ribbonX + 15},${ribbonY} L ${ribbonX + ribbonW - 15},${ribbonY} L ${ribbonX + ribbonW},${ribbonY + ribbonH / 2} L ${ribbonX + ribbonW - 15},${ribbonY + ribbonH} L ${ribbonX + 15},${ribbonY + ribbonH} L ${ribbonX},${ribbonY + ribbonH / 2} Z`)
      doc.stroke()
      doc.restore()
      // Course text inside ribbon
      doc.fillColor(GOLD).text(courseText, ribbonX, ribbonY + 16, { width: ribbonW, align: 'center' })

      // ===== 3 info cards row =====
      const colsY = cardY + 380
      const colsH = 60
      const colW = 180
      const colGap = 18
      const totalColsW = 3 * colW + 2 * colGap
      const colsStartX = cx - totalColsW / 2

      // Col 1: Issue Date (left)
      doc.save()
      roundRectPath(colsStartX, colsY, colW, colsH, 8)
      doc.fill(CREAM_DEEP)
      doc.lineWidth(1.2).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('تاريخ الإصدار', colsStartX, colsY + 12, { width: colW, align: 'center' })
      setFont(14, 'bold')
      doc.fillColor(NAVY).text(issueDate, colsStartX, colsY + 34, { width: colW, align: 'center' })

      // Col 2: Issuer (center)
      const col2X = colsStartX + colW + colGap
      doc.save()
      roundRectPath(col2X, colsY, colW, colsH, 8)
      doc.fill(CREAM_DEEP)
      doc.lineWidth(1.2).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('الجهة المصدرة', col2X, colsY + 12, { width: colW, align: 'center' })
      setFont(14, 'bold')
      doc.fillColor(NAVY).text('أكاديمية المستقبل الدولية', col2X, colsY + 34, { width: colW, align: 'center' })

      // Col 3: Status (right)
      const col3X = colsStartX + 2 * (colW + colGap)
      doc.save()
      roundRectPath(col3X, colsY, colW, colsH, 8)
      doc.fill(CREAM_DEEP)
      doc.lineWidth(1.2).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('الحالة', col3X, colsY + 12, { width: colW, align: 'center' })
      const badgeText = cert.status === 'صالحة' ? '● صالحة' : cert.status || 'صالحة'
      setFont(14, 'bold')
      const badgeW = doc.widthOfString(badgeText) + 30
      const badgeH = 26
      const badgeX = col3X + colW / 2 - badgeW / 2
      const badgeY = colsY + 30
      doc.save()
      roundRectPath(badgeX, badgeY, badgeW, badgeH, badgeH / 2)
      doc.fill(LIGHT_GREEN)
      doc.lineWidth(1.2).strokeColor(EMERALD)
      doc.stroke()
      doc.restore()
      doc.fillColor(EMERALD).text(badgeText, col3X, badgeY + 6, { width: colW, align: 'center' })

      // ===== Bottom: QR + Barcode + Signature =====
      const bottomY = cardY + cardH - 140

      // QR (left)
      const qrBuffer = await generateQR(verifyUrl)
      const qrSize = 50
      const qrX = cardX + 35
      doc.save()
      roundRectPath(qrX - 6, bottomY - 6, qrSize + 12, qrSize + 12, 6)
      doc.fill(WHITE)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(qrBuffer, qrX, bottomY, { width: qrSize, height: qrSize })
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('امسح للتحقق', qrX, bottomY + qrSize + 4, { width: qrSize, align: 'center' })

      // Barcode (center)
      const barcodeBuffer = await generateBarcode(cert.certificate_number)
      const barcodeW = 150
      const barcodeH = 28
      const barcodeX = cx - barcodeW / 2
      const barcodeY = bottomY + 5
      // White card
      doc.save()
      roundRectPath(barcodeX - 12, barcodeY - 8, barcodeW + 24, barcodeH + 50, 4)
      doc.fill(WHITE)
      doc.lineWidth(0.8).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeW, height: barcodeH })
      setFont(13, 'bold')
      doc.fillColor(NAVY).text(cert.certificate_number, cx - 100, barcodeY + barcodeH + 2, { width: 200, align: 'center' })
      setFont(9, 'regular')
      doc.fillColor(GRAY_DARK).text('CERTIFICATE ID', cx - 100, barcodeY + barcodeH + 18, { width: 200, align: 'center' })

      // ===== Signature block (right) =====
      const sigBoxW = 220
      const sigBoxH = 130
      const sigBoxX = cardX + cardW - 35 - sigBoxW
      const sigBoxY = bottomY - 10

      // Background
      doc.save()
      roundRectPath(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 8)
      doc.fill(CREAM_DEEP)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      // Inner accent
      doc.save()
      roundRectPath(sigBoxX + 4, sigBoxY + 4, sigBoxW - 8, sigBoxH - 8, 5)
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT)
      doc.stroke()
      doc.restore()

      // Top label
      setFont(12, 'bold')
      doc.fillColor(GOLD_DARK).text('توقيع الجهة المانوحة', sigBoxX, sigBoxY + 8, { width: sigBoxW, align: 'center' })

      // === LARGE GEL-PEN SIGNATURE ===
      const sigImgAreaY = sigBoxY + 30
      if (founderSignature) {
        try {
          const sigRes = await fetch(founderSignature)
          const sigBuf = await sigRes.arrayBuffer()
          const sigPath = path.join(os.tmpdir(), `sig-${Date.now()}.png`)
          fs.writeFileSync(sigPath, Buffer.from(sigBuf))
          if (fs.existsSync(sigPath)) {
            doc.image(sigPath, sigBoxX + 20, sigImgAreaY, { width: 180, height: 55 })
            fs.unlinkSync(sigPath)
          }
        } catch {
          drawGelPenSignaturePDF(doc, sigBoxX + 25, sigImgAreaY + 28, sigBoxW - 50)
        }
      } else {
        drawGelPenSignaturePDF(doc, sigBoxX + 25, sigImgAreaY + 28, sigBoxW - 50)
      }

      // Founder name (large, navy)
      setFont(16, 'bold')
      doc.fillColor(NAVY).text('د. هاني الشافعي', sigBoxX, sigBoxY + 95, { width: sigBoxW, align: 'center' })
      // Founder title
      setFont(12, 'regular')
      doc.fillColor(GOLD_DARK).text('المدير التنفيذي', sigBoxX, sigBoxY + 113, { width: sigBoxW, align: 'center' })

      // Watermark
      doc.save()
      doc.fillOpacity(0.04)
      doc.translate(cx, pageH / 2)
      doc.rotate(45)
      setFont(140, 'black')
      doc.fillColor(NAVY).text('FIA', -100, -50, { width: 200, align: 'center' })
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
