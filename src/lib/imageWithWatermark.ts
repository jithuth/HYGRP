export async function processImageWithWatermark(
    file: File,
    watermarkText: string
  ): Promise<File> {
    const img = await createImageBitmap(file)
  
    const maxWidth = 1280
    let { width, height } = img
  
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width)
      width = maxWidth
    }
  
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
  
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
  
    ctx.drawImage(img, 0, 0, width, height)
  
    // Multi-line watermark
    const lines = watermarkText.split('\n').map(l => l.trim()).filter(Boolean)
  
    const fontSize = Math.max(24, Math.floor(width * 0.024)) // big and readable
    const lineHeight = Math.floor(fontSize * 1.25)
    const padding = Math.floor(fontSize * 0.7)
    const boxHeight = lines.length * lineHeight + padding * 2
  
    // Background bar
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, height - boxHeight, width, boxHeight)
  
    // Text styling
    ctx.font = `bold ${fontSize}px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
  
    // Draw each line centered
    const startY = height - boxHeight + padding
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight)
    })
  
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.7)
    )
  
    return new File([blob], `attendance-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  }
  