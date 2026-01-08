'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { processImageWithWatermark } from '@/lib/imageWithWatermark'
import { reverseGeocode } from '@/lib/reverseGeocode'
import { detectFace } from '@/lib/faceDetection'
import './technician-attendance.css'

const round5 = (v: number) => Number(v.toFixed(5))

export default function TechnicianAttendance() {
  const [photo, setPhoto] = useState<File | null>(null)
  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [attendanceCompleted, setAttendanceCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    checkTodayAttendance()
  }, [])

  /* 🔍 Detect today attendance */
  const checkTodayAttendance = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from('attendance')
      .select('id, check_out')
      .eq('user_id', auth.user.id)
      .eq('work_date', today)
      .maybeSingle()

    if (!data) return

    if (data.check_out) {
      setAttendanceCompleted(true)
      setStatus('Attendance already completed for today')
    } else {
      setAttendanceId(data.id)
      setStatus('You are already checked in')
    }
  }

  /* 📍 GPS */
  const getLocation = (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            lat: round5(p.coords.latitude),
            lon: round5(p.coords.longitude),
          }),
        reject,
        { enableHighAccuracy: true, timeout: 15000 }
      )
    )

  /* 📸 Camera + face validation */
  const handlePhotoSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Invalid file')
      return
    }

    setLoading(true)
    setStatus('Validating photo…')

    try {
      const hasFace = await detectFace(file)
      if (!hasFace) {
        alert('No face detected. Please take a clear selfie.')
        setLoading(false)
        return
      }

      setPhoto(file)
      setStatus('Photo verified')
    } catch {
      alert('Unable to verify photo')
    } finally {
      setLoading(false)
    }
  }

  /* 📤 Upload with watermark */
  const uploadWatermarkedPhoto = async (
    file: File,
    type: 'CHECK-IN' | 'CHECK-OUT',
    lat: number,
    lon: number
  ) => {
    const time = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Kuwait',
      hour12: false,
    })

    const place = await reverseGeocode(lat, lon)

    const watermark = [
      `${type} | ${time}`,
      place,
      `Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}`,
    ].join('\n')

    const processed = await processImageWithWatermark(file, watermark)

    const path = `attendance/${crypto.randomUUID()}.jpg`

    const { error } = await supabase.storage
      .from('attendance-photos')
      .upload(path, processed, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) throw error
    return path
  }

  /* ✅ CHECK-IN */
  const handleCheckIn = async () => {
    if (!photo) return alert('Photo required')

    setLoading(true)
    setStatus('Checking in…')

    try {
      const { user } = (await supabase.auth.getUser()).data
      if (!user) throw new Error('Not logged in')

      const today = new Date().toISOString().slice(0, 10)

      const { data: existing } = await supabase
        .from('attendance')
        .select('id, check_out')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .maybeSingle()

      if (existing) {
        alert('Attendance already exists for today')
        setLoading(false)
        return
      }

      const { lat, lon } = await getLocation()
      const photoPath = await uploadWatermarkedPhoto(photo, 'CHECK-IN', lat, lon)

      const FullName =
        user.user_metadata?.full_name ||
        user.email ||
        'Technician'

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
      alert(e.message || 'Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  /* ❌ CHECK-OUT */
  const handleCheckOut = async () => {
    if (!photo || !attendanceId) return alert('Photo required')

    setLoading(true)
    setStatus('Checking out…')

    try {
      const { lat, lon } = await getLocation()
      const photoPath = await uploadWatermarkedPhoto(photo, 'CHECK-OUT', lat, lon)

      await supabase
        .from('attendance')
        .update({
          check_out: new Date().toISOString(),
          check_out_latitude: lat,
          check_out_longitude: lon,
          check_out_photo: photoPath,
        })
        .eq('id', attendanceId)

      setAttendanceCompleted(true)
      setAttendanceId(null)
      setPhoto(null)
      setStatus('Attendance completed for today')
    } catch (e: any) {
      alert(e.message || 'Check-out failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tech-container">
      <div className="card">
        <h1>Attendance</h1>
        <p className="info">{status || 'Ready'}</p>

        {!attendanceCompleted && (
          <>
            <label className="upload">
              Take Photo
              <input
                type="file"
                accept="image/*"
                 capture="user"
                disabled={loading}
                onChange={(e) =>
                  e.target.files && handlePhotoSelect(e.target.files[0])
                }
              />
            </label>

            {photo && (
              <img
                src={URL.createObjectURL(photo)}
                className="preview"
              />
            )}
          </>
        )}

        {!attendanceCompleted && !attendanceId && (
          <button className="btn checkin" onClick={handleCheckIn} disabled={loading}>
            Check In
          </button>
        )}

        {!attendanceCompleted && attendanceId && (
          <button className="btn checkout" onClick={handleCheckOut} disabled={loading}>
            Check Out
          </button>
        )}

        {attendanceCompleted && (
          <p className="done">Attendance completed for today</p>
        )}
      </div>
    </div>
  )
}
