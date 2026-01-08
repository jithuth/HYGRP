'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type AttendanceRow = {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  remarks: string | null;
};

export default function AttendanceHistory() {
  const [rows, setRows] = useState<AttendanceRow[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('work_date', { ascending: false })

      if (data) {
        setRows(data)
      }
    }
    load()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>Attendance History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>In</th>
            <th>Out</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
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
