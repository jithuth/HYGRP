'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import LogoutButton from '@/components/LogoutButton'
import './technician.css'

/* =========================
   WATERMARK HELPER
========================= */
async function addWatermark(file: File): Promise<Blob> {
  // 1. Get GPS
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    })
  })

  const lat = position.coords.latitude.toFixed(6)
  const lng = position.coords.longitude.toFixed(6)

  // 2. GMT +03 timestamp
  const now = new Date()
  const gmt3 = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const timestamp = gmt3.toISOString().replace('T', ' ').slice(0, 16)

  // 3. Load image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = URL.createObjectURL(file)
  })

  // 4. Canvas
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  // 5. Watermark style
  ctx.font = 'bold 32px Arial'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'
  ctx.lineWidth = 4

  const lines = [
    `${timestamp} (GMT+03)`,
    `Lat: ${lat}`,
    `Lng: ${lng}`,
  ]

  let y = canvas.height - 120
  for (const line of lines) {
    ctx.strokeText(line, 20, y)
    ctx.fillText(line, 20, y)
    y += 40
  }

  // 6. Export
  return await new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      'image/jpeg',
      0.9
    )
  })
}

/* =========================
   TECHNICIAN PAGE
========================= */
export default function TechnicianDashboard() {
  const [attendance, setAttendance] = useState<any>(null)
  const [remarks, setRemarks] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    loadAttendance()
  }, [])

  const loadAttendance = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .maybeSingle()

    setAttendance(data)
    setRemarks(data?.remarks || '')
  }

  const uploadPhoto = async (userId: string) => {
    if (!photo) return null

    try {
      const watermarked = await addWatermark(photo)
      const path = `${userId}/${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from('attendance-photos')
        .upload(path, watermarked, {
          contentType: 'image/jpeg',
        })

      if (error) throw error
      return data.path
    } catch {
      alert('GPS permission is required to upload attendance photo.')
      return null
    }
  }

  const checkIn = async () => {
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const photoPath = await uploadPhoto(user.id)
    if (!photoPath) {
      setLoading(false)
      return
    }

    await supabase.from('attendance').insert({
      user_id: user.id,
      work_date: today,
      check_in: new Date().toISOString(),
      remarks,
      photo_url: photoPath,
    })

    setLoading(false)
    loadAttendance()
  }

  const checkOut = async () => {
    if (!attendance?.check_in) return

    setLoading(true)

    await supabase
      .from('attendance')
      .update({
        check_out: new Date().toISOString(),
        remarks,
      })
      .eq('id', attendance.id)

    setLoading(false)
    loadAttendance()
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Technician Attendance</h1>
        <LogoutButton />
      </header>

      <div className="attendance-card">
        <textarea
          placeholder="Remarks / Notes"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files?.[0] || null)}
        />

        {error && <div className="error">{error}</div>}

        {!attendance && (
          <button onClick={checkIn} disabled={loading}>
            {loading ? 'Checking In…' : 'Check In'}
          </button>
        )}

        {attendance && !attendance.check_out && (
          <button onClick={checkOut} disabled={loading}>
            {loading ? 'Checking Out…' : 'Check Out'}
          </button>
        )}

        {attendance?.check_in && (
          <p>
            Check-In:{' '}
            {new Date(attendance.check_in).toLocaleTimeString()}
          </p>
        )}

        {attendance?.check_out && (
          <p>
            Check-Out:{' '}
            {new Date(attendance.check_out).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}
