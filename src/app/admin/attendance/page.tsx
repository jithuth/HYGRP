'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminAttendance() {
  const [rows, setRows] = useState<any[]>([])
  const [date, setDate] = useState('')

  useEffect(() => {
    load()
  }, [date])

  const load = async () => {
    let query = supabase
      .from('attendance')
      .select('*, profiles(role)')
      .order('work_date', { ascending: false })

    if (date) query = query.eq('work_date', date)

    const { data } = await query
    setRows(data || [])
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Attendance Records</h1>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Date</th>
            <th>In</th>
            <th>Out</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.user_id}</td>
              <td>{r.work_date}</td>
              <td>{r.check_in && new Date(r.check_in).toLocaleTimeString()}</td>
              <td>{r.check_out && new Date(r.check_out).toLocaleTimeString()}</td>
              <td>{r.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
