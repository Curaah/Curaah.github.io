import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { Shell } from './ui'

const TYPES: [string, string][] = [
  ['blood_camp', 'Blood donation camp'],
  ['health_camp', 'Health checkup camp'],
  ['awareness', 'Awareness session'],
  ['training', 'Training (for example, CPR)'],
  ['webinar', 'Webinar'],
  ['other', 'Other'],
]

export default function NewEvent() {
  const { session, profile } = useSession()
  const nav = useNavigate()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('health_camp')
  const [description, setDescription] = useState('')
  const [online, setOnline] = useState(false)
  const [city, setCity] = useState(profile?.city ?? '')
  const [venue, setVenue] = useState('')
  const [when, setWhen] = useState('')
  const [forProfit, setForProfit] = useState(false)
  const [needed, setNeeded] = useState(0)
  const [credits, setCredits] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('is_verified_org').then(({ data }) => setAllowed(Boolean(data)))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const start = new Date(when)
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
      setError('Choose a start time in the future.')
      return
    }
    if (credits > 0 && needed < 1) {
      setError('Rewards are for volunteers. Set how many volunteers you need, or set the reward to 0.')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('events').insert({
      organizer_id: session!.user.id,
      title: title.trim(),
      event_type: type,
      description: description.trim(),
      is_online: online,
      city: online ? null : city.trim() || null,
      venue: online ? null : venue.trim() || null,
      starts_at: start.toISOString(),
      is_for_profit: forProfit,
      volunteers_needed: needed,
      reward_credits: credits,
    })
    setBusy(false)
    if (error) setError(error.message)
    else nav('/')
  }

  if (allowed === null) return <Shell back><p>Loading…</p></Shell>
  if (!allowed) return <Shell back><p>Only verified organizations can create events. Request verification from your home screen.</p></Shell>

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Create an event</h1>
      <form onSubmit={submit}>
        <label className="label" htmlFor="title">Event title</label>
        <input id="title" className="field" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="label" htmlFor="type">Type</label>
        <select id="type" className="field" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label className="label" htmlFor="desc">What will happen, and who is it for?</label>
        <textarea id="desc" className="field" rows={4} required maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />

        <label className="label" htmlFor="when">Starts</label>
        <input id="when" className="field" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />

        <label className="mt-4 flex gap-3"><input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} /><span>This event is online</span></label>
        {!online && (
          <>
            <label className="label" htmlFor="city">City or area</label>
            <input id="city" className="field" value={city} onChange={(e) => setCity(e.target.value)} />
            <label className="label" htmlFor="venue">Venue</label>
            <input id="venue" className="field" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="For example, Civil Hospital grounds" />
          </>
        )}

        <label className="mt-5 flex gap-3">
          <input type="checkbox" checked={forProfit} onChange={(e) => setForProfit(e.target.checked)} />
          <span>This event is for profit (participants pay, or we sell products or consultations). Charity events are free to run.</span>
        </label>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="needed">Volunteers needed</label>
            <input id="needed" className="field" type="number" min={0} value={needed} onChange={(e) => setNeeded(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className="label" htmlFor="credits">Reward credits each</label>
            <input id="credits" className="field" type="number" min={0} value={credits} onChange={(e) => setCredits(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
        <p className="mt-1 text-sm">Volunteers will see this reward before they sign up. Use 0 for no reward.</p>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-6"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Publish event'}</button></div>
      </form>
    </Shell>
  )
}