'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import './attendance-map.css'

type Attendance = {
  id: string
  user_id: string
  work_date: string
  check_in: string
  latitude: number
  longitude: number
  photo_url: string
}

export default function AdminAttendanceMap() {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [records, setRecords] = useState<Attendance[]>([])

  /* 1️⃣ Load attendance data */
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error) {
        console.error(error)
        return
      }

      setRecords(data || [])
    }

    load()
  }, [])

  /* 2️⃣ Init map AFTER DOM + data are ready */
  useEffect(() => {
    if (records.length === 0) return
    if (!mapContainerRef.current) return
    if (mapRef.current) return

    initMap()
  }, [records])

  const initMap = async () => {
    const L = (await import('leaflet')).default

    // 🔥 REQUIRED: fix missing marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current!).setView(
      [records[0].latitude, records[0].longitude],
      11
    )

    // Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current)

    // Force resize after mount
    setTimeout(() => {
      mapRef.current.invalidateSize()
    }, 300)

    // Markers
    records.forEach((r) => {
      const photoUrl = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(r.photo_url).data.publicUrl

      L.marker([Number(r.latitude), Number(r.longitude)])
        .addTo(mapRef.current)
        .bindPopup(`
          <strong>Technician ID:</strong> ${r.user_id}<br/>
          <strong>Date:</strong> ${r.work_date}<br/>
          <strong>Check-In:</strong> ${new Date(r.check_in).toLocaleTimeString()}<br/>
          <img src="${photoUrl}"
               style="margin-top:8px;width:180px;border-radius:8px"/>
        `)
    })
  }

  return (
    <div className="map-page">
      <h1>Attendance – Map View</h1>
      <div ref={mapContainerRef} id="attendance-map" />
    </div>
  )
}
