import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { Shell } from './ui'

type Org = { user_id: string; org_name: string; org_type: string; city: string | null }

const TYPE: Record<string, string> = { ngo: 'NGO', blood_bank: 'Blood bank', professional: 'Healthcare professional' }

export default function Organizations() {
  const { session, profile } = useSession()
  const uid = session!.user.id
  const city = profile?.city?.trim().toLowerCase() ?? ''
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [localOnly, setLocalOnly] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const [o, f, c] = await Promise.all([
        supabase.from('verified_orgs').select('user_id, org_name, org_type, city').order('org_name').limit(200),
        supabase.from('follows').select('org_id'),
        supabase.from('org_followers').select('org_id, followers'),
      ])
      setOrgs((o.data as Org[] | null) ?? [])
      setMine(new Set(((f.data as { org_id: string }[] | null) ?? []).map((x) => x.org_id)))
      setCounts(Object.fromEntries(((c.data as { org_id: string; followers: number }[] | null) ?? []).map((x) => [x.org_id, x.followers])))
    })()
  }, [])

  async function toggle(o: Org) {
    setError('')
    const following = mine.has(o.user_id)
    if (!following && mine.size >= 100) {
      setError('You can follow up to 100 organizations. Unfollow one to follow another.')
      return
    }
    setBusy(o.user_id)
    const { error: e } = following
      ? await supabase.from('follows').delete().eq('user_id', uid).eq('org_id', o.user_id)
      : await supabase.from('follows').insert({ user_id: uid, org_id: o.user_id })
    setBusy(null)
    if (e) {
      setError(friendly(e))
      return
    }
    const next = new Set(mine)
    if (following) next.delete(o.user_id)
    else next.add(o.user_id)
    setMine(next)
    setCounts({ ...counts, [o.user_id]: Math.max(0, (counts[o.user_id] ?? 0) + (following ? -1 : 1)) })
  }

  const shown = (orgs ?? []).filter(
    (o) =>
      (q.trim() === '' || o.org_name.toLowerCase().includes(q.trim().toLowerCase())) &&
      (type === 'all' || o.org_type === type) &&
      (!localOnly || (o.city ?? '').toLowerCase() === city),
  )

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Organizations</h1>
      <p className="mt-1">Follow verified organizations to see more of their posts, events and programs. They never see who follows them, only how many.</p>

      <label className="label" htmlFor="oq">Search by name</label>
      <input id="oq" className="field" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="label" htmlFor="ot">Type</label>
      <select id="ot" className="field" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="all">All types</option>
        <option value="ngo">NGOs</option>
        <option value="blood_bank">Blood banks</option>
        <option value="professional">Healthcare professionals</option>
      </select>
      {city && (
        <label className="mt-3 flex gap-3">
          <input type="checkbox" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} />
          <span>Only organizations in {profile?.city}</span>
        </label>
      )}
      {error && <p className="err" role="alert">{error}</p>}

      {orgs === null && <p className="mt-4">Loading…</p>}
      {orgs !== null && shown.length === 0 && <p className="card mt-4">No organizations match. Try clearing the filters.</p>}
      {shown.map((o) => {
        const following = mine.has(o.user_id)
        return (
          <article key={o.user_id} className="card mt-3">
            <div className="flex flex-wrap gap-2">
              <span className="chip">{TYPE[o.org_type] ?? o.org_type}</span>
              {o.city && <span className="chip">{o.city}</span>}
            </div>
            <p className="mt-2 text-lg font-semibold">{o.org_name}</p>
            <p className="text-sm">{counts[o.user_id] ?? 0} {(counts[o.user_id] ?? 0) === 1 ? 'follower' : 'followers'}</p>
            <button
              className={following ? 'btn btn-quiet mt-3' : 'btn mt-3'}
              aria-pressed={following}
              disabled={busy === o.user_id}
              onClick={() => toggle(o)}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          </article>
        )
      })}
    </Shell>
  )
}