'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import './attendance-map.css'

export default function AdminAttendanceMap() {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!records.length || mapRef.current || !mapContainerRef.current) return
    initMap()
  }, [records])

  const load = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .not('check_in_latitude', 'is', null)
      .not('check_in_longitude', 'is', null)

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

    const first = records.find(
      r =>
        typeof r.check_in_latitude === 'number' &&
        typeof r.check_in_longitude === 'number'
    )
    if (!first) return

    mapRef.current = L.map(mapContainerRef.current!).setView(
      [first.check_in_latitude, first.check_in_longitude],
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
          { icon: icon('blue') }
        ).addTo(mapRef.current)
      } else {
        L.marker(
          [r.check_in_latitude, r.check_in_longitude],
          { icon: icon('green') }
        ).addTo(mapRef.current)

        if (outPhoto) {
          L.marker(
            [r.check_out_latitude, r.check_out_longitude],
            { icon: icon('red') }
          ).addTo(mapRef.current)
        }
      }
    })
  }

  return <div id="attendance-map" ref={mapContainerRef} />
}
