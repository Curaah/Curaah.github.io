import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { imageUrl } from '../lib/images'
import { MODE_LABEL, STATUS_LABEL, fmtDate, inr, type Program } from '../lib/programs'
import { TOPIC_LABEL } from '../lib/topics'
import { Shell } from './ui'
import ProgramParticipants from './ProgramParticipants'
import ProgramTimetable from './ProgramTimetable'
import ProgramUpdates from './ProgramUpdates'

export default function ManageProgram() {
  const { id } = useParams()
  const { session } = useSession()
  const [program, setProgram] = useState<Program | null | undefined>(undefined)
  const [payInfo, setPayInfo] = useState<string | null>(null)
  const [taken, setTaken] = useState(0)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('programs').select('*').eq('id', id!).maybeSingle()
    setProgram((data as Program | null) ?? null)
    const [p, c] = await Promise.all([
      supabase.from('program_payment_info').select('info').eq('program_id', id!).maybeSingle(),
      supabase.from('program_counts').select('taken').eq('program_id', id!).maybeSingle(),
    ])
    setPayInfo((p.data as { info: string } | null)?.info ?? null)
    setTaken((c.data as { taken: number } | null)?.taken ?? 0)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function setStatus(status: 'published' | 'closed') {
    setError('')
    const { error: e } = await supabase.rpc('set_program_status', { p_program: id, p_status: status })
    if (e) setError(friendly(e))
    await load()
  }

  if (program === undefined) return <Shell><p>Loading…</p></Shell>
  if (program === null || program.organizer_id !== session!.user.id) {
    return <Shell><Link to="/programs" className="underline">Back to programs</Link><p className="mt-4">This program was not found, or it is not yours.</p></Shell>
  }

  return (
    <Shell>
      <Link to="/programs" className="underline">← All programs</Link>
      {program.image_path && <img src={imageUrl(program.image_path)} alt={program.image_alt ?? ''} className="mt-3 w-full rounded-xl border" style={{ borderColor: 'var(--line)' }} />}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip">{STATUS_LABEL[program.status]}</span>
        <span className="chip">{MODE_LABEL[program.mode]}</span>
        <span className="chip">{inr(program.price_inr)}</span>
        <span className="chip">{TOPIC_LABEL[program.topic] ?? 'Health'}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{program.title}</h1>
      <p className="mt-1">{program.summary}</p>
      <p className="mt-2 text-sm">
        Starts {fmtDate(program.starts_on)} · {program.duration_days} days{program.city ? ` · ${program.city}` : ''} · {taken}{program.seats ? ` of ${program.seats}` : ''} joined
      </p>
      {payInfo && <p className="card mt-3 text-sm"><strong>Payment instructions people see after asking to join:</strong><br />{payInfo}</p>}
      {error && <p className="err" role="alert">{error}</p>}
      {program.status === 'hidden' ? (
        <p className="card mt-3">Curaah has hidden this program. Contact support if you think this is a mistake.</p>
      ) : program.status === 'published' ? (
        <button className="btn btn-quiet mt-3" onClick={() => setStatus('closed')}>Close to new sign-ups</button>
      ) : (
        <button className="btn mt-3" onClick={() => setStatus('published')}>Reopen sign-ups</button>
      )}

      <ProgramParticipants programId={program.id} price={program.price_inr} />
      <ProgramTimetable program={program} />
      <ProgramUpdates programId={program.id} />
    </Shell>
  )
}