export async function compressImage(
    file: File,
    maxWidth = 1280,
    quality = 0.7
  ): Promise<File> {
    const bitmap = await createImageBitmap(file)
  
    let { width, height } = bitmap
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width)
      width = maxWidth
    }
  
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
  
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
  
    ctx.drawImage(bitmap, 0, 0, width, height)
  
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob(
        (b) => resolve(b as Blob),
        'image/jpeg',
        quality
      )
    )
  
    return new File([blob], `photo-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  }
  