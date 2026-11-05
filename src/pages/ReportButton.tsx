import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/errors'

const REASONS: [string, string][] = [
  ['misleading_health_info', 'Misleading or false health information'],
  ['scam_or_payment', 'A scam, or a suspicious request for payment'],
  ['unsafe_or_harmful', 'Unsafe or harmful advice'],
  ['inappropriate_content', 'Inappropriate content'],
  ['privacy_concern', 'Shares private information'],
  ['spam', 'Spam'],
  ['other', 'Something else'],
]

// A small "Report" link. Reports are private and go to Curaah's team.
export default function ReportButton({ type, id }: { type: 'post' | 'program' | 'event' | 'organization'; id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('misleading_health_info')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function send(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await supabase.rpc('report_content', { p_type: type, p_id: id, p_reason: reason, p_detail: detail })
    setBusy(false)
    if (err) setError(friendly(err))
    else setDone(true)
  }

  if (done) return <p className="mt-3 text-sm" role="status">Thank you. Our team will review this. The organization will not see who reported it.</p>
  if (!open) return <button className="mt-3 text-sm underline" onClick={() => setOpen(true)}>Report</button>

  return (
    <form onSubmit={send} className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <label className="label" htmlFor={`rr-${id}`}>What is wrong?</label>
      <select id={`rr-${id}`} className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <label className="label" htmlFor={`rd-${id}`}>Tell us more (optional)</label>
      <input id={`rd-${id}`} className="field" maxLength={300} value={detail} onChange={(e) => setDetail(e.target.value)} />
      <p className="mt-1 text-xs">Reports are private. In a medical emergency, call 108 or 112 instead.</p>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  )
}