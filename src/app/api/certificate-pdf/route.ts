import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import bwip from 'bwip-js'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { Buffer } from 'buffer'

// Force Node.js runtime
export const runtime = 'nodejs'
export const maxDuration = 60

// Brand colors — luxurious white/gold/navy palette
const NAVY = '#0B1635'
const NAVY_LIGHT = '#1A2547'
const GOLD = '#D4AF37'
const GOLD_LIGHT = '#E5C158'
const GOLD_PALE = '#F5E5B3'
const WHITE = '#FFFFFF'
const GRAY = '#666666'
const GRAY_LIGHT = '#999999'
const GREEN = '#16A34A'

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

// Register fonts for canvas (once)
let fontsRegistered = false
function registerFontsForCanvas() {
  if (fontsRegistered) return
  try {
    const fonts = getFontPaths()
    if (fs.existsSync(fonts.regular)) GlobalFonts.registerFromPath(fonts.regular, 'Cairo')
    if (fs.existsSync(fonts.bold)) GlobalFonts.registerFromPath(fonts.bold, 'Cairo-Bold')
    if (fs.existsSync(fonts.black)) GlobalFonts.registerFromPath(fonts.black, 'Cairo-Black')
    fontsRegistered = true
  } catch (e) {
    // ignore
  }
}

// Generate a real Code-128 barcode as PNG buffer (different for each cert number)
async function generateBarcode(certNumber: string): Promise<Buffer> {
  try {
    return await bwip.toBuffer({
      bcid: 'code128',
      text: certNumber,
      scale: 2,
      height: 25,
      includetext: false,
      paddingwidth: 5,
      paddingheight: 5,
      backgroundcolor: 'FFFFFF',
      foregroundcolor: '0B1635',
    })
  } catch (e: any) {
    // Fallback: simple barcode stripes
    const canvas = createCanvas(200, 60)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 200, 60)
    ctx.fillStyle = NAVY
    let x = 5
    for (let i = 0; i < 40; i++) {
      const w = 1 + ((certNumber.charCodeAt(i % certNumber.length) * (i + 1)) % 4)
      if (i % 2 === 0) ctx.fillRect(x, 5, w, 50)
      x += w
    }
    return await canvas.encode('png')
  }
}

// Generate QR code as PNG buffer
async function generateQR(url: string): Promise<Buffer> {
  return await QRCode.toBuffer(url, {
    type: 'png',
    width: 200,
    margin: 1,
    color: { dark: NAVY, light: WHITE },
  })
}

// ============== PDF Certificate ==============
async function generateCertificatePDF(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const fonts = getFontPaths()
      const doc = new PDFDocument({
        size: [842, 595], // A4 landscape
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

      // Background: pure white
      doc.rect(0, 0, pageW, pageH).fill(WHITE)

      // Three-layer gold frame
      doc.lineWidth(1).strokeColor(GOLD).rect(20, 20, pageW - 40, pageH - 40).stroke()
      doc.lineWidth(2.5).strokeColor(GOLD).rect(28, 28, pageW - 56, pageH - 56).stroke()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(36, 36, pageW - 72, pageH - 72).stroke()

      // Corner ornaments
      const drawCornerOrnament = (x: number, y: number, flipX = false, flipY = false) => {
        const s = flipX ? -1 : 1
        const v = flipY ? -1 : 1
        doc.polygon([x, y - 6 * v], [x + 4 * s, y], [x, y + 6 * v], [x - 4 * s, y]).fill(GOLD)
        doc.lineWidth(0.8).strokeColor(GOLD)
        doc.moveTo(x + (8 * s), y).lineTo(x + (28 * s), y).stroke()
        doc.moveTo(x, y + (8 * v)).lineTo(x, y + (28 * v)).stroke()
        doc.polygon([x + (28 * s), y - 3], [x + (31 * s), y], [x + (28 * s), y + 3], [x + (25 * s), y]).fill(GOLD)
        doc.polygon([x, y + (28 * v) - 3], [x + 3, y + (28 * v)], [x, y + (28 * v) + 3], [x - 3, y + (28 * v)]).fill(GOLD)
      }
      drawCornerOrnament(50, 50, false, false)
      drawCornerOrnament(pageW - 50, 50, true, false)
      drawCornerOrnament(50, pageH - 50, false, true)
      drawCornerOrnament(pageW - 50, pageH - 50, true, true)

      // Logo: navy circle with gold ring + FIA text
      const logoY = pageH - 95
      const logoR = 26
      doc.circle(cx, logoY + logoR, logoR).fill(NAVY)
      doc.circle(cx, logoY + logoR, logoR).lineWidth(2).strokeColor(GOLD)
      doc.circle(cx, logoY + logoR, logoR - 4).lineWidth(0.5).strokeColor(GOLD_LIGHT)
      setFont(15, 'bold')
      doc.fillColor(GOLD).text('FIA', cx - 20, logoY + logoR - 8, { width: 40, align: 'center' })

      // English main title
      setFont(13, 'bold')
      doc.fillColor(GOLD).text('CERTIFICATE OF COMPLETION', cx - 350, logoY - 75, { width: 700, align: 'center' })

      // Academy name Arabic (large navy)
      setFont(26, 'bold')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 350, logoY - 50, { width: 700, align: 'center' })

      // English academy name
      setFont(11, 'regular')
      doc.fillColor(GRAY).text('FUTURE INTERNATIONAL ACADEMY', cx - 350, logoY - 30, { width: 700, align: 'center' })

      // Gold divider with diamond
      const dividerY = logoY - 15
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx - 130, dividerY).lineTo(cx - 10, dividerY).stroke()
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx + 10, dividerY).lineTo(cx + 130, dividerY).stroke()
      doc.polygon([cx, dividerY - 4], [cx + 4, dividerY], [cx, dividerY + 4], [cx - 4, dividerY]).fill(GOLD)

      // Award statement
      setFont(12, 'regular')
      doc.fillColor(GRAY).text('تُمنح هذه الشهادة إلى', cx - 350, logoY - 60, { width: 700, align: 'center' })

      // Student name (large, navy)
      setFont(34, 'black')
      doc.fillColor(NAVY).text(cert.student_name || 'طالب', cx - 350, logoY - 95, { width: 700, align: 'center' })

      // Course completion statement
      setFont(12, 'regular')
      doc.fillColor(GRAY).text('لإكماله دورة', cx - 350, logoY - 140, { width: 700, align: 'center' })

      // Course title (gold)
      setFont(20, 'bold')
      doc.fillColor(GOLD).text(cert.course_title || 'دورة معتمدة', cx - 350, logoY - 165, { width: 700, align: 'center' })

      // Three columns
      const colY = pageH - 130
      const colH = 50
      doc.save()
      doc.fillOpacity(0.4)
      doc.rect(80, colY, 220, colH).fill(GOLD_PALE)
      doc.rect(cx - 110, colY, 220, colH).fill(GOLD_PALE)
      doc.rect(pageW - 300, colY, 220, colH).fill(GOLD_PALE)
      doc.restore()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(80, colY, 220, colH).stroke()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(cx - 110, colY, 220, colH).stroke()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(pageW - 300, colY, 220, colH).stroke()

      // Column 1: Date
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('تاريخ الإصدار', 80, colY + 8, { width: 220, align: 'center' })
      setFont(11, 'bold')
      doc.fillColor(NAVY).text(issueDate, 80, colY + 25, { width: 220, align: 'center' })

      // Column 2: Issuer
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('الجهة المصدرة', cx - 110, colY + 8, { width: 220, align: 'center' })
      setFont(11, 'bold')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 110, colY + 25, { width: 220, align: 'center' })

      // Column 3: Status
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('الحالة', pageW - 300, colY + 8, { width: 220, align: 'center' })
      setFont(11, 'bold')
      doc.fillColor(GREEN).text(cert.status === 'صالحة' ? 'صالحة' : cert.status || 'صالحة', pageW - 300, colY + 25, { width: 220, align: 'center' })

      // ===== QR code (left) =====
      const qrBuffer = await generateQR(verifyUrl)
      const qrX = 80
      const qrY = 75
      const qrSize = 45
      doc.lineWidth(1).strokeColor(GOLD).rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4).stroke()
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })
      setFont(6, 'regular')
      doc.fillColor(GRAY).text('امسح للتحقق', qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' })

      // ===== Real Code-128 barcode (center) =====
      const barcodeBuffer = await generateBarcode(cert.certificate_number)
      // Barcode is at most ~200px wide × 60px tall
      const barcodeW = 180
      const barcodeH = 50
      const barcodeX = cx - barcodeW / 2
      const barcodeY2 = 85
      // White background with light gray border
      doc.rect(barcodeX - 3, barcodeY2 - 3, barcodeW + 6, barcodeH + 6).fill(WHITE)
      doc.lineWidth(0.5).strokeColor(GRAY_LIGHT).rect(barcodeX - 3, barcodeY2 - 3, barcodeW + 6, barcodeH + 6).stroke()
      // Embed barcode image
      doc.image(barcodeBuffer, barcodeX, barcodeY2, { width: barcodeW, height: barcodeH })
      // Cert number caption
      setFont(10, 'bold')
      doc.fillColor(NAVY).text(cert.certificate_number, cx - 100, barcodeY2 + barcodeH + 2, { width: 200, align: 'center' })
      setFont(7, 'regular')
      doc.fillColor(GRAY).text('Certificate ID', cx - 100, barcodeY2 + barcodeH + 15, { width: 200, align: 'center' })

      // ===== Signature (right) =====
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('توقيع الجهة المانوحة', pageW - 200, 90 + 25, { width: 120, align: 'center' })
      doc.lineWidth(0.8).strokeColor(NAVY).moveTo(pageW - 200, 90 + 22).lineTo(pageW - 80, 90 + 22).stroke()
      setFont(10, 'bold')
      doc.fillColor(NAVY).text('المدير التنفيذي', pageW - 200, 90 + 10, { width: 120, align: 'center' })

      // Bottom gold ribbon
      doc.rect(60, 50, pageW - 120, 4).fill(GOLD)
      doc.rect(60, 56, pageW - 120, 1).fill(GOLD_LIGHT)

      // Verify URL
      setFont(7, 'regular')
      doc.fillColor(GRAY_LIGHT).text(`للتحقق: ${verifyUrl}`, cx - 200, 35, { width: 400, align: 'center' })

      // Watermark
      doc.save()
      doc.fillOpacity(0.04)
      doc.translate(cx, pageH / 2)
      doc.rotate(45)
      setFont(120, 'black')
      doc.fillColor(NAVY).text('FIA', -150, -60, { width: 300, align: 'center' })
      doc.restore()

      doc.end()
    } catch (e: any) {
      reject(e)
    }
  })
}

// ============== PNG Certificate (full certificate, mirrors PDF design) ==============
async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
  registerFontsForCanvas()

  // Use 2x resolution for crisp output
  const scale = 2
  const pageW = 842 * scale
  const pageH = 595 * scale
  const canvas = createCanvas(pageW, pageH)
  const ctx = canvas.getContext('2d')

  // Helper functions
  const fill = (color: string) => { ctx.fillStyle = color }
  const stroke = (color: string, width: number) => { ctx.strokeStyle = color; ctx.lineWidth = width }
  const rect = (x: number, y: number, w: number, h: number) => ctx.rect(x, y, w, h)
  const fillRect = (x: number, y: number, w: number, h: number) => ctx.fillRect(x, y, w, h)
  const strokeRect = (x: number, y: number, w: number, h: number) => ctx.strokeRect(x, y, w, h)

  const setFont = (size: number, weight: 'regular' | 'bold' | 'black' = 'regular') => {
    const family = weight === 'black' ? 'Cairo-Black' : weight === 'bold' ? 'Cairo-Bold' : 'Cairo'
    ctx.font = `${size * scale}px ${family}`
  }

  const cx = pageW / 2

  // ===== Background =====
  fill(WHITE)
  fillRect(0, 0, pageW, pageH)

  // ===== Three-layer gold frame =====
  stroke(GOLD, 1 * scale)
  strokeRect(20 * scale, 20 * scale, pageW - 40 * scale, pageH - 40 * scale)
  ctx.stroke()
  stroke(GOLD, 2.5 * scale)
  strokeRect(28 * scale, 28 * scale, pageW - 56 * scale, pageH - 56 * scale)
  ctx.stroke()
  stroke(GOLD_LIGHT, 0.5 * scale)
  strokeRect(36 * scale, 36 * scale, pageW - 72 * scale, pageH - 72 * scale)
  ctx.stroke()

  // ===== Corner ornaments =====
  const drawDiamond = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath()
    ctx.moveTo(x, y - h)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x - w, y)
    ctx.closePath()
    ctx.fill()
  }
  const drawCorner = (x: number, y: number, fx: number, fy: number) => {
    fill(GOLD)
    drawDiamond(x, y, 4 * scale, 6 * scale)
    stroke(GOLD, 0.8 * scale)
    ctx.beginPath()
    ctx.moveTo(x + 8 * scale * fx, y)
    ctx.lineTo(x + 28 * scale * fx, y)
    ctx.moveTo(x, y + 8 * scale * fy)
    ctx.lineTo(x, y + 28 * scale * fy)
    ctx.stroke()
    fill(GOLD)
    drawDiamond(x + 28 * scale * fx, y, 3 * scale, 3 * scale)
    drawDiamond(x, y + 28 * scale * fy, 3 * scale, 3 * scale)
  }
  drawCorner(50 * scale, 50 * scale, 1, 1)
  drawCorner(pageW - 50 * scale, 50 * scale, -1, 1)
  drawCorner(50 * scale, pageH - 50 * scale, 1, -1)
  drawCorner(pageW - 50 * scale, pageH - 50 * scale, -1, -1)

  // ===== Logo: navy circle with gold rings =====
  const logoY = pageH - 95 * scale
  const logoR = 26 * scale
  fill(NAVY)
  ctx.beginPath()
  ctx.arc(cx, logoY + logoR, logoR, 0, 2 * Math.PI)
  ctx.fill()
  stroke(GOLD, 2 * scale)
  ctx.beginPath()
  ctx.arc(cx, logoY + logoR, logoR, 0, 2 * Math.PI)
  ctx.stroke()
  stroke(GOLD_LIGHT, 0.5 * scale)
  ctx.beginPath()
  ctx.arc(cx, logoY + logoR, logoR - 4 * scale, 0, 2 * Math.PI)
  ctx.stroke()
  setFont(15, 'bold')
  fill(GOLD)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('FIA', cx, logoY + logoR)

  // ===== English main title =====
  setFont(13, 'bold')
  fill(GOLD)
  ctx.fillText('CERTIFICATE OF COMPLETION', cx, logoY - 75 * scale)

  // ===== Academy name Arabic (large navy) =====
  ctx.direction = 'rtl'
  setFont(26, 'bold')
  fill(NAVY)
  ctx.fillText(cert.issued_by || 'أكاديمية المستقبل الدولية', cx, logoY - 50 * scale)

  // English academy name
  ctx.direction = 'ltr'
  setFont(11, 'regular')
  fill(GRAY)
  ctx.fillText('FUTURE INTERNATIONAL ACADEMY', cx, logoY - 30 * scale)

  // ===== Gold divider with diamond =====
  const dividerY = logoY - 15 * scale
  stroke(GOLD, 1 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 130 * scale, dividerY)
  ctx.lineTo(cx - 10 * scale, dividerY)
  ctx.moveTo(cx + 10 * scale, dividerY)
  ctx.lineTo(cx + 130 * scale, dividerY)
  ctx.stroke()
  fill(GOLD)
  drawDiamond(cx, dividerY, 4 * scale, 4 * scale)

  // ===== Award statement =====
  ctx.direction = 'rtl'
  setFont(12, 'regular')
  fill(GRAY)
  ctx.fillText('تُمنح هذه الشهادة إلى', cx, logoY - 60 * scale)

  // ===== Student name (large, navy) =====
  setFont(34, 'black')
  fill(NAVY)
  ctx.fillText(cert.student_name || 'طالب', cx, logoY - 95 * scale)

  // Course completion statement
  setFont(12, 'regular')
  fill(GRAY)
  ctx.fillText('لإكماله دورة', cx, logoY - 140 * scale)

  // Course title (gold)
  setFont(20, 'bold')
  fill(GOLD)
  ctx.fillText(cert.course_title || 'دورة معتمدة', cx, logoY - 165 * scale)

  // ===== Three columns =====
  const colY = pageH - 130 * scale
  const colH = 50 * scale
  const colW = 220 * scale
  // Background fill (semi-transparent gold pale)
  ctx.globalAlpha = 0.4
  fill(GOLD_PALE)
  fillRect(80 * scale, colY, colW, colH)
  fillRect(cx - 110 * scale, colY, colW, colH)
  fillRect(pageW - 300 * scale, colY, colW, colH)
  ctx.globalAlpha = 1
  // Borders
  stroke(GOLD_LIGHT, 0.5 * scale)
  strokeRect(80 * scale, colY, colW, colH)
  ctx.stroke()
  strokeRect(cx - 110 * scale, colY, colW, colH)
  ctx.stroke()
  strokeRect(pageW - 300 * scale, colY, colW, colH)
  ctx.stroke()

  // Column 1: Date
  setFont(8, 'regular')
  fill(GRAY)
  ctx.fillText('تاريخ الإصدار', 80 * scale + colW / 2, colY + 8 * scale)
  setFont(11, 'bold')
  fill(NAVY)
  ctx.fillText(issueDate, 80 * scale + colW / 2, colY + 25 * scale)

  // Column 2: Issuer
  setFont(8, 'regular')
  fill(GRAY)
  ctx.fillText('الجهة المصدرة', cx, colY + 8 * scale)
  setFont(11, 'bold')
  fill(NAVY)
  ctx.fillText(cert.issued_by || 'أكاديمية المستقبل الدولية', cx, colY + 25 * scale)

  // Column 3: Status
  setFont(8, 'regular')
  fill(GRAY)
  ctx.fillText('الحالة', pageW - 300 * scale + colW / 2, colY + 8 * scale)
  setFont(11, 'bold')
  fill(GREEN)
  ctx.fillText(cert.status === 'صالحة' ? 'صالحة' : cert.status || 'صالحة', pageW - 300 * scale + colW / 2, colY + 25 * scale)

  // ===== QR code (left) =====
  const qrBuffer = await generateQR(verifyUrl)
  const qrImg = await loadImage(qrBuffer)
  const qrSize = 45 * scale
  const qrX = 80 * scale
  const qrY = 75 * scale
  // White background + gold border
  fill(WHITE)
  fillRect(qrX - 2 * scale, qrY - 2 * scale, qrSize + 4 * scale, qrSize + 4 * scale)
  stroke(GOLD, 1 * scale)
  strokeRect(qrX - 2 * scale, qrY - 2 * scale, qrSize + 4 * scale, qrSize + 4 * scale)
  ctx.stroke()
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  ctx.direction = 'rtl'
  setFont(6, 'regular')
  fill(GRAY)
  ctx.textAlign = 'center'
  ctx.fillText('امسح للتحقق', qrX + qrSize / 2, qrY + qrSize + 5 * scale)

  // ===== Real Code-128 barcode (center) =====
  const barcodeBuffer = await generateBarcode(cert.certificate_number)
  const barcodeImg = await loadImage(barcodeBuffer)
  const barcodeW = 180 * scale
  const barcodeH = 40 * scale
  const barcodeX = cx - barcodeW / 2
  const barcodeY2 = 85 * scale
  // White bg + light gray border
  fill(WHITE)
  fillRect(barcodeX - 3 * scale, barcodeY2 - 3 * scale, barcodeW + 6 * scale, barcodeH + 6 * scale)
  stroke(GRAY_LIGHT, 0.5 * scale)
  strokeRect(barcodeX - 3 * scale, barcodeY2 - 3 * scale, barcodeW + 6 * scale, barcodeH + 6 * scale)
  ctx.stroke()
  // Draw barcode image (maintain aspect ratio, fit inside)
  ctx.drawImage(barcodeImg, barcodeX, barcodeY2, barcodeW, barcodeH)
  // Cert number caption
  ctx.direction = 'ltr'
  setFont(10, 'bold')
  fill(NAVY)
  ctx.fillText(cert.certificate_number, cx, barcodeY2 + barcodeH + 7 * scale)
  setFont(7, 'regular')
  fill(GRAY)
  ctx.fillText('Certificate ID', cx, barcodeY2 + barcodeH + 18 * scale)

  // ===== Signature (right) =====
  ctx.direction = 'rtl'
  setFont(8, 'regular')
  fill(GRAY)
  ctx.fillText('توقيع الجهة المانوحة', pageW - 140 * scale, 115 * scale)
  stroke(NAVY, 0.8 * scale)
  ctx.beginPath()
  ctx.moveTo(pageW - 200 * scale, 112 * scale)
  ctx.lineTo(pageW - 80 * scale, 112 * scale)
  ctx.stroke()
  setFont(10, 'bold')
  fill(NAVY)
  ctx.fillText('المدير التنفيذي', pageW - 140 * scale, 100 * scale)

  // ===== Bottom gold ribbon =====
  fill(GOLD)
  fillRect(60 * scale, 50 * scale, pageW - 120 * scale, 4 * scale)
  fill(GOLD_LIGHT)
  fillRect(60 * scale, 56 * scale, pageW - 120 * scale, 1 * scale)

  // ===== Verify URL =====
  ctx.direction = 'ltr'
  setFont(7, 'regular')
  fill(GRAY_LIGHT)
  ctx.fillText(`للتحقق: ${verifyUrl}`, cx, 35 * scale)

  // ===== Watermark =====
  ctx.save()
  ctx.globalAlpha = 0.04
  ctx.translate(cx, pageH / 2)
  ctx.rotate(Math.PI / 4)
  setFont(120, 'black')
  fill(NAVY)
  ctx.fillText('FIA', 0, 0)
  ctx.restore()

  return await canvas.encode('png')
}

// Helper to load an image buffer into a canvas image
async function loadImage(buffer: Buffer): Promise<any> {
  const { loadImage } = await import('@napi-rs/canvas')
  return await loadImage(buffer)
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
