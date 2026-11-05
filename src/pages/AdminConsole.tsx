import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/errors'
import { Shell } from './ui'

type Tab = 'reports' | 'orgs' | 'points' | 'content' | 'log'
type Org = { user_id: string; org_name: string; org_type: string; city: string | null; status: string; events_count: number; checkins: number; health_issued: number; volunteer_issued: number; programs_count: number; posts_count: number }
type Pt = { ledger_id: number; created_at: string; kind: string; amount: number; reason: string; person: string; issued_by: string; title: string }
type Item = { item_type: 'post' | 'program' | 'event'; item_id: string; title: string; org_name: string; status: string; created_at: string }
type Rep = { target_type: 'post' | 'program' | 'event' | 'organization'; target_id: string; title: string; org_name: string; item_status: string; report_count: number; reasons: string[]; details: string[]; first_reported: string }
type Act = { created_at: string; admin: string; action: string; target_type: string | null; note: string | null }

const REPORT_REASON: Record<string, string> = { misleading_health_info: 'Misleading health information', scam_or_payment: 'Scam or suspicious payment', unsafe_or_harmful: 'Unsafe or harmful', inappropriate_content: 'Inappropriate', privacy_concern: 'Privacy', spam: 'Spam', other: 'Other' }
const ORG_TYPE: Record<string, string> = { ngo: 'NGO', blood_bank: 'Blood bank', professional: 'Professional' }
const REASON: Record<string, string> = { event_attendance: 'Attended', training: 'Training', blood_donation: 'Blood donation', program: 'Program completed' }
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function AdminConsole() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('reports')
  const [reports, setReports] = useState<Rep[] | null>(null)
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [points, setPoints] = useState<Pt[] | null>(null)
  const [items, setItems] = useState<Item[] | null>(null)
  const [log, setLog] = useState<Act[] | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async (t: Tab) => {
    if (t === 'reports') setReports(((await supabase.rpc('admin_open_reports')).data as Rep[] | null) ?? [])
    if (t === 'orgs') setOrgs(((await supabase.rpc('admin_org_overview')).data as Org[] | null) ?? [])
    if (t === 'points') setPoints(((await supabase.rpc('admin_recent_points', { p_limit: 60 })).data as Pt[] | null) ?? [])
    if (t === 'content') setItems(((await supabase.rpc('admin_content_feed', { p_limit: 80 })).data as Item[] | null) ?? [])
    if (t === 'log') setLog(((await supabase.rpc('admin_recent_actions', { p_limit: 60 })).data as Act[] | null) ?? [])
  }, [])

  useEffect(() => {
    supabase.rpc('is_admin').then(({ data }) => setAllowed(Boolean(data)))
  }, [])

  useEffect(() => {
    if (allowed) load(tab)
  }, [allowed, tab, load])

  // Every action asks for a short reason, which is saved in the admin log.
  function reason(): string | null {
    const note = window.prompt('Reason (at least 5 characters). It is saved in the admin log:')
    if (note === null) return null
    if (note.trim().length < 5) {
      setError('Please write a reason of at least 5 characters.')
      return null
    }
    return note.trim()
  }

  async function act(call: () => PromiseLike<{ error: { message: string; code?: string } | null }>, done: string) {
    setError('')
    setMsg('')
    const { error: e } = await call()
    if (e) setError(friendly(e))
    else setMsg(done)
    await load(tab)
  }

  function setVerification(o: Org, status: 'verified' | 'rejected') {
    if (!window.confirm(`${status === 'verified' ? 'Verify' : 'Revoke verification for'} ${o.org_name}?`)) return
    const note = reason()
    if (note) act(() => supabase.rpc('admin_set_verification', { p_user: o.user_id, p_status: status, p_note: note }), `${o.org_name}: ${status === 'verified' ? 'verified' : 'verification revoked'}.`)
  }

  function hideAll(o: Org) {
    if (!window.confirm(`Hide all posts and programs, and cancel upcoming events, from ${o.org_name}?`)) return
    const note = reason()
    if (note) act(() => supabase.rpc('admin_hide_everything_by', { p_user: o.user_id, p_note: note }), `Everything from ${o.org_name} is hidden.`)
  }

  function reverse(p: Pt) {
    if (!window.confirm(`Take back ${p.amount} ${p.kind} points from ${p.person}?`)) return
    const note = reason()
    if (note) act(() => supabase.rpc('admin_reverse_points', { p_ledger_id: p.ledger_id, p_note: note }), 'Points reversed.')
  }

  function setContent(i: Item, status: string, verb: string) {
    if (!window.confirm(`${verb} "${i.title}"?`)) return
    const note = reason()
    if (note) act(() => supabase.rpc('admin_set_content_status', { p_type: i.item_type, p_id: i.item_id, p_status: status, p_note: note }), `Done: ${verb.toLowerCase()} "${i.title}".`)
  }

  async function resolveReports(r: Rep, resolution: 'actioned' | 'dismissed', note: string) {
    const { error: e } = await supabase.rpc('admin_resolve_reports', { p_type: r.target_type, p_id: r.target_id, p_resolution: resolution, p_note: note })
    if (e) setError(friendly(e))
    else setMsg(resolution === 'dismissed' ? 'Reports dismissed.' : 'Reports marked as resolved.')
    await load('reports')
  }

  function dismiss(r: Rep) {
    const note = reason()
    if (note) resolveReports(r, 'dismissed', note)
  }

  async function takeAction(r: Rep) {
    const isOrg = r.target_type === 'organization'
    const hideStatus = r.target_type === 'event' ? 'cancelled' : 'hidden'
    const ask = isOrg ? `Revoke verification for ${r.title}?` : `${r.target_type === 'event' ? 'Cancel' : 'Hide'} "${r.title}"?`
    if (!window.confirm(ask)) return
    const note = reason()
    if (!note) return
    setError('')
    setMsg('')
    const first = isOrg
      ? await supabase.rpc('admin_set_verification', { p_user: r.target_id, p_status: 'rejected', p_note: note })
      : await supabase.rpc('admin_set_content_status', { p_type: r.target_type, p_id: r.target_id, p_status: hideStatus, p_note: note })
    if (first.error) {
      setError(friendly(first.error))
      return
    }
    await resolveReports(r, 'actioned', note)
  }

  if (allowed === null) return <Shell back><p>Loading…</p></Shell>
  if (!allowed) return <Shell back><p>This page is only for Curaah administrators.</p></Shell>

  const tabs: [Tab, string][] = [['reports', 'Reports'], ['orgs', 'Organizations'], ['points', 'Points'], ['content', 'Content'], ['log', 'Log']]

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Admin tools</h1>
      <p className="mt-1 text-sm">Every action asks for a reason and is saved in the log. <Link to="/admin" className="underline">Verification requests</Link></p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} className="chip" style={tab === t ? { borderColor: 'var(--accent)', fontWeight: 600 } : undefined} onClick={() => { setTab(t); setMsg(''); setError('') }}>{label}</button>
        ))}
      </div>
      {msg && <p className="card mt-3" role="status">{msg}</p>}
      {error && <p className="err" role="alert">{error}</p>}

      {tab === 'reports' && (
        <section>
          <p className="mt-3 text-sm">Open reports from users, most reported first. Reporters stay private.</p>
          {reports === null && <p className="mt-3">Loading…</p>}
          {reports !== null && reports.length === 0 && <p className="card mt-3">No open reports. Good.</p>}
          {(reports ?? []).map((r) => {
            const off = r.item_status === 'hidden' || r.item_status === 'cancelled'
            return (
              <article key={`${r.target_type}-${r.target_id}`} className="card mt-3">
                <div className="flex flex-wrap gap-2">
                  <span className="chip">{r.target_type === 'organization' ? 'Organization' : r.target_type === 'post' ? 'Post' : r.target_type === 'program' ? 'Program' : 'Event'}</span>
                  <span className="chip">{r.report_count} {r.report_count === 1 ? 'report' : 'reports'}</span>
                  {r.item_status !== 'n/a' && <span className="chip">{r.item_status}</span>}
                </div>
                <p className="mt-2 font-semibold">{r.title}</p>
                {r.target_type !== 'organization' && <p className="text-sm">By {r.org_name}</p>}
                <p className="text-sm">Reasons: {r.reasons.map((x) => REPORT_REASON[x] ?? x).join(', ')}</p>
                {r.details.slice(0, 3).map((d, i) => <p key={i} className="text-sm">“{d}”</p>)}
                <div className="mt-3 grid gap-2">
                  {!off && <button className="btn" onClick={() => takeAction(r)}>{r.target_type === 'organization' ? 'Revoke verification and resolve' : r.target_type === 'event' ? 'Cancel the event and resolve' : 'Hide it and resolve'}</button>}
                  <button className="btn btn-quiet" onClick={() => dismiss(r)}>No problem found: dismiss</button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === 'orgs' && (
        <section>
          <p className="mt-3 text-sm">Look for unusual numbers, such as a very high number of points per check-in.</p>
          {orgs === null && <p className="mt-3">Loading…</p>}
          {(orgs ?? []).map((o) => (
            <article key={o.user_id} className="card mt-3">
              <div className="flex flex-wrap gap-2">
                <span className="chip">{o.status === 'verified' ? 'Verified' : o.status === 'pending' ? 'Pending' : o.status === 'rejected' ? 'Not verified' : 'No request'}</span>
                <span className="chip">{ORG_TYPE[o.org_type] ?? o.org_type}</span>
                {o.city && <span className="chip">{o.city}</span>}
              </div>
              <p className="mt-2 font-semibold">{o.org_name}</p>
              <p className="text-sm">Events {o.events_count} · Check-ins {o.checkins} · Posts {o.posts_count} · Programs {o.programs_count}</p>
              <p className="text-sm">Points issued: {o.health_issued} health, {o.volunteer_issued} volunteer{o.checkins > 0 ? ` (${Math.round(o.health_issued / o.checkins)} health per check-in)` : ''}</p>
              <div className="mt-3 grid gap-2">
                {o.status === 'verified' && <button className="btn btn-quiet" onClick={() => setVerification(o, 'rejected')}>Revoke verification</button>}
                {(o.status === 'pending' || o.status === 'rejected') && <button className="btn" onClick={() => setVerification(o, 'verified')}>Verify</button>}
                <button className="btn btn-quiet" style={{ color: 'var(--warn)' }} onClick={() => hideAll(o)}>Hide everything they published</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'points' && (
        <section>
          <p className="mt-3 text-sm">Points issued by organizations, newest first. Daily task points are not shown.</p>
          {points === null && <p className="mt-3">Loading…</p>}
          {points !== null && points.length === 0 && <p className="card mt-3">No organization-issued points yet.</p>}
          {(points ?? []).map((p) => (
            <article key={p.ledger_id} className="card mt-3">
              <p className="font-semibold">{p.person}: +{p.amount} {p.kind}</p>
              <p className="text-sm">{REASON[p.reason] ?? p.reason}: {p.title}</p>
              <p className="text-sm">Confirmed by {p.issued_by} · {when(p.created_at)}</p>
              <button className="mt-2 underline" style={{ color: 'var(--warn)' }} onClick={() => reverse(p)}>Reverse these points</button>
            </article>
          ))}
        </section>
      )}

      {tab === 'content' && (
        <section>
          <p className="mt-3 text-sm">The latest posts, programs and events from organizations.</p>
          {items === null && <p className="mt-3">Loading…</p>}
          {(items ?? []).map((i) => {
            const off = i.status === 'hidden' || i.status === 'cancelled'
            return (
              <article key={`${i.item_type}-${i.item_id}`} className="card mt-3">
                <div className="flex flex-wrap gap-2">
                  <span className="chip">{i.item_type === 'post' ? 'Post' : i.item_type === 'program' ? 'Program' : 'Event'}</span>
                  <span className="chip">{i.status}</span>
                </div>
                <p className="mt-2 font-semibold">{i.title}</p>
                <p className="text-sm">{i.org_name} · {when(i.created_at)}</p>
                <div className="mt-2">
                  {off
                    ? <button className="underline" style={{ color: 'var(--accent)' }} onClick={() => setContent(i, 'published', 'Restore')}>Restore</button>
                    : i.item_type === 'event'
                      ? <button className="underline" style={{ color: 'var(--warn)' }} onClick={() => setContent(i, 'cancelled', 'Cancel')}>Cancel this event</button>
                      : <button className="underline" style={{ color: 'var(--warn)' }} onClick={() => setContent(i, 'hidden', 'Hide')}>Hide</button>}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === 'log' && (
        <section>
          <p className="mt-3 text-sm">What administrators have done. This record cannot be edited.</p>
          {log === null && <p className="mt-3">Loading…</p>}
          {log !== null && log.length === 0 && <p className="card mt-3">Nothing yet.</p>}
          {(log ?? []).map((a, idx) => (
            <article key={idx} className="card mt-3">
              <p className="font-semibold">{a.action.replace(/_/g, ' ')}{a.target_type ? ` · ${a.target_type}` : ''}</p>
              <p className="text-sm">{a.admin} · {when(a.created_at)}</p>
              {a.note && <p className="text-sm">Reason: {a.note}</p>}
            </article>
          ))}
        </section>
      )}
    </Shell>
  )
}