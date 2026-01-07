'use client'

import LogoutButton from '@/components/LogoutButton'
import './admin.css'

export default function AdminDashboard() {
  return (
    <div className="admin-wrapper">
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          HYGRP
        </div>

        <nav>
          <a className="active">Dashboard</a>
          <a>Attendance</a>
          <a>Maintenance</a>
          <a>Technicians</a>
          <a>Reports</a>
        </nav>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <span>Admin Dashboard</span>
          <LogoutButton />
        </header>

        <section className="content">
          <div className="stat-grid">
            <div className="stat-card blue">
              <h3>15</h3>
              <p>Total Technicians</p>
            </div>
            <div className="stat-card green">
              <h3>9</h3>
              <p>Active Today</p>
            </div>
            <div className="stat-card orange">
              <h3>4</h3>
              <p>Pending Jobs</p>
            </div>
            <div className="stat-card red">
              <h3>2</h3>
              <p>Issues</p>
            </div>
          </div>

          <div className="box">
            <h2>Recent Activity</h2>
            <p>No recent activity</p>
          </div>
        </section>
      </div>
    </div>
  )
}
