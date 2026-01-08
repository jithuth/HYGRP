'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TechnicianAttendance() {
  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  const checkIn = async (file: File) => {
    setLoading(true)

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { lat, lon } = await getLocation()
    const photo = await uploadPhoto(file)
    const FullName = await getFullName(auth.user.id)

    const { data } = await supabase
      .from('attendance')
      .insert({
        user_id: auth.user.id,
        FullName,
        check_in: new Date().toISOString(),
        check_in_latitude: lat,
        check_in_longitude: lon,
        check_in_photo: photo,
      })
      .select()
      .single()

    setAttendanceId(data.id)
    setLoading(false)
  }

  const checkOut = async (file: File) => {
    if (!attendanceId) return
    setLoading(true)

    const { lat, lon } = await getLocation()
    const photo = await uploadPhoto(file)

    await supabase
      .from('attendance')
      .update({
        check_out: new Date().toISOString(),
        check_out_latitude: lat,
        check_out_longitude: lon,
        check_out_photo: photo,
      })
      .eq('id', attendanceId)

    setAttendanceId(null)
    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Attendance</h2>

      {!attendanceId ? (
        <>
          <p>Check-In (photo required)</p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={loading}
            onChange={(e) =>
              e.target.files && checkIn(e.target.files[0])
            }
          />
        </>
      ) : (
        <>
          <p>Check-Out (photo required)</p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={loading}
            onChange={(e) =>
              e.target.files && checkOut(e.target.files[0])
            }
          />
        </>
      )}
    </div>
  )
}
