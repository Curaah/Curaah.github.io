import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { IMAGE_BUCKET, shrinkImage } from '../lib/images'
import { MODES, todayIST } from '../lib/programs'
import { TOPICS } from '../lib/topics'
import { Shell } from './ui'

export default function NewProgram() {
  const { session, profile } = useSession()
  const nav = useNavigate()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('general')
  const [mode, setMode] = useState('online')
  const [city, setCity] = useState(profile?.city ?? '')
  const [startsOn, setStartsOn] = useState(todayIST())
  const [days, setDays] = useState(28)
  const [price, setPrice] = useState(0)
  const [seats, setSeats] = useState('')
  const [payInfo, setPayInfo] = useState('')
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
      const { data, error: err } = await supabase.rpc('create_program', {
        p_title: title.trim(),
        p_summary: summary.trim(),
        p_description: description.trim(),
        p_topic: topic,
        p_mode: mode,
        p_city: mode === 'online' ? null : city.trim(),
        p_duration_days: days,
        p_starts_on: startsOn,
        p_price_inr: price,
        p_seats: seats ? Number(seats) : null,
        p_payment_info: price > 0 ? payInfo.trim() : null,
        p_image_path: path,
        p_image_alt: path ? alt.trim() : null,
      })
      if (err) {
        if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path])
        throw err
      }
      nav(`/programs/${data as string}`)
    } catch (err) {
      setError(friendly(err as { message?: string; code?: string }))
    }
    setBusy(false)
  }

  if (allowed === null) return <Shell back><p>Loading…</p></Shell>
  if (!allowed) return <Shell back><p>Only verified organizations can create programs.</p></Shell>

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Create a program</h1>
      <p className="mt-1">After you create it, you will add the timetable: live classes, in-person sessions and self-paced days.</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="ptitle">Program name</label>
        <input id="ptitle" className="field" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="label" htmlFor="psummary">One-line summary</label>
        <input id="psummary" className="field" required minLength={10} maxLength={200} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="For example, Four weeks of gentle morning yoga for beginners" />

        <label className="label" htmlFor="pdesc">What people will get</label>
        <textarea id="pdesc" className="field" rows={6} required minLength={20} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} />

        <label className="label" htmlFor="ptopic">Topic</label>
        <select id="ptopic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label className="label" htmlFor="pmode">How is it delivered?</label>
        <select id="pmode" className="field" value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {mode !== 'online' && (
          <>
            <label className="label" htmlFor="pcity">City</label>
            <input id="pcity" className="field" required minLength={2} value={city} onChange={(e) => setCity(e.target.value)} />
          </>
        )}

        <div className="mt-1 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="pstart">Starts on</label>
            <input id="pstart" className="field" type="date" required min={todayIST()} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pdays">Duration (days)</label>
            <input id="pdays" className="field" type="number" min={1} max={365} required value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="pprice">Price (₹)</label>
            <input id="pprice" className="field" type="number" min={0} max={100000} required value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="pseats">Places (optional)</label>
            <input id="pseats" className="field" type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} />
          </div>
        </div>
        <p className="mt-1 text-sm">Use 0 for a free program.</p>

        {price > 0 && (
          <>
            <label className="label" htmlFor="ppay">How should people pay you?</label>
            <input id="ppay" className="field" required minLength={5} maxLength={300} value={payInfo} onChange={(e) => setPayInfo(e.target.value)} placeholder="For example, UPI: coach@upi, or a payment link" />
            <p className="mt-1 text-sm">
              People see this only after they ask to join. Curaah does not take the payment in this version: you collect it yourself, then confirm the person on your program page.
            </p>
          </>
        )}

        <p className="label">Poster (optional)</p>
        {!file ? (
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a poster" onChange={pick} />
        ) : (
          <div className="card">
            <img src={preview} alt="Preview of your poster" className="w-full rounded-xl" />
            <label className="label" htmlFor="palt">Describe the poster for people who cannot see it</label>
            <input id="palt" className="field" required minLength={3} maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} />
            <button type="button" className="mt-3 underline" style={{ color: 'var(--accent)' }} onClick={() => { setFile(null); setPreview(''); setAlt('') }}>Remove poster</button>
          </div>
        )}

        <label className="mt-5 flex gap-3">
          <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>I confirm this program is run by suitably qualified people, and it makes no false or misleading health claims.</span>
        </label>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-6"><button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create program'}</button></div>
      </form>
    </Shell>
  )
}