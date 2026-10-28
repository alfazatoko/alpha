/**
 * ── Studio Composer Engine (ALFAZA CELL) ──────────────────────────────────────
 * Teknologi Komposisi Studio Cerdas:
 * 1. Mengisolasi produk fisik asli (kartu perdana, voucher, aksesoris) dari latar meja kasir.
 * 2. Menghasilkan latar belakang studio komersial beresolusi tinggi (Google Imagen 3 / Preset Studio).
 * 3. Menggabungkan produk asli ke dalam studio dengan pencahayaan 3D, ambient shadow, dan watermark toko.
 * 4. JAMINAN: Produk asli toko 100% terjaga (tidak ada lagi gambar ngawur/acak).
 */

export interface StudioOptions {
  theme?: 'neon_blue' | 'luxury_dark' | 'clean_minimal' | 'telkomsel_red' | 'custom'
  customPrompt?: string
  addShadow?: boolean
  addReflection?: boolean
  storeName?: string
  apiKey?: string
}

/**
 * Memuat gambar dari dataUrl / base64 ke HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error('Gagal memuat file gambar untuk diolah: ' + e))
    img.src = src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`
  })
}

/**
 * Cerdas Mengisolasi Kartu/Produk Fisik (Adaptive Background Segmentation & Feathering)
 * Mengidentifikasi kartu fisik di bagian tengah dan memisahkan latar belakang meja toko.
 */
export async function isolateProductCard(
  imageSource: string
): Promise<{ productCanvas: HTMLCanvasElement; originalAspect: number }> {
  const img = await loadImage(imageSource)
  const origW = img.naturalWidth || img.width
  const origH = img.naturalHeight || img.height
  const originalAspect = origW / origH

  // Buat canvas pemroses beresolusi tinggi
  const canvas = document.createElement('canvas')
  canvas.width = origW
  canvas.height = origH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia')

  ctx.drawImage(img, 0, 0, origW, origH)
  const imgData = ctx.getImageData(0, 0, origW, origH)
  const data = imgData.data

  // 1. Sampel warna latar belakang dari 4 sudut gambar (meja/etalase kasir)
  const sampleRadius = Math.max(4, Math.floor(Math.min(origW, origH) * 0.03))
  const cornerColors: Array<[number, number, number]> = []

  const sampleCorner = (startX: number, startY: number) => {
    let r = 0, g = 0, b = 0, count = 0
    for (let y = startY; y < startY + sampleRadius && y < origH; y++) {
      for (let x = startX; x < startX + sampleRadius && x < origW; x++) {
        const idx = (y * origW + x) * 4
        r += data[idx]
        g += data[idx + 1]
        b += data[idx + 2]
        count++
      }
    }
    if (count > 0) cornerColors.push([r / count, g / count, b / count])
  }

  sampleCorner(0, 0) // Kiri atas
  sampleCorner(origW - sampleRadius, 0) // Kanan atas
  sampleCorner(0, origH - sampleRadius) // Kiri bawah
  sampleCorner(origW - sampleRadius, origH - sampleRadius) // Kanan bawah

  // 2. Tentukan zona aman produk di tengah (biasanya kartu voucher berada di 70-85% tengah layar)
  const centerX = origW / 2
  const centerY = origH / 2
  const maxCenterDist = Math.hypot(origW * 0.45, origH * 0.45)

  // 3. Segmentasi warna pintar dengan feathering (halus di pinggiran)
  const colorTolerance = 42

  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      const idx = (y * origW + x) * 4
      const pr = data[idx]
      const pg = data[idx + 1]
      const pb = data[idx + 2]

      // Hitung jarak dari tengah gambar
      const distFromCenter = Math.hypot(x - centerX, y - centerY)
      const centerFactor = Math.min(1, distFromCenter / maxCenterDist)

      // Cek kemiripan pixel ini dengan warna sudut latar belakang
      let minBgDiff = 999
      for (const [cr, cg, cb] of cornerColors) {
        const diff = Math.hypot(pr - cr, pg - cg, pb - cb)
        if (diff < minBgDiff) minBgDiff = diff
      }

      // Jika pixel sangat mirip dengan latar meja dan berada di luar area inti tengah
      if (minBgDiff < colorTolerance && centerFactor > 0.48) {
        // Transparansikan pixel latar belakang
        const alphaFade = Math.max(0, Math.min(1, (minBgDiff - (colorTolerance * 0.5)) / (colorTolerance * 0.5)))
        data[idx + 3] = Math.floor(data[idx + 3] * alphaFade * (1 - centerFactor))
      } else if (centerFactor > 0.88) {
        // Sudut paling tepi yang jauh dari produk difeather halus
        const edgeFade = Math.max(0, 1 - ((centerFactor - 0.88) / 0.12))
        data[idx + 3] = Math.floor(data[idx + 3] * edgeFade)
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
  return { productCanvas: canvas, originalAspect }
}

/**
 * Menghasilkan Kanvas Latar Belakang Studio Mewah (Procedural High-Resolution Studio Renderer)
 */
export function createStudioBackdrop(
  width: number,
  height: number,
  theme: StudioOptions['theme'] = 'neon_blue'
): HTMLCanvasElement {
  const bgCanvas = document.createElement('canvas')
  bgCanvas.width = width
  bgCanvas.height = height
  const ctx = bgCanvas.getContext('2d')
  if (!ctx) return bgCanvas

  if (theme === 'neon_blue') {
    // ── Tema 1: Alfaza Cyber Neon (Nuansa Konter Modern Biru-Ungu) ──
    const grad = ctx.createRadialGradient(width / 2, height * 0.35, 80, width / 2, height / 2, width * 0.75)
    grad.addColorStop(0, '#1e1b4b')
    grad.addColorStop(0.4, '#0f172a')
    grad.addColorStop(0.8, '#030712')
    grad.addColorStop(1, '#020617')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Meja etalase kaca dengan pencahayaan neon horizontal
    const podiumY = height * 0.72
    const tableGrad = ctx.createLinearGradient(0, podiumY, 0, height)
    tableGrad.addColorStop(0, 'rgba(30, 58, 138, 0.6)')
    tableGrad.addColorStop(0.15, 'rgba(15, 23, 42, 0.95)')
    tableGrad.addColorStop(1, '#020617')
    ctx.fillStyle = tableGrad
    ctx.fillRect(0, podiumY, width, height - podiumY)

    // Garis lampu neon biru menyala di tepi meja kaca
    ctx.save()
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 4
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.moveTo(width * 0.08, podiumY)
    ctx.lineTo(width * 0.92, podiumY)
    ctx.stroke()
    ctx.restore()

  } else if (theme === 'luxury_dark') {
    // ── Tema 2: Luxury Dark Wood & Gold Bokeh (Warm Premium) ──
    const grad = ctx.createRadialGradient(width / 2, height * 0.3, 50, width / 2, height / 2, width * 0.7)
    grad.addColorStop(0, '#451a03')
    grad.addColorStop(0.4, '#1c1917')
    grad.addColorStop(1, '#0c0a09')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Bokeh warm particles
    for (let i = 0; i < 24; i++) {
      const bx = (Math.sin(i * 3.7) * 0.5 + 0.5) * width
      const by = (Math.cos(i * 2.1) * 0.5 + 0.5) * (height * 0.65)
      const br = 12 + (i % 6) * 7
      const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br)
      bGrad.addColorStop(0, 'rgba(251, 191, 36, 0.25)')
      bGrad.addColorStop(1, 'rgba(251, 191, 36, 0)')
      ctx.fillStyle = bGrad
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.fill()
    }

    // Meja kayu polished
    const podiumY = height * 0.73
    const tableGrad = ctx.createLinearGradient(0, podiumY, 0, height)
    tableGrad.addColorStop(0, 'rgba(120, 53, 15, 0.5)')
    tableGrad.addColorStop(1, '#1c1917')
    ctx.fillStyle = tableGrad
    ctx.fillRect(0, podiumY, width, height - podiumY)

  } else if (theme === 'telkomsel_red') {
    // ── Tema 3: Dynamic Red & Dark Carbon (Telkomsel Style) ──
    const grad = ctx.createRadialGradient(width / 2, height * 0.35, 60, width / 2, height / 2, width * 0.8)
    grad.addColorStop(0, '#7f1d1d')
    grad.addColorStop(0.5, '#18181b')
    grad.addColorStop(1, '#09090b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Neon red edge
    const podiumY = height * 0.72
    ctx.save()
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3.5
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 16
    ctx.beginPath()
    ctx.moveTo(width * 0.1, podiumY)
    ctx.lineTo(width * 0.9, podiumY)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, podiumY, width, height - podiumY)

  } else {
    // ── Tema 4: Clean Studio Minimalist (Apple/Retail Style) ──
    const grad = ctx.createRadialGradient(width / 2, height * 0.3, 40, width / 2, height / 2, width * 0.75)
    grad.addColorStop(0, '#334155')
    grad.addColorStop(0.6, '#0f172a')
    grad.addColorStop(1, '#020617')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    const podiumY = height * 0.73
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, podiumY, width, height - podiumY)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, podiumY, width, 1)
  }

  return bgCanvas
}

/**
 * Mencoba Mengambil Latar Belakang Desain Khusus dari Google Gemini Imagen 3
 */
async function fetchGeminiStudioBackdrop(
  prompt: string,
  apiKey: string
): Promise<HTMLImageElement | null> {
  try {
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`
    const studioPrompt = `Empty professional showroom podium with modern glass showcase counter, ${prompt}, cinematic lighting, 4k advertising product photography, completely empty podium ready for product placement, clean background`
    
    const res = await fetch(imagenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: studioPrompt }],
        parameters: { sampleCount: 1, aspectRatio: "1:1" }
      })
    })

    if (res.ok) {
      const data = await res.json()
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded
      if (b64) {
        return await loadImage(`data:image/jpeg;base64,${b64}`)
      }
    }
  } catch (e) {
    console.warn('Gemini studio backdrop generator failed, using native studio backdrop:', e)
  }
  return null
}

/**
 * FUNGSI UTAMA: Komposisi Studio Cerdas (Smart Studio Composer)
 * Menyatukan produk voucher asli dengan studio profesional, bayangan 3D, dan branding toko.
 */
export async function composeSmartStudioPhoto(
  sourceImageBase64: string,
  instructionText: string,
  options: StudioOptions = {}
): Promise<{ imageUrl: string; prompt: string; isAiEdited: boolean; source: 'gemini' | 'studio' }> {
  const storeName = options.storeName || 'ALFAZA CELL'
  const promptLower = instructionText.toLowerCase()

  // 1. Tentukan tema studio berdasarkan instruksi kasir
  let selectedTheme: StudioOptions['theme'] = 'neon_blue'
  if (promptLower.includes('merah') || promptLower.includes('telkomsel')) {
    selectedTheme = 'telkomsel_red'
  } else if (promptLower.includes('emas') || promptLower.includes('kayu') || promptLower.includes('mewah') || promptLower.includes('warm')) {
    selectedTheme = 'luxury_dark'
  } else if (promptLower.includes('putih') || promptLower.includes('bersih') || promptLower.includes('minimal')) {
    selectedTheme = 'clean_minimal'
  }

  // 2. Isolasi produk kartu voucher asli
  const { productCanvas, originalAspect } = await isolateProductCard(sourceImageBase64)

  // 3. Siapkan Master Canvas Beresolusi Tinggi (1080 x 1080 Standar Katalog & WhatsApp)
  const masterW = 1080
  const masterH = 1080
  const masterCanvas = document.createElement('canvas')
  masterCanvas.width = masterW
  masterCanvas.height = masterH
  const ctx = masterCanvas.getContext('2d')
  if (!ctx) throw new Error('Tidak dapat membuat canvas komposer')

  // 4. Render Background Studio (Coba Gemini Imagen 3 jika ada API key, atau gunakan Backdrop Studio Pro)
  let bgDrawn = false
  if (options.apiKey) {
    const aiBgImg = await fetchGeminiStudioBackdrop(instructionText, options.apiKey)
    if (aiBgImg) {
      ctx.drawImage(aiBgImg, 0, 0, masterW, masterH)
      bgDrawn = true
    }
  }

  if (!bgDrawn) {
    const backdropCanvas = createStudioBackdrop(masterW, masterH, selectedTheme)
    ctx.drawImage(backdropCanvas, 0, 0)
  }

  // 5. Tentukan ukuran dan posisi produk voucher agar tampil elegan di tengah
  const maxProdW = masterW * 0.72
  const maxProdH = masterH * 0.65
  let targetW = maxProdW
  let targetH = targetW / originalAspect

  if (targetH > maxProdH) {
    targetH = maxProdH
    targetW = targetH * originalAspect
  }

  const posX = (masterW - targetW) / 2
  const posY = (masterH - targetH) / 2 - 25 // Sedikit naik di atas meja

  // 6. Gambar Bayangan 3D Alami di Bawah Produk (Realistic 3D Ambient & Contact Shadow)
  ctx.save()
  const shadowCenterY = posY + targetH + 8
  const shadowGrad = ctx.createRadialGradient(
    masterW / 2, shadowCenterY, 15,
    masterW / 2, shadowCenterY, targetW * 0.58
  )
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)')
  shadowGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)')
  shadowGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.12)')
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = shadowGrad
  ctx.beginPath()
  ctx.ellipse(masterW / 2, shadowCenterY, targetW * 0.54, 28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 7. Gambar Produk Asli yang Sudah Terisolasi (100% Produk Kartu Voucher Anda Asli)
  ctx.save()
  // Berikan sedikit kilau pencahayaan halus di sekeliling kartu
  ctx.shadowColor = selectedTheme === 'neon_blue' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(0, 0, 0, 0.4)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 6
  ctx.drawImage(productCanvas, posX, posY, targetW, targetH)
  ctx.restore()

  // 8. Berikan Lencana / Watermark Resmi Toko di Sudut Kanan Bawah
  ctx.save()
  ctx.font = '800 24px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = 8
  ctx.fillText(`📍 ${storeName}`, masterW - 40, masterH - 40)
  ctx.restore()

  // 9. Berikan Label "PROMO OFFICIAL" di Sudut Kiri Atas
  ctx.save()
  const tagText = '✨ KATALOG RESMI'
  ctx.font = '800 16px sans-serif'
  const tagW = ctx.measureText(tagText).width + 24
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 1.5
  
  // Rounded pill background
  const pillX = 36, pillY = 36, pillH = 34
  ctx.beginPath()
  ctx.roundRect(pillX, pillY, tagW, pillH, 12)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#38bdf8'
  ctx.fillText(tagText, pillX + 12, pillY + 23)
  ctx.restore()

  // 10. Konversi ke Data URL JPEG Berkualitas Tinggi
  const finalImageUrl = masterCanvas.toDataURL('image/jpeg', 0.92)

  return {
    imageUrl: finalImageUrl,
    prompt: instructionText,
    isAiEdited: true,
    source: bgDrawn ? 'gemini' : 'studio'
  }
}
