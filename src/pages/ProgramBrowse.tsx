import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { imageUrl } from '../lib/images'
import { MODE_LABEL, fmtDate, fmtIST, inr, type Program } from '../lib/programs'
import { TOPICS, TOPIC_LABEL } from '../lib/topics'
import { ListSkeleton } from './Skeleton'

type Mine = { program_id: string; program_title: string; organizer: string; status: 'requested' | 'confirmed' | 'completed'; live_total: number; live_held: number; attended: number; next_session: string | null }

const STATE: Record<Mine['status'], string> = {
  requested: 'Waiting for the organizer to confirm your payment',
  confirmed: 'You are in',
  completed: 'Completed',
}

export default function ProgramBrowse() {
  const { profile } = useSession()
  const city = profile?.city?.trim().toLowerCase() ?? ''
  const [mine, setMine] = useState<Mine[] | null>(null)
  const [programs, setPrograms] = useState<Program[] | null>(null)
  const [orgs, setOrgs] = useState<Record<string, string>>({})
  const [taken, setTaken] = useState<Record<string, number>>({})
  const [topic, setTopic] = useState('all')
  const [localOnly, setLocalOnly] = useState(Boolean(city))

  useEffect(() => {
    ;(async () => {
      const [p, m] = await Promise.all([
        supabase.from('programs').select('*').eq('status', 'published').order('starts_on').limit(50),
        supabase.rpc('my_program_progress'),
      ])
      const list = (p.data as Program[] | null) ?? []
      setPrograms(list)
      setMine((m.data as Mine[] | null) ?? [])
      const ids = list.map((x) => x.id)
      if (ids.length) {
        const [o, c] = await Promise.all([
          supabase.from('verified_orgs').select('user_id, org_name').in('user_id', [...new Set(list.map((x) => x.organizer_id))]),
          supabase.from('program_counts').select('program_id, taken').in('program_id', ids),
        ])
        setOrgs(Object.fromEntries(((o.data as { user_id: string; org_name: string }[] | null) ?? []).map((x) => [x.user_id, x.org_name])))
        setTaken(Object.fromEntries(((c.data as { program_id: string; taken: number }[] | null) ?? []).map((x) => [x.program_id, x.taken])))
      }
    })()
  }, [])

  const joined = new Set((mine ?? []).map((m) => m.program_id))
  const shown = (programs ?? []).filter(
    (p) =>
      !joined.has(p.id) &&
      (topic === 'all' || p.topic === topic) &&
      (!localOnly || p.mode === 'online' || (city !== '' && (p.city ?? '').toLowerCase() === city)),
  )

  return (
    <>
      <h1 className="text-2xl font-bold">Programs</h1>
      <p className="mt-1">Wellness programs run by verified organizations, with live classes and a timetable inside Curaah.</p>

      {mine === null && <ListSkeleton rows={1} />}
      {mine !== null && mine.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">My programs</h2>
          {mine.map((m) => (
            <Link key={m.program_id} to={`/programs/${m.program_id}`} className="card mt-3 block">
              <span className="chip">{STATE[m.status]}</span>
              <p className="mt-2 text-lg font-semibold">{m.program_title}</p>
              <p className="text-sm">By {m.organizer}</p>
              {m.status !== 'requested' && m.live_held > 0 && <p className="mt-1 text-sm">Joined {m.attended} of {m.live_held} live classes so far</p>}
              {m.status === 'confirmed' && m.next_session && <p className="text-sm">Next session: {fmtIST(m.next_session)}</p>}
            </Link>
          ))}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Discover programs</h2>
        <label className="label" htmlFor="ptf">Topic</label>
        <select id="ptf" className="field" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">All topics</option>
          {TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {city && (
          <label className="mt-2 flex gap-3">
            <input type="checkbox" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} />
            <span>Only online programs and programs in {profile?.city}</span>
          </label>
        )}
        {programs === null && <ListSkeleton />}
        {programs !== null && shown.length === 0 && <p className="card mt-3">No programs match right now. Check back soon.</p>}
        {shown.map((p) => {
          const left = p.seats ? p.seats - (taken[p.id] ?? 0) : null
          return (
            <Link key={p.id} to={`/programs/${p.id}`} className="card mt-3 block">
              {p.image_path && <img src={imageUrl(p.image_path)} alt={p.image_alt ?? ''} loading="lazy" className="mb-3 w-full rounded-xl border" style={{ borderColor: 'var(--line)' }} />}
              <div className="flex flex-wrap gap-2">
                <span className="chip">{TOPIC_LABEL[p.topic] ?? 'Health'}</span>
                <span className="chip">{MODE_LABEL[p.mode]}</span>
                <span className="chip">{inr(p.price_inr)}</span>
                {left !== null && <span className="chip">{left <= 0 ? 'Full' : `${left} places left`}</span>}
              </div>
              <p className="mt-2 text-lg font-semibold">{p.title}</p>
              <p className="text-sm">By {orgs[p.organizer_id] ?? 'a verified organization'}</p>
              <p className="mt-1">{p.summary}</p>
              <p className="mt-1 text-sm">Starts {fmtDate(p.starts_on)} · {p.duration_days} days{p.city ? ` · ${p.city}` : ''}</p>
            </Link>
          )
        })}
      </section>
    </>
  )
}