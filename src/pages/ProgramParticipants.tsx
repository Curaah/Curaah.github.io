import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/errors'

type Row = { enrollment_id: string; status: 'requested' | 'confirmed' | 'cancelled' | 'completed'; name: string; contact: string; note: string | null; created_at: string }
type Att = { enrollment_id: string; attended: number; held: number }

const LABEL: Record<Row['status'], string> = {
  requested: 'Asked to join',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export default function ProgramParticipants({ programId, price }: { programId: string; price: number }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [att, setAtt] = useState<Record<string, Att>>({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [r, a] = await Promise.all([
      supabase.rpc('program_enrollments_for', { p_program: programId }),
      supabase.rpc('program_participant_attendance', { p_program: programId }),
    ])
    setRows((r.data as Row[] | null) ?? [])
    setAtt(Object.fromEntries(((a.data as Att[] | null) ?? []).map((x) => [x.enrollment_id, x])))
  }, [programId])

  useEffect(() => {
    load()
  }, [load])

  async function change(row: Row, status: 'confirmed' | 'cancelled' | 'completed') {
    const ask =
      status === 'cancelled'
        ? `Cancel ${row.name}'s place? If they already paid, you will need to refund them yourself.`
        : status === 'completed'
          ? `Mark ${row.name} as having completed the program? This awards them points.`
          : `Confirm that you received payment from ${row.name}?`
    if (!window.confirm(ask)) return
    setError('')
    setMsg('')
    const { error: e } = await supabase.rpc('set_enrollment_status', { p_enrollment: row.enrollment_id, p_status: status })
    if (e) setError(friendly(e))
    else setMsg(status === 'completed' ? `${row.name} is marked completed.` : status === 'confirmed' ? `${row.name} is confirmed and can now see the program.` : `${row.name}'s place was cancelled.`)
    await load()
  }

  const active = (rows ?? []).filter((r) => r.status !== 'cancelled')
  const cancelled = (rows ?? []).filter((r) => r.status === 'cancelled')

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Participants</h2>
      {price > 0 && <p className="mt-1 text-sm">For paid programs: people ask to join, you collect their payment, then tap <strong>Confirm payment</strong> so they can see the program.</p>}
      {msg && <p className="mt-2" role="status">{msg}</p>}
      {error && <p className="err" role="alert">{error}</p>}
      {rows === null && <p className="mt-2">Loading…</p>}
      {rows !== null && active.length === 0 && <p className="card mt-3">Nobody has joined yet.</p>}
      {active.map((r) => {
        const a = att[r.enrollment_id]
        return (
          <article key={r.enrollment_id} className="card mt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{r.name}</p>
              <span className="chip">{LABEL[r.status]}</span>
            </div>
            <p className="mt-1"><a className="underline" href={`tel:${r.contact}`}>{r.contact}</a></p>
            {r.note && <p className="text-sm">Note: {r.note}</p>}
            {a && a.held > 0 && <p className="mt-1 text-sm">Attended {a.attended} of {a.held} live classes so far</p>}
            <div className="mt-3 grid gap-2">
              {r.status === 'requested' && <button className="btn" onClick={() => change(r, 'confirmed')}>Confirm payment</button>}
              {r.status === 'confirmed' && <button className="btn" onClick={() => change(r, 'completed')}>Mark completed</button>}
              {(r.status === 'requested' || r.status === 'confirmed') && <button className="btn btn-quiet" onClick={() => change(r, 'cancelled')}>Cancel place</button>}
            </div>
          </article>
        )
      })}
      {cancelled.length > 0 && <p className="mt-3 text-sm">{cancelled.length} cancelled {cancelled.length === 1 ? 'place' : 'places'} not shown.</p>}
      <p className="mt-3 text-xs">People agreed to share their name and contact with you for this program only. Use them only to run it.</p>
    </section>
  )
}