import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { friendly } from '../lib/errors'
import { fmtTime, useDoses, useDueAlerts, type Dose } from '../lib/useDoses'
import { Shell } from './ui'

type Med = { id: string; name: string; dose_note: string | null; times: string[]; end_date: string | null }
type Day = { day: string; planned: number; taken: number; skipped: number }

const STATE_LABEL: Record<Dose['state'], string> = {
  upcoming: 'Later today',
  due: 'Due now',
  missed: 'Not logged',
  taken: 'Taken',
  skipped: 'Skipped',
}

export default function Medicines() {
  const { session } = useSession()
  const uid = session!.user.id
  const { doses, reload: reloadDoses, error: doseError } = useDoses(!IS_CARE)
  useDueAlerts(doses)

  const [consent, setConsent] = useState<boolean | null>(null)
  const [agree, setAgree] = useState(false)
  const [meds, setMeds] = useState<Med[] | null>(null)
  const [week, setWeek] = useState<Day[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [endDate, setEndDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [canNotify, setCanNotify] = useState(typeof Notification !== 'undefined' && Notification.permission === 'default')

  const loadAll = useCallback(async () => {
    const [m, w] = await Promise.all([
      supabase.from('medicines').select('id, name, dose_note, times, end_date').order('created_at'),
      supabase.rpc('adherence_week'),
    ])
    setMeds((m.data as Med[] | null) ?? [])
    setWeek((w.data as Day[] | null) ?? [])
    await reloadDoses()
  }, [reloadDoses])

  useEffect(() => {
    if (IS_CARE) return
    supabase
      .from('consents')
      .select('granted')
      .eq('purpose', 'medicine_tracking')
      .order('id', { ascending: false })
      .limit(1)
      .then(({ data }) => setConsent(Boolean(data?.[0]?.granted)))
  }, [])

  useEffect(() => {
    if (consent) loadAll()
  }, [consent, loadAll])

  if (IS_CARE) return <Shell back><p>Medicine reminders are in the Curaah app.</p></Shell>
  if (consent === null) return <Shell back><p>Loading…</p></Shell>

  async function start() {
    setBusy(true)
    const { error: e } = await supabase.from('consents').insert({ user_id: uid, purpose: 'medicine_tracking', granted: true, policy_version: 'v0' })
    setBusy(false)
    if (e) setError(friendly(e))
    else setConsent(true)
  }

  async function log(d: Dose, status: 'taken' | 'skipped') {
    setError('')
    const { error: e } = await supabase.rpc('log_dose', { p_medicine: d.medicine_id, p_time: d.scheduled, p_status: status })
    if (e) setError(friendly(e))
    await loadAll()
  }

  async function undo(d: Dose) {
    setError('')
    const { error: e } = await supabase.rpc('unlog_dose', { p_medicine: d.medicine_id, p_time: d.scheduled })
    if (e) setError(friendly(e))
    await loadAll()
  }

  async function addMedicine(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const cleaned = [...new Set(times.filter(Boolean))].sort()
    if (cleaned.length === 0) {
      setError('Add at least one time.')
      setBusy(false)
      return
    }
    const { error: err } = await supabase.from('medicines').insert({
      user_id: uid,
      name: name.trim(),
      dose_note: note.trim() || null,
      times: cleaned,
      end_date: endDate || null,
    })
    setBusy(false)
    if (err) {
      setError(friendly(err))
      return
    }
    setName('')
    setNote('')
    setTimes(['08:00'])
    setEndDate('')
    setAdding(false)
    await loadAll()
  }

  async function remove(m: Med) {
    if (!window.confirm(`Remove ${m.name}? Its reminders and history will be deleted.`)) return
    const { error: e } = await supabase.from('medicines').delete().eq('id', m.id)
    if (e) setError(friendly(e))
    await loadAll()
  }

  async function deleteAll() {
    if (!window.confirm('Delete all your medicines and their history? This cannot be undone.')) return
    const { error: e } = await supabase.from('medicines').delete().eq('user_id', uid)
    if (e) {
      setError(friendly(e))
      return
    }
    await supabase.from('consents').insert({ user_id: uid, purpose: 'medicine_tracking', granted: false, policy_version: 'v0' })
    setMeds([])
    setWeek([])
    setConsent(false)
    setAgree(false)
  }

  // ---- First time: a clear privacy notice before anything is stored ----
  if (!consent) {
    return (
      <Shell back>
        <h1 className="text-2xl font-bold">Medicine reminders</h1>
        <p className="mt-2">Curaah can remind you about your medicines and keep a simple record of what you took.</p>
        <ul className="mt-3 list-disc pl-5">
          <li>Only you can see your medicines. Organizations and other users cannot.</li>
          <li>You can remove a medicine, or delete everything, at any time.</li>
          <li>Curaah only reminds and records. It does not give medical advice. Take your medicines as your doctor prescribed.</li>
        </ul>
        <label className="mt-4 flex gap-3">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I agree that Curaah stores my medicine names and times privately to remind me.</span>
        </label>
        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-6"><button className="btn" disabled={!agree || busy} onClick={start}>Start</button></div>
      </Shell>
    )
  }

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Medicine reminders</h1>
      <p className="mt-2 text-sm">
        Curaah only reminds and records. Take your medicines as your doctor prescribed, and ask your doctor or pharmacist what to do if you miss a dose.
        Reminders appear while this app is open, so keep your phone alarm too.
      </p>
      {canNotify && (
        <button className="btn btn-quiet mt-3" onClick={async () => { await Notification.requestPermission(); setCanNotify(false) }}>
          Show reminders on this device while the app is open
        </button>
      )}
      {(error || doseError) && <p className="err" role="alert">{error || doseError}</p>}

      <h2 className="mt-6 text-lg font-semibold">Today</h2>
      {doses === null && <p className="mt-2">Loading…</p>}
      {doses !== null && doses.length === 0 && <p className="card mt-3">{meds && meds.length > 0 ? 'No doses are scheduled for today.' : 'Add a medicine below to see today’s doses here.'}</p>}
      {(doses ?? []).map((d) => (
        <article key={`${d.medicine_id}-${d.scheduled}`} className="card mt-3" style={d.state === 'due' ? { borderColor: 'var(--accent)' } : undefined}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{fmtTime(d.scheduled)}</p>
            <span className="chip">{STATE_LABEL[d.state]}</span>
          </div>
          <p className="mt-1">{d.name}{d.dose_note ? ` (${d.dose_note})` : ''}</p>
          {(d.state === 'upcoming' || d.state === 'due' || d.state === 'missed') && (
            <>
              {d.state === 'missed' && <p className="mt-1 text-sm">If you took it late, tap Taken. If you did not, tap Skip.</p>}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button className="btn" onClick={() => log(d, 'taken')}>Taken</button>
                <button className="btn btn-quiet" onClick={() => log(d, 'skipped')}>Skip</button>
              </div>
            </>
          )}
          {(d.state === 'taken' || d.state === 'skipped') && (
            <button className="mt-2 underline" style={{ color: 'var(--accent)' }} onClick={() => undo(d)}>Undo</button>
          )}
        </article>
      ))}

      <h2 className="mt-8 text-lg font-semibold">Last 7 days</h2>
      <div className="card mt-3 grid gap-2">
        {week.map((w) => {
          const taken = Math.min(w.taken, w.planned)
          return (
            <div key={w.day}>
              <div className="flex justify-between text-sm">
                <span>{new Date(`${w.day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span>{w.planned === 0 ? 'No medicines planned' : `${taken} of ${w.planned} taken`}</span>
              </div>
              {w.planned > 0 && (
                <div className="mt-1 h-2 rounded-full" style={{ background: 'var(--line)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${(taken / w.planned) * 100}%`, background: 'var(--accent)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <h2 className="mt-8 text-lg font-semibold">My medicines</h2>
      {meds !== null && meds.length === 0 && !adding && <p className="card mt-3">You have not added any medicines yet.</p>}
      {(meds ?? []).map((m) => (
        <article key={m.id} className="card mt-3">
          <p className="font-semibold">{m.name}{m.dose_note ? ` (${m.dose_note})` : ''}</p>
          <p className="text-sm">{m.times.map(fmtTime).join(', ')}{m.end_date ? ` · until ${new Date(`${m.end_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</p>
          <button className="mt-2 underline" style={{ color: 'var(--accent)' }} onClick={() => remove(m)}>Remove</button>
        </article>
      ))}

      {!adding ? (
        <button className="btn mt-4" onClick={() => setAdding(true)}>Add a medicine</button>
      ) : (
        <form onSubmit={addMedicine} className="card mt-4">
          <label className="label" htmlFor="mname">Medicine name</label>
          <input id="mname" className="field" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label" htmlFor="mnote">Note (optional)</label>
          <input id="mnote" className="field" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example, 1 tablet after food" />
          <p className="mt-1 text-sm">Write it the way your doctor or the label says. Curaah does not check or change it.</p>
          <p className="label">Times each day</p>
          {times.map((t, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input aria-label={`Time ${i + 1}`} className="field" type="time" required value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />
              {times.length > 1 && <button type="button" className="btn btn-quiet" style={{ width: 'auto' }} onClick={() => setTimes(times.filter((_, j) => j !== i))}>Remove</button>}
            </div>
          ))}
          {times.length < 6 && <button type="button" className="underline" style={{ color: 'var(--accent)' }} onClick={() => setTimes([...times, '20:00'])}>Add another time</button>}
          <label className="label" htmlFor="mend">Last day (optional, for a short course)</label>
          <input id="mend" className="field" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-10 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
        <button className="underline" style={{ color: 'var(--warn)' }} onClick={deleteAll}>Delete all my medicine data</button>
      </div>
    </Shell>
  )
}