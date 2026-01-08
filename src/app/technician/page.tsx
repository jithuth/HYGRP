'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import './technician-attendance.css'

export default function TechnicianAttendance() {
  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

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
      .gte('check_in', `${today}T00:00:00`)
      .is('check_out', null)
      .maybeSingle()

    if (data) setAttendanceId(data.id)
  }

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

  const uploadPhoto = async (file: File) => {
    const path = `attendance/${Date.now()}-${file.name}`
    await supabase.storage.from('attendance-photos').upload(path, file)
    return path
  }

  const getFullName = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    return data?.full_name ?? 'Unknown'
  }

  const handleCheckIn = async () => {
    if (!photo) {
      alert('Please upload a photo')
      return
    }

    setLoading(true)
    setStatus('Checking in...')

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { lat, lon } = await getLocation()
    const photoPath = await uploadPhoto(photo)
    const FullName = await getFullName(auth.user.id)

    const { data } = await supabase
      .from('attendance')
      .insert({
        user_id: auth.user.id,
        FullName,
        check_in: new Date().toISOString(),
        check_in_latitude: lat,
        check_in_longitude: lon,
        check_in_photo: photoPath,
      })
      .select()
      .single()

    setAttendanceId(data.id)
    setPhoto(null)
    setStatus('Checked in successfully')
    setLoading(false)
  }

  const handleCheckOut = async () => {
    if (!photo || !attendanceId) {
      alert('Please upload a photo')
      return
    }

    setLoading(true)
    setStatus('Checking out...')

    const { lat, lon } = await getLocation()
    const photoPath = await uploadPhoto(photo)

    await supabase
      .from('attendance')
      .update({
        check_out: new Date().toISOString(),
        check_out_latitude: lat,
        check_out_longitude: lon,
        check_out_photo: photoPath,
      })
      .eq('id', attendanceId)

    setAttendanceId(null)
    setPhoto(null)
    setStatus('Checked out successfully')
    setLoading(false)
  }

  return (
    <div className="tech-container">
      <h1>Attendance</h1>

      <div className="card">
        <p className="status">
          {attendanceId
            ? 'You are currently checked in'
            : 'You are not checked in'}
        </p>

        <label className="upload-box">
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
            onClick={handleCheckIn}
            disabled={loading}
          >
            Check In
          </button>
        ) : (
          <button
            className="btn checkout"
            onClick={handleCheckOut}
            disabled={loading}
          >
            Check Out
          </button>
        )}

        {status && <p className="status-text">{status}</p>}
      </div>
    </div>
  )
}
