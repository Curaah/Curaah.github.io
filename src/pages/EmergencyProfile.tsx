import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { friendly } from '../lib/errors'
import { useI18n } from '../lib/i18n'

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function EmergencyProfile() {
  const { session, profile, refresh } = useSession()
  const { t } = useI18n()
  const [group, setGroup] = useState(profile?.blood_group ?? '')
  const [on, setOn] = useState(profile?.emergency_available ?? false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!profile?.is_volunteer) return null
  const uid = session!.user.id

  async function save() {
    setBusy(true)
    setMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ blood_group: group || null, emergency_available: on })
      .eq('id', uid)
    if (error) {
      setMsg(friendly(error))
      setBusy(false)
      return
    }
    if (on !== profile!.emergency_available) {
      await supabase.from('consents').insert({ user_id: uid, purpose: 'emergency_alerts', granted: on, policy_version: 'v0' })
    }
    await refresh()
    setMsg(t('ep.saved'))
    setBusy(false)
  }

  return (
    <section className="card mt-6">
      <h2 className="text-lg font-semibold">{t('ep.title')}</h2>
      <p className="mt-1">{t('ep.intro')}</p>

      <label className="label" htmlFor="bg">{t('ep.group')}</label>
      <select
        id="bg"
        className="field"
        value={group}
        onChange={(e) => {
          setGroup(e.target.value)
          if (!e.target.value) setOn(false)
        }}
      >
        <option value="">{t('ep.unknown')}</option>
        {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      <label className="mt-4 flex gap-3">
        <input type="checkbox" disabled={!group} checked={on} onChange={(e) => setOn(e.target.checked)} />
        <span>{t('ep.alertMe')}</span>
      </label>
      {!group && <p className="mt-1 text-sm">{t('ep.chooseFirst')}</p>}

      <p className="mt-3 text-sm">{t('ep.privacy')}</p>

      {msg && <p className="mt-3" role="status">{msg}</p>}
      <div className="mt-4"><button className="btn" onClick={save} disabled={busy}>{busy ? t('ep.saving') : t('ep.save')}</button></div>
    </section>
  )
}