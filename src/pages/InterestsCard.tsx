import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { friendly } from '../lib/errors'
import { TOPICS } from '../lib/topics'

// "What I care about": topics and followed organizations, used only to choose what the person sees.
export default function InterestsCard() {
  const { session } = useSession()
  const [topics, setTopics] = useState<string[]>([])
  const [follows, setFollows] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (IS_CARE) return
    ;(async () => {
      const [i, f] = await Promise.all([
        supabase.from('interests').select('topics').maybeSingle(),
        supabase.from('follows').select('org_id', { count: 'exact', head: true }),
      ])
      setTopics((i.data as { topics: string[] } | null)?.topics ?? [])
      setFollows(f.count ?? 0)
    })()
  }, [])

  if (IS_CARE) return null

  async function save() {
    setBusy(true)
    setError('')
    setMsg('')
    const { error: e } = await supabase.from('interests').upsert({ user_id: session!.user.id, topics, updated_at: new Date().toISOString() })
    setBusy(false)
    if (e) setError(friendly(e))
    else setMsg('Saved. Your feed will use this.')
  }

  return (
    <section className="card mt-6">
      <h2 className="text-lg font-semibold">What I care about</h2>
      <p className="mt-1 text-sm">Pick topics you want to see more of. Only you can see this, and organizations never learn who chose what.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TOPICS.map(([v, label]) => (
          <label key={v} className="chip flex gap-2" style={topics.includes(v) ? { borderColor: 'var(--accent)' } : undefined}>
            <input type="checkbox" checked={topics.includes(v)} onChange={(e) => setTopics(e.target.checked ? [...topics, v] : topics.filter((x) => x !== v))} />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {msg && <p className="mt-2" role="status">{msg}</p>}
      <button className="btn mt-3" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save interests'}</button>
      <p className="mt-4">You follow {follows} {follows === 1 ? 'organization' : 'organizations'}.</p>
      <Link to="/organizations" className="btn btn-quiet mt-2 block text-center">Find organizations to follow</Link>
    </section>
  )
}