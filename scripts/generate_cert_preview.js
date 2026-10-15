// Standalone certificate PNG preview generator — for visual verification
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas')
const fs = require('fs')
const path = require('path')
const QRCode = require('qrcode')
const bwip = require('bwip-js')

// Palette
const NAVY_DEEP = '#001F3F'
const NAVY_DARK = '#00162B'
const NAVY = '#002147'
const GOLD = '#D4AF37'
const GOLD_BRIGHT = '#FFD700'
const GOLD_DARK = '#8B6428'
const GOLD_LIGHT = '#E5C77E'
const GOLD_PALE = '#F5E5B3'
const CREAM = '#FDFAF6'
const CREAM_DEEP = '#F5EBD5'
const EMERALD = '#28A745'
const LIGHT_GREEN = '#D4EDDA'
const GRAY_DARK = '#333333'
const GRAY = '#666666'
const GRAY_BG = '#F3F4F6'
const WHITE = '#FFFFFF'
const SIG_BLUE = '#0047AB'

// Register fonts
const fontsDir = '/home/z/my-project/.fonts'
if (fs.existsSync(path.join(fontsDir, 'Cairo-Regular.ttf'))) {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Regular.ttf'), 'Cairo')
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Bold.ttf'), 'Cairo-Bold')
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Black.ttf'), 'Cairo-Black')
}

async function generateBarcode(certNumber) {
  try {
    return await bwip.toBuffer({
      bcid: 'code128', text: certNumber, scale: 2, height: 20,
      includetext: false, paddingwidth: 3, paddingheight: 3,
      backgroundcolor: 'FFFFFF', foregroundcolor: '001F3F',
    })
  } catch (e) {
    const canvas = createCanvas(200, 50)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 200, 50)
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

async function generateQR(url) {
  return await QRCode.toBuffer(url, { type: 'png', width: 200, margin: 1, color: { dark: NAVY_DEEP, light: WHITE } })
}

function drawGelPenSignature(ctx, startX, centerY, width, scale) {
  const ink = SIG_BLUE
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const steps = 200
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps, t2 = (i + 1) / steps
    const x1 = startX + width * t1, x2 = startX + width * t2
    // REDUCED amplitudes (compact signature)
    const y1 = centerY + Math.sin(t1 * Math.PI * 5) * 10 * scale + Math.sin(t1 * Math.PI * 11) * 4 * scale + Math.cos(t1 * Math.PI * 3) * 7 * scale
    const y2 = centerY + Math.sin(t2 * Math.PI * 5) * 10 * scale + Math.sin(t2 * Math.PI * 11) * 4 * scale + Math.cos(t2 * Math.PI * 3) * 7 * scale
    const pressure = Math.abs(y2 - y1) > 0.15 ? 3.5 : 2
    ctx.strokeStyle = ink; ctx.lineWidth = pressure * scale
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  }
  // Small left flourish — REDUCED
  ctx.strokeStyle = ink; ctx.lineWidth = 2.5 * scale
  ctx.beginPath()
  ctx.moveTo(startX - 8 * scale, centerY - 12 * scale)
  ctx.bezierCurveTo(startX - 16 * scale, centerY - 28 * scale, startX + 4 * scale, centerY - 30 * scale, startX + 6 * scale, centerY - 14 * scale)
  ctx.stroke()
  // Small right end flourish — REDUCED
  ctx.lineWidth = 3 * scale
  ctx.beginPath()
  ctx.moveTo(startX + width, centerY)
  ctx.bezierCurveTo(startX + width + 16 * scale, centerY - 16 * scale, startX + width + 22 * scale, centerY + 4 * scale, startX + width + 8 * scale, centerY + 6 * scale)
  ctx.stroke()
  // Underscore — REDUCED length
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

  // ===== Outer navy background =====
  fill(NAVY_DEEP); ctx.fillRect(0, 0, pageW, pageH)

  // ===== Inner cream card (with shadow) =====
  const cardPad = 30 * scale
  const cardX = cardPad, cardY = cardPad
  const cardW = pageW - 2 * cardPad, cardH = pageH - 2 * cardPad

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 15 * scale; ctx.shadowOffsetY = 5 * scale
  fillRoundRect(cardX, cardY, cardW, cardH, 14 * scale, CREAM)
  ctx.restore()

  // ===== Double gold frame =====
  strokeRoundRect(cardX + 6 * scale, cardY + 6 * scale, cardW - 12 * scale, cardH - 12 * scale, 10 * scale, GOLD, 1.5 * scale)
  strokeRoundRect(cardX + 18 * scale, cardY + 18 * scale, cardW - 36 * scale, cardH - 36 * scale, 6 * scale, GOLD, 3.5 * scale)

  // ===== Corner ornaments =====
  const cornerInset = 24 * scale
  const cornerSize = 30 * scale
  const drawCorner = (x, y, sx, sy) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5 * scale
    ctx.beginPath()
    ctx.moveTo(0, cornerSize)
    ctx.bezierCurveTo(0, cornerSize * 0.3, cornerSize * 0.3, 0, cornerSize, 0)
    ctx.stroke()
    ctx.strokeStyle = GOLD_LIGHT; ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    ctx.moveTo(cornerSize * 0.2, cornerSize * 0.8)
    ctx.bezierCurveTo(cornerSize * 0.3, cornerSize * 0.4, cornerSize * 0.5, cornerSize * 0.25, cornerSize * 0.8, cornerSize * 0.2)
    ctx.stroke()
    ctx.fillStyle = GOLD
    ctx.beginPath()
    ctx.arc(cornerSize * 0.15, cornerSize * 0.85, 2 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  drawCorner(cardX + cornerInset, cardY + cornerInset, 1, 1)
  drawCorner(cardX + cardW - cornerInset, cardY + cornerInset, -1, 1)
  drawCorner(cardX + cornerInset, cardY + cardH - cornerInset, 1, -1)
  drawCorner(cardX + cardW - cornerInset, cardY + cardH - cornerInset, -1, -1)

  // ===== Logo (top-right) =====
  const logoSize = 80 * scale
  const logoX = cardX + cardW - logoSize - 35 * scale
  const logoY = cardY + 40 * scale
  const logoPath = '/home/z/my-project/public/fia/logo-official.png'
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath)
    const logoImg = await loadImage(logoBuffer)
    fillRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 8 * scale, WHITE)
    strokeRoundRect(logoX - 6 * scale, logoY - 6 * scale, logoSize + 12 * scale, logoSize + 12 * scale, 8 * scale, GOLD, 1.5 * scale)
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
  }

  // ===== Title block =====
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'

  setFont(38, 'bold'); fill(NAVY_DEEP)
  ctx.fillText(cert.issued_by || 'أكاديمية المستقبل الدولية', cx, cardY + 80 * scale)

  ctx.direction = 'ltr'; setFont(13, 'bold'); fill(GOLD)
  ctx.fillText('F U T U R E   I N T E R N A T I O N A L   A C A D E M Y', cx, cardY + 115 * scale)

  // Divider
  const dividerY = cardY + 145 * scale
  stroke(GOLD, 1.5 * scale)
  ctx.beginPath()
  ctx.moveTo(cx - 110 * scale, dividerY); ctx.lineTo(cx - 14 * scale, dividerY)
  ctx.moveTo(cx + 14 * scale, dividerY); ctx.lineTo(cx + 110 * scale, dividerY)
  ctx.stroke()
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, dividerY - 7 * scale)
  ctx.lineTo(cx + 7 * scale, dividerY)
  ctx.lineTo(cx, dividerY + 7 * scale)
  ctx.lineTo(cx - 7 * scale, dividerY)
  ctx.closePath(); ctx.fill()

  // Certification statement
  ctx.direction = 'rtl'; setFont(15, 'regular'); fill(GRAY_DARK)
  ctx.fillText('تُشهد أكاديمية المستقبل الدولية بأن', cx, cardY + 175 * scale)

  // Student name (LARGEST)
  setFont(44, 'black'); fill(NAVY_DEEP)
  ctx.fillText(cert.student_name || 'طالب', cx, cardY + 225 * scale)

  // Completion phrase
  setFont(15, 'regular'); fill(GRAY_DARK)
  ctx.fillText('قد أتم بنجاح دورة', cx, cardY + 270 * scale)

  // ===== Course banner =====
  const ribbonY = cardY + 295 * scale
  const ribbonH = 45 * scale
  setFont(22, 'bold')
  const courseText = cert.course_title || 'دورة معتمدة'
  const textW = ctx.measureText(courseText).width
  const ribbonPadX = 40 * scale
  const ribbonW = Math.max(textW + 100 * scale + ribbonPadX * 2, 300 * scale)
  const ribbonX = cx - ribbonW / 2

  fill(NAVY_DEEP)
  ctx.beginPath()
  ctx.moveTo(ribbonX + 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX + 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX, ribbonY + ribbonH / 2)
  ctx.closePath(); ctx.fill()

  stroke(GOLD, 2.5 * scale)
  ctx.beginPath()
  ctx.moveTo(ribbonX + 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY)
  ctx.lineTo(ribbonX + ribbonW, ribbonY + ribbonH / 2)
  ctx.lineTo(ribbonX + ribbonW - 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX + 18 * scale, ribbonY + ribbonH)
  ctx.lineTo(ribbonX, ribbonY + ribbonH / 2)
  ctx.closePath(); ctx.stroke()

  fill(GOLD_BRIGHT)
  ctx.fillText(courseText, cx, ribbonY + ribbonH / 2 + 1 * scale)

  // Diamond below ribbon
  const belowRibbonY = ribbonY + ribbonH + 18 * scale
  fill(GOLD)
  ctx.beginPath()
  ctx.moveTo(cx, belowRibbonY - 4 * scale)
  ctx.lineTo(cx + 4 * scale, belowRibbonY)
  ctx.lineTo(cx, belowRibbonY + 4 * scale)
  ctx.lineTo(cx - 4 * scale, belowRibbonY)
  ctx.closePath(); ctx.fill()

  // ===== Info cards (3) =====
  const colsY = cardY + 380 * scale
  const colsH = 50 * scale
  const colW = 200 * scale
  const colGap = 15 * scale
  const totalColsW = 3 * colW + 2 * colGap
  const colsStartX = cx - totalColsW / 2

  // Card 1
  fillRoundRect(colsStartX, colsY, colW, colsH, 10 * scale, WHITE)
  strokeRoundRect(colsStartX, colsY, colW, colsH, 10 * scale, GOLD, 1.5 * scale)
  fillRoundRect(colsStartX + 10 * scale, colsY + 8 * scale, 34 * scale, 34 * scale, 17 * scale, GOLD)
  ctx.fillStyle = WHITE; ctx.font = `${18 * scale}px Cairo-Bold`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('📅', colsStartX + 27 * scale, colsY + 25 * scale)
  ctx.direction = 'rtl'; setFont(10, 'regular'); fill(GRAY); ctx.textAlign = 'right'
  ctx.fillText('تاريخ الإصدار', colsStartX + colW - 12 * scale, colsY + 15 * scale)
  setFont(13, 'bold'); fill(NAVY_DEEP)
  ctx.fillText(cert.issueDate, colsStartX + colW - 12 * scale, colsY + 34 * scale)

  // Card 2
  const col2X = colsStartX + colW + colGap
  fillRoundRect(col2X, colsY, colW, colsH, 10 * scale, WHITE)
  strokeRoundRect(col2X, colsY, colW, colsH, 10 * scale, GOLD, 1.5 * scale)
  fillRoundRect(col2X + 10 * scale, colsY + 8 * scale, 34 * scale, 34 * scale, 17 * scale, GOLD)
  ctx.fillStyle = WHITE
  ctx.fillText('🎓', col2X + 27 * scale, colsY + 25 * scale)
  ctx.direction = 'rtl'; setFont(10, 'regular'); fill(GRAY); ctx.textAlign = 'right'
  ctx.fillText('الجهة المصدرة', col2X + colW - 12 * scale, colsY + 15 * scale)
  setFont(13, 'bold'); fill(NAVY_DEEP)
  ctx.fillText('أكاديمية المستقبل الدولية', col2X + colW - 12 * scale, colsY + 34 * scale)

  // Card 3: Status — REDESIGNED with status PROMINENTLY in CENTER
  const col3X = colsStartX + 2 * (colW + colGap)
  const isRevoked = cert.status === 'ملغاة' || cert.status === 'ملغي'
  const statusColor = isRevoked ? '#DC3545' : EMERALD
  const statusBgColor = isRevoked ? '#F8D7DA' : '#D4EDDA'
  const statusText = isRevoked ? 'ملغي' : 'صالح'

  fillRoundRect(col3X, colsY, colW, colsH, 10 * scale, statusBgColor)
  strokeRoundRect(col3X, colsY, colW, colsH, 10 * scale, statusColor, 2 * scale)

  // Status icon — circle with checkmark (صالح) or X (ملغي)
  const iconCenterX = col3X + colW / 2
  const iconCenterY = colsY + 15 * scale
  const iconR = 9 * scale
  fillRoundRect(iconCenterX - iconR, iconCenterY - iconR, iconR * 2, iconR * 2, iconR, statusColor)
  ctx.fillStyle = WHITE
  ctx.font = `${11 * scale}px Cairo-Bold`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(isRevoked ? '✕' : '✓', iconCenterX, iconCenterY + 1 * scale)

  // Status label
  ctx.direction = 'rtl'; setFont(8, 'regular'); fill('#6C757D'); ctx.textAlign = 'center'
  ctx.fillText('الحالة', col3X + colW / 2, colsY + 32 * scale)

  // Status value — prominent, colored, centered
  setFont(13, 'bold'); fill(statusColor)
  ctx.fillText(statusText, col3X + colW / 2, colsY + 44 * scale)

  // ===== Bottom: Centered signature only (NO QR, NO BARCODE, NO NAME/TITLE) =====
  const bottomY = cardY + 445 * scale

  // Top label centered above signature
  setFont(12, 'bold'); fill(GOLD_DARK); ctx.textAlign = 'center'; ctx.direction = 'rtl'
  ctx.fillText('توقيع الجهة المانوحة', cx, bottomY)

  // Royal blue gel-pen signature — centered
  const sigWidth = 200 * scale
  const sigStartX = cx - sigWidth / 2
  const sigCenterY = bottomY + 35 * scale
  drawGelPenSignature(ctx, sigStartX, sigCenterY, sigWidth, scale)

  // ===== Watermark =====
  ctx.save()
  ctx.globalAlpha = 0.05
  ctx.translate(cx, pageH / 2)
  ctx.rotate(Math.PI / 4)
  setFont(140, 'black'); fill(NAVY_DEEP)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('FIA', 0, 0)
  ctx.restore()

  return await canvas.encode('png')
}

async function main() {
  const cert = {
    student_name: 'محمد علي عبده شائع الخربة',
    course_title: 'أساسيات التمريض السريري',
    certificate_number: 'FIA-2026-51994',
    issued_by: 'أكاديمية المستقبل الدولية',
    issueDate: '15 أكتوبر 2026',
    verifyUrl: 'https://fiaacademy.vercel.app/?verify=FIA-2026-51994#verify',
    status: 'صالحة',
  }
  const png = await generateCertificatePNG(cert)
  const outPath = '/home/z/my-project/download/cert-preview-v3.png'
  fs.writeFileSync(outPath, png)
  console.log(`Written: ${outPath} (${png.length} bytes)`)
}

main().catch(e => { console.error(e); process.exit(1) })
