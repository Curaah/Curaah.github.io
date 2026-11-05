import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'

type Verification = {
  registration_no: string
  proof_url: string | null
  status: 'pending' | 'verified' | 'rejected'
  admin_note: string | null
}

export default function VerificationCard() {
  const { session } = useSession()
  const uid = session!.user.id
  const [row, setRow] = useState<Verification | null | undefined>(undefined)
  const [regNo, setRegNo] = useState('')
  const [proof, setProof] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('org_verifications').select('*').eq('user_id', uid).maybeSingle()
    const v = (data as Verification | null) ?? null
    setRow(v)
    if (v) {
      setRegNo(v.registration_no)
      setProof(v.proof_url ?? '')
    }
  }

  useEffect(() => {
    load()
  }, [uid])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const values = {
      registration_no: regNo.trim(),
      proof_url: proof.trim() || null,
      status: 'pending' as const,
      admin_note: null,
      reviewed_at: null,
    }
    const { error } = row
      ? await supabase.from('org_verifications').update(values).eq('user_id', uid)
      : await supabase.from('org_verifications').insert({ user_id: uid, ...values })
    if (error) setError(error.message)
    else await load()
    setBusy(false)
  }

  if (row === undefined) return null

  if (row?.status === 'verified') {
    return (
      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Verified</h2>
        <p className="mt-1">Your organization is verified. Registration number: {row.registration_no}</p>
        <p className="mt-2">Create events from the Events tab and write posts from the Content tab.</p>
      </section>
    )
  }

  if (row?.status === 'pending') {
    return (
      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Under review</h2>
        <p className="mt-1">We received registration number {row.registration_no}. A person reviews each request, and this page will show the result.</p>
      </section>
    )
  }

  return (
    <section className="card mt-6">
      <h2 className="text-lg font-semibold">{row ? 'Not approved yet' : 'Get verified'}</h2>
      {row?.status === 'rejected' && row.admin_note && <p className="mt-1">Reviewer’s note: {row.admin_note}</p>}
      <p className="mt-1">Verified organizations can post events and health content. Tell us how you are registered.</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="reg">Registration number</label>
        <input id="reg" className="field" required value={regNo} onChange={(e) => setRegNo(e.target.value)} />
        <label className="label" htmlFor="proof">Link to your registration certificate (optional)</label>
        <input id="proof" className="field" type="url" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="https://" />
        <p className="mt-1 text-sm">Use a shared link, such as Google Drive, that anyone with the link can open.</p>
        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-4">
          <button className="btn" disabled={busy}>{busy ? 'Sending…' : row ? 'Submit again' : 'Submit for verification'}</button>
        </div>
      </form>
    </section>
  )
}