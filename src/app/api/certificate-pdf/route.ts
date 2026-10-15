import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import bwip from 'bwip-js'
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { Buffer } from 'buffer'

// Force Node.js runtime
export const runtime = 'nodejs'
export const maxDuration = 60

// Brand colors — modern luxurious palette matching reference image
const NAVY = '#0F172A'
const NAVY_LIGHT = '#1A1F36'
const GOLD = '#C5A059'
const GOLD_LIGHT = '#E5C158'
const GOLD_PALE = '#F5E5B3'
const CREAM = '#FDFBF7'
const SAGE_GREEN = '#E6F4EA'
const EMERALD_GREEN = '#10B981'
const LIGHT_GREEN = '#D1FAE5'
const GRAY = '#6B7280'
const GRAY_LIGHT = '#9CA3AF'
const GRAY_BG = '#F3F4F6'
const WHITE = '#FFFFFF'

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
async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
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

  // Outer soft green border (container)
  strokeRoundRect(15 * scale, 15 * scale, pageW - 30 * scale, pageH - 30 * scale, 14 * scale, SAGE_GREEN, 2 * scale)

  // ===== Inner certificate frame: cream with thick gold border =====
  const innerPad = 30 * scale
  const innerX = innerPad
  const innerY = innerPad
  const innerW = pageW - 2 * innerPad
  const innerH = pageH - 2 * innerPad

  // Fill cream for inner card
  fillRoundRect(innerX, innerY, innerW, innerH, 12 * scale, CREAM)

  // Gold border (thick outer line)
  strokeRoundRect(innerX, innerY, innerW, innerH, 12 * scale, GOLD, 3 * scale)
  // Gold border (thin inner line)
  strokeRoundRect(innerX + 5 * scale, innerY + 5 * scale, innerW - 10 * scale, innerH - 10 * scale, 10 * scale, GOLD, 0.7 * scale)

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

  // ===== Logo (top-right interior) — square with rounded corners, navy bg + gold "FIA" =====
  const logoSize = 50 * scale
  const logoX = innerX + innerW - logoSize - 22 * scale
  const logoY = innerY + 22 * scale
  fillRoundRect(logoX, logoY, logoSize, logoSize, 10 * scale, NAVY)
  strokeRoundRect(logoX, logoY, logoSize, logoSize, 10 * scale, GOLD, 1.5 * scale)
  setFont(16, 'bold')
  fill(GOLD)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('FIA', logoX + logoSize / 2, logoY + logoSize / 2)

  // ===== Title: CERTIFICATE OF COMPLETION (gold, small, all caps) =====
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  setFont(11, 'bold')
  fill(GOLD)
  // Letter-spacing approximation
  const titleText = 'CERTIFICATE OF COMPLETION'
  const titleY = innerY + 50 * scale
  ctx.fillText(titleText, cx, titleY)

  // ===== Academy name Arabic (large, navy) =====
  ctx.direction = 'rtl'
  setFont(28, 'bold')
  fill(NAVY)
  ctx.fillText(cert.issued_by || 'أكاديمية المستقبل الدولية', cx, innerY + 88 * scale)

  // English subtitle (small, gray)
  ctx.direction = 'ltr'
  setFont(11, 'regular')
  fill(GRAY)
  ctx.fillText('FUTURE INTERNATIONAL ACADEMY', cx, innerY + 118 * scale)

  // ===== Divider with center diamond =====
  const dividerY = innerY + 140 * scale
  stroke(GOLD, 1 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 100 * scale, dividerY)
  ctx.lineTo(cx - 10 * scale, dividerY)
  ctx.moveTo(cx + 10 * scale, dividerY)
  ctx.lineTo(cx + 100 * scale, dividerY)
  ctx.stroke()
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, dividerY - 5 * scale)
  ctx.lineTo(cx + 5 * scale, dividerY)
  ctx.lineTo(cx, dividerY + 5 * scale)
  ctx.lineTo(cx - 5 * scale, dividerY)
  ctx.closePath()
  ctx.fill()

  // ===== Award statement (gray) =====
  ctx.direction = 'rtl'
  setFont(13, 'regular')
  fill(GRAY)
  ctx.fillText('تشهد أكاديمية المستقبل الدولية بأن', cx, innerY + 165 * scale)

  // ===== Student name (LARGE, navy, most prominent) =====
  setFont(36, 'black')
  fill(NAVY)
  ctx.fillText(cert.student_name || 'طالب', cx, innerY + 210 * scale)

  // Course completion statement (small gray)
  setFont(13, 'regular')
  fill(GRAY)
  ctx.fillText('قد أتم بنجاح متطلبات دورة', cx, innerY + 250 * scale)

  // Course title (gold, bold, prominent)
  setFont(20, 'bold')
  fill(GOLD)
  ctx.fillText(cert.course_title || 'دورة معتمدة', cx, innerY + 282 * scale)

  // ===== Accreditation pill banner (gold pale) =====
  const pillY = innerY + 312 * scale
  const pillH = 28 * scale
  const pillText = 'معتمدة من: أكاديمية المستقبل الدولية'
  setFont(11, 'bold')
  const pillW = ctx.measureText(pillText).width + 60 * scale
  const pillX = cx - pillW / 2
  fillRoundRect(pillX, pillY, pillW, pillH, pillH / 2, GOLD_PALE)
  strokeRoundRect(pillX, pillY, pillW, pillH, pillH / 2, GOLD_LIGHT, 1 * scale)
  fill(NAVY)
  ctx.fillText('★ ' + pillText, cx, pillY + pillH / 2)

  // ===== 3 metadata columns at bottom =====
  const colsY = innerY + 360 * scale
  const colsH = 60 * scale
  const colW = 200 * scale
  const colGap = 20 * scale
  const totalColsW = 3 * colW + 2 * colGap
  const colsStartX = cx - totalColsW / 2

  // Column 1: Issue Date (left)
  fillRoundRect(colsStartX, colsY, colW, colsH, 8 * scale, GRAY_BG)
  ctx.direction = 'rtl'
  setFont(9, 'regular')
  fill(GRAY)
  ctx.textAlign = 'center'
  ctx.fillText('تاريخ الإصدار', colsStartX + colW / 2, colsY + 18 * scale)
  setFont(13, 'bold')
  fill(NAVY)
  ctx.fillText(issueDate, colsStartX + colW / 2, colsY + 40 * scale)

  // Column 2: Issuer (center)
  fillRoundRect(colsStartX + colW + colGap, colsY, colW, colsH, 8 * scale, GRAY_BG)
  setFont(9, 'regular')
  fill(GRAY)
  ctx.fillText('الجهة المصدرة', cx, colsY + 18 * scale)
  setFont(13, 'bold')
  fill(NAVY)
  ctx.fillText('أكاديمية المستقبل الدولية', cx, colsY + 40 * scale)

  // Column 3: Status (right, with green badge)
  const col3X = colsStartX + 2 * (colW + colGap)
  fillRoundRect(col3X, colsY, colW, colsH, 8 * scale, GRAY_BG)
  setFont(9, 'regular')
  fill(GRAY)
  ctx.fillText('الحالة', col3X + colW / 2, colsY + 18 * scale)
  // Green pill badge for status
  const badgeText = cert.status === 'صالحة' ? '● صالحة' : cert.status || 'صالحة'
  setFont(13, 'bold')
  const badgeW = ctx.measureText(badgeText).width + 24 * scale
  const badgeH = 22 * scale
  const badgeX = col3X + colW / 2 - badgeW / 2
  const badgeY = colsY + 30 * scale
  fillRoundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2, LIGHT_GREEN)
  fill(EMERALD_GREEN)
  ctx.fillText(badgeText, col3X + colW / 2, badgeY + badgeH / 2 + 2 * scale)

  // ===== Bottom: QR + Cert number + signature =====
  const bottomY = innerY + innerH - 60 * scale

  // QR (left)
  const qrBuffer = await generateQR(verifyUrl)
  const qrImg = await loadImage(qrBuffer)
  const qrSize = 35 * scale
  const qrX = innerX + 30 * scale
  fillRoundRect(qrX - 3 * scale, bottomY - 3 * scale, qrSize + 6 * scale, qrSize + 6 * scale, 4 * scale, WHITE)
  strokeRoundRect(qrX - 3 * scale, bottomY - 3 * scale, qrSize + 6 * scale, qrSize + 6 * scale, 4 * scale, GOLD, 1 * scale)
  ctx.drawImage(qrImg, qrX, bottomY, qrSize, qrSize)
  ctx.direction = 'rtl'
  setFont(8, 'regular')
  fill(GRAY)
  ctx.textAlign = 'center'
  ctx.fillText('امسح للتحقق', qrX + qrSize / 2, bottomY + qrSize + 12 * scale)

  // Cert number (center) with real Code-128 barcode
  const barcodeBuffer = await generateBarcode(cert.certificate_number)
  const barcodeImg = await loadImage(barcodeBuffer)
  const barcodeW = 140 * scale
  const barcodeH = 25 * scale
  const barcodeX = cx - barcodeW / 2
  const barcodeY = bottomY + 2 * scale
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeW, barcodeH)
  ctx.direction = 'ltr'
  setFont(10, 'bold')
  fill(NAVY)
  ctx.fillText(cert.certificate_number, cx, bottomY + barcodeH + 12 * scale)
  setFont(7, 'regular')
  fill(GRAY)
  ctx.fillText('Certificate ID', cx, bottomY + barcodeH + 22 * scale)

  // Signature (right)
  ctx.direction = 'rtl'
  const sigX = innerX + innerW - 30 * scale - 120 * scale
  setFont(9, 'regular')
  fill(GRAY)
  ctx.textAlign = 'center'
  ctx.fillText('توقيع الجهة المانوحة', sigX + 60 * scale, bottomY + 8 * scale)
  stroke(NAVY, 0.8 * scale)
  ctx.beginPath()
  ctx.moveTo(sigX, bottomY + 20 * scale)
  ctx.lineTo(sigX + 120 * scale, bottomY + 20 * scale)
  ctx.stroke()
  setFont(11, 'bold')
  fill(NAVY)
  ctx.fillText('المدير التنفيذي', sigX + 60 * scale, bottomY + 33 * scale)

  // ===== Watermark (very subtle) =====
  ctx.save()
  ctx.globalAlpha = 0.03
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
async function generateCertificatePDF(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
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

      // Outer soft green border (container)
      doc.save()
      doc.lineWidth(2).strokeColor(SAGE_GREEN)
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

      // Gold border (thick outer line)
      doc.save()
      doc.lineWidth(3).strokeColor(GOLD)
      roundRectPath(innerX, innerY, innerW, innerH, 12)
      doc.stroke()
      doc.restore()
      // Gold border (thin inner line)
      doc.save()
      doc.lineWidth(0.7).strokeColor(GOLD)
      roundRectPath(innerX + 5, innerY + 5, innerW - 10, innerH - 10, 10)
      doc.stroke()
      doc.restore()

      // Corner ornaments (L-shaped)
      const cornerLen = 18
      const cornerInset = 14
      doc.lineWidth(1.5).strokeColor(GOLD)
      // Top-left
      doc.moveTo(innerX + cornerInset, innerY + cornerInset + cornerLen).lineTo(innerX + cornerInset, innerY + cornerInset).lineTo(innerX + cornerInset + cornerLen, innerY + cornerInset).stroke()
      // Top-right
      doc.moveTo(innerX + innerW - cornerInset - cornerLen, innerY + cornerInset).lineTo(innerX + innerW - cornerInset, innerY + cornerInset).lineTo(innerX + innerW - cornerInset, innerY + cornerInset + cornerLen).stroke()
      // Bottom-left
      doc.moveTo(innerX + cornerInset, innerY + innerH - cornerInset - cornerLen).lineTo(innerX + cornerInset, innerY + innerH - cornerInset).lineTo(innerX + cornerInset + cornerLen, innerY + innerH - cornerInset).stroke()
      // Bottom-right
      doc.moveTo(innerX + innerW - cornerInset - cornerLen, innerY + innerH - cornerInset).lineTo(innerX + innerW - cornerInset, innerY + innerH - cornerInset).lineTo(innerX + innerW - cornerInset, innerY + innerH - cornerInset - cornerLen).stroke()

      // ===== Logo (top-right interior) =====
      const logoSize = 50
      const logoX = innerX + innerW - logoSize - 22
      const logoY = innerY + 22
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

      // ===== Title: CERTIFICATE OF COMPLETION (gold) =====
      setFont(11, 'bold')
      doc.fillColor(GOLD).text('CERTIFICATE OF COMPLETION', cx - 350, innerY + 42, { width: 700, align: 'center' })

      // Academy name Arabic (large, navy)
      setFont(28, 'bold')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 350, innerY + 75, { width: 700, align: 'center' })

      // English subtitle
      setFont(11, 'regular')
      doc.fillColor(GRAY).text('FUTURE INTERNATIONAL ACADEMY', cx - 350, innerY + 110, { width: 700, align: 'center' })

      // Divider with center diamond
      const dividerY = innerY + 140
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx - 100, dividerY).lineTo(cx - 10, dividerY).stroke()
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx + 10, dividerY).lineTo(cx + 100, dividerY).stroke()
      doc.polygon([cx, dividerY - 5], [cx + 5, dividerY], [cx, dividerY + 5], [cx - 5, dividerY]).fill(GOLD)

      // Award statement
      setFont(13, 'regular')
      doc.fillColor(GRAY).text('تشهد أكاديمية المستقبل الدولية بأن', cx - 350, innerY + 160, { width: 700, align: 'center' })

      // Student name (LARGE, navy)
      setFont(36, 'black')
      doc.fillColor(NAVY).text(cert.student_name || 'طالب', cx - 350, innerY + 195, { width: 700, align: 'center' })

      // Course completion statement
      setFont(13, 'regular')
      doc.fillColor(GRAY).text('قد أتم بنجاح متطلبات دورة', cx - 350, innerY + 245, { width: 700, align: 'center' })

      // Course title (gold, bold)
      setFont(20, 'bold')
      doc.fillColor(GOLD).text(cert.course_title || 'دورة معتمدة', cx - 350, innerY + 275, { width: 700, align: 'center' })

      // Accreditation pill banner
      const pillY = innerY + 312
      const pillH = 28
      setFont(11, 'bold')
      const pillText = '★ معتمدة من: أكاديمية المستقبل الدولية'
      const pillW = doc.widthOfString(pillText) + 60
      const pillX = cx - pillW / 2
      doc.save()
      roundRectPath(pillX, pillY, pillW, pillH, pillH / 2)
      doc.fill(GOLD_PALE)
      doc.lineWidth(1).strokeColor(GOLD_LIGHT)
      doc.stroke()
      doc.restore()
      doc.fillColor(NAVY).text(pillText, pillX, pillY + 8, { width: pillW, align: 'center' })

      // ===== 3 metadata columns at bottom =====
      const colsY = innerY + 360
      const colsH = 60
      const colW = 200
      const colGap = 20
      const totalColsW = 3 * colW + 2 * colGap
      const colsStartX = cx - totalColsW / 2

      // Col 1: Issue Date (left)
      doc.save()
      roundRectPath(colsStartX, colsY, colW, colsH, 8)
      doc.fill(GRAY_BG)
      doc.restore()
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('تاريخ الإصدار', colsStartX, colsY + 10, { width: colW, align: 'center' })
      setFont(13, 'bold')
      doc.fillColor(NAVY).text(issueDate, colsStartX, colsY + 32, { width: colW, align: 'center' })

      // Col 2: Issuer (center)
      const col2X = colsStartX + colW + colGap
      doc.save()
      roundRectPath(col2X, colsY, colW, colsH, 8)
      doc.fill(GRAY_BG)
      doc.restore()
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('الجهة المصدرة', col2X, colsY + 10, { width: colW, align: 'center' })
      setFont(13, 'bold')
      doc.fillColor(NAVY).text('أكاديمية المستقبل الدولية', col2X, colsY + 32, { width: colW, align: 'center' })

      // Col 3: Status (right)
      const col3X = colsStartX + 2 * (colW + colGap)
      doc.save()
      roundRectPath(col3X, colsY, colW, colsH, 8)
      doc.fill(GRAY_BG)
      doc.restore()
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('الحالة', col3X, colsY + 10, { width: colW, align: 'center' })
      // Green pill badge for status
      const badgeText = cert.status === 'صالحة' ? '● صالحة' : cert.status || 'صالحة'
      setFont(13, 'bold')
      const badgeW = doc.widthOfString(badgeText) + 24
      const badgeH = 22
      const badgeX = col3X + colW / 2 - badgeW / 2
      const badgeY = colsY + 30
      doc.save()
      roundRectPath(badgeX, badgeY, badgeW, badgeH, badgeH / 2)
      doc.fill(LIGHT_GREEN)
      doc.restore()
      doc.fillColor(EMERALD_GREEN).text(badgeText, col3X, badgeY + 3, { width: colW, align: 'center' })

      // ===== Bottom: QR + Cert number + signature =====
      const bottomY = innerY + innerH - 60

      // QR (left)
      const qrBuffer = await generateQR(verifyUrl)
      const qrSize = 35
      const qrX = innerX + 30
      doc.save()
      roundRectPath(qrX - 3, bottomY - 3, qrSize + 6, qrSize + 6, 4)
      doc.fill(WHITE)
      doc.lineWidth(1).strokeColor(GOLD)
      doc.stroke()
      doc.restore()
      doc.image(qrBuffer, qrX, bottomY, { width: qrSize, height: qrSize })
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('امسح للتحقق', qrX, bottomY + qrSize + 2, { width: qrSize, align: 'center' })

      // Cert number (center) with real Code-128 barcode
      const barcodeBuffer = await generateBarcode(cert.certificate_number)
      const barcodeW = 140
      const barcodeH = 25
      const barcodeX = cx - barcodeW / 2
      const barcodeY = bottomY + 2
      doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeW, height: barcodeH })
      setFont(10, 'bold')
      doc.fillColor(NAVY).text(cert.certificate_number, cx - 100, barcodeY + barcodeH + 2, { width: 200, align: 'center' })
      setFont(7, 'regular')
      doc.fillColor(GRAY).text('Certificate ID', cx - 100, barcodeY + barcodeH + 14, { width: 200, align: 'center' })

      // Signature (right)
      const sigX = innerX + innerW - 30 - 120
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('توقيع الجهة المانوحة', sigX, bottomY, { width: 120, align: 'center' })
      doc.lineWidth(0.8).strokeColor(NAVY).moveTo(sigX, bottomY + 20).lineTo(sigX + 120, bottomY + 20).stroke()
      setFont(11, 'bold')
      doc.fillColor(NAVY).text('المدير التنفيذي', sigX, bottomY + 25, { width: 120, align: 'center' })

      // Watermark
      doc.save()
      doc.fillOpacity(0.03)
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

    const issueDate = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ar-EG')
    const verifyUrl = `https://fiaacademy.vercel.app/?verify=${encodeURIComponent(cert.certificate_number)}#verify`

    if (format === 'png') {
      const pngBytes = await generateCertificatePNG(cert, issueDate, verifyUrl)
      const headers = new Headers()
      headers.set('Content-Type', 'image/png')
      headers.set('Content-Disposition', `inline; filename="FIA-Certificate-${cert.certificate_number}.png"`)
      headers.set('Cache-Control', 'public, max-age=3600')
      return new NextResponse(pngBytes, { status: 200, headers })
    } else {
      const pdfBytes = await generateCertificatePDF(cert, issueDate, verifyUrl)
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
