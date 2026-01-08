export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
  
      const res = await fetch(url, {
        headers: {
          // Nominatim asks for a UA. This is fine for dev; for production you should proxy via your server.
          'User-Agent': 'hygrp-attendance-app',
          'Accept': 'application/json',
        },
      })
  
      if (!res.ok) return 'Unknown location'
      const data = await res.json()
  
      const a = data?.address
      return (
        a?.neighbourhood ||
        a?.suburb ||
        a?.road ||
        a?.city ||
        a?.town ||
        a?.village ||
        data?.display_name ||
        'Unknown location'
      )
    } catch {
      return 'Location unavailable'
    }
  }
  