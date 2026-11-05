import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { IS_CARE } from '../lib/app'
import { FORMAT_LABEL, fmtIST, fmtTimeIST } from '../lib/programs'

type S = { session_id: string; program_id: string; program_title: string; title: string; starts_at: string; duration_minutes: number; format: 'live_video' | 'in_person' | 'self_paced'; notes: string | null; can_join: boolean; attended: boolean }

// "Your sessions": what is happening today or tomorrow in the programs the person joined.
export default function ProgramSessionsToday() {
  const [rows, setRows] = useState<S[] | null>(null)

  useEffect(() => {
    if (IS_CARE) return
    const load = () => supabase.rpc('my_sessions', { p_days: 2 }).then(({ data }) => setRows((data as S[] | null) ?? []))
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  if (IS_CARE || !rows || rows.length === 0) return null

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Your sessions</h2>
      {rows.slice(0, 4).map((s) => (
        <article key={s.session_id} className="card mt-3" style={s.can_join ? { borderColor: 'var(--accent)' } : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip inline-flex items-center gap-1">{s.format === 'live_video' && <Video size={14} aria-hidden="true" />}{FORMAT_LABEL[s.format]}</span>
            <span className="text-sm">{fmtIST(s.starts_at)}{s.duration_minutes > 0 ? ` – ${fmtTimeIST(new Date(new Date(s.starts_at).getTime() + s.duration_minutes * 60000).toISOString())}` : ''}</span>
          </div>
          <p className="mt-1 font-semibold">{s.title}</p>
          <p className="text-sm">{s.program_title}</p>
          {s.notes && s.format === 'in_person' && <p className="text-sm">{s.notes}</p>}
          {s.format === 'live_video' && s.can_join && <Link to={`/session/${s.session_id}`} className="btn mt-3 block text-center">Join live class</Link>}
          {s.format === 'live_video' && !s.can_join && s.attended && <p className="mt-2 text-sm font-semibold">You joined this class.</p>}
          {s.format === 'self_paced' && <Link to={`/programs/${s.program_id}`} className="mt-2 inline-block underline">Open the program</Link>}
        </article>
      ))}
    </section>
  )
}