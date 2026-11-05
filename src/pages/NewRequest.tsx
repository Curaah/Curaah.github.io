import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { Shell } from './ui'

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const URGENCY: [string, string][] = [
  ['critical', 'Critical: needed within a few hours'],
  ['today', 'Needed today'],
  ['within_3_days', 'Needed within 3 days'],
]

export default function NewRequest() {
  const { profile } = useSession()
  const [group, setGroup] = useState('')
  const [units, setUnits] = useState(1)
  const [hospital, setHospital] = useState('')
  const [city, setCity] = useState(profile?.city ?? '')
  const [urgency, setUrgency] = useState('today')
  const [note, setNote] = useState('')
  const [contact, setContact] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('raise_blood_request', {
      p_blood_group: group,
      p_units: units,
      p_hospital: hospital,
      p_city: city,
      p_urgency: urgency,
      p_note: note,
      p_contact: contact,
      p_consent: consent,
    })
    setBusy(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  if (IS_CARE) return <Shell back><p>Blood requests are raised from the Curaah app.</p></Shell>

  const callButtons = (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <a href="tel:108" className="btn btn-quiet block text-center">Call 108</a>
      <a href="tel:112" className="btn btn-quiet block text-center">Call 112</a>
    </div>
  )

  if (done) {
    return (
      <Shell back>
        <h1 className="text-2xl font-bold">Your request is live</h1>
        <p className="mt-2">Matching volunteers and blood banks in {city} can now see it. They will contact you only if they choose to respond.</p>
        <p className="mt-2">Please also contact the hospital’s blood bank directly, and call for help if the situation is life-threatening.</p>
        {callButtons}
        <Link to="/" className="btn mt-6 block text-center">Back to home</Link>
      </Shell>
    )
  }

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">Request blood</h1>
      <div className="card mt-3" style={{ borderColor: 'var(--warn)' }}>
        <p><strong>Life-threatening emergency?</strong> Call 108 or 112 first, and contact the hospital’s blood bank directly.</p>
        {callButtons}
        <p className="mt-3 text-sm">Curaah is in beta. We cannot promise that someone will respond.</p>
      </div>

      <form onSubmit={submit}>
        <label className="label" htmlFor="group">Blood group needed</label>
        <select id="group" className="field" required value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Choose…</option>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <label className="label" htmlFor="units">Units needed</label>
        <input id="units" className="field" type="number" min={1} max={10} required value={units} onChange={(e) => setUnits(Number(e.target.value))} />

        <label className="label" htmlFor="hospital">Hospital</label>
        <input id="hospital" className="field" required minLength={2} maxLength={150} value={hospital} onChange={(e) => setHospital(e.target.value)} />

        <label className="label" htmlFor="city">City</label>
        <input id="city" className="field" required minLength={2} maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />

        <label className="label" htmlFor="urgency">How urgent is it?</label>
        <select id="urgency" className="field" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          {URGENCY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label className="label" htmlFor="note">Short note (optional)</label>
        <input id="note" className="field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example, ward or bed number" />
        <p className="mt-1 text-sm">Responders can see this note. Don’t include the patient’s full name or diagnosis.</p>

        <label className="label" htmlFor="contact">Phone number for responders</label>
        <input id="contact" className="field" type="tel" required minLength={5} maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)} />

        <label className="mt-4 flex gap-3">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I agree to share this phone number with volunteers or blood banks who choose to respond. It is deleted when I close the request.</span>
        </label>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-6"><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Raise request'}</button></div>
      </form>
    </Shell>
  )
}