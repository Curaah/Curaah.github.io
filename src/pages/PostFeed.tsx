import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { IMAGE_BUCKET, imageUrl } from '../lib/images'
import { TOPICS, TOPIC_LABEL } from '../lib/topics'
import { ListSkeleton } from './Skeleton'
import ReportButton from './ReportButton'

type Post = {
  id: string
  author_id: string
  title: string
  body: string
  topic: string
  source_note: string | null
  image_path: string | null
  image_alt: string | null
  created_at: string
}

export default function PostFeed() {
  const { session } = useSession()
  const uid = session!.user.id
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [orgs, setOrgs] = useState<Record<string, string>>({})
  const [topic, setTopic] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const base = supabase.from('posts').select('*').eq('status', 'published')
    const filtered = topic === 'all' ? base : base.eq('topic', topic)
    const { data } = await filtered.order('created_at', { ascending: false }).limit(30)
    const list = (data as Post[] | null) ?? []
    setPosts(list)
    const ids = [...new Set(list.map((p) => p.author_id))]
    if (ids.length) {
      const { data: o } = await supabase.from('verified_orgs').select('user_id, org_name').in('user_id', ids)
      setOrgs(Object.fromEntries((o ?? []).map((x) => [x.user_id, x.org_name])))
    }
  }

  useEffect(() => {
    load()
  }, [topic])

  useEffect(() => {
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(Boolean(data)))
  }, [])

  async function hide(id: string) {
    if (!window.confirm('Hide this post from everyone?')) return
    const { error } = await supabase.from('posts').update({ status: 'hidden' }).eq('id', id)
    setMsg(error ? friendly(error) : 'Post hidden')
    load()
  }

  async function remove(p: Post) {
    if (!window.confirm('Delete your post permanently?')) return
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (!error && p.image_path) await supabase.storage.from(IMAGE_BUCKET).remove([p.image_path])
    setMsg(error ? friendly(error) : 'Post deleted')
    load()
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Health content</h2>
      <p className="mt-1 text-sm">General information from verified organizations. It is not medical advice, so talk to a doctor about your own health.</p>
      <label className="label" htmlFor="topic-filter">Topic</label>
      <select id="topic-filter" className="field" value={topic} onChange={(e) => setTopic(e.target.value)}>
        <option value="all">All topics</option>
        {TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {msg && <p className="mt-3" role="status">{msg}</p>}
      {posts === null && <ListSkeleton />}
      {posts !== null && posts.length === 0 && <p className="card mt-3">No posts here yet.</p>}
      {(posts ?? []).map((p) => {
        const long = p.body.length > 280
        const open = openId === p.id
        return (
          <article key={p.id} className="card mt-3">
            <span className="chip">{TOPIC_LABEL[p.topic] ?? 'Health'}</span>
            <h3 className="mt-2 text-lg font-semibold">{p.title}</h3>
            <p className="text-sm">
              By {orgs[p.author_id] ?? 'a verified organization'} ·{' '}
              {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {p.image_path && (
              <img
                src={imageUrl(p.image_path)}
                alt={p.image_alt ?? ''}
                loading="lazy"
                className="mt-3 w-full rounded-xl border"
                style={{ borderColor: 'var(--line)' }}
              />
            )}
            <p className="mt-2 whitespace-pre-line">{long && !open ? `${p.body.slice(0, 280)}…` : p.body}</p>
            {long && (
              <button className="mt-1 underline" style={{ color: 'var(--accent)' }} onClick={() => setOpenId(open ? null : p.id)}>
                {open ? 'Show less' : 'Read more'}
              </button>
            )}
            {p.source_note && <p className="mt-2 text-sm">Source: {p.source_note}</p>}
            {p.author_id !== uid && <ReportButton type="post" id={p.id} />}
            {p.author_id === uid && (
              <button className="btn btn-quiet mt-3" onClick={() => remove(p)}>Delete my post</button>
            )}
            {isAdmin && p.author_id !== uid && (
              <button className="btn btn-quiet mt-3" onClick={() => hide(p.id)}>Hide this post (admin)</button>
            )}
          </article>
        )
      })}
    </section>
  )
}