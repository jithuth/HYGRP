'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import './attendance-map.css'

type Attendance = {
  FullName: string
  check_in: string
  check_out: string | null
  check_in_latitude: number
  check_in_longitude: number
  check_out_latitude: number | null
  check_out_longitude: number | null
  check_in_photo: string
  check_out_photo: string | null
}

export default function AdminAttendanceMap() {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [records, setRecords] = useState<Attendance[]>([])

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!records.length || mapRef.current || !mapContainerRef.current) return
    initMap()
  }, [records])

  const load = async () => {
    const { data } = await supabase.from('attendance').select('*')
    setRecords(data || [])
  }

  const initMap = async () => {
    const L = (await import('leaflet')).default

    const icon = (color: string) =>
      new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })

    const green = icon('green')
    const red = icon('red')
    const blue = icon('blue')

    mapRef.current = L.map(mapContainerRef.current!).setView(
      [records[0].check_in_latitude, records[0].check_in_longitude],
      11
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(
      mapRef.current
    )

    records.forEach((r) => {
      const same =
        r.check_out_latitude &&
        r.check_out_longitude &&
        r.check_in_latitude === r.check_out_latitude &&
        r.check_in_longitude === r.check_out_longitude

      const inPhoto = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(r.check_in_photo).data.publicUrl

      const outPhoto = r.check_out_photo
        ? supabase.storage
            .from('attendance-photos')
            .getPublicUrl(r.check_out_photo).data.publicUrl
        : null

      if (same) {
        L.marker(
          [r.check_in_latitude, r.check_in_longitude],
          { icon: blue }
        )
          .addTo(mapRef.current)
          .bindPopup(
            `<strong>${r.FullName}</strong><br/>
             Same location<br/>
             <img src="${inPhoto}" width="200"/>`
          )
      } else {
        L.marker(
          [r.check_in_latitude, r.check_in_longitude],
          { icon: green }
        )
          .addTo(mapRef.current)
          .bindPopup(
            `<strong>${r.FullName}</strong><br/>
             Check-In<br/>
             <img src="${inPhoto}" width="200"/>`
          )

        if (r.check_out_latitude && r.check_out_longitude && outPhoto) {
          L.marker(
            [r.check_out_latitude, r.check_out_longitude],
            { icon: red }
          )
            .addTo(mapRef.current)
            .bindPopup(
              `<strong>${r.FullName}</strong><br/>
               Check-Out<br/>
               <img src="${outPhoto}" width="200"/>`
            )
        }
      }
    })
  }

  return <div ref={mapContainerRef} id="attendance-map" />
}
