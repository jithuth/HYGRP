'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { compressImage } from '@/lib/imageCompress'
import './technician-attendance.css'

export default function TechnicianAttendance() {
  const [photo, setPhoto] = useState<File | null>(null)
  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  /* 🔍 Check if already checked-in today */
  useEffect(() => {
    detectOpenAttendance()
  }, [])

  const detectOpenAttendance = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('work_date', today)
      .is('check_out', null)
      .maybeSingle()

    if (data) setAttendanceId(data.id)
  }

  /* 📍 GPS */
  const getLocation = (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            lat: p.coords.latitude,
            lon: p.coords.longitude,
          }),
        reject,
        { enableHighAccuracy: true }
      )
    )

  /* 📸 Upload (compressed) */
  const uploadPhoto = async (file: File) => {
    const compressed = await compressImage(file)
    const path = `attendance/${crypto.randomUUID()}.jpg`

    const { error } = await supabase.storage
      .from('attendance-photos')
      .upload(path, compressed, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) throw error
    return path
  }

  /* ✅ CHECK-IN */
  const handleCheckIn = async () => {
    if (!photo) {
      alert('Upload photo required')
      return
    }

    setLoading(true)
    setStatus('Checking in...')

    try {
      const { user } = (await supabase.auth.getUser()).data
      if (!user) throw new Error('Not authenticated')

      const { lat, lon } = await getLocation()
      const photoPath = await uploadPhoto(photo)

      const FullName =
        user.user_metadata?.full_name ||
        user.email ||
        'Technician'

      const today = new Date().toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          FullName,
          work_date: today,
          check_in: new Date().toISOString(),
          check_in_latitude: lat,
          check_in_longitude: lon,
          check_in_photo: photoPath,
        })
        .select()
        .single()

      if (error) throw error

      setAttendanceId(data.id)
      setPhoto(null)
      setStatus('Checked in successfully')
    } catch (e: any) {
      alert(e.message)
    }

    setLoading(false)
  }

  /* ❌ CHECK-OUT */
  const handleCheckOut = async () => {
    if (!photo || !attendanceId) {
      alert('Upload photo required')
      return
    }

    setLoading(true)
    setStatus('Checking out...')

    try {
      const { lat, lon } = await getLocation()
      const photoPath = await uploadPhoto(photo)

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: new Date().toISOString(),
          check_out_latitude: lat,
          check_out_longitude: lon,
          check_out_photo: photoPath,
        })
        .eq('id', attendanceId)

      if (error) throw error

      setAttendanceId(null)
      setPhoto(null)
      setStatus('Checked out successfully')
    } catch (e: any) {
      alert(e.message)
    }

    setLoading(false)
  }

  return (
    <div className="tech-container">
      <div className="card">
        <h1>Attendance</h1>

        <p className="info">
          {attendanceId
            ? 'You are checked in'
            : 'You are not checked in'}
        </p>

        <label className="upload">
          Upload Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) =>
              e.target.files && setPhoto(e.target.files[0])
            }
          />
        </label>

        {photo && (
          <img
            src={URL.createObjectURL(photo)}
            className="preview"
          />
        )}

        {!attendanceId ? (
          <button
            className="btn checkin"
            disabled={loading}
            onClick={handleCheckIn}
          >
            Check In
          </button>
        ) : (
          <button
            className="btn checkout"
            disabled={loading}
            onClick={handleCheckOut}
          >
            Check Out
          </button>
        )}

        {status && <p className="status">{status}</p>}
      </div>
    </div>
  )
}
