import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'
import os from 'os'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { Buffer } from 'buffer'

// Force Node.js runtime
export const runtime = 'nodejs'
export const maxDuration = 60

// Brand colors
const NAVY = '#0B1635'
const NAVY_LIGHT = '#1A2547'
const GOLD = '#D4AF37'
const GOLD_LIGHT = '#E5C158'
const CREAM = '#FBF7EE'
const GRAY = '#666666'

// Register Cairo font if available
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

// Arabic shaping helper using bidirectional algorithm
// Note: pdfkit doesn't natively shape Arabic. For better rendering,
// we recommend using a server-side shaping library. For now, we'll
// use a simple reverse approach + rely on Cairo font's shaping.
function shapeArabic(text: string): string {
  if (!text) return text
  // Detect RTL chars
  const isRTL = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
  if (!isRTL) return text
  // Try to use the native Cairo font's bidirectional capabilities
  // For pdfkit + Cairo, the text needs to be in logical order, and we use RTL writing direction
  return text
}

// Convert hex to rgb
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

// Generate PDF certificate
async function generateCertificatePDF(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const fonts = getFontPaths()
      // Create a PDF in landscape A4
      const doc = new PDFDocument({
        size: [842, 595], // A4 landscape
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        info: {
          Title: `FIA Certificate — ${cert.certificate_number}`,
          Author: 'FIA — Future International Academy',
          Subject: 'Verified Professional Certificate',
        },
      })

      // Use Cairo if available, else fall back to built-in Helvetica
      const fontOpts = (weight: 'regular' | 'bold' | 'black' = 'regular') => {
        const path = weight === 'black' ? fonts.black : weight === 'bold' ? fonts.bold : fonts.regular
        if (fs.existsSync(path)) return path
        return undefined
      }
      const setFont = (size: number, weight: 'regular' | 'bold' | 'black' = 'regular') => {
        const fp = fontOpts(weight)
        if (fp) doc.font(fp, size)
        else {
          doc.font(weight === 'regular' ? 'Helvetica' : 'Helvetica-Bold', size)
        }
      }

      // Buffer to collect PDF data
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      // ===== Background (cream) =====
      const pageW = 842
      const pageH = 595
      doc.rect(0, 0, pageW, pageH).fill(CREAM)

      // Outer navy border (thick)
      doc.lineWidth(20).strokeColor(NAVY).rect(15, 15, pageW - 30, pageH - 30).stroke()
      // Inner gold border
      doc.lineWidth(2).strokeColor(GOLD).rect(25, 25, pageW - 50, pageH - 50).stroke()

      // Decorative corner ornaments
      const cornerSize = 8
      ;[
        [25, 25],
        [pageW - 25 - cornerSize, 25],
        [25, pageH - 25 - cornerSize],
        [pageW - 25 - cornerSize, pageH - 25 - cornerSize],
      ].forEach(([x, y]) => {
        doc.rect(x, y, cornerSize, cornerSize).fill(GOLD)
      })

      // ===== Header: Logo circle =====
      const cx = pageW / 2
      const logoY = pageH - 95
      const logoR = 25
      // Navy circle
      doc.circle(cx, logoY + logoR, logoR).fill(NAVY).strokeColor(GOLD).lineWidth(3).stroke()
      // "FIA" text in gold
      setFont(14, 'bold')
      doc.fillColor(GOLD).text('FIA', cx - 20, logoY + logoR - 8, { width: 40, align: 'center' })

      // Academy name (Arabic)
      setFont(26, 'black')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 300, logoY - 35, { width: 600, align: 'center' })

      // English subtitle
      setFont(10, 'bold')
      doc.fillColor(GOLD).text('FUTURE INTERNATIONAL ACADEMY', cx - 300, logoY - 50, { width: 600, align: 'center' })

      // Decorative gold line
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx - 100, logoY - 58).lineTo(cx + 100, logoY - 58).stroke()

      // ===== Body =====
      setFont(14, 'regular')
      doc.fillColor(NAVY).text('شهادة إتمام دورة معتمدة', cx - 300, logoY - 95, { width: 600, align: 'center' })

      setFont(11, 'regular')
      doc.fillColor(GRAY).text('تشهد أكاديمية المستقبل الدولية بأن', cx - 300, logoY - 115, { width: 600, align: 'center' })

      // Student name (large gold)
      setFont(36, 'black')
      doc.fillColor(GOLD).text(cert.student_name || 'طالب', cx - 300, logoY - 160, { width: 600, align: 'center' })

      // Underline student name
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx - 200, logoY - 168).lineTo(cx + 200, logoY - 168).stroke()

      setFont(11, 'regular')
      doc.fillColor(GRAY).text('قد أتم بنجاح متطلبات دورة', cx - 300, logoY - 195, { width: 600, align: 'center' })

      // Course title
      setFont(18, 'bold')
      doc.fillColor(NAVY).text(cert.course_title || 'دورة معتمدة', cx - 300, logoY - 220, { width: 600, align: 'center' })

      // ===== Footer: Date + Signature + Barcode + QR =====
      // Left side: Date
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('تاريخ الإصدار', 110, 80, { width: 80, align: 'center' })
      setFont(12, 'bold')
      doc.fillColor(NAVY).text(issueDate, 100, 65, { width: 100, align: 'center' })

      // Center: barcode (visual bars)
      const barcodeValue = cert.certificate_number
      const barcodeX = pageW / 2 - 100
      const barcodeY = 70
      let bx = barcodeX
      // Generate deterministic barcode stripes from the cert number hash
      const seed = barcodeValue.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const rand = (i: number) => {
        const x = Math.sin(seed + i) * 10000
        return x - Math.floor(x)
      }
      for (let i = 0; i < 50; i++) {
        const w = 1.5 + rand(i) * 3
        if (i % 2 === 0) {
          doc.rect(bx, barcodeY, w, 35).fill(NAVY)
        }
        bx += w
      }
      // Barcode caption
      setFont(9, 'bold')
      doc.fillColor(NAVY).text(barcodeValue, cx - 100, 55, { width: 200, align: 'center' })

      // Right side: Signature
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('توقيع الجهة المانوحة', pageW - 200, 100, { width: 100, align: 'center' })
      doc.lineWidth(1).strokeColor(NAVY).moveTo(pageW - 200, 88).lineTo(pageW - 100, 88).stroke()
      setFont(11, 'bold')
      doc.fillColor(NAVY).text('المدير التنفيذي', pageW - 200, 75, { width: 100, align: 'center' })

      // ===== Gold seal =====
      const sealX = pageW - 130
      const sealY = 110
      const sealR = 25
      doc.circle(sealX, sealY, sealR).fill('white').strokeColor(GOLD).lineWidth(3).stroke()
      doc.circle(sealX, sealY, sealR - 4).strokeColor(NAVY).lineWidth(1).stroke()
      setFont(8, 'bold')
      doc.fillColor(NAVY).text('FIA', sealX - 20, sealY - 8, { width: 40, align: 'center' })
      setFont(6, 'bold')
      doc.fillColor(NAVY).text('معتمد', sealX - 20, sealY + 2, { width: 40, align: 'center' })
      // Stars around seal
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4
        const sx = sealX + Math.cos(angle) * (sealR + 4)
        const sy = sealY + Math.sin(angle) * (sealR + 4)
        doc.circle(sx, sy, 1.5).fill(GOLD)
      }

      // ===== QR code =====
      const qrData = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 1,
        color: { dark: NAVY, light: CREAM },
      })
      const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64')
      doc.image(qrBuffer, 125, 110, { width: 50, height: 50 })
      setFont(7, 'regular')
      doc.fillColor(GRAY).text('امسح للتحقق', 110, 103, { width: 80, align: 'center' })

      // ===== Footer ribbon =====
      doc.rect(50, 35, pageW - 100, 8).fill(GOLD)
      setFont(8, 'regular')
      doc.fillColor(GRAY).text(`للتحقق: ${verifyUrl}`, cx - 200, 22, { width: 400, align: 'center' })

      doc.end()
    } catch (e: any) {
      reject(e)
    }
  })
}

// Generate PNG preview using simpler canvas approach (we'll use QRCode's built-in for now)
async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
  // Generate a simple PNG with QR code embedded (lightweight version)
  // For the rich PDF, see the PDF generator above
  return await QRCode.toBuffer(verifyUrl, {
    type: 'png',
    width: 800,
    margin: 4,
    color: { dark: NAVY, light: CREAM },
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
    const verifyUrl = `https://fia-academy-nu.vercel.app/#verify?number=${cert.certificate_number}`

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
