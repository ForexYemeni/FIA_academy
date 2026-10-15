// Preview generator — same logic as the API PNG generator
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas')
const fs = require('fs')
const path = require('path')
const QRCode = require('qrcode')
const bwip = require('bwip-js')

const NAVY = '#0A1F44'
const NAVY_DEEP = '#051429'
const NAVY_DARK = '#020A15'
const NAVY_MID = '#1B3A6B'
const GOLD = '#C9A961'
const GOLD_BRIGHT = '#E5C77E'
const GOLD_PALE = '#F5E5B3'
const GOLD_DARK = '#8B6F2C'
const IVORY = '#FBF7EC'
const IVORY_DEEP = '#F0E8D2'
const CREAM = '#FDFAF0'
const EMERALD = '#1B7E3A'
const EMERALD_LIGHT = '#D4EDDA'
const CRIMSON = '#A02424'
const CRIMSON_LIGHT = '#F8D7DA'
const GRAY_DARK = '#2C2C2C'
const GRAY = '#6B6B6B'
const WHITE = '#FFFFFF'
const SIG_BLUE = '#0047AB'

const fontsDir = '/home/z/my-project/.fonts'
if (fs.existsSync(path.join(fontsDir, 'Cairo-Regular.ttf'))) {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Regular.ttf'), 'Cairo')
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Bold.ttf'), 'Cairo-Bold')
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Black.ttf'), 'Cairo-Black')
}

async function generateBarcode(certNumber) {
  try {
    return await bwip.toBuffer({
      bcid: 'code128', text: certNumber, scale: 2, height: 18,
      includetext: false, paddingwidth: 3, paddingheight: 3,
      backgroundcolor: 'FFFFFF', foregroundcolor: '0A1F44',
    })
  } catch (e) {
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

async function generateQR(url) {
  return await QRCode.toBuffer(url, { type: 'png', width: 200, margin: 1, color: { dark: NAVY, light: WHITE } })
}

function drawCornerOrnament(ctx, x, y, scale, mx, my) {
  ctx.save(); ctx.translate(x, y); ctx.scale(mx, my); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2 * scale
  ctx.beginPath()
  ctx.moveTo(0, 36 * scale)
  ctx.bezierCurveTo(0, 12 * scale, 12 * scale, 0, 36 * scale, 0)
  ctx.stroke()
  ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 1.2 * scale
  ctx.beginPath()
  ctx.moveTo(6 * scale, 30 * scale)
  ctx.bezierCurveTo(6 * scale, 16 * scale, 16 * scale, 6 * scale, 30 * scale, 6 * scale)
  ctx.stroke()
  ctx.fillStyle = GOLD
  const dots = [[2, 32], [10, 22], [22, 10], [32, 2]]
  dots.forEach(([dx, dy]) => {
    ctx.beginPath()
    ctx.arc(dx * scale, dy * scale, 1.5 * scale, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(4 * scale, -4 * scale); ctx.lineTo(8 * scale, 0); ctx.lineTo(4 * scale, 4 * scale)
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

function drawGelPenSignature(ctx, startX, centerY, width, scale) {
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
  ctx.strokeStyle = ink; ctx.lineWidth = 2.5 * scale
  ctx.beginPath()
  ctx.moveTo(startX - 8 * scale, centerY - 12 * scale)
  ctx.bezierCurveTo(startX - 16 * scale, centerY - 28 * scale, startX + 4 * scale, centerY - 30 * scale, startX + 6 * scale, centerY - 14 * scale)
  ctx.stroke()
  ctx.lineWidth = 3 * scale
  ctx.beginPath()
  ctx.moveTo(startX + width, centerY)
  ctx.bezierCurveTo(startX + width + 16 * scale, centerY - 16 * scale, startX + width + 22 * scale, centerY + 4 * scale, startX + width + 8 * scale, centerY + 6 * scale)
  ctx.stroke()
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
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.arc(startX - 14 * scale, centerY - 8 * scale, 1.8 * scale, 0, Math.PI * 2)
  ctx.fill()
}

async function generateCertificatePNG(cert) {
  const scale = 2
  const pageW = 842 * scale, pageH = 595 * scale
  const canvas = createCanvas(pageW, pageH)
  const ctx = canvas.getContext('2d')

  const fill = (c) => { ctx.fillStyle = c }
  const stroke = (c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w }
  const roundRect = (x, y, w, h, r) => {
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
  const fillRoundRect = (x, y, w, h, r, c) => { fill(c); roundRect(x, y, w, h, r); ctx.fill() }
  const strokeRoundRect = (x, y, w, h, r, c, lw) => { stroke(c, lw); roundRect(x, y, w, h, r); ctx.stroke() }
  const setFont = (size, weight = 'regular') => {
    const family = weight === 'black' ? 'Cairo-Black' : weight === 'bold' ? 'Cairo-Bold' : 'Cairo'
    ctx.font = `${size * scale}px ${family}`
  }

  const cx = pageW / 2

  // Outer navy background with gradient
  fill(NAVY_DEEP); ctx.fillRect(0, 0, pageW, pageH)
  const bgGrad = ctx.createRadialGradient(cx, pageH / 2, 100 * scale, cx, pageH / 2, pageW)
  bgGrad.addColorStop(0, NAVY); bgGrad.addColorStop(1, NAVY_DEEP)
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, pageW, pageH)

  // Subtle diamond pattern on navy
  ctx.save()
  ctx.globalAlpha = 0.06
  fill(GOLD)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      const x = col * 80 * scale + (row % 2 ? 40 * scale : 0)
      const y = row * 80 * scale
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4)
      ctx.fillRect(-2 * scale, -2 * scale, 4 * scale, 4 * scale); ctx.restore()
    }
  }
  ctx.restore()

  // Inner ivory card
  const cardPad = 28 * scale
  const cardX = cardPad, cardY = cardPad, cardW = pageW - 2 * cardPad, cardH = pageH - 2 * cardPad
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20 * scale; ctx.shadowOffsetY = 6 * scale
  fillRoundRect(cardX, cardY, cardW, cardH, 16 * scale, IVORY); ctx.restore()

  const innerGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH)
  innerGrad.addColorStop(0, CREAM); innerGrad.addColorStop(1, IVORY)
  ctx.fillStyle = innerGrad
  roundRect(cardX, cardY, cardW, cardH, 16 * scale); ctx.fill()

  // Triple gold frame
  strokeRoundRect(cardX + 8 * scale, cardY + 8 * scale, cardW - 16 * scale, cardH - 16 * scale, 12 * scale, GOLD, 2.5 * scale)
  strokeRoundRect(cardX + 16 * scale, cardY + 16 * scale, cardW - 32 * scale, cardH - 32 * scale, 8 * scale, GOLD_BRIGHT, 1 * scale)
  strokeRoundRect(cardX + 22 * scale, cardY + 22 * scale, cardW - 44 * scale, cardH - 44 * scale, 6 * scale, GOLD, 0.5 * scale)

  // Corner ornaments
  const cornerInset = 28 * scale
  drawCornerOrnament(ctx, cardX + cornerInset, cardY + cornerInset, scale, 1, 1)
  drawCornerOrnament(ctx, cardX + cardW - cornerInset, cardY + cornerInset, scale, -1, 1)
  drawCornerOrnament(ctx, cardX + cornerInset, cardY + cardH - cornerInset, scale, 1, -1)
  drawCornerOrnament(ctx, cardX + cardW - cornerInset, cardY + cardH - cornerInset, scale, -1, -1)

  // FIA seal (top-left)
  const sealSize = 60 * scale, sealX = cardX + 50 * scale, sealY = cardY + 50 * scale
  fillRoundRect(sealX - sealSize / 2, sealY - sealSize / 2, sealSize, sealSize, sealSize / 2, NAVY_DARK)
  strokeRoundRect(sealX - sealSize / 2, sealY - sealSize / 2, sealSize, sealSize, sealSize / 2, GOLD, 2.5 * scale)
  strokeRoundRect(sealX - sealSize / 2 + 5 * scale, sealY - sealSize / 2 + 5 * scale, sealSize - 10 * scale, sealSize - 10 * scale, (sealSize - 10 * scale) / 2, GOLD_BRIGHT, 0.8 * scale)
  setFont(18, 'bold'); fill(GOLD_BRIGHT)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('FIA', sealX, sealY)

  // Logo (top-right)
  const logoSize = 75 * scale, logoX = cardX + cardW - logoSize - 50 * scale, logoY = cardY + 45 * scale
  const logoPath = '/home/z/my-project/public/fia/logo-official.png'
  if (fs.existsSync(logoPath)) {
    const logoImg = await loadImage(fs.readFileSync(logoPath))
    fillRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 10 * scale, WHITE)
    strokeRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 10 * scale, GOLD, 2 * scale)
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
  }

  // Header: Institution name (large, navy)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'
  setFont(34, 'bold'); fill(NAVY)
  ctx.fillText('أكاديمية المستقبل الدولية', cx, cardY + 80 * scale)
  ctx.direction = 'ltr'; setFont(12, 'bold'); fill(GOLD_DARK)
  ctx.fillText('F U T U R E   I N T E R N A T I O N A L   A C A D E M Y', cx, cardY + 115 * scale)

  // Premium ornamental divider
  const dividerY = cardY + 145 * scale
  stroke(GOLD, 1.5 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 130 * scale, dividerY - 3 * scale); ctx.lineTo(cx - 16 * scale, dividerY - 3 * scale)
  ctx.moveTo(cx + 16 * scale, dividerY - 3 * scale); ctx.lineTo(cx + 130 * scale, dividerY - 3 * scale)
  ctx.moveTo(cx - 130 * scale, dividerY + 3 * scale); ctx.lineTo(cx - 16 * scale, dividerY + 3 * scale)
  ctx.moveTo(cx + 16 * scale, dividerY + 3 * scale); ctx.lineTo(cx + 130 * scale, dividerY + 3 * scale)
  ctx.stroke()
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, dividerY - 8 * scale); ctx.lineTo(cx + 8 * scale, dividerY); ctx.lineTo(cx, dividerY + 8 * scale); ctx.lineTo(cx - 8 * scale, dividerY)
  ctx.closePath(); ctx.fill()
  ctx.beginPath()
  ctx.arc(cx - 18 * scale, dividerY, 2 * scale, 0, Math.PI * 2)
  ctx.arc(cx + 18 * scale, dividerY, 2 * scale, 0, Math.PI * 2)
  ctx.fill()

  // Certificate title
  ctx.direction = 'rtl'; setFont(28, 'bold'); fill(NAVY)
  ctx.fillText('شهادة إتمام', cx, cardY + 185 * scale)
  ctx.direction = 'ltr'; setFont(11, 'bold'); fill(GOLD_DARK)
  ctx.fillText('C E R T I F I C A T E   O F   C O M P L E T I O N', cx, cardY + 215 * scale)

  // Certification statement
  ctx.direction = 'rtl'; setFont(14, 'regular'); fill(GRAY_DARK)
  ctx.fillText('تشهد أكاديمية المستقبل الدولية بأن', cx, cardY + 245 * scale)

  // Recipient name — LARGEST with AUTO-FIT
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

  // Gold underline + center diamond
  stroke(GOLD, 1 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 80 * scale, cardY + 320 * scale); ctx.lineTo(cx + 80 * scale, cardY + 320 * scale)
  ctx.stroke()
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, cardY + 316 * scale); ctx.lineTo(cx + 4 * scale, cardY + 320 * scale); ctx.lineTo(cx, cardY + 324 * scale); ctx.lineTo(cx - 4 * scale, cardY + 320 * scale)
  ctx.closePath(); ctx.fill()

  // Completion statement
  ctx.direction = 'rtl'; setFont(14, 'regular'); fill(GRAY_DARK)
  ctx.fillText('قد أتم بنجاح متطلبات دورة', cx, cardY + 345 * scale)

  // Course plaque — with AUTO-FIT
  const plaqueY = cardY + 380 * scale, plaqueH = 40 * scale
  let courseFontSize = 20
  setFont(courseFontSize, 'bold')
  const courseText = cert.course_title || 'دورة معتمدة'
  let textWidth = ctx.measureText(courseText).width
  const plaquePadX = 50 * scale
  const maxPlaqueWidth = cardW - 100 * scale
  while (textWidth + 100 * scale + plaquePadX * 2 > maxPlaqueWidth && courseFontSize > 11) {
    courseFontSize -= 1
    setFont(courseFontSize, 'bold')
    textWidth = ctx.measureText(courseText).width
  }
  const plaqueW = Math.max(textWidth + 100 * scale + plaquePadX * 2, 320 * scale)
  const plaqueX = cx - plaqueW / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8 * scale; ctx.shadowOffsetY = 3 * scale
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

  stroke(GOLD, 2.5 * scale)
  ctx.beginPath()
  ctx.moveTo(plaqueX + 18 * scale, plaqueY)
  ctx.lineTo(plaqueX + plaqueW - 18 * scale, plaqueY)
  ctx.lineTo(plaqueX + plaqueW, plaqueY + plaqueH / 2)
  ctx.lineTo(plaqueX + plaqueW - 18 * scale, plaqueY + plaqueH)
  ctx.lineTo(plaqueX + 18 * scale, plaqueY + plaqueH)
  ctx.lineTo(plaqueX, plaqueY + plaqueH / 2)
  ctx.closePath(); ctx.stroke()
  stroke(GOLD_BRIGHT, 0.6 * scale)
  ctx.beginPath()
  ctx.moveTo(plaqueX + 22 * scale, plaqueY + 4 * scale)
  ctx.lineTo(plaqueX + plaqueW - 22 * scale, plaqueY + 4 * scale)
  ctx.lineTo(plaqueX + plaqueW - 5 * scale, plaqueY + plaqueH / 2)
  ctx.lineTo(plaqueX + plaqueW - 22 * scale, plaqueY + plaqueH - 4 * scale)
  ctx.lineTo(plaqueX + 22 * scale, plaqueY + plaqueH - 4 * scale)
  ctx.lineTo(plaqueX + 5 * scale, plaqueY + plaqueH / 2)
  ctx.closePath(); ctx.stroke()

  fill(GOLD_BRIGHT)
  ctx.fillText(courseText, cx, plaqueY + plaqueH / 2 + 1 * scale)

  // 3 info boxes
  const boxesY = cardY + 430 * scale, boxesH = 40 * scale
  const boxW = 200 * scale, boxGap = 18 * scale
  const totalBoxesW = 3 * boxW + 2 * boxGap
  const boxesStartX = cx - totalBoxesW / 2

  // Box 1: Date
  fillRoundRect(boxesStartX, boxesY, boxW, boxesH, 8 * scale, WHITE)
  strokeRoundRect(boxesStartX, boxesY, boxW, boxesH, 8 * scale, GOLD, 1.5 * scale)
  fillRoundRect(boxesStartX + 12 * scale, boxesY + 12 * scale, 32 * scale, 32 * scale, 16 * scale, NAVY)
  setFont(16, 'bold'); fill(GOLD_BRIGHT); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('📅', boxesStartX + 28 * scale, boxesY + 28 * scale)
  ctx.direction = 'rtl'; setFont(9, 'regular'); fill(GRAY); ctx.textAlign = 'right'
  ctx.fillText('تاريخ الإصدار', boxesStartX + boxW - 14 * scale, boxesY + 16 * scale)
  setFont(13, 'bold'); fill(NAVY)
  ctx.fillText(cert.issueDate, boxesStartX + boxW - 14 * scale, boxesY + 38 * scale)

  // Box 2: Issuer
  const box2X = boxesStartX + boxW + boxGap
  fillRoundRect(box2X, boxesY, boxW, boxesH, 8 * scale, WHITE)
  strokeRoundRect(box2X, boxesY, boxW, boxesH, 8 * scale, GOLD, 1.5 * scale)
  fillRoundRect(box2X + 12 * scale, boxesY + 12 * scale, 32 * scale, 32 * scale, 16 * scale, NAVY)
  setFont(16, 'bold'); fill(GOLD_BRIGHT); ctx.textAlign = 'center'
  ctx.fillText('🎓', box2X + 28 * scale, boxesY + 28 * scale)
  ctx.direction = 'rtl'; setFont(9, 'regular'); fill(GRAY); ctx.textAlign = 'right'
  ctx.fillText('الجهة المصدرة', box2X + boxW - 14 * scale, boxesY + 16 * scale)
  setFont(13, 'bold'); fill(NAVY)
  ctx.fillText('أكاديمية المستقبل الدولية', box2X + boxW - 14 * scale, boxesY + 38 * scale)

  // Box 3: Status
  const box3X = boxesStartX + 2 * (boxW + boxGap)
  const isRevoked = cert.status === 'ملغاة' || cert.status === 'ملغي'
  const statusColor = isRevoked ? CRIMSON : EMERALD
  const statusBgColor = isRevoked ? CRIMSON_LIGHT : EMERALD_LIGHT
  const statusText = isRevoked ? 'ملغي' : 'صالح'
  fillRoundRect(box3X, boxesY, boxW, boxesH, 8 * scale, statusBgColor)
  strokeRoundRect(box3X, boxesY, boxW, boxesH, 8 * scale, statusColor, 2 * scale)
  fillRoundRect(box3X + 12 * scale, boxesY + 12 * scale, 32 * scale, 32 * scale, 16 * scale, statusColor)
  setFont(16, 'bold'); fill(WHITE); ctx.textAlign = 'center'
  ctx.fillText(isRevoked ? '✕' : '✓', box3X + 28 * scale, boxesY + 28 * scale)
  ctx.direction = 'rtl'; setFont(9, 'regular'); fill(GRAY); ctx.textAlign = 'right'
  ctx.fillText('الحالة', box3X + boxW - 14 * scale, boxesY + 16 * scale)
  setFont(13, 'bold'); fill(statusColor)
  ctx.fillText(statusText, box3X + boxW - 14 * scale, boxesY + 38 * scale)

  // Bottom row
  const bottomY = cardY + 480 * scale

  // QR (left)
  const qrBuffer = await generateQR(cert.verifyUrl)
  const qrImg = await loadImage(qrBuffer)
  const qrSize = 55 * scale, qrX = cardX + 70 * scale
  fillRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, WHITE)
  strokeRoundRect(qrX - 6 * scale, bottomY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 6 * scale, GOLD, 1.5 * scale)
  ctx.drawImage(qrImg, qrX, bottomY, qrSize, qrSize)
  ctx.direction = 'rtl'; setFont(10, 'bold'); fill(NAVY); ctx.textAlign = 'center'
  ctx.fillText('امسح للتحقق', qrX + qrSize / 2, bottomY + qrSize + 14 * scale)

  // Barcode (center)
  const barcodeBuffer = await generateBarcode(cert.certificate_number)
  const barcodeImg = await loadImage(barcodeBuffer)
  const barcodeW = 140 * scale, barcodeH = 25 * scale
  const barcodeX = cx - barcodeW / 2, barcodeY = bottomY + 5 * scale
  fillRoundRect(barcodeX - 10 * scale, barcodeY - 6 * scale, barcodeW + 20 * scale, barcodeH + 45 * scale, 4 * scale, WHITE)
  strokeRoundRect(barcodeX - 10 * scale, barcodeY - 6 * scale, barcodeW + 20 * scale, barcodeH + 45 * scale, 4 * scale, GOLD, 1.2 * scale)
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeW, barcodeH)
  ctx.direction = 'ltr'; setFont(12, 'bold'); fill(NAVY)
  ctx.fillText(cert.certificate_number, cx, bottomY + barcodeH + 12 * scale)
  setFont(8, 'regular'); fill(GRAY)
  ctx.fillText('CERTIFICATE ID', cx, bottomY + barcodeH + 26 * scale)

  // Signature (right) — EMPTY by default, only signature image if provided
  const sigAreaW = 200 * scale, sigAreaX = cardX + cardW - 60 * scale - sigAreaW
  ctx.direction = 'rtl'; setFont(11, 'bold'); fill(GRAY_DARK); ctx.textAlign = 'center'
  ctx.fillText('توقيع الجهة المانوحة', sigAreaX + sigAreaW / 2, bottomY + 5 * scale)

  // No default signature — area remains EMPTY

  // Thin gold signature line (always shown — indicates where signature goes)
  stroke(GOLD, 1 * scale)
  ctx.beginPath()
  ctx.moveTo(sigAreaX + 15 * scale, bottomY + 40 * scale)
  ctx.lineTo(sigAreaX + sigAreaW - 15 * scale, bottomY + 40 * scale)
  ctx.stroke()

  // Signatory name + position — NOT shown (no signature approved yet)

  // Watermark
  ctx.save()
  ctx.globalAlpha = 0.04
  ctx.translate(cx, pageH / 2); ctx.rotate(Math.PI / 4)
  setFont(150, 'black'); fill(NAVY)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('FIA', 0, 0)
  ctx.restore()

  return await canvas.encode('png')
}

async function main() {
  const cert = {
    student_name: 'محمد علي عبده شائع',
    course_title: 'مكافحة العدوى ومكافحة الأمراض المعدية',
    certificate_number: 'FIA-2026-51994',
    issueDate: '10 أكتوبر 2026',
    verifyUrl: 'https://fiaacademy.vercel.app/?verify=FIA-2026-51994#verify',
    status: 'صالحة',
  }
  const png = await generateCertificatePNG(cert)
  const outPath = '/home/z/my-project/download/cert-preview-v4.png'
  fs.writeFileSync(outPath, png)
  console.log(`Written: ${outPath} (${png.length} bytes)`)
}

main().catch(e => { console.error(e); process.exit(1) })
