// Extract blue signature using cluster detection — only dense blue areas are kept
const { loadImage, createCanvas } = require('@napi-rs/canvas')
const fs = require('fs')

async function extractSignature() {
  const imgBuf = fs.readFileSync('/home/z/my-project/upload/file_0000000016c88208bb8c9467c0d4b283.png')
  const img = await loadImage(imgBuf)
  console.log('Source image:', img.width, 'x', img.height)

  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, img.width, img.height)
  const data = imageData.data

  // Step 1: Mark all "blue ink" candidate pixels
  const blueMask = new Uint8Array(img.width * img.height)
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a < 128) continue
      // Very strict blue detection
      if (b > 100 && b > r + 80 && b > g + 40 && r < 80) {
        blueMask[y * img.width + x] = 1
      }
    }
  }

  // Step 2: Use density-based filtering — keep only pixels in dense clusters
  // For each candidate pixel, check if there are at least N neighbors in a window
  const filteredMask = new Uint8Array(img.width * img.height)
  const windowSize = 10 // 21x21 window around each pixel
  const minNeighbors = 15 // need at least this many blue pixels in window
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = y * img.width + x
      if (!blueMask[idx]) continue
      // Count neighbors
      let count = 0
      for (let dy = -windowSize; dy <= windowSize; dy++) {
        for (let dx = -windowSize; dx <= windowSize; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= img.width || ny >= img.height) continue
          if (blueMask[ny * img.width + nx]) count++
        }
      }
      if (count >= minNeighbors) {
        filteredMask[idx] = 1
      }
    }
  }

  // Step 3: Apply mask to image — keep only dense blue signature pixels
  let blueCount = 0
  for (let i = 0; i < data.length; i += 4) {
    const maskIdx = i / 4
    if (filteredMask[maskIdx]) {
      // Set to royal blue ink color
      data[i] = 0      // R
      data[i + 1] = 71  // G
      data[i + 2] = 171 // B
      data[i + 3] = 255
      blueCount++
    } else {
      data[i + 3] = 0
    }
  }
  console.log(`Dense blue ink pixels kept: ${blueCount}`)
  ctx.putImageData(imageData, 0, 0)

  // Step 4: Find tight bounding box
  let minX = img.width, maxX = 0, minY = img.height, maxY = 0
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (filteredMask[y * img.width + x]) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    console.error('No signature found!')
    process.exit(1)
  }

  const padding = 30
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(img.width, maxX + padding)
  maxY = Math.min(img.height, maxY + padding)
  const cropW = maxX - minX, cropH = maxY - minY
  console.log(`Signature bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY}) — ${cropW}x${cropH}px`)

  const sigCanvas = createCanvas(cropW, cropH)
  const sigCtx = sigCanvas.getContext('2d')
  sigCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH)

  const outPath = '/home/z/my-project/public/fia/signature-hani.png'
  const pngBuffer = await sigCanvas.encode('png')
  fs.writeFileSync(outPath, pngBuffer)
  console.log(`Signature extracted to: ${outPath} (${pngBuffer.length} bytes)`)
}

extractSignature().catch(e => { console.error(e); process.exit(1) })
