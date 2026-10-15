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
const GRAY_LIGHT = '#999999'

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

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

async function generateCertificatePDF(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const fonts = getFontPaths()
      const doc = new PDFDocument({
        size: [842, 595], // A4 landscape
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        info: {
          Title: `FIA Certificate — ${cert.certificate_number}`,
          Author: 'FIA — Future International Academy',
          Subject: 'Verified Professional Certificate',
        },
      })

      const fontOpts = (weight: 'regular' | 'bold' | 'black' = 'regular') => {
        const p = weight === 'black' ? fonts.black : weight === 'bold' ? fonts.bold : fonts.regular
        if (fs.existsSync(p)) return p
        return undefined
      }
      const setFont = (size: number, weight: 'regular' | 'bold' | 'black' = 'regular') => {
        const fp = fontOpts(weight)
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

      // ===== Background =====
      doc.rect(0, 0, pageW, pageH).fill(CREAM)

      // ===== Decorative outer frame =====
      // Outer thin gold line
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(20, 20, pageW - 40, pageH - 40).stroke()
      // Middle gold band
      doc.lineWidth(3).strokeColor(GOLD).rect(28, 28, pageW - 56, pageH - 56).stroke()
      // Inner thin gold line
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).rect(36, 36, pageW - 72, pageH - 72).stroke()
      // Navy outer thick border
      doc.lineWidth(12).strokeColor(NAVY).rect(12, 12, pageW - 24, pageH - 24).stroke()

      // ===== Corner ornaments — gold stars =====
      const drawStar = (cx: number, cy: number, r: number) => {
        const points: [number, number][] = []
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2
          const radius = i % 2 === 0 ? r : r / 2.5
          points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
        }
        doc.polygon(points[0], points[1], points[2], points[3], points[4], points[5], points[6], points[7], points[8], points[9]).fill(GOLD)
      }
      drawStar(50, 50, 8)
      drawStar(pageW - 50, 50, 8)
      drawStar(50, pageH - 50, 8)
      drawStar(pageW - 50, pageH - 50, 8)

      // ===== Top: Logo + Academy name =====
      const logoY = pageH - 85
      const logoR = 28
      // Outer gold ring
      doc.circle(cx, logoY + logoR, logoR + 3).fill(GOLD)
      // Navy circle
      doc.circle(cx, logoY + logoR, logoR).fill(NAVY)
      // Inner gold ring (thin)
      doc.lineWidth(0.5).strokeColor(GOLD).circle(cx, logoY + logoR, logoR - 4).stroke()
      // "FIA" text in gold
      setFont(15, 'bold')
      doc.fillColor(GOLD).text('FIA', cx - 20, logoY + logoR - 8, { width: 40, align: 'center' })

      // Academy name (Arabic, large)
      setFont(28, 'black')
      doc.fillColor(NAVY).text(cert.issued_by || 'أكاديمية المستقبل الدولية', cx - 350, logoY - 35, { width: 700, align: 'center' })

      // English subtitle
      setFont(11, 'bold')
      doc.fillColor(GOLD).text('FUTURE INTERNATIONAL ACADEMY', cx - 350, logoY - 50, { width: 700, align: 'center' })

      // Decorative gold ornaments (small diamonds)
      const drawDiamond = (x: number, y: number, s: number) => {
        doc.polygon([x, y - s], [x + s, y], [x, y + s], [x - s, y]).fill(GOLD)
      }
      drawDiamond(cx - 110, logoY - 58, 3)
      drawDiamond(cx + 110, logoY - 58, 3)
      // Gold line with diamond in center
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx - 95, logoY - 58).lineTo(cx - 10, logoY - 58).stroke()
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx + 10, logoY - 58).lineTo(cx + 95, logoY - 58).stroke()
      drawDiamond(cx, logoY - 58, 4)

      // ===== Body =====
      setFont(13, 'regular')
      doc.fillColor(NAVY).text('شهادة إتمام دورة معتمدة', cx - 350, logoY - 90, { width: 700, align: 'center' })

      setFont(11, 'regular')
      doc.fillColor(GRAY).text('تشهد أكاديمية المستقبل الدولية بأن', cx - 350, logoY - 110, { width: 700, align: 'center' })

      // Student name (large gold)
      setFont(40, 'black')
      doc.fillColor(GOLD).text(cert.student_name || 'طالب', cx - 350, logoY - 165, { width: 700, align: 'center' })

      // Underline student name with double line
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).moveTo(cx - 200, logoY - 170).lineTo(cx + 200, logoY - 170).stroke()
      doc.lineWidth(1.5).strokeColor(GOLD).moveTo(cx - 200, logoY - 172).lineTo(cx + 200, logoY - 172).stroke()
      doc.lineWidth(0.5).strokeColor(GOLD_LIGHT).moveTo(cx - 200, logoY - 174).lineTo(cx + 200, logoY - 174).stroke()

      setFont(11, 'regular')
      doc.fillColor(GRAY).text('قد أتم بنجاح متطلبات دورة', cx - 350, logoY - 200, { width: 700, align: 'center' })

      // Course title with decorative lines on both sides
      const courseTitle = cert.course_title || 'دورة معتمدة'
      setFont(20, 'bold')
      doc.fillColor(NAVY).text(courseTitle, cx - 350, logoY - 225, { width: 700, align: 'center' })

      // ===== Footer: Date + Signature + Barcode + QR =====
      // Footer section background bar (cream/light gold tint)
      doc.saveState()
      doc.fillOpacity(0.15)
      doc.rect(50, 95, pageW - 100, 70).fill(GOLD)
      doc.restoreState()

      // Left side: Date box
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('تاريخ الإصدار', 100, 145, { width: 100, align: 'center' })
      setFont(13, 'bold')
      doc.fillColor(NAVY).text(issueDate, 100, 128, { width: 100, align: 'center' })
      // Small decoration above date
      doc.lineWidth(0.5).strokeColor(GOLD).moveTo(110, 120).lineTo(190, 120).stroke()
      drawDiamond(150, 116, 2)

      // Center: barcode (visual bars)
      const barcodeValue = cert.certificate_number
      const barcodeX = pageW / 2 - 90
      const barcodeY = 105
      let bx = barcodeX
      const seed = barcodeValue.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const rand = (i: number) => {
        const x = Math.sin(seed + i) * 10000
        return x - Math.floor(x)
      }
      for (let i = 0; i < 55; i++) {
        const w = 1.5 + rand(i) * 3
        if (i % 2 === 0) {
          doc.rect(bx, barcodeY, w, 35).fill(NAVY)
        }
        bx += w
      }
      // Border around barcode
      doc.lineWidth(0.5).strokeColor(GRAY_LIGHT).rect(barcodeX - 5, barcodeY - 5, bx - barcodeX + 10, 45).stroke()
      // Barcode caption
      setFont(10, 'bold')
      doc.fillColor(NAVY).text(barcodeValue, cx - 100, 80, { width: 200, align: 'center' })
      // Top decoration
      setFont(8, 'regular')
      doc.fillColor(GRAY).text('• Certificate ID •', cx - 100, 70, { width: 200, align: 'center' })

      // Right side: Signature box
      setFont(9, 'regular')
      doc.fillColor(GRAY).text('توقيع الجهة المانوحة', pageW - 200, 150, { width: 100, align: 'center' })
      // Signature line with decorations
      doc.lineWidth(1).strokeColor(NAVY).moveTo(pageW - 200, 138).lineTo(pageW - 100, 138).stroke()
      // Decorative diamonds at line ends
      drawDiamond(pageW - 200, 138, 2)
      drawDiamond(pageW - 100, 138, 2)
      setFont(12, 'bold')
      doc.fillColor(NAVY).text('المدير التنفيذي', pageW - 200, 122, { width: 100, align: 'center' })

      // ===== Gold seal (between signature and barcode) =====
      const sealX = pageW - 80
      const sealY = 130
      const sealR = 28
      // Outer thin gold ring
      doc.circle(sealX, sealY, sealR + 1).lineWidth(0.5).strokeColor(GOLD_LIGHT)
      // Main gold ring
      doc.circle(sealX, sealY, sealR).lineWidth(3).strokeColor(GOLD).fill('white')
      // Inner navy circle
      doc.circle(sealX, sealY, sealR - 6).fill(NAVY)
      // Inner gold ring
      doc.circle(sealX, sealY, sealR - 8).lineWidth(0.5).strokeColor(GOLD)
      // Seal text - "FIA"
      setFont(10, 'bold')
      doc.fillColor(GOLD).text('FIA', sealX - 20, sealY - 8, { width: 40, align: 'center' })
      setFont(6, 'bold')
      doc.fillColor(GOLD).text('معتمد', sealX - 20, sealY + 2, { width: 40, align: 'center' })
      setFont(5, 'regular')
      doc.fillColor(GOLD).text('• OFFICIAL •', sealX - 20, sealY + 10, { width: 40, align: 'center' })
      // Stars around seal
      for (let i = 0; i < 12; i++) {
        const angle = (i * 2 * Math.PI) / 12
        const sx = sealX + Math.cos(angle) * (sealR + 4)
        const sy = sealY + Math.sin(angle) * (sealR + 4)
        doc.circle(sx, sy, 1).fill(GOLD)
      }

      // ===== QR code (left of date) =====
      const qrData = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 1,
        color: { dark: NAVY, light: CREAM },
      })
      const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64')
      // QR with gold border
      doc.rect(50, 105, 50, 50).lineWidth(2).strokeColor(GOLD).fill('white')
      doc.image(qrBuffer, 52, 107, { width: 46, height: 46 })
      setFont(7, 'bold')
      doc.fillColor(GRAY).text('امسح', 50, 158, { width: 50, align: 'center' })
      setFont(7, 'regular').fillColor(GRAY).text('للتحقق', 50, 165, { width: 50, align: 'center' })

      // ===== Footer ribbon (gold strip at the very bottom) =====
      doc.rect(50, 50, pageW - 100, 6).fill(GOLD)
      doc.rect(50, 58, pageW - 100, 2).fill(GOLD_LIGHT)

      // Bottom verify URL
      setFont(8, 'regular')
      doc.fillColor(GRAY).text(`للتحقق من صحة الشهادة: ${verifyUrl}`, cx - 300, 35, { width: 600, align: 'center' })

      // Watermark (very faint) — diagonal FIA across the page
      doc.saveState()
      doc.fillOpacity(0.06)
      doc.translate(cx, pageH / 2)
      doc.rotate(45)
      setFont(80, 'black')
      doc.fillColor(NAVY).text('FIA', -100, -40, { width: 200, align: 'center' })
      doc.restoreState()

      // Add small text on top "OFFICIAL CERTIFICATE"
      setFont(8, 'bold')
      doc.fillColor(GOLD).text('• OFFICIAL CERTIFICATE •', cx - 350, pageH - 25, { width: 700, align: 'center' })

      doc.end()
    } catch (e: any) {
      reject(e)
    }
  })
}

async function generateCertificatePNG(cert: any, issueDate: string, verifyUrl: string): Promise<Buffer> {
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
    const verifyUrl = `https://fiaacademy.vercel.app/#verify?number=${cert.certificate_number}`

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
