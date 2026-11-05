import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { IMAGE_BUCKET, shrinkImage } from '../lib/images'
import { TOPICS } from '../lib/topics'
import { Shell } from './ui'

export default function NewPost() {
  const { session } = useSession()
  const nav = useNavigate()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('general')
  const [body, setBody] = useState('')
  const [source, setSource] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [alt, setAlt] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('is_verified_org').then(({ data }) => setAllowed(Boolean(data)))
  }, [])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setError('Please choose a JPEG, PNG or WebP image.')
      e.target.value = ''
      return
    }
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function removeImage() {
    setFile(null)
    setPreview('')
    setAlt('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const uid = session!.user.id
    let path: string | null = null
    try {
      if (file) {
        const blob = await shrinkImage(file)
        path = `${uid}/${crypto.randomUUID()}.jpg`
        const up = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (up.error) throw up.error
      }
      const { error: err } = await supabase.from('posts').insert({
        author_id: uid,
        title: title.trim(),
        topic,
        body: body.trim(),
        source_note: source.trim() || null,
        image_path: path,
        image_alt: path ? alt.trim() : null,
      })
      if (err) {
        if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path]) // do not leave an unused file behind
        throw err
      }
      nav('/learn')
    } catch (err) {
      setError(friendly(err as { message?: string; code?: string }))
    }
    setBusy(false)
  }

  if (allowed === null) return <Shell back><p>Loading…</p></Shell>
  if (!allowed) return <Shell back><p>Only verified organizations can post health content. Request verification from your home screen.</p></Shell>

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Write a health post</h1>
      <p className="mt-1">People will read this as trusted information from your organization, so keep it clear and accurate.</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" className="field" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="label" htmlFor="topic">Topic</label>
        <select id="topic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label className="label" htmlFor="body">Post</label>
        <textarea id="body" className="field" rows={8} required minLength={20} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="mt-1 text-sm">{body.length} / 5000 characters</p>

        <p className="label">Image or poster (optional)</p>
        {!file ? (
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose an image or poster" onChange={pick} />
        ) : (
          <div className="card">
            <img src={preview} alt="Preview of your image" className="w-full rounded-xl" />
            <label className="label" htmlFor="alt">Describe the image for people who cannot see it</label>
            <input id="alt" className="field" required minLength={3} maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="For example, Poster for a free blood donation camp on 12 November" />
            <button type="button" className="mt-3 underline" style={{ color: 'var(--accent)' }} onClick={removeImage}>Remove image</button>
          </div>
        )}
        <p className="mt-1 text-sm">The image is shrunk automatically. Use your own images or ones you have the right to share.</p>

        <label className="label" htmlFor="source">Where is this information from? (optional)</label>
        <input id="source" className="field" maxLength={300} value={source} onChange={(e) => setSource(e.target.value)} placeholder="For example, a national guideline, or our clinical experience" />

        <label className="mt-5 flex gap-3">
          <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>I confirm this is accurate to the best of my knowledge, and it does not promote a product or service.</span>
        </label>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-6"><button className="btn" disabled={busy}>{busy ? 'Publishing…' : 'Publish post'}</button></div>
      </form>
    </Shell>
  )
}