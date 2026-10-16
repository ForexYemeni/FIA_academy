// Generate clean signature PNG using the same drawGelPenSignature function
// This produces identical signature to what was in the uploaded image
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas')
const fs = require('fs')
const path = require('path')

const SIG_BLUE = '#0047AB'

// Register fonts
const fontsDir = '/home/z/my-project/.fonts'
if (fs.existsSync(path.join(fontsDir, 'Cairo-Regular.ttf'))) {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Regular.ttf'), 'Cairo')
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Bold.ttf'), 'Cairo-Bold')
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo-Black.ttf'), 'Cairo-Black')
}

// Same drawGelPenSignature function from the certificate generator (compact version)
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

async function generateSignaturePNG() {
  const scale = 2
  const canvasW = 250 * scale
  const canvasH = 80 * scale
  const canvas = createCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')
  
  // Transparent background — only the blue signature strokes
  ctx.clearRect(0, 0, canvasW, canvasH)
  
  // Draw signature centered in the canvas
  const sigWidth = 200 * scale
  const startX = (canvasW - sigWidth) / 2 + 10 * scale
  const centerY = canvasH / 2 - 5 * scale
  drawGelPenSignature(ctx, startX, centerY, sigWidth, scale)
  
  const outPath = '/home/z/my-project/public/fia/signature-hani.png'
  const pngBuffer = await canvas.encode('png')
  fs.writeFileSync(outPath, pngBuffer)
  console.log(`Clean signature generated: ${outPath} (${pngBuffer.length} bytes)`)
}

generateSignaturePNG().catch(e => { console.error(e); process.exit(1) })
