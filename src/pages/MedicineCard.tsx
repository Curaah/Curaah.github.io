import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { friendly } from '../lib/errors'
import { fmtTime, useDoses, useDueAlerts, type Dose } from '../lib/useDoses'

// Shown on Home for patients and caregivers.
export default function MedicineCard() {
  const { profile } = useSession()
  const show = !IS_CARE && (profile?.user_type === 'patient' || Boolean(profile?.is_caregiver))
  const { doses, reload } = useDoses(show)
  useDueAlerts(show ? doses : null)
  const [error, setError] = useState('')

  async function log(d: Dose, status: 'taken' | 'skipped') {
    setError('')
    const { error: e } = await supabase.rpc('log_dose', { p_medicine: d.medicine_id, p_time: d.scheduled, p_status: status })
    if (e) setError(friendly(e))
    await reload()
  }

  if (!show || doses === null) return null

  const due = doses.filter((d) => d.state === 'due')
  const notLogged = doses.filter((d) => d.state === 'missed')
  const next = doses.find((d) => d.state === 'upcoming')

  return (
    <section className="card mt-6">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><Pill size={18} aria-hidden="true" />Medicines</h2>
        <Link to="/medicines" className="underline" style={{ color: 'var(--accent)' }}>Manage</Link>
      </div>

      {doses.length === 0 && (
        <p className="mt-2">Add your medicines to get reminders at the right times, and a simple record of what you took.</p>
      )}

      {due.map((d) => (
        <div key={`${d.medicine_id}-${d.scheduled}`} className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--accent)' }}>
          <p className="font-semibold">Due now: {d.name}{d.dose_note ? ` (${d.dose_note})` : ''}</p>
          <p className="text-sm">Scheduled for {fmtTime(d.scheduled)}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button className="btn" onClick={() => log(d, 'taken')}>Taken</button>
            <button className="btn btn-quiet" onClick={() => log(d, 'skipped')}>Skip</button>
          </div>
        </div>
      ))}

      {due.length === 0 && next && <p className="mt-2">Next: {next.name} at {fmtTime(next.scheduled)}</p>}
      {due.length === 0 && !next && doses.length > 0 && notLogged.length === 0 && <p className="mt-2">All of today’s medicines are logged.</p>}
      {notLogged.length > 0 && (
        <p className="mt-2 text-sm">
          {notLogged.length} earlier {notLogged.length === 1 ? 'dose is' : 'doses are'} not logged. <Link to="/medicines" className="underline">Review</Link>
        </p>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      <p className="mt-3 text-xs">Reminders appear while the app is open. Keep your phone alarm too.</p>
    </section>
  )
}