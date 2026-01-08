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
  
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, width, height)
  
    // 🔥 Watermark background
    const padding = 20
    const fontSize = Math.max(22, width * 0.025)
    ctx.font = `bold ${fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
  
    const textY = height - padding
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(
      0,
      height - fontSize * 2.2,
      width,
      fontSize * 2.2
    )
  
    // 🔥 Watermark text
    ctx.fillStyle = '#ffffff'
    ctx.fillText(watermarkText, width / 2, textY)
  
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob(
        (b) => resolve(b as Blob),
        'image/jpeg',
        0.7
      )
    )
  
    return new File([blob], `attendance-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  }
  