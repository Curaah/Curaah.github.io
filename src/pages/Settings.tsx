import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { Shell } from './ui'

type Prefs = { emergency: boolean; events: boolean; content: boolean; daily_tasks: boolean; daily_limit: number; quiet_start: string; quiet_end: string }
const LABELS: [keyof Prefs, string][] = [
  ['emergency', 'Emergency requests near me'],
  ['events', 'Health events'],
  ['content', 'Health articles and updates'],
  ['daily_tasks', 'Daily task reminders'],
]

export default function Settings() {
  const { session } = useSession()
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [msg, setMsg] = useState('')
  const uid = session!.user.id

  useEffect(() => {
    supabase.from('notification_prefs').select('*').eq('user_id', uid).maybeSingle().then(({ data }) => {
      setPrefs(data as Prefs)
    })
  }, [uid])

  async function save(patch: Partial<Prefs>) {
    if (!prefs) return
    setPrefs({ ...prefs, ...patch })
    const { error } = await supabase.from('notification_prefs').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', uid)
    setMsg(error ? `Could not save: ${error.message}` : 'Saved')
  }

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Notifications</h1>
      <p className="mt-1">You decide what reaches you. Change this any time.</p>
      {!prefs ? <p className="mt-4">Loading…</p> : (
        <>
          <div className="card mt-5">
            {LABELS.map(([k, label]) => (
              <label key={k} className="flex items-center justify-between gap-3 py-2">
                <span>{label}</span>
                <input type="checkbox" className="h-5 w-5" checked={prefs[k] as boolean} onChange={(e) => save({ [k]: e.target.checked })} />
              </label>
            ))}
          </div>
          <label className="label" htmlFor="limit">Most notifications per day</label>
          <select id="limit" className="field" value={prefs.daily_limit} onChange={(e) => save({ daily_limit: Number(e.target.value) })}>
            {[0, 3, 5, 10].map((n) => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
          </select>
          <p className="mt-1 text-sm">Emergency requests you opted into can still reach you.</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="qs">Quiet from</label><input id="qs" type="time" className="field" value={prefs.quiet_start?.slice(0, 5)} onChange={(e) => save({ quiet_start: e.target.value })} /></div>
            <div><label className="label" htmlFor="qe">Quiet until</label><input id="qe" type="time" className="field" value={prefs.quiet_end?.slice(0, 5)} onChange={(e) => save({ quiet_end: e.target.value })} /></div>
          </div>
          {msg && <p className="mt-3" role="status">{msg}</p>}
        </>
      )}
      <button className="btn btn-quiet mt-8" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </Shell>
  )
}
