import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/errors'
import { FORMAT_LABEL, addDays, fmtIST, fmtTimeIST, istToIso, todayIST, weekdayOf, type Program } from '../lib/programs'

type Session = { id: string; title: string; starts_at: string; duration_minutes: number; format: 'live_video' | 'in_person' | 'self_paced'; notes: string | null }

const DAYS: [number, string][] = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']]

export default function ProgramTimetable({ program }: { program: Program }) {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'repeat' | 'one'>('repeat')
  const [title, setTitle] = useState('')
  const [format, setFormat] = useState<Session['format']>('live_video')
  const [time, setTime] = useState('06:30')
  const [duration, setDuration] = useState(45)
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [weeks, setWeeks] = useState(Math.min(Math.ceil(program.duration_days / 7), 12))
  const [oneDate, setOneDate] = useState(program.starts_on > todayIST() ? program.starts_on : todayIST())
  const [moving, setMoving] = useState<string | null>(null)
  const [moveTo, setMoveTo] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('program_sessions').select('id, title, starts_at, duration_minutes, format, notes').eq('program_id', program.id).order('starts_at')
    setSessions((data as Session[] | null) ?? [])
  }, [program.id])

  useEffect(() => {
    load()
  }, [load])

  const lengthMin = format === 'self_paced' ? 0 : duration

  // The sessions this form would add (not in the past, not already in the timetable)
  const planned = useMemo(() => {
    const out: { title: string; starts_at: string; duration_minutes: number; format: string; notes: string }[] = []
    const dates: string[] = []
    if (mode === 'one') dates.push(oneDate)
    else {
      for (let i = 0; i < Math.min(weeks * 7, program.duration_days); i++) {
        const d = addDays(program.starts_on, i)
        if (days.includes(weekdayOf(d))) dates.push(d)
      }
    }
    const existing = new Set((sessions ?? []).map((s) => `${s.title}|${new Date(s.starts_at).getTime()}`))
    for (const d of dates) {
      const iso = istToIso(d, time)
      if (new Date(iso).getTime() < Date.now()) continue
      if (existing.has(`${title.trim()}|${new Date(iso).getTime()}`)) continue
      out.push({ title: title.trim(), starts_at: iso, duration_minutes: lengthMin, format, notes: notes.trim() })
    }
    return out
  }, [mode, oneDate, days, weeks, time, title, format, lengthMin, notes, program, sessions])

  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (planned.length === 0) {
      setError('Nothing to add. Check the days, dates and time, and that they are not in the past.')
      return
    }
    if (planned.length > 60) {
      setError('That is more than 60 sessions at once. Reduce the number of weeks or days.')
      return
    }
    setBusy(true)
    const { data, error: err } = await supabase.rpc('add_program_sessions', { p_program: program.id, p_sessions: planned })
    setBusy(false)
    if (err) {
      setError(friendly(err))
      return
    }
    setMsg(`Added ${data as number} ${(data as number) === 1 ? 'session' : 'sessions'}.`)
    setTitle('')
    setNotes('')
    await load()
  }

  async function remove(s: Session) {
    if (!window.confirm(`Delete "${s.title}" on ${fmtIST(s.starts_at)}?`)) return
    setError('')
    const { error: err } = await supabase.rpc('delete_program_session', { p_session: s.id })
    if (err) setError(friendly(err))
    await load()
  }

  async function saveMove(s: Session) {
    setError('')
    if (!moveTo) return
    const [d, t] = moveTo.split('T')
    const { error: err } = await supabase.rpc('reschedule_program_session', { p_session: s.id, p_starts_at: istToIso(d, t) })
    if (err) setError(friendly(err))
    else {
      setMoving(null)
      setMoveTo('')
    }
    await load()
  }

  const now = Date.now()
  const upcoming = (sessions ?? []).filter((s) => new Date(s.starts_at).getTime() + s.duration_minutes * 60000 >= now)
  const past = (sessions ?? []).filter((s) => !upcoming.includes(s))

  const row = (s: Session, canEdit: boolean) => (
    <article key={s.id} className="card mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{FORMAT_LABEL[s.format]}</span>
        <span className="text-sm">
          {fmtIST(s.starts_at)}
          {s.duration_minutes > 0 ? ` – ${fmtTimeIST(new Date(new Date(s.starts_at).getTime() + s.duration_minutes * 60000).toISOString())}` : ''}
        </span>
      </div>
      <p className="mt-1 font-semibold">{s.title}</p>
      {s.notes && <p className="text-sm">{s.notes}</p>}
      {s.format === 'live_video' && now >= new Date(s.starts_at).getTime() - 30 * 60000 && now <= new Date(s.starts_at).getTime() + (s.duration_minutes + 60) * 60000 && (
      <Link to={`/session/${s.id}`} className="btn mt-3 block text-center">Open class room</Link>
      )}
      {canEdit && new Date(s.starts_at).getTime() > now && (
        moving === s.id ? (
          <div className="mt-3">
            <label className="label" htmlFor={`mv-${s.id}`}>New date and time (Indian time)</label>
            <input id={`mv-${s.id}`} className="field" type="datetime-local" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button className="btn" onClick={() => saveMove(s)}>Save</button>
              <button className="btn btn-quiet" onClick={() => setMoving(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex gap-4">
            <button className="underline" style={{ color: 'var(--accent)' }} onClick={() => { setMoving(s.id); setMoveTo('') }}>Move</button>
            <button className="underline" style={{ color: 'var(--warn)' }} onClick={() => remove(s)}>Delete</button>
          </div>
        )
      )}
    </article>
  )

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Timetable</h2>
      <p className="mt-1 text-sm">Confirmed participants see this timetable on their own screens. Times are in Indian time.</p>
      {msg && <p className="mt-2" role="status">{msg}</p>}
      {error && !open && <p className="err" role="alert">{error}</p>}
      {sessions === null && <p className="mt-2">Loading…</p>}
      {sessions !== null && upcoming.length === 0 && <p className="card mt-3">No upcoming sessions yet.</p>}
      {upcoming.map((s) => row(s, true))}
      {past.length > 0 && (
        <>
          <button className="mt-3 underline" onClick={() => setShowPast(!showPast)}>{showPast ? 'Hide' : 'Show'} past sessions ({past.length})</button>
          {showPast && past.map((s) => row(s, false))}
        </>
      )}

      {!open ? (
        <button className="btn mt-4" onClick={() => setOpen(true)}>Add to timetable</button>
      ) : (
        <form onSubmit={add} className="card mt-4">
          <p className="font-semibold">Add sessions</p>
          <div className="mt-2 flex gap-4">
            <label className="flex gap-2"><input type="radio" name="tmode" checked={mode === 'repeat'} onChange={() => setMode('repeat')} />Repeat every week</label>
            <label className="flex gap-2"><input type="radio" name="tmode" checked={mode === 'one'} onChange={() => setMode('one')} />One session</label>
          </div>

          <label className="label" htmlFor="stitle">Session name</label>
          <input id="stitle" className="field" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example, Morning yoga" />

          <label className="label" htmlFor="sformat">Type</label>
          <select id="sformat" className="field" value={format} onChange={(e) => setFormat(e.target.value as Session['format'])}>
            <option value="live_video">Live video, inside Curaah</option>
            <option value="in_person">In person</option>
            <option value="self_paced">Self-paced (material for that day)</option>
          </select>

          {mode === 'repeat' ? (
            <>
              <p className="label">On these days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(([n, label]) => (
                  <label key={n} className="chip flex gap-2" style={days.includes(n) ? { borderColor: 'var(--accent)' } : undefined}>
                    <input type="checkbox" checked={days.includes(n)} onChange={(e) => setDays(e.target.checked ? [...days, n] : days.filter((x) => x !== n))} />
                    {label}
                  </label>
                ))}
              </div>
              <label className="label" htmlFor="sweeks">For how many weeks (from the program start)</label>
              <input id="sweeks" className="field" type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))} />
            </>
          ) : (
            <>
              <label className="label" htmlFor="sdate">Date</label>
              <input id="sdate" className="field" type="date" required min={program.starts_on} value={oneDate} onChange={(e) => setOneDate(e.target.value)} />
            </>
          )}

          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="stime">{format === 'self_paced' ? 'Available from' : 'Starts at'}</label>
              <input id="stime" className="field" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            {format !== 'self_paced' && (
              <div>
                <label className="label" htmlFor="sdur">Minutes</label>
                <input id="sdur" className="field" type="number" min={format === 'live_video' ? 10 : 0} max={240} required value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            )}
          </div>

          <label className="label" htmlFor="snotes">Notes for participants (optional)</label>
          <input id="snotes" className="field" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={format === 'in_person' ? 'Where to meet, what to bring' : 'What to prepare'} />
          {format === 'live_video' && <p className="mt-1 text-sm">Participants join live classes from inside the app. The video room itself is switched on in a later update, but you can build your timetable now.</p>}

          <p className="mt-3 font-semibold">{planned.length === 0 ? 'No sessions to add yet' : `This will add ${planned.length} ${planned.length === 1 ? 'session' : 'sessions'}`}</p>
          {planned.slice(0, 3).map((p) => <p key={p.starts_at} className="text-sm">{fmtIST(p.starts_at)}</p>)}
          {planned.length > 3 && <p className="text-sm">…and {planned.length - 3} more</p>}

          {error && <p className="err" role="alert">{error}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn" disabled={busy || planned.length === 0}>{busy ? 'Adding…' : 'Add sessions'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => { setOpen(false); setError('') }}>Close</button>
          </div>
        </form>
      )}
    </section>
  )
}