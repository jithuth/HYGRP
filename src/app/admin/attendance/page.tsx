'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import 'leaflet/dist/leaflet.css'
import './attendance-map.css'

type Attendance = {
  id: string
  FullName: string
  work_date: string
  check_in: string | null
  check_out: string | null
  check_in_latitude: number | null
  check_in_longitude: number | null
  check_out_latitude: number | null
  check_out_longitude: number | null
  check_in_photo: string | null
  check_out_photo: string | null
}

export default function AdminAttendanceMap() {
  const mapRef = useRef<any>(null)
  const mapEl = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<Attendance[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [name, setName] = useState('')
  const [modalImg, setModalImg] = useState<string | null>(null)

  /* ---------------- LOAD DATA ---------------- */
  const loadData = async () => {
    let q = supabase.from('attendance').select('*')

    if (from) q = q.gte('work_date', from)
    if (to) q = q.lte('work_date', to)
    if (name) q = q.ilike('FullName', `%${name}%`)

    const { data, error } = await q
    if (error) return console.error(error)

    setData(data || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  /* ---------------- MAP INIT ---------------- */
  useEffect(() => {
    if (!mapEl.current || mapRef.current || data.length === 0) return
    initMap()
  }, [data])

  const initMap = async () => {
    const L = (await import('leaflet')).default

    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    mapRef.current = L.map(mapEl.current!).setView(
      [data[0].check_in_latitude!, data[0].check_in_longitude!],
      11
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current)

    renderMarkers(L)
  }

  /* ---------------- MARKERS ---------------- */
  const renderMarkers = (L: any) => {
    data.forEach((r) => {
      if (!r.check_in_latitude || !r.check_in_longitude) return

      const sameLocation =
        r.check_out_latitude &&
        r.check_out_longitude &&
        r.check_out_latitude === r.check_in_latitude &&
        r.check_out_longitude === r.check_in_longitude

      const color = sameLocation ? 'blue' : r.check_out ? 'red' : 'green'

      const marker = L.circleMarker(
        [r.check_in_latitude, r.check_in_longitude],
        {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.9,
        }
      )

      marker
        .addTo(mapRef.current)
        .bindPopup(buildPopup(r), { maxWidth: 420 })
    })
  }

  /* ---------------- POPUP ---------------- */
  const buildPopup = (r: Attendance) => {
    const inImg = r.check_in_photo
      ? supabase.storage.from('attendance-photos').getPublicUrl(r.check_in_photo).data.publicUrl
      : null

    const outImg = r.check_out_photo
      ? supabase.storage.from('attendance-photos').getPublicUrl(r.check_out_photo).data.publicUrl
      : null

    return `
      <div class="popup">
        <strong>${r.FullName}</strong><br/>
        <small>${r.work_date}</small>

        <div class="photo-row">
          ${inImg ? `<img src="${inImg}" data-img="${inImg}" />` : ''}
          ${outImg ? `<img src="${outImg}" data-img="${outImg}" />` : ''}
        </div>

        <div class="times">
          ${r.check_in ? `IN: ${new Date(r.check_in).toLocaleTimeString()}` : ''}
          ${r.check_out ? `<br/>OUT: ${new Date(r.check_out).toLocaleTimeString()}` : ''}
        </div>
      </div>
    `
  }

  /* ---------------- CLICK IMAGE → MODAL ---------------- */
  useEffect(() => {
    document.addEventListener('click', (e: any) => {
      const img = e.target?.getAttribute?.('data-img')
      if (img) setModalImg(img)
    })
  }, [])

  return (
    <>
      <div className="filters">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <input
          placeholder="Technician name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={loadData}>Apply</button>
      </div>

      <div ref={mapEl} className="map" />

      {modalImg && (
        <div className="modal" onClick={() => setModalImg(null)}>
          <img src={modalImg} />
        </div>
      )}
    </>
  )
}
