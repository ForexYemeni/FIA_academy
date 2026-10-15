import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'
import os from 'os'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import bwip from 'bwip-js'
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { Buffer } from 'buffer'

// Force Node.js runtime
export const runtime = 'nodejs'
export const maxDuration = 60

// Brand colors — modern luxurious palette matching reference image
// Enhanced contrast for maximum clarity & visual prominence
const NAVY = '#0B1224'           // Darker navy for stronger text
const NAVY_LIGHT = '#1A1F36'
const NAVY_DARK = '#050912'      // Even darker for accent text
const GOLD = '#B58A3E'           // Deeper gold for better contrast on cream
const GOLD_DARK = '#8B6428'      // Darker gold for accent text
const GOLD_LIGHT = '#E5C158'
const GOLD_PALE = '#F5E5B3'
const CREAM = '#FCF9F0'           // Warmer cream with more presence
const CREAM_DEEP = '#F5EBD5'     // Deeper cream for highlights
const SAGE_GREEN = '#D4E8DC'     // Soft sage
const EMERALD_GREEN = '#0F9D58'  // Deeper green for stronger badge
const LIGHT_GREEN = '#D1FAE5'
const GRAY = '#374151'           // Darker gray for better readability
const GRAY_DARK = '#1F2937'      // Very dark gray for sub-text
const GRAY_LIGHT = '#9CA3AF'
const GRAY_BG = '#F3F4F6'
const WHITE = '#FFFFFF'
const BLACK = '#000000'

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
    return await bwip.toBuffer({
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

// ============== Modern PNG Certificate (matching reference image) ==============
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
    fill(c)
    roundRect(x, y, w, h, r)
    ctx.fill()
  }
  const strokeRoundRect = (x: number, y: number, w: number, h: number, r: number, c: string, lw: number) => {
    stroke(c, lw)
    roundRect(x, y, w, h, r)
    ctx.stroke()
  }
  const setFont = (size: number, weight: 'regular' | 'bold' | 'black' = 'regular') => {
    const family = weight === 'black' ? 'Cairo-Black' : weight === 'bold' ? 'Cairo-Bold' : 'Cairo'
    ctx.font = `${size * scale}px ${family}`
  }

  const cx = pageW / 2

  // ===== Background: cream =====
  fill(CREAM)
  ctx.fillRect(0, 0, pageW, pageH)

  // Add subtle cream gradient overlays for richness
  const bgGrad = ctx.createRadialGradient(cx, pageH / 2, 100 * scale, cx, pageH / 2, pageW)
  bgGrad.addColorStop(0, CREAM)
  bgGrad.addColorStop(1, CREAM_DEEP)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, pageW, pageH)

  // Outer sage green border (container) — thicker for stronger frame
  strokeRoundRect(15 * scale, 15 * scale, pageW - 30 * scale, pageH - 30 * scale, 14 * scale, SAGE_GREEN, 3 * scale)

  // ===== Inner certificate frame: cream with thick gold border =====
  const innerPad = 30 * scale
  const innerX = innerPad
  const innerY = innerPad
  const innerW = pageW - 2 * innerPad
  const innerH = pageH - 2 * innerPad

  // Fill cream for inner card
  fillRoundRect(innerX, innerY, innerW, innerH, 12 * scale, CREAM)

  // Gold border (thicker outer line — very prominent)
  strokeRoundRect(innerX, innerY, innerW, innerH, 12 * scale, GOLD, 5 * scale)
  // Gold border (thin inner line)
  strokeRoundRect(innerX + 7 * scale, innerY + 7 * scale, innerW - 14 * scale, innerH - 14 * scale, 10 * scale, GOLD, 1.2 * scale)
  // Even thinner gold inner accent line for triple-frame luxury effect
  strokeRoundRect(innerX + 11 * scale, innerY + 11 * scale, innerW - 22 * scale, innerH - 22 * scale, 8 * scale, GOLD_LIGHT, 0.5 * scale)

  // ===== Corner ornaments (L-shaped) =====
  const cornerLen = 18 * scale
  const cornerInset = 14 * scale
  // Top-left
  stroke(GOLD, 1.5 * scale)
  ctx.beginPath()
  ctx.moveTo(innerX + cornerInset, innerY + cornerInset + cornerLen)
  ctx.lineTo(innerX + cornerInset, innerY + cornerInset)
  ctx.lineTo(innerX + cornerInset + cornerLen, innerY + cornerInset)
  ctx.stroke()
  // Top-right
  ctx.beginPath()
  ctx.moveTo(innerX + innerW - cornerInset - cornerLen, innerY + cornerInset)
  ctx.lineTo(innerX + innerW - cornerInset, innerY + cornerInset)
  ctx.lineTo(innerX + innerW - cornerInset, innerY + cornerInset + cornerLen)
  ctx.stroke()
  // Bottom-left
  ctx.beginPath()
  ctx.moveTo(innerX + cornerInset, innerY + innerH - cornerInset - cornerLen)
  ctx.lineTo(innerX + cornerInset, innerY + innerH - cornerInset)
  ctx.lineTo(innerX + cornerInset + cornerLen, innerY + innerH - cornerInset)
  ctx.stroke()
  // Bottom-right
  ctx.beginPath()
  ctx.moveTo(innerX + innerW - cornerInset - cornerLen, innerY + innerH - cornerInset)
  ctx.lineTo(innerX + innerW - cornerInset, innerY + innerH - cornerInset)
  ctx.lineTo(innerX + innerW - cornerInset, innerY + innerH - cornerInset - cornerLen)
  ctx.stroke()

  // ===== Logo (top-right interior) — official FIA logo image =====
  const logoSize = 70 * scale
  const logoX = innerX + innerW - logoSize - 22 * scale
  const logoY = innerY + 22 * scale
  // Load the official logo
  const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-official.png')
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath)
    const logoImg = await loadImage(logoBuffer)
    // White rounded background for the logo
    fillRoundRect(logoX - 4 * scale, logoY - 4 * scale, logoSize + 8 * scale, logoSize + 8 * scale, 8 * scale, WHITE)
    strokeRoundRect(logoX - 4 * scale, logoY - 4 * scale, logoSize + 8 * scale, logoSize + 8 * scale, 8 * scale, GOLD, 1 * scale)
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

  // ===== Title: CERTIFICATE OF COMPLETION (gold, small, all caps) =====
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  setFont(13, 'bold')
  fill(GOLD_DARK)
  // Letter-spacing approximation
  const titleText = 'CERTIFICATE OF COMPLETION'
  const titleY = innerY + 50 * scale
  ctx.fillText(titleText, cx, titleY)

  // ===== Academy name Arabic (large, navy) =====
  ctx.direction = 'rtl'
  setFont(34, 'bold')
  fill(NAVY_DARK)
  ctx.fillText(cert.issued_by || 'أكاديمية المستقبل الدولية', cx, innerY + 90 * scale)

  // English subtitle (small, gray)
  ctx.direction = 'ltr'
  setFont(12, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('FUTURE INTERNATIONAL ACADEMY', cx, innerY + 120 * scale)

  // ===== Divider with center diamond =====
  const dividerY = innerY + 142 * scale
  stroke(GOLD, 1.5 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 100 * scale, dividerY)
  ctx.lineTo(cx - 10 * scale, dividerY)
  ctx.moveTo(cx + 10 * scale, dividerY)
  ctx.lineTo(cx + 100 * scale, dividerY)
  ctx.stroke()
  // Center diamond — gold with darker outline
  fill(GOLD_DARK)
  ctx.beginPath()
  ctx.moveTo(cx, dividerY - 6 * scale)
  ctx.lineTo(cx + 6 * scale, dividerY)
  ctx.lineTo(cx, dividerY + 6 * scale)
  ctx.lineTo(cx - 6 * scale, dividerY)
  ctx.closePath()
  ctx.fill()
  // Small dots on either side of diamond
  fill(GOLD_DARK)
  ctx.beginPath()
  ctx.arc(cx - 14 * scale, dividerY, 1.5 * scale, 0, Math.PI * 2)
  ctx.arc(cx + 14 * scale, dividerY, 1.5 * scale, 0, Math.PI * 2)
  ctx.fill()

  // ===== Award statement (gray) =====
  ctx.direction = 'rtl'
  setFont(14, 'bold')
  fill(GRAY_DARK)
  ctx.fillText('تشهد أكاديمية المستقبل الدولية بأن', cx, innerY + 168 * scale)

  // ===== Student name (LARGE, navy, most prominent) =====
  setFont(40, 'black')
  fill(NAVY_DARK)
  ctx.fillText(cert.student_name || 'طالب', cx, innerY + 215 * scale)

  // Course completion statement (small gray)
  setFont(14, 'bold')
  fill(GRAY_DARK)
  ctx.fillText('قد أتم بنجاح متطلبات دورة', cx, innerY + 252 * scale)

  // Course title (gold, bold, prominent)
  setFont(22, 'bold')
  fill(GOLD_DARK)
  ctx.fillText(cert.course_title || 'دورة معتمدة', cx, innerY + 284 * scale)

  // ===== Accreditation pill banner (gold pale) =====
  const pillY = innerY + 314 * scale
  const pillH = 32 * scale
  const pillText = 'معتمدة من: أكاديمية المستقبل الدولية'
  setFont(13, 'bold')
  const pillW = ctx.measureText(pillText).width + 80 * scale
  const pillX = cx - pillW / 2
  // Outer pill (gold)
  fillRoundRect(pillX, pillY, pillW, pillH, pillH / 2, GOLD_PALE)
  strokeRoundRect(pillX, pillY, pillW, pillH, pillH / 2, GOLD_DARK, 1.5 * scale)
  fill(NAVY_DARK)
  ctx.fillText('★  ' + pillText, cx, pillY + pillH / 2)

  // ===== 3 metadata columns at bottom =====
  const colsY = innerY + 360 * scale
  const colsH = 64 * scale
  const colW = 200 * scale
  const colGap = 20 * scale
  const totalColsW = 3 * colW + 2 * colGap
  const colsStartX = cx - totalColsW / 2

  // Column 1: Issue Date (left)
  fillRoundRect(colsStartX, colsY, colW, colsH, 8 * scale, GRAY_BG)
  strokeRoundRect(colsStartX, colsY, colW, colsH, 8 * scale, GOLD, 0.8 * scale)
  ctx.direction = 'rtl'
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.textAlign = 'center'
  ctx.fillText('تاريخ الإصدار', colsStartX + colW / 2, colsY + 18 * scale)
  setFont(15, 'bold')
  fill(NAVY_DARK)
  ctx.fillText(issueDate, colsStartX + colW / 2, colsY + 42 * scale)

  // Column 2: Issuer (center)
  fillRoundRect(colsStartX + colW + colGap, colsY, colW, colsH, 8 * scale, GRAY_BG)
  strokeRoundRect(colsStartX + colW + colGap, colsY, colW, colsH, 8 * scale, GOLD, 0.8 * scale)
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('الجهة المصدرة', cx, colsY + 18 * scale)
  setFont(15, 'bold')
  fill(NAVY_DARK)
  ctx.fillText('أكاديمية المستقبل الدولية', cx, colsY + 42 * scale)

  // Column 3: Status (right, with green badge)
  const col3X = colsStartX + 2 * (colW + colGap)
  fillRoundRect(col3X, colsY, colW, colsH, 8 * scale, GRAY_BG)
  strokeRoundRect(col3X, colsY, colW, colsH, 8 * scale, GOLD, 0.8 * scale)
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.fillText('الحالة', col3X + colW / 2, colsY + 18 * scale)
  // Green pill badge for status
  const badgeText = cert.status === 'صالحة' ? '● صالحة' : cert.status || 'صالحة'
  setFont(15, 'bold')
  const badgeW = ctx.measureText(badgeText).width + 30 * scale
  const badgeH = 26 * scale
  const badgeX = col3X + colW / 2 - badgeW / 2
  const badgeY = colsY + 32 * scale
  fillRoundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2, LIGHT_GREEN)
  strokeRoundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2, EMERALD_GREEN, 1.2 * scale)
  fill(EMERALD_GREEN)
  ctx.fillText(badgeText, col3X + colW / 2, badgeY + badgeH / 2 + 2 * scale)

  // ===== Bottom: QR + Cert number + signature =====
  const bottomY = innerY + innerH - 90 * scale

  // QR (left)
  const qrBuffer = await generateQR(verifyUrl)
  const qrImg = await loadImage(qrBuffer)
  const qrSize = 50 * scale
  const qrX = innerX + 30 * scale
  fillRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, WHITE)
  strokeRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, GOLD, 1.5 * scale)
  ctx.drawImage(qrImg, qrX, bottomY, qrSize, qrSize)
  ctx.direction = 'rtl'
  setFont(11, 'bold')
  fill(GOLD_DARK)
  ctx.textAlign = 'center'
  ctx.fillText('امسح للتحقق', qrX + qrSize / 2, bottomY + qrSize + 18 * scale)

  // Cert number (center) with real Code-128 barcode
  const barcodeBuffer = await generateBarcode(cert.certificate_number)
  const barcodeImg = await loadImage(barcodeBuffer)
  const barcodeW = 160 * scale
  const barcodeH = 30 * scale
  const barcodeX = cx - barcodeW / 2
  const barcodeY = bottomY + 4 * scale
  // Background card for barcode
  fillRoundRect(barcodeX - 12 * scale, barcodeY - 8 * scale, barcodeW + 24 * scale, barcodeH + 36 * scale, 4 * scale, WHITE)
  strokeRoundRect(barcodeX - 12 * scale, barcodeY - 8 * scale, barcodeW + 24 * scale, barcodeH + 36 * scale, 4 * scale, GOLD, 0.8 * scale)
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeW, barcodeH)
  ctx.direction = 'ltr'
  setFont(12, 'bold')
  fill(NAVY_DARK)
  ctx.fillText(cert.certificate_number, cx, bottomY + barcodeH + 14 * scale)
  setFont(9, 'regular')
  fill(GRAY_DARK)
  ctx.fillText('CERTIFICATE ID', cx, bottomY + barcodeH + 26 * scale)

  // Signature (right) — enhanced signature block with founder name + title
  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Signature block: larger area + better placement
  const sigBoxW = 160 * scale
  const sigBoxH = 70 * scale
  const sigBoxX = innerX + innerW - 30 * scale - sigBoxW
  const sigBoxY = bottomY - 5 * scale

  // Subtle gold background pill for signature area (luxury feel)
  fillRoundRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 6 * scale, GOLD_PALE)
  strokeRoundRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 6 * scale, GOLD, 0.6 * scale)

  // Label: "توقيع الجهة المانوحة" — small gold-brown label
  setFont(9, 'bold')
  fill(GOLD)
  ctx.fillText('توقيع الجهة المانوحة', sigBoxX + sigBoxW / 2, sigBoxY + 12 * scale)

  // Draw signature image if available, otherwise draw a cursive-style signature placeholder
  if (founderSignature) {
    try {
      const sigBuffer = await fetch(founderSignature).then(r => r.arrayBuffer())
      const sigImg = await loadImage(Buffer.from(sigBuffer))
      const sigImgH = 28 * scale
      const sigImgW = 110 * scale
      ctx.drawImage(sigImg, sigBoxX + (sigBoxW - sigImgW) / 2, sigBoxY + 20 * scale, sigImgW, sigImgH)
    } catch {
      // Fallback line
      stroke(NAVY, 1 * scale)
      ctx.beginPath()
      ctx.moveTo(sigBoxX + 20 * scale, sigBoxY + 36 * scale)
      ctx.lineTo(sigBoxX + sigBoxW - 20 * scale, sigBoxY + 36 * scale)
      ctx.stroke()
    }
  } else {
    // Cursive-style signature placeholder — script-like strokes
    stroke(NAVY, 1.4 * scale)
    ctx.beginPath()
    ctx.moveTo(sigBoxX + 20 * scale, sigBoxY + 38 * scale)
    // Wavy script line to suggest a signature
    const sw = sigBoxW - 40 * scale
    for (let i = 0; i <= sw; i += 2) {
      const y = sigBoxY + 38 * scale + Math.sin(i / 12) * 3 * scale
      ctx.lineTo(sigBoxX + 20 * scale + i, y)
    }
    ctx.stroke()
    // Underscore baseline
    stroke(NAVY, 0.8 * scale)
    ctx.beginPath()
    ctx.moveTo(sigBoxX + 20 * scale, sigBoxY + 44 * scale)
    ctx.lineTo(sigBoxX + sigBoxW - 20 * scale, sigBoxY + 44 * scale)
    ctx.stroke()
  }

  // Founder name (bold navy) — "د. هاني الشافعي"
  setFont(13, 'bold')
  fill(NAVY)
  ctx.fillText('د. هاني الشافعي', sigBoxX + sigBoxW / 2, sigBoxY + 52 * scale)

  // Founder title (small gold) — "المدير التنفيذي"
  setFont(9, 'regular')
  fill(GOLD)
  ctx.fillText('المدير التنفيذي', sigBoxX + sigBoxW / 2, sigBoxY + 62 * scale)

  // ===== Watermark (very subtle — barely visible to not interfere with text) =====
  ctx.save()
  ctx.globalAlpha = 0.02
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
        // pdfkit rounded path
        doc.path(`M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`)
      }

      // ===== Background: cream =====
      doc.rect(0, 0, pageW, pageH).fill(CREAM)

      // Outer sage green border (container) — thicker for stronger frame
      doc.save()
      doc.lineWidth(3).strokeColor(SAGE_GREEN)
      roundRectPath(15, 15, pageW - 30, pageH - 30, 14)
      doc.stroke()
      doc.restore()

      // ===== Inner certificate frame =====
      const innerPad = 30
      const innerX = innerPad
      const innerY = innerPad
      const innerW = pageW - 2 * innerPad
      const innerH = pageH - 2 * innerPad

      // Fill cream for inner card
      doc.save()
      roundRectPath(innerX, innerY, innerW, innerH, 12)
      doc.fill(CREAM)
      doc.restore()

      // Gold border (thicker outer line — very prominent)
      doc.save()
      doc.lineWidth(5).strokeColor(GOLD)
      roundRectPath(innerX, innerY, innerW, innerH, 12)
      doc.stroke()
      doc.restore()
      // Gold border (thin inner line)
      doc.save()
      doc.lineWidth(1.2).strokeColor(GOLD)
      roundRectPath(innerX + 7, innerY + 7, innerW - 14, innerH - 14, 10)
      doc.stroke()
      doc.restore()
      // Triple-frame thin inner accent
      doc.save()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT)
      roundRectPath(innerX + 11, innerY + 11, innerW - 22, innerH - 22, 8)
      doc.stroke()
      doc.restore()

      // Corner ornaments (L-shaped)
      const cornerLen = 18
      const cornerInset = 14
      doc.lineWidth(1.8).strokeColor(GOLD_DARK)
      // Top-left
      doc.moveTo(innerX + cornerInset, innerY + cornerInset + cornerLen).lineTo(innerX + cornerInset, innerY + cornerInset).lineTo(innerX + cornerInset + cornerLen, innerY + cornerInset).stroke()
      // Top-right
      doc.moveTo(innerX + innerW - cornerInset - cornerLen, innerY + cornerInset).lineTo(innerX + innerW - cornerInset, innerY + cornerInset).lineTo(innerX + innerW - cornerInset, innerY + cornerInset + cornerLen).stroke()
      // Bottom-left
      doc.moveTo(innerX + cornerInset, innerY + innerH - cornerInset - cornerLen).lineTo(innerX + cornerInset, innerY + innerH - cornerInset).lineTo(innerX + cornerInset + cornerLen, innerY + innerH - cornerInset).stroke()
      // Bottom-right
      doc.moveTo(innerX + innerW - cornerInset - cornerLen, innerY + innerH - cornerInset).lineTo(innerX + innerW - cornerInset, innerY + innerH - cornerInset).lineTo(innerX + innerW - cornerInset, innerY + innerH - cornerInset - cornerLen).stroke()

      // ===== Logo (top-right interior) — official FIA logo image =====
      const logoSize = 70
      const logoX = innerX + innerW - logoSize - 22
      const logoY = innerY + 22
      const logoPath = path.join(process.cwd(), 'public', 'fia', 'logo-official.png')
      if (fs.existsSync(logoPath)) {
        // White rounded background for the logo
        doc.save()
        roundRectPath(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8, 8)
        doc.fill(WHITE)
        doc.lineWidth(1).strokeColor(GOLD)
        doc.stroke()
        doc.restore()
        doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize })
      } else {
        // Fallback: navy square with gold FIA
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

      // ===== Title: CERTIFICATE OF COMPLETION (gold) =====
      setFont(13, 'bold')
      doc.fillColor(GOLD_DARK).text('CERTIFICATE OF COMPLETION', cx - 350, innerY + 42, { width: 700, align: 'center' })

      // Academy name Arabic (large, navy)
      setFont(34, 'bold')
      doc.fillColor(NAVY_DARK).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 350, innerY + 75, { width: 700, align: 'center' })

      // English subtitle
      setFont(12, 'bold')
      doc.fillColor(GOLD_DARK).text('FUTURE INTERNATIONAL ACADEMY', cx - 350, innerY + 112, { width: 700, align: 'center' })

      // Divider with center diamond
      const dividerY = innerY + 142
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx - 100, dividerY).lineTo(cx - 10, dividerY).stroke()
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx + 10, dividerY).lineTo(cx + 100, dividerY).stroke()
      doc.polygon([cx, dividerY - 6], [cx + 6, dividerY], [cx, dividerY + 6], [cx - 6, dividerY]).fill(GOLD_DARK)

      // Award statement
      setFont(14, 'bold')
      doc.fillColor(GRAY_DARK).text('تشهد أكاديمية المستقبل الدولية بأن', cx - 350, innerY + 160, { width: 700, align: 'center' })

      // Student name (LARGE, navy)
      setFont(40, 'black')
      doc.fillColor(NAVY_DARK).text(cert.student_name || 'طالب', cx - 350, innerY + 195, { width: 700, align: 'center' })

      // Course completion statement
      setFont(14, 'bold')
      doc.fillColor(GRAY_DARK).text('قد أتم بنجاح متطلبات دورة', cx - 350, innerY + 248, { width: 700, align: 'center' })

      // Course title (gold, bold)
      setFont(22, 'bold')
      doc.fillColor(GOLD_DARK).text(cert.course_title || 'دورة معتمدة', cx - 350, innerY + 278, { width: 700, align: 'center' })

      // Accreditation pill banner
      const pillY = innerY + 314
      const pillH = 32
      setFont(13, 'bold')
      const pillText = '★  معتمدة من: أكاديمية المستقبل الدولية'
      const pillW = doc.widthOfString(pillText) + 80
      const pillX = cx - pillW / 2
      doc.save()
      roundRectPath(pillX, pillY, pillW, pillH, pillH / 2)
      doc.fill(GOLD_PALE)
      doc.lineWidth(1.5).strokeColor(GOLD_DARK)
      doc.stroke()
      doc.restore()
      doc.fillColor(NAVY_DARK).text(pillText, pillX, pillY + 8, { width: pillW, align: 'center' })

      // ===== 3 metadata columns at bottom =====
      const colsY = innerY + 360
      const colsH = 64
      const colW = 200
      const colGap = 20
      const totalColsW = 3 * colW + 2 * colGap
      const colsStartX = cx - totalColsW / 2

      // Col 1: Issue Date (left)
      doc.save()
      roundRectPath(colsStartX, colsY, colW, colsH, 8)
      doc.fill(GRAY_BG)
      doc.lineWidth(0.8).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('تاريخ الإصدار', colsStartX, colsY + 10, { width: colW, align: 'center' })
      setFont(15, 'bold')
      doc.fillColor(NAVY_DARK).text(issueDate, colsStartX, colsY + 32, { width: colW, align: 'center' })

      // Col 2: Issuer (center)
      const col2X = colsStartX + colW + colGap
      doc.save()
      roundRectPath(col2X, colsY, colW, colsH, 8)
      doc.fill(GRAY_BG)
      doc.lineWidth(0.8).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('الجهة المصدرة', col2X, colsY + 10, { width: colW, align: 'center' })
      setFont(15, 'bold')
      doc.fillColor(NAVY_DARK).text('أكاديمية المستقبل الدولية', col2X, colsY + 32, { width: colW, align: 'center' })

      // Col 3: Status (right)
      const col3X = colsStartX + 2 * (colW + colGap)
      doc.save()
      roundRectPath(col3X, colsY, colW, colsH, 8)
      doc.fill(GRAY_BG)
      doc.lineWidth(0.8).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('الحالة', col3X, colsY + 10, { width: colW, align: 'center' })
      // Green pill badge for status
      const badgeText = cert.status === 'صالحة' ? '● صالحة' : cert.status || 'صالحة'
      setFont(15, 'bold')
      const badgeW = doc.widthOfString(badgeText) + 30
      const badgeH = 26
      const badgeX = col3X + colW / 2 - badgeW / 2
      const badgeY = colsY + 32
      doc.save()
      roundRectPath(badgeX, badgeY, badgeW, badgeH, badgeH / 2)
      doc.fill(LIGHT_GREEN)
      doc.lineWidth(1.2).strokeColor(EMERALD_GREEN)
      doc.stroke()
      doc.restore()
      doc.fillColor(EMERALD_GREEN).text(badgeText, col3X, badgeY + 5, { width: colW, align: 'center' })

      // ===== Bottom: QR + Cert number + signature =====
      const bottomY = innerY + innerH - 90

      // QR (left)
      const qrBuffer = await generateQR(verifyUrl)
      const qrSize = 50
      const qrX = innerX + 30
      doc.save()
      roundRectPath(qrX - 6, bottomY - 6, qrSize + 12, qrSize + 12, 6)
      doc.fill(WHITE)
      doc.lineWidth(1.5).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(qrBuffer, qrX, bottomY, { width: qrSize, height: qrSize })
      setFont(11, 'bold')
      doc.fillColor(GOLD_DARK).text('امسح للتحقق', qrX, bottomY + qrSize + 4, { width: qrSize, align: 'center' })

      // Cert number (center) with real Code-128 barcode
      const barcodeBuffer = await generateBarcode(cert.certificate_number)
      const barcodeW = 160
      const barcodeH = 30
      const barcodeX = cx - barcodeW / 2
      const barcodeY = bottomY + 4
      // White background card for barcode
      doc.save()
      roundRectPath(barcodeX - 12, barcodeY - 8, barcodeW + 24, barcodeH + 36, 4)
      doc.fill(WHITE)
      doc.lineWidth(0.8).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeW, height: barcodeH })
      setFont(12, 'bold')
      doc.fillColor(NAVY_DARK).text(cert.certificate_number, cx - 100, barcodeY + barcodeH + 2, { width: 200, align: 'center' })
      setFont(9, 'regular')
      doc.fillColor(GRAY_DARK).text('CERTIFICATE ID', cx - 100, barcodeY + barcodeH + 16, { width: 200, align: 'center' })

      // ===== Signature block (right) — enhanced with founder name =====
      const sigBoxW = 160
      const sigBoxH = 70
      const sigBoxX = innerX + innerW - 30 - sigBoxW
      const sigBoxY = bottomY - 5

      // Subtle gold background pill
      doc.save()
      roundRectPath(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 6)
      doc.fill(GOLD_PALE)
      doc.lineWidth(0.6).strokeColor(GOLD)
      doc.stroke()
      doc.restore()

      // Label
      setFont(9, 'bold')
      doc.fillColor(GOLD_DARK).text('توقيع الجهة المانوحة', sigBoxX, sigBoxY + 6, { width: sigBoxW, align: 'center' })

      // Draw signature image if available, otherwise draw script-like signature placeholder
      if (founderSignature) {
        try {
          const sigRes = await fetch(founderSignature)
          const sigBuf = await sigRes.arrayBuffer()
          const sigPath = path.join(os.tmpdir(), `sig-${Date.now()}.png`)
          fs.writeFileSync(sigPath, Buffer.from(sigBuf))
          if (fs.existsSync(sigPath)) {
            doc.image(sigPath, sigBoxX + 25, sigBoxY + 18, { width: 110, height: 28 })
            fs.unlinkSync(sigPath)
          }
        } catch {
          doc.lineWidth(1).strokeColor(NAVY).moveTo(sigBoxX + 20, sigBoxY + 36).lineTo(sigBoxX + sigBoxW - 20, sigBoxY + 36).stroke()
        }
      } else {
        // Script-like wavy signature
        doc.lineWidth(1.4).strokeColor(NAVY_DARK)
        doc.moveTo(sigBoxX + 20, sigBoxY + 38)
        const sw = sigBoxW - 40
        for (let i = 0; i <= sw; i += 2) {
          const y = sigBoxY + 38 + Math.sin(i / 12) * 3
          doc.lineTo(sigBoxX + 20 + i, y)
        }
        doc.stroke()
        // Underscore
        doc.lineWidth(0.8).strokeColor(NAVY_DARK).moveTo(sigBoxX + 20, sigBoxY + 44).lineTo(sigBoxX + sigBoxW - 20, sigBoxY + 44).stroke()
      }

      // Founder name — "د. هاني الشافعي"
      setFont(13, 'bold')
      doc.fillColor(NAVY_DARK).text('د. هاني الشافعي', sigBoxX, sigBoxY + 47, { width: sigBoxW, align: 'center' })
      // Founder title
      setFont(9, 'regular')
      doc.fillColor(GOLD_DARK).text('المدير التنفيذي', sigBoxX, sigBoxY + 61, { width: sigBoxW, align: 'center' })

      // Watermark (very subtle — barely visible to not interfere with text)
      doc.save()
      doc.fillOpacity(0.02)
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
          // Parse bio for signature
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
