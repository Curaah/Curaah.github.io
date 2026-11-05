import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { IS_CARE } from './app'

export function useVerified() {
  const [verified, setVerified] = useState(false)
  useEffect(() => {
    if (IS_CARE) supabase.rpc('is_verified_org').then(({ data }) => setVerified(Boolean(data)))
  }, [])
  return verified
}