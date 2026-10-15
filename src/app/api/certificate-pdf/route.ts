import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
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

      // ===== Background: pure white =====
      doc.rect(0, 0, pageW, pageH).fill(WHITE)

      // ===== Outer gold frame (elegant, single layer) =====
      // Outer thin gold line
      doc.lineWidth(1).strokeColor(GOLD).rect(20, 20, pageW - 40, pageH - 40).stroke()
      // Inner thicker gold line
      doc.lineWidth(2.5).strokeColor(GOLD).rect(28, 28, pageW - 56, pageH - 56).stroke()
      // Innermost thin gold line
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(36, 36, pageW - 72, pageH - 72).stroke()

      // ===== Corner ornaments — elegant gold filigree =====
      const drawCornerOrnament = (x: number, y: number, flipX = false, flipY = false) => {
        const s = flipX ? -1 : 1
        const v = flipY ? -1 : 1
        // Small diamonds
        doc.polygon([x, y - 6 * v], [x + 4 * s, y], [x, y + 6 * v], [x - 4 * s, y]).fill(GOLD)
        // Lines forming an L
        doc.lineWidth(0.8).strokeColor(GOLD)
        doc.moveTo(x + (8 * s), y).lineTo(x + (28 * s), y).stroke()
        doc.moveTo(x, y + (8 * v)).lineTo(x, y + (28 * v)).stroke()
        // Small diamond at the end of each line
        doc.polygon([x + (28 * s), y - 3], [x + (31 * s), y], [x + (28 * s), y + 3], [x + (25 * s), y]).fill(GOLD)
        doc.polygon([x, y + (28 * v) - 3], [x + 3, y + (28 * v)], [x, y + (28 * v) + 3], [x - 3, y + (28 * v)]).fill(GOLD)
      }
      // Top corners
      drawCornerOrnament(50, 50, false, false)
      drawCornerOrnament(pageW - 50, 50, true, false)
      // Bottom corners
      drawCornerOrnament(50, pageH - 50, false, true)
      drawCornerOrnament(pageW - 50, pageH - 50, true, true)

      // ===== Top: Logo + Academy name =====
      const logoY = pageH - 95
      const logoR = 26
      // Navy circle (the FIA logo — using original)
      doc.circle(cx, logoY + logoR, logoR).fill(NAVY)
      // Gold ring around it
      doc.circle(cx, logoY + logoR, logoR).lineWidth(2).strokeColor(GOLD)
      // Inner gold thin ring
      doc.circle(cx, logoY + logoR, logoR - 4).lineWidth(0.5).strokeColor(GOLD_LIGHT)
      // "FIA" text in gold inside the circle
      setFont(15, 'bold')
      doc.fillColor(GOLD).text('FIA', cx - 20, logoY + logoR - 8, { width: 40, align: 'center' })

      // ===== English main title (top, gold) =====
      setFont(13, 'bold')
      doc.fillColor(GOLD).text('CERTIFICATE OF COMPLETION', cx - 350, logoY - 75, { width: 700, align: 'center' })

      // Academy name in Arabic (large navy)
      setFont(26, 'bold')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 350, logoY - 50, { width: 700, align: 'center' })

      // English academy name (smaller, gray)
      setFont(11, 'regular')
      doc.fillColor(GRAY).text('FUTURE INTERNATIONAL ACADEMY', cx - 350, logoY - 30, { width: 700, align: 'center' })

      // ===== Gold divider with center diamond =====
      const dividerY = logoY - 15
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx - 130, dividerY).lineTo(cx - 10, dividerY).stroke()
      doc.lineWidth(1).strokeColor(GOLD).moveTo(cx + 10, dividerY).lineTo(cx + 130, dividerY).stroke()
      doc.polygon([cx, dividerY - 4], [cx + 4, dividerY], [cx, dividerY + 4], [cx - 4, dividerY]).fill(GOLD)

      // ===== Award statement =====
      setFont(12, 'regular')
      doc.fillColor(GRAY).text('تُمنح هذه الشهادة إلى', cx - 350, logoY - 60, { width: 700, align: 'center' })

      // ===== Student name (large, navy, prominent) =====
      setFont(34, 'black')
      doc.fillColor(NAVY).text(cert.student_name || 'طالب', cx - 350, logoY - 95, { width: 700, align: 'center' })

      // ===== Course completion statement =====
      setFont(12, 'regular')
      doc.fillColor(GRAY).text('لإكماله دورة', cx - 350, logoY - 140, { width: 700, align: 'center' })

      // ===== Course title (gold, prominent) =====
      setFont(20, 'bold')
      doc.fillColor(GOLD).text(cert.course_title || 'دورة معتمدة', cx - 350, logoY - 165, { width: 700, align: 'center' })

      // ===== Three columns: Date | Issuer | Status =====
      const colY = pageH - 130
      const colH = 50
      // Column backgrounds (light gray boxes)
      doc.rect(80, colY, 220, colH).fillOpacity(0.4).fill(GOLD_PALE).opacity(1)
      doc.rect(cx - 110, colY, 220, colH).fillOpacity(0.4).fill(GOLD_PALE).opacity(1)
      doc.rect(pageW - 300, colY, 220, colH).fillOpacity(0.4).fill(GOLD_PALE).opacity(1)
      // Light gold borders
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(80, colY, 220, colH).stroke()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(cx - 110, colY, 220, colH).stroke()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(pageW - 300, colY, 220, colH).stroke()

      // Column 1: Issue date
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('تاريخ الإصدار', 80, colY + 8, { width: 220, align: 'center' })
      setFont(11, 'bold')
      doc.fillColor(NAVY).text(issueDate, 80, colY + 25, { width: 220, align: 'center' })

      // Column 2: Issuing body
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('الجهة المصدرة', cx - 110, colY + 8, { width: 220, align: 'center' })
      setFont(11, 'bold')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 110, colY + 25, { width: 220, align: 'center' })

      // Column 3: Status
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('الحالة', pageW - 300, colY + 8, { width: 220, align: 'center' })
      setFont(11, 'bold')
      doc.fillColor(GREEN).text(cert.status === 'صالحة' ? 'صالحة' : cert.status || 'صالحة', pageW - 300, colY + 25, { width: 220, align: 'center' })

      // ===== Bottom: QR code + Cert number + Verify URL =====
      // QR code (left)
      const qrData = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 1,
        color: { dark: NAVY, light: WHITE },
      })
      const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64')
      const qrX = 80
      const qrY = 75
      const qrSize = 40
      // QR background with gold border
      doc.lineWidth(1).strokeColor(GOLD).rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4).stroke()
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })
      setFont(6, 'regular')
      doc.fillColor(GRAY).text('امسح للتحقق', qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' })

      // Center: Certificate number
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('رقم الشهادة', cx - 150, qrY + 5, { width: 300, align: 'center' })
      setFont(13, 'bold')
      doc.fillColor(NAVY).text(cert.certificate_number, cx - 150, qrY + 18, { width: 300, align: 'center' })
      setFont(7, 'regular')
      doc.fillColor(GRAY).text('Certificate ID', cx - 150, qrY + 36, { width: 300, align: 'center' })

      // Right: Signature
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('توقيع الجهة المانوحة', pageW - 200, qrY + 25, { width: 120, align: 'center' })
      doc.lineWidth(0.8).strokeColor(NAVY).moveTo(pageW - 200, qrY + 22).lineTo(pageW - 80, qrY + 22).stroke()
      setFont(10, 'bold')
      doc.fillColor(NAVY).text('المدير التنفيذي', pageW - 200, qrY + 10, { width: 120, align: 'center' })

      // ===== Bottom gold ribbon =====
      doc.rect(60, 50, pageW - 120, 4).fill(GOLD)
      doc.rect(60, 56, pageW - 120, 1).fill(GOLD_LIGHT)

      // ===== Bottom verify URL =====
      setFont(7, 'regular')
      doc.fillColor(GRAY_LIGHT).text(`للتحقق: ${verifyUrl}`, cx - 200, 35, { width: 400, align: 'center' })

      // ===== Watermark (very faint FIA diagonal) =====
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

async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
  // Generate a high-res PNG of the QR code (full certificate PNG would be too complex without a rendering engine)
  return await QRCode.toBuffer(verifyUrl, {
    type: 'png',
    width: 800,
    margin: 4,
    color: { dark: NAVY, light: WHITE },
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
