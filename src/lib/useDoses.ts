import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { friendly } from './errors'

export type Dose = {
  medicine_id: string
  name: string
  dose_note: string | null
  scheduled: string // 'HH:MM:SS'
  status: 'taken' | 'skipped' | null
  state: 'upcoming' | 'due' | 'missed' | 'taken' | 'skipped'
}

// '20:30:00' -> '8:30 PM'
export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Loads today's doses and refreshes every minute and whenever the app comes back to the screen.
export function useDoses(enabled = true) {
  const [doses, setDoses] = useState<Dose[] | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('todays_doses')
    if (e) {
      setError(friendly(e))
      setDoses([])
      return
    }
    setError('')
    setDoses((data as Dose[] | null) ?? [])
  }, [])

  useEffect(() => {
    if (!enabled) return
    reload()
    const id = setInterval(reload, 60000)
    const onShow = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [enabled, reload])

  return { doses, reload, error }
}

// Vibrates and shows a notification when a dose becomes due while the app is open.
export function useDueAlerts(doses: Dose[] | null) {
  const notified = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!doses) return
    const due = doses.filter((d) => d.state === 'due')
    const key = (d: Dose) => `${d.medicine_id}-${d.scheduled}`
    if (notified.current === null) {
      notified.current = new Set(due.map(key)) // already due when the app opened: no alert
      return
    }
    const fresh = due.filter((d) => !notified.current!.has(key(d)))
    fresh.forEach((d) => notified.current!.add(key(d)))
    if (fresh.length) {
      navigator.vibrate?.([200, 100, 200])
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Time for your medicine', { body: fresh.map((d) => d.name).join(', ') })
      }
    }
  }, [doses])
}