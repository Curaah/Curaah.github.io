import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/errors'
import { useSession } from '../lib/session'
import { ACCOUNT_KIND, IS_CARE } from '../lib/app'
import { Shell } from './ui'

export default function Onboarding() {
  const { session, refresh } = useSession()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [userType, setUserType] = useState<'patient' | 'healthy'>('healthy')
  const [volunteer, setVolunteer] = useState(false)
  const [caregiver, setCaregiver] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<'ngo' | 'blood_bank' | 'professional'>('ngo')
  const [adult, setAdult] = useState(false)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    const uid = session.user.id
    setBusy(true); setError('')
    const { error: e1 } = await supabase.from('profiles').insert({
      id: uid,
      account_kind: ACCOUNT_KIND,
      full_name: name.trim(),
      city: city.trim() || null,
      user_type: IS_CARE ? null : userType,
      is_volunteer: !IS_CARE && userType === 'healthy' && volunteer,
      is_caregiver: !IS_CARE && caregiver,
      org_name: IS_CARE ? orgName.trim() : null,
      org_type: IS_CARE ? orgType : null,
      adult_confirmed: adult,
    })
    if (e1) { setError(friendly(e1)); setBusy(false); return }
    const results = await Promise.all([
      supabase.from('consents').insert({ user_id: uid, purpose: 'profile_processing', granted: true, policy_version: 'v0' }),
      supabase.from('notification_prefs').insert({ user_id: uid }),
    ])
    const failed = results.find((r) => r.error)
    if (failed?.error) { setError(friendly(failed.error)); setBusy(false); return }
    await refresh()
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold">Tell us a little about you</h1>
      <p className="mt-1">You can add more later, only when a feature needs it.</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="name">{IS_CARE ? 'Your name (contact person)' : 'Your name'}</label>
        <input id="name" className="field" required value={name} onChange={(e) => setName(e.target.value)} />
        <label className="label" htmlFor="city">City or area</label>
        <input id="city" className="field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="For example, Rupnagar" />

        {IS_CARE ? (
          <>
            <label className="label" htmlFor="org">Organization name</label>
            <input id="org" className="field" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <label className="label" htmlFor="orgtype">We are</label>
            <select id="orgtype" className="field" value={orgType} onChange={(e) => setOrgType(e.target.value as typeof orgType)}>
              <option value="ngo">An NGO</option>
              <option value="blood_bank">A blood bank</option>
              <option value="professional">A healthcare professional</option>
            </select>
          </>
        ) : (
          <>
            <fieldset className="mt-4">
              <legend className="label">I am joining as</legend>
              <label className="card mb-2 flex gap-3"><input type="radio" name="t" checked={userType === 'healthy'} onChange={() => setUserType('healthy')} /><span>Someone staying healthy</span></label>
              <label className="card flex gap-3"><input type="radio" name="t" checked={userType === 'patient'} onChange={() => { setUserType('patient'); setVolunteer(false) }} /><span>Someone managing a health condition</span></label>
            </fieldset>
            {userType === 'healthy' && (
              <label className="mt-4 flex gap-3"><input type="checkbox" checked={volunteer} onChange={(e) => setVolunteer(e.target.checked)} /><span>I want to volunteer for health events and emergencies</span></label>
            )}
            <label className="mt-3 flex gap-3"><input type="checkbox" checked={caregiver} onChange={(e) => setCaregiver(e.target.checked)} /><span>I also look after a family member’s health</span></label>
          </>
        )}

        <label className="mt-5 flex gap-3"><input type="checkbox" required checked={adult} onChange={(e) => setAdult(e.target.checked)} /><span>I am 18 or older</span></label>
        <label className="mt-3 flex gap-3"><input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I agree that these details are stored to run my account. I can change my notification choices at any time.</span></label>
        {error && <p className="err" role="alert">{error}</p>}
        <div className="mt-6"><button className="btn" disabled={busy || !adult || !agree}>{busy ? 'Saving…' : 'Continue'}</button></div>
      </form>
      <button className="btn btn-quiet mt-3" type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </Shell>
  )
}
