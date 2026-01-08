'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import './attendance-map.css'

type Attendance = {
  id: string
  FullName: string
  work_date: string
  check_in: string
  check_out: string | null

  check_in_latitude: number
  check_in_longitude: number
  check_in_photo: string

  check_out_latitude: number | null
  check_out_longitude: number | null
  check_out_photo: string | null
}

export default function AdminAttendanceMap() {
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null) // marker layer group
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)

  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<Attendance[]>([])

  useEffect(() => {
    // initial load
    fetchAttendance(fromDate, toDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // if map already exists, just redraw markers when records change
    if (!records.length) {
      if (mapRef.current && layerRef.current) layerRef.current.clearLayers()
      return
    }
    initOrUpdateMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records])

  const fetchAttendance = async (from: string, to: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id, FullName, work_date,
          check_in, check_out,
          check_in_latitude, check_in_longitude, check_in_photo,
          check_out_latitude, check_out_longitude, check_out_photo
        `)
        .gte('work_date', from)
        .lte('work_date', to)
        .not('check_in_latitude', 'is', null)
        .not('check_in_longitude', 'is', null)
        .order('check_in', { ascending: false })

      if (error) throw error

      // extra safety (no undefined)
      const valid = (data || []).filter(
        (r: any) =>
          typeof r.check_in_latitude === 'number' &&
          typeof r.check_in_longitude === 'number'
      )

      setRecords(valid as Attendance[])
    } catch (e) {
      console.error(e)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const initOrUpdateMap = async () => {
    const L = (await import('leaflet')).default

    const icon = (color: 'green' | 'red' | 'blue') =>
      new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })

    const first = records[0]

    // Init map once
    if (!mapRef.current) {
      if (!mapContainerRef.current) return
      mapRef.current = L.map(mapContainerRef.current).setView(
        [first.check_in_latitude, first.check_in_longitude],
        11
      )
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current)

      layerRef.current = L.layerGroup().addTo(mapRef.current)

      // fix sizing on first load
      setTimeout(() => mapRef.current?.invalidateSize?.(), 250)
    }

    // Clear and redraw markers
    layerRef.current.clearLayers()

    records.forEach((r) => {
      const inPhotoUrl = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(r.check_in_photo).data.publicUrl

      const outPhotoUrl = r.check_out_photo
        ? supabase.storage
            .from('attendance-photos')
            .getPublicUrl(r.check_out_photo).data.publicUrl
        : null

      // "same location" check with tolerance (better than strict equality)
      const sameLocation =
        r.check_out_latitude != null &&
        r.check_out_longitude != null &&
        Math.abs(r.check_in_latitude - r.check_out_latitude) < 0.00001 &&
        Math.abs(r.check_in_longitude - r.check_out_longitude) < 0.00001

      const baseInfo = `
        <div style="font-family:Arial;max-width:220px">
          <strong>${r.FullName}</strong><br/>
          <small>${r.work_date}</small><br/><br/>
      `

      // 🔵 Blue: same location, show both
      if (sameLocation && outPhotoUrl && r.check_out) {
        const popup = `
          ${baseInfo}
          <div><strong>Check-In</strong>: ${new Date(r.check_in).toLocaleString()}</div>
          <img src="${inPhotoUrl}" style="margin-top:8px;width:200px;border-radius:10px"/><br/><br/>
          <div><strong>Check-Out</strong>: ${new Date(r.check_out).toLocaleString()}</div>
          <img src="${outPhotoUrl}" style="margin-top:8px;width:200px;border-radius:10px"/>
          </div>
        `
        L.marker([r.check_in_latitude, r.check_in_longitude], { icon: icon('blue') })
          .bindPopup(popup)
          .addTo(layerRef.current)

        return
      }

      // 🟢 Green: check-in
      const inPopup = `
        ${baseInfo}
        <div><strong>Check-In</strong>: ${new Date(r.check_in).toLocaleString()}</div>
        <img src="${inPhotoUrl}" style="margin-top:8px;width:200px;border-radius:10px"/>
        </div>
      `
      L.marker([r.check_in_latitude, r.check_in_longitude], { icon: icon('green') })
        .bindPopup(inPopup)
        .addTo(layerRef.current)

      // 🟥 Red: check-out
      if (
        r.check_out_latitude != null &&
        r.check_out_longitude != null &&
        outPhotoUrl &&
        r.check_out
      ) {
        const outPopup = `
          ${baseInfo}
          <div><strong>Check-Out</strong>: ${new Date(r.check_out).toLocaleString()}</div>
          <img src="${outPhotoUrl}" style="margin-top:8px;width:200px;border-radius:10px"/>
          </div>
        `
        L.marker([r.check_out_latitude, r.check_out_longitude], { icon: icon('red') })
          .bindPopup(outPopup)
          .addTo(layerRef.current)
      }
    })
  }

  const onApplyFilter = () => {
    if (!fromDate || !toDate) return
    fetchAttendance(fromDate, toDate)
  }

  return (
    <div className="admin-page">
      <div className="toolbar">
        <div className="field">
          <label>From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="field">
          <label>To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button className="btn" onClick={onApplyFilter} disabled={loading}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      <div ref={mapContainerRef} id="attendance-map" />
    </div>
  )
}
