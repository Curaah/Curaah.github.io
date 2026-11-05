import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { imageUrl } from '../lib/images'
import { FORMAT_LABEL, MODE_LABEL, fmtDate, fmtIST, fmtTimeIST, inr, type Program } from '../lib/programs'
import { TOPIC_LABEL } from '../lib/topics'
import { Shell } from './ui'
import ReportButton from './ReportButton'

type Status = 'requested' | 'confirmed' | 'cancelled' | 'completed'
type MySession = { session_id: string; program_id: string; title: string; starts_at: string; duration_minutes: number; format: 'live_video' | 'in_person' | 'self_paced'; notes: string | null; can_join: boolean; attended: boolean }
type PastSession = { id: string; title: string; starts_at: string; duration_minutes: number; format: string }
type Update = { id: string; title: string; body: string; link_url: string | null; created_at: string }

export default function ProgramDetail() {
  const { id } = useParams()
  const { session } = useSession()
  const uid = session!.user.id
  const [program, setProgram] = useState<Program | null | undefined>(undefined)
  const [org, setOrg] = useState('')
  const [taken, setTaken] = useState(0)
  const [status, setStatus] = useState<Status | null>(null)
  const [payInfo, setPayInfo] = useState<string | null>(null)
  const [upcoming, setUpcoming] = useState<MySession[]>([])
  const [past, setPast] = useState<PastSession[]>([])
  const [joinedSessions, setJoinedSessions] = useState<Set<string>>(new Set())
  const [updates, setUpdates] = useState<Update[]>([])
  const [joining, setJoining] = useState(false)
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('programs').select('*').eq('id', id!).maybeSingle()
    const p = (data as Program | null) ?? null
    setProgram(p)
    if (!p) return
    const [o, c, e] = await Promise.all([
      supabase.from('verified_orgs').select('org_name').eq('user_id', p.organizer_id).maybeSingle(),
      supabase.from('program_counts').select('taken').eq('program_id', p.id).maybeSingle(),
      supabase.from('program_enrollments').select('status').eq('program_id', p.id).eq('user_id', uid).maybeSingle(),
    ])
    setOrg((o.data as { org_name: string } | null)?.org_name ?? 'a verified organization')
    setTaken((c.data as { taken: number } | null)?.taken ?? 0)
    const st = ((e.data as { status: Status } | null)?.status ?? null) as Status | null
    setStatus(st)
    const pay = await supabase.from('program_payment_info').select('info').eq('program_id', p.id).maybeSingle()
    setPayInfo((pay.data as { info: string } | null)?.info ?? null)
    if (st === 'confirmed' || st === 'completed') {
      const [ms, all, att, up] = await Promise.all([
        supabase.rpc('my_sessions', { p_days: 120 }),
        supabase.from('program_sessions').select('id, title, starts_at, duration_minutes, format').eq('program_id', p.id).order('starts_at'),
        supabase.from('session_attendance').select('session_id'),
        supabase.from('program_updates').select('id, title, body, link_url, created_at').eq('program_id', p.id).order('created_at', { ascending: false }),
      ])
      const mine = ((ms.data as MySession[] | null) ?? []).filter((s) => s.program_id === p.id)
      setUpcoming(mine)
      const upIds = new Set(mine.map((s) => s.session_id))
      setPast(((all.data as PastSession[] | null) ?? []).filter((s) => !upIds.has(s.id) && new Date(s.starts_at).getTime() < Date.now()).reverse())
      setJoinedSessions(new Set(((att.data as { session_id: string }[] | null) ?? []).map((x) => x.session_id)))
      setUpdates((up.data as Update[] | null) ?? [])
    }
  }, [id, uid])

  useEffect(() => {
    load()
  }, [load])

  async function join(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMsg('')
    const { data, error: err } = await supabase.rpc('enroll_in_program', { p_program: id, p_contact: contact, p_note: note, p_consent: consent })
    setBusy(false)
    if (err) {
      setError(friendly(err))
      return
    }
    setJoining(false)
    setMsg(data === 'confirmed' ? 'You are in. Your timetable is below.' : 'Request sent. Pay the organizer using the instructions below, and they will confirm your place.')
    await load()
  }

  async function leave() {
    if (!window.confirm('Leave this program? If you already paid, ask the organizer about a refund.')) return
    setError('')
    const { error: err } = await supabase.rpc('cancel_enrollment', { p_program: id })
    if (err) setError(friendly(err))
    else setMsg('You left the program. Your contact details were removed from it.')
    await load()
  }

  if (program === undefined) return <Shell back><p>Loading…</p></Shell>
  if (program === null) return <Shell back><p>This program was not found.</p></Shell>

  const left = program.seats ? program.seats - taken : null
  const active = status === 'requested' || status === 'confirmed' || status === 'completed'
  const canJoin = !active && program.status === 'published' && (left === null || left > 0)

  return (
    <Shell>
      <Link to="/programs" className="underline">← All programs</Link>
      {program.image_path && <img src={imageUrl(program.image_path)} alt={program.image_alt ?? ''} className="mt-3 w-full rounded-xl border" style={{ borderColor: 'var(--line)' }} />}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip">{TOPIC_LABEL[program.topic] ?? 'Health'}</span>
        <span className="chip">{MODE_LABEL[program.mode]}</span>
        <span className="chip">{inr(program.price_inr)}</span>
        {left !== null && <span className="chip">{left <= 0 ? 'Full' : `${left} places left`}</span>}
      </div>
      <h1 className="mt-2 text-2xl font-bold">{program.title}</h1>
      <p className="text-sm">By {org}</p>
      <p className="mt-2">{program.summary}</p>
      <p className="mt-2 text-sm">Starts {fmtDate(program.starts_on)} · {program.duration_days} days{program.city ? ` · ${program.city}` : ''}</p>
      <p className="mt-3 whitespace-pre-line">{program.description}</p>
      <p className="mt-3 text-xs">Programs are run by independent verified organizations and are for general wellbeing. They are not medical advice, so talk to your doctor about your own health.</p>
      <ReportButton type="program" id={program.id} />

      {msg && <p className="card mt-4" role="status">{msg}</p>}
      {error && <p className="err" role="alert">{error}</p>}

      {canJoin && !joining && <button className="btn mt-4" onClick={() => setJoining(true)}>{program.price_inr > 0 ? `Ask to join · ${inr(program.price_inr)}` : 'Join for free'}</button>}
      {!active && !canJoin && <p className="card mt-4">{program.status === 'published' ? 'This program is full.' : 'This program is not taking new sign-ups.'}</p>}

      {canJoin && joining && (
        <form onSubmit={join} className="card mt-4">
          <p className="font-semibold">Your details for {org}</p>
          <label className="label" htmlFor="jc">Phone number</label>
          <input id="jc" className="field" type="tel" required minLength={5} maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)} />
          <label className="label" htmlFor="jn">Anything the organizer should know? (optional)</label>
          <input id="jn" className="field" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="mt-4 flex gap-3">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree to share my name and this phone number with {org} for this program only. If I leave, my contact is removed.</span>
          </label>
          {program.price_inr > 0 && <p className="mt-2 text-sm">This is a paid program. After you ask to join, you will see how to pay the organizer directly. Curaah does not take the payment.</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn" disabled={busy}>{busy ? 'Sending…' : program.price_inr > 0 ? 'Send request' : 'Join'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => setJoining(false)}>Not now</button>
          </div>
        </form>
      )}

      {status === 'requested' && (
        <section className="card mt-4">
          <p className="font-semibold">Waiting for payment confirmation</p>
          {payInfo ? <p className="mt-1">Pay the organizer: <strong>{payInfo}</strong></p> : <p className="mt-1">The organizer will share payment instructions.</p>}
          <p className="mt-1 text-sm">Once they confirm your payment, the timetable and materials appear here.</p>
          <button className="mt-3 underline" style={{ color: 'var(--warn)' }} onClick={leave}>Cancel my request</button>
        </section>
      )}

      {(status === 'confirmed' || status === 'completed') && (
        <>
          {status === 'completed' && <p className="card mt-4 font-semibold">You completed this program. Well done.</p>}

          <h2 className="mt-8 text-lg font-semibold">Your timetable</h2>
          {upcoming.length === 0 && <p className="card mt-3">No upcoming sessions have been scheduled yet. Check back soon.</p>}
          {upcoming.map((s) => (
            <article key={s.session_id} className="card mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{FORMAT_LABEL[s.format]}</span>
                <span className="text-sm">{fmtIST(s.starts_at)}{s.duration_minutes > 0 ? ` – ${fmtTimeIST(new Date(new Date(s.starts_at).getTime() + s.duration_minutes * 60000).toISOString())}` : ''}</span>
              </div>
              <p className="mt-1 font-semibold">{s.title}</p>
              {s.notes && <p className="text-sm">{s.notes}</p>}
              {s.format === 'live_video' && (s.can_join
                ? <Link to={`/session/${s.session_id}`} className="btn mt-3 block text-center">Join live class</Link>
                : <p className="mt-2 text-sm">You can join from 10 minutes before it starts. This happens inside Curaah.</p>)}
              {s.attended && <p className="mt-2 text-sm font-semibold">You joined this class.</p>}
            </article>
          ))}
          {past.length > 0 && (
            <>
              <h3 className="mt-5 font-semibold">Earlier sessions</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {past.slice(0, 10).map((s) => (
                  <li key={s.id}>{s.title} · {fmtIST(s.starts_at)} · {joinedSessions.has(s.id) ? 'Joined' : s.format === 'live_video' ? 'Not joined' : 'Past'}</li>
                ))}
              </ul>
            </>
          )}

          <h2 className="mt-8 text-lg font-semibold">Updates and materials</h2>
          {updates.length === 0 && <p className="card mt-3">Nothing has been posted yet.</p>}
          {updates.map((u) => (
            <article key={u.id} className="card mt-3">
              <p className="font-semibold">{u.title}</p>
              <p className="text-sm">{fmtIST(u.created_at)}</p>
              <p className="mt-1 whitespace-pre-line">{u.body}</p>
              {u.link_url && <p className="mt-1 break-all"><a className="underline" href={u.link_url} target="_blank" rel="noreferrer noopener">{u.link_url}</a></p>}
            </article>
          ))}

          {status === 'confirmed' && <button className="mt-6 underline" style={{ color: 'var(--warn)' }} onClick={leave}>Leave this program</button>}
        </>
      )}
    </Shell>
  )
}