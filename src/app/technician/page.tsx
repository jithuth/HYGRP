'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import LogoutButton from '@/components/LogoutButton'
import './technician.css'

/* =========================
   Reverse Geocode (GPS → Place)
========================= */
async function reverseGeocode(lat: string, lng: string): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: { 'User-Agent': 'HYGRP-Attendance-System' },
      }
    )

    const data = await res.json()

    return (
      data.address?.suburb ||
      data.address?.neighbourhood ||
      data.address?.city ||
      data.address?.town ||
      data.address?.state ||
      'Location Unknown'
    )
  } catch {
    return 'Location Unknown'
  }
}

/* =========================
   Watermark Engine
========================= */
async function addWatermark(file: File): Promise<Blob> {
  // 1. GPS
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    })
  })

  const lat = position.coords.latitude.toFixed(6)
  const lng = position.coords.longitude.toFixed(6)

  // 2. Place name
  const place = await reverseGeocode(lat, lng)

  // 3. GMT +03 timestamp
  const now = new Date()
  const gmt3 = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const timestamp = gmt3
    .toISOString()
    .replace('T', ' ')
    .slice(0, 16)

  // 4. Load image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = URL.createObjectURL(file)
  })

  // 5. Canvas
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  // 6. Watermark text
  const lines = [
    `📍 ${place}`,
    `Lat: ${lat}, Lng: ${lng}`,
    `${timestamp} (GMT+03)`,
  ]

  const fontSize = Math.max(36, Math.floor(canvas.width / 28))
  ctx.font = `bold ${fontSize}px Arial`
  ctx.textAlign = 'center'

  const padding = 24
  const lineHeight = fontSize + 12
  const boxHeight = lines.length * lineHeight + padding * 2
  const boxY = canvas.height - boxHeight - 30

  // Background box
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(canvas.width * 0.1, boxY, canvas.width * 0.8, boxHeight)

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 3

  let y = boxY + padding + fontSize

  for (const line of lines) {
    ctx.strokeText(line, canvas.width / 2, y)
    ctx.fillText(line, canvas.width / 2, y)
    y += lineHeight
  }

  // 7. Export
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
  })
}

/* =========================
   Technician Page
========================= */
export default function TechnicianDashboard() {
  const [attendance, setAttendance] = useState<any>(null)
  const [remarks, setRemarks] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

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

        {!attendance && (
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />
        )}

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
