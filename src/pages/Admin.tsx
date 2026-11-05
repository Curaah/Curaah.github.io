import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Shell } from './ui'

type Row = {
  user_id: string
  registration_no: string
  proof_url: string | null
  submitted_at: string
  full_name?: string
  city?: string | null
  org_name?: string | null
  org_type?: string | null
}

const ORG: Record<string, string> = { ngo: 'NGO', blood_bank: 'Blood bank', professional: 'Healthcare professional' }

export default function Admin() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  async function load() {
    const { data: requests } = await supabase
      .from('org_verifications')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at')
    const list = requests ?? []
    const ids = list.map((r) => r.user_id)
    const { data: people } = ids.length
      ? await supabase.from('profiles').select('id, full_name, city, org_name, org_type').in('id', ids)
      : { data: [] }
    const byId = new Map((people ?? []).map((p) => [p.id, p]))
    setRows(list.map((r) => ({ ...r, ...(byId.get(r.user_id) ?? {}) })))
  }

  useEffect(() => {
    supabase.rpc('is_admin').then(({ data }) => {
      setAllowed(Boolean(data))
      if (data) load()
    })
  }, [])

  async function decide(id: string, status: 'verified' | 'rejected') {
    const note = notes[id]?.trim() || null
    if (status === 'rejected' && !note) {
      setMsg('Add a short note so the organization knows what to fix.')
      return
    }
    const { error } = await supabase
      .from('org_verifications')
      .update({ status, admin_note: note, reviewed_at: new Date().toISOString() })
      .eq('user_id', id)
    if (error) {
      setMsg(`Could not save: ${error.message}`)
      return
    }
    setMsg(status === 'verified' ? 'Approved' : 'Rejected')
    load()
  }

  if (allowed === null) return <Shell back><p>Loading…</p></Shell>
  if (!allowed) return <Shell back><p>This page is only for Curaah administrators.</p></Shell>

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Verification requests</h1>
      <Link to="/admin/console" className="btn btn-quiet mt-3 block text-center">More admin tools: organizations, points, content, log</Link>
      <p className="mt-1">Check each registration number against the organization’s records before approving. Open proof links with care.</p>
      {msg && <p className="mt-3" role="status">{msg}</p>}
      {rows.length === 0 && <p className="card mt-5">No requests are waiting. New ones will appear here.</p>}
      {rows.map((r) => (
        <section key={r.user_id} className="card mt-5">
          <h2 className="text-lg font-semibold">{r.org_name}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip">{ORG[r.org_type ?? ''] ?? 'Organization'}</span>
            {r.city && <span className="chip">{r.city}</span>}
          </div>
          <p className="mt-3">Contact: {r.full_name}</p>
          <p>Registration number: <strong>{r.registration_no}</strong></p>
          {r.proof_url && /^https?:\/\//i.test(r.proof_url) ? (
            <p className="break-all">Proof: <a className="underline" href={r.proof_url} target="_blank" rel="noreferrer noopener">{r.proof_url}</a></p>
          ) : (
            <p>No proof link given.</p>
          )}
          <label className="label" htmlFor={`n-${r.user_id}`}>Note (required if rejecting)</label>
          <input id={`n-${r.user_id}`} className="field" value={notes[r.user_id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.user_id]: e.target.value })} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn" onClick={() => decide(r.user_id, 'verified')}>Approve</button>
            <button className="btn btn-quiet" onClick={() => decide(r.user_id, 'rejected')}>Reject</button>
          </div>
        </section>
      ))}
    </Shell>
  )
}