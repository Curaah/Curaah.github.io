import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { friendly } from '../lib/errors'
import { useI18n } from '../lib/i18n'
import Attendees from './Attendees'
import { ListSkeleton } from './Skeleton'
import ReportButton from './ReportButton'

type Ev = {
  id: string
  organizer_id: string
  title: string
  description: string
  event_type: string
  is_online: boolean
  city: string | null
  venue: string | null
  starts_at: string
  is_for_profit: boolean
  volunteers_needed: number
  reward_credits: number
}

type Reg = { event_id: string; as_volunteer: boolean; share_contact: boolean }

const TYPE_KEY = {
  blood_camp: 'ev.type.blood_camp',
  health_camp: 'ev.type.health_camp',
  awareness: 'ev.type.awareness',
  training: 'ev.type.training',
  webinar: 'ev.type.webinar',
  other: 'ev.type.other',
} as const

function RegisterBox({ ev, orgName, onClose, onDone }: { ev: Ev; orgName: string; onClose: () => void; onDone: () => void }) {
  const { session, profile } = useSession()
  const { t } = useI18n()
  const canVolunteer = Boolean(profile?.is_volunteer) && ev.volunteers_needed > 0
  const [asVolunteer, setAsVolunteer] = useState(false)
  const [share, setShare] = useState(false)
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.from('event_registrations').insert({
      event_id: ev.id,
      user_id: session!.user.id,
      as_volunteer: asVolunteer,
      share_contact: share,
      contact: share ? contact.trim() : null,
    })
    setBusy(false)
    if (error) setError(friendly(error))
    else onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
      {canVolunteer && (
        <label className="flex gap-3">
          <input type="checkbox" checked={asVolunteer} onChange={(e) => setAsVolunteer(e.target.checked)} />
          <span>{ev.reward_credits > 0 ? t('ev.asVolunteerReward', { n: String(ev.reward_credits) }) : t('ev.asVolunteer')}</span>
        </label>
      )}
      <label className="mt-3 flex gap-3">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
        <span>{t('ev.share', { org: orgName })}</span>
      </label>
      {share && (
        <>
          <label className="label" htmlFor={`c-${ev.id}`}>{t('ev.contact')}</label>
          <input id={`c-${ev.id}`} className="field" required value={contact} onChange={(e) => setContact(e.target.value)} />
          <p className="mt-1 text-sm">{t('ev.shareNote', { org: orgName })}</p>
        </>
      )}
      {!share && <p className="mt-2 text-sm">{t('ev.noShareNote')}</p>}
      {error && <p className="err" role="alert">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="btn" disabled={busy}>{busy ? t('ep.saving') : t('open.confirm')}</button>
        <button type="button" className="btn btn-quiet" onClick={onClose}>{t('open.notNow')}</button>
      </div>
    </form>
  )
}

export default function EventList() {
  const { session, profile } = useSession()
  const { t, lang } = useI18n()
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'pa' ? 'pa-IN' : 'en-IN'
  const uid = session!.user.id
  const city = profile?.city?.trim() ?? ''
  const [events, setEvents] = useState<Ev[] | null>(null)
  const [orgs, setOrgs] = useState<Record<string, string>>({})
  const [regs, setRegs] = useState<Record<string, Reg>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [localOnly, setLocalOnly] = useState(Boolean(city))

  async function loadRegs() {
    if (IS_CARE) return
    const { data } = await supabase.from('event_registrations').select('event_id, as_volunteer, share_contact').eq('user_id', uid)
    setRegs(Object.fromEntries(((data as Reg[] | null) ?? []).map((r) => [r.event_id, r])))
  }

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('starts_at', today.toISOString())
      .order('starts_at')
      .limit(50)
      .then(async ({ data }) => {
        const list = (data as Ev[] | null) ?? []
        setEvents(list)
        const ids = [...new Set(list.map((e) => e.organizer_id))]
        if (ids.length) {
          const { data: o } = await supabase.from('verified_orgs').select('user_id, org_name').in('user_id', ids)
          setOrgs(Object.fromEntries((o ?? []).map((x) => [x.user_id, x.org_name])))
        }
      })
    loadRegs()
  }, [])

  async function cancel(eventId: string) {
    await supabase.from('event_registrations').delete().eq('event_id', eventId).eq('user_id', uid)
    loadRegs()
  }

  const shown = (events ?? []).filter(
    (e) => !localOnly || e.is_online || (e.city ?? '').toLowerCase() === city.toLowerCase(),
  )

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{t('ev.upcoming')}</h2>
      {city && (
        <label className="mt-2 flex gap-3">
          <input type="checkbox" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} />
          <span>{t('ev.onlyLocal', { city })}</span>
        </label>
      )}
      {events === null && <ListSkeleton />}
      {events !== null && shown.length === 0 && (
        <p className="card mt-3">
          {localOnly ? t('ev.emptyLocal') : t('ev.emptyAll')} {IS_CARE ? t('ev.emptyCare') : t('ev.emptyUser')}
        </p>
      )}
      {shown.map((e) => {
        const reg = regs[e.id]
        const orgName = orgs[e.organizer_id] ?? t('ev.organizerFallback')
        const typeKey = TYPE_KEY[e.event_type as keyof typeof TYPE_KEY] ?? TYPE_KEY.other
        return (
          <article key={e.id} className="card mt-3">
            <div className="flex flex-wrap gap-2">
              <span className="chip">{t(typeKey)}</span>
              <span className="chip">{e.is_for_profit ? t('ev.paid') : t('ev.charity')}</span>
              {e.organizer_id === uid && <span className="chip">{t('ev.yours')}</span>}
            </div>
            <h3 className="mt-2 text-lg font-semibold">{e.title}</h3>
            <p>{t('ev.by', { org: orgName })}</p>
            <p className="mt-1">
              {new Date(e.starts_at).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
            <p>{e.is_online ? t('ev.online') : [e.venue, e.city].filter(Boolean).join(', ') || t('ev.venueTbd')}</p>
            <p className="mt-2">{e.description}</p>
            {e.organizer_id !== uid && <ReportButton type="event" id={e.id} />}
            <p className="mt-2 text-sm">
              {e.volunteers_needed > 0
                ? `${t('ev.volNeeded', { n: String(e.volunteers_needed) })} ${e.reward_credits > 0 ? t('ev.reward', { n: String(e.reward_credits) }) : t('ev.noReward')}`
                : t('ev.noVol')}
            </p>
            {!IS_CARE &&
              (reg ? (
                <div className="mt-3">
                  <p>
                    {reg.as_volunteer ? t('ev.registeredVol') : t('ev.registered')}{' '}
                    {reg.share_contact ? t('ev.sharedWith', { org: orgName }) : t('ev.notShared')}
                  </p>
                  <button className="btn btn-quiet mt-2" onClick={() => cancel(e.id)}>{t('ev.cancel')}</button>
                </div>
              ) : open === e.id ? (
                <RegisterBox ev={e} orgName={orgName} onClose={() => setOpen(null)} onDone={() => { setOpen(null); loadRegs() }} />
              ) : (
                <button className="btn mt-3" onClick={() => setOpen(e.id)}>{t('ev.register')}</button>
              ))}
            {e.organizer_id === uid && <Attendees eventId={e.id} />}
          </article>
        )
      })}
    </section>
  )
}