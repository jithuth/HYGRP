'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  return (
    <button className="logout-btn" onClick={logout}>
      Logout
    </button>
  )
}
