export async function addWatermark(
    file: File
  ): Promise<Blob> {
    // 1. Get GPS location
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    })
  
    const lat = position.coords.latitude.toFixed(6)
    const lng = position.coords.longitude.toFixed(6)
  
    // 2. Get GMT+03 timestamp
    const now = new Date()
    const gmt3 = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  
    const timestamp = gmt3
      .toISOString()
      .replace('T', ' ')
      .slice(0, 16)
  
    // 3. Load image
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = URL.createObjectURL(file)
    })
  
    // 4. Draw on canvas
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
  
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
  
    // 5. Watermark style
    const padding = 20
    ctx.font = 'bold 32px Arial'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.lineWidth = 4
  
    const lines = [
      `${timestamp} (GMT+03)`,
      `Lat: ${lat}`,
      `Lng: ${lng}`,
    ]
  
    let y = canvas.height - padding - lines.length * 40
  
    for (const line of lines) {
      ctx.strokeText(line, padding, y)
      ctx.fillText(line, padding, y)
      y += 40
    }
  
    // 6. Export image
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
    })
  }
  