import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { fmtIST } from '../lib/programs'

type Update = { id: string; title: string; body: string; link_url: string | null; created_at: string }

export default function ProgramUpdates({ programId }: { programId: string }) {
  const { session } = useSession()
  const [updates, setUpdates] = useState<Update[] | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('program_updates').select('id, title, body, link_url, created_at').eq('program_id', programId).order('created_at', { ascending: false })
    setUpdates((data as Update[] | null) ?? [])
  }, [programId])

  useEffect(() => {
    load()
  }, [load])

  async function post(e: FormEvent) {
    e.preventDefault()
    setError('')
    const l = link.trim()
    if (l && !/^https:\/\//i.test(l)) {
      setError('Links must start with https://')
      return
    }
    setBusy(true)
    const { error: err } = await supabase.from('program_updates').insert({
      program_id: programId,
      author_id: session!.user.id,
      title: title.trim(),
      body: body.trim(),
      link_url: l || null,
    })
    setBusy(false)
    if (err) {
      setError(friendly(err))
      return
    }
    setTitle('')
    setBody('')
    setLink('')
    await load()
  }

  async function remove(u: Update) {
    if (!window.confirm(`Delete "${u.title}"?`)) return
    const { error: err } = await supabase.from('program_updates').delete().eq('id', u.id)
    if (err) setError(friendly(err))
    await load()
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Updates and materials</h2>
      <p className="mt-1 text-sm">Only confirmed participants see these. Use them for plans, reading, recipes and reminders.</p>

      <form onSubmit={post} className="card mt-3">
        <label className="label" htmlFor="utitle">Title</label>
        <input id="utitle" className="field" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="label" htmlFor="ubody">Message</label>
        <textarea id="ubody" className="field" rows={4} required maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="label" htmlFor="ulink">Link (optional)</label>
        <input id="ulink" className="field" type="url" maxLength={300} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-3"><button className="btn" disabled={busy}>{busy ? 'Posting…' : 'Post update'}</button></div>
      </form>

      {updates !== null && updates.length === 0 && <p className="card mt-3">No updates yet.</p>}
      {(updates ?? []).map((u) => (
        <article key={u.id} className="card mt-3">
          <p className="font-semibold">{u.title}</p>
          <p className="text-sm">{fmtIST(u.created_at)}</p>
          <p className="mt-1 whitespace-pre-line">{u.body}</p>
          {u.link_url && <p className="mt-1 break-all"><a className="underline" href={u.link_url} target="_blank" rel="noreferrer noopener">{u.link_url}</a></p>}
          <button className="mt-2 underline" style={{ color: 'var(--warn)' }} onClick={() => remove(u)}>Delete</button>
        </article>
      ))}
    </section>
  )
}