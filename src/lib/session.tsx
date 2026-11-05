import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Profile = {
  id: string
  account_kind: 'individual' | 'stakeholder'
  full_name: string
  city: string | null
  user_type: 'patient' | 'healthy' | null
  is_volunteer: boolean
  is_caregiver: boolean
  blood_group: string | null
  emergency_available: boolean
  org_name: string | null
  org_type: 'ngo' | 'blood_bank' | 'professional' | null
}

type Ctx = {
  ready: boolean
  session: Session | null
  profile: Profile | null | undefined // undefined = still loading, null = none yet
  refresh: () => Promise<void>
}

const SessionCtx = createContext<Ctx>({ ready: false, session: null, profile: undefined, refresh: async () => {} })
export const useSession = () => useContext(SessionCtx)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile((data as Profile | null) ?? null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) load(data.session.user.id)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) setTimeout(() => load(s.user.id), 0)
      else setProfile(undefined)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const refresh = useCallback(async () => {
    if (session) await load(session.user.id)
  }, [session, load])

  return <SessionCtx.Provider value={{ ready, session, profile, refresh }}>{children}</SessionCtx.Provider>
}
