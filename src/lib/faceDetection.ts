export async function detectFace(file: File): Promise<boolean> {
    // Browser support check (Chrome / Edge / Android OK)
    // iOS Safari will skip this gracefully
    // @ts-ignore
    if (!('FaceDetector' in window)) {
      console.warn('FaceDetector not supported – skipping face validation')
      return true
    }
  
    // @ts-ignore
    const detector = new window.FaceDetector({
      fastMode: true,
      maxDetectedFaces: 1,
    })
  
    const bitmap = await createImageBitmap(file)
    const faces = await detector.detect(bitmap)
  
    return faces.length > 0
  }
  