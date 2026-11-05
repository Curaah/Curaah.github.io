import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { useVerified } from '../lib/useVerified'
import { MODE_LABEL, STATUS_LABEL, fmtDate, inr, type Program } from '../lib/programs'
import { ListSkeleton } from './Skeleton'
import ProgramBrowse from './ProgramBrowse'

export default function Programs() {
  const { session } = useSession()
  const verified = useVerified()
  const [programs, setPrograms] = useState<Program[] | null>(null)
  const [taken, setTaken] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!IS_CARE) return
    ;(async () => {
      const { data } = await supabase.from('programs').select('*').eq('organizer_id', session!.user.id).order('created_at', { ascending: false })
      const list = (data as Program[] | null) ?? []
      setPrograms(list)
      if (list.length) {
        const { data: c } = await supabase.from('program_counts').select('program_id, taken').in('program_id', list.map((p) => p.id))
        setTaken(Object.fromEntries(((c as { program_id: string; taken: number }[] | null) ?? []).map((x) => [x.program_id, x.taken])))
      }
    })()
  }, [session])

  if (!IS_CARE) return <ProgramBrowse />

  return (
    <>
      <h1 className="text-2xl font-bold">Programs</h1>
      <p className="mt-1">Run wellness programs for the community: live classes, coaching and courses, free or paid.</p>
      {verified ? (
        <Link to="/programs/new" className="btn mt-4 block text-center">Create a program</Link>
      ) : (
        <p className="card mt-4">Only verified organizations can create programs. Request verification from your Home screen.</p>
      )}

      {programs === null && <ListSkeleton />}
      {programs !== null && programs.length === 0 && verified && <p className="card mt-4">You have not created a program yet.</p>}
      {(programs ?? []).map((p) => (
        <Link key={p.id} to={`/programs/${p.id}`} className="card mt-4 block">
          <div className="flex flex-wrap gap-2">
            <span className="chip">{STATUS_LABEL[p.status]}</span>
            <span className="chip">{MODE_LABEL[p.mode]}</span>
            <span className="chip">{inr(p.price_inr)}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
          <p className="text-sm">Starts {fmtDate(p.starts_on)} · {p.duration_days} days</p>
          <p className="text-sm">{taken[p.id] ?? 0}{p.seats ? ` of ${p.seats}` : ''} joined</p>
        </Link>
      ))}
    </>
  )
}