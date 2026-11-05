import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { friendly } from '../lib/errors'
import { tr, useI18n } from '../lib/i18n'
import { ListSkeleton } from './Skeleton'

type Req = {
  id: string
  blood_group: string
  units: number
  hospital: string
  city: string
  urgency: 'critical' | 'today' | 'within_3_days'
  patient_note: string | null
  created_at: string
}

type Translate = ReturnType<typeof useI18n>['t']

const URGENCY_KEY = {
  critical: 'mine.urg.critical',
  today: 'mine.urg.today',
  within_3_days: 'mine.urg.within_3_days',
} as const
const RANK: Record<Req['urgency'], number> = { critical: 0, today: 1, within_3_days: 2 }

function ago(iso: string, t: Translate): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return t('open.agoMin', { n: String(mins) })
  const h = Math.round(mins / 60)
  return h < 24 ? t('open.agoHour', { n: String(h) }) : t('open.agoDay', { n: String(Math.round(h / 24)) })
}

function RespondBox({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('respond_to_request', {
      p_request: id,
      p_contact: contact,
      p_note: note,
      p_consent: consent,
    })
    setBusy(false)
    if (error) setError(friendly(error))
    else onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
      <label className="label" htmlFor={`rc-${id}`}>{IS_CARE ? t('open.phoneBank') : t('open.phoneYou')}</label>
      <input id={`rc-${id}`} className="field" type="tel" required minLength={5} maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)} />
      <label className="label" htmlFor={`rn-${id}`}>{t('req.note')}</label>
      <input id={`rn-${id}`} className="field" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={IS_CARE ? t('open.notePhBank') : t('open.notePhYou')} />
      <label className="mt-4 flex gap-3">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{t('open.consent')}</span>
      </label>
      {!IS_CARE && <p className="mt-2 text-sm">{t('open.eligibility')}</p>}
      {error && <p className="err" role="alert">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="btn" disabled={busy}>{busy ? t('req.sending') : t('open.confirm')}</button>
        <button type="button" className="btn btn-quiet" onClick={onClose}>{t('open.notNow')}</button>
      </div>
    </form>
  )
}

export default function OpenRequests() {
  const { session, profile } = useSession()
  const { t } = useI18n()
  const uid = session!.user.id
  const eligible = IS_CARE ? profile?.org_type === 'blood_bank' : Boolean(profile?.is_volunteer && profile?.emergency_available)
  const [reqs, setReqs] = useState<Req[] | null>(null)
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [contacts, setContacts] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const seen = useRef<Set<string> | null>(null)
  const alertsOn = useRef(true)
  const [banner, setBanner] = useState('')
  const [canNotify, setCanNotify] = useState(typeof Notification !== 'undefined' && Notification.permission === 'default')

  async function load() {
    const { data } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .neq('requester_id', uid)
    const list = ((data as Req[] | null) ?? []).sort(
      (a, b) => RANK[a.urgency] - RANK[b.urgency] || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    setReqs(list)
    const prev = seen.current
    seen.current = new Set(list.map((x) => x.id))
    if (prev && alertsOn.current) {
      const fresh = list.filter((x) => !prev.has(x.id))
      if (fresh.length) {
        // tr() reads the current language, so the alert text stays correct if the language changes.
        const text = tr('open.newOne', { group: fresh[0].blood_group, hospital: fresh[0].hospital })
        setBanner(fresh.length > 1 ? tr('open.newMany', { n: String(fresh.length) }) : text)
        navigator.vibrate?.([200, 100, 200])
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(tr('open.notifyTitle'), { body: text })
        }
      }
    }
    const { data: r } = await supabase.from('blood_responses').select('request_id').eq('responder_id', uid)
    const ids = new Set((r ?? []).map((x) => x.request_id as string))
    setMine(ids)
    if (ids.size) {
      const { data: c } = await supabase.from('request_contacts').select('request_id, contact').in('request_id', [...ids])
      setContacts(Object.fromEntries((c ?? []).map((x) => [x.request_id, x.contact])))
    } else {
      setContacts({})
    }
  }

  useEffect(() => {
    if (!eligible) return
    supabase
      .from('notification_prefs')
      .select('emergency')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => {
        alertsOn.current = data?.emergency ?? true
      })
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [eligible])

  async function withdraw(id: string) {
    if (!window.confirm(t('open.confirmWithdraw'))) return
    await supabase.from('blood_responses').delete().eq('request_id', id).eq('responder_id', uid)
    load()
  }

  if (!eligible) return null

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{t('open.title')}</h2>
      <p className="mt-1 text-sm">
        {IS_CARE ? t('open.subBank') : t('open.subVolunteer')} {t('open.noMoney')}
      </p>
      {banner && (
        <div className="card mt-3" role="alert" style={{ borderColor: 'var(--warn)' }}>
          <strong>{banner}</strong>
          <button className="btn btn-quiet mt-2" onClick={() => setBanner('')}>{t('open.dismiss')}</button>
        </div>
      )}
      {canNotify && (
        <button
          className="btn btn-quiet mt-3"
          onClick={async () => {
            await Notification.requestPermission()
            setCanNotify(false)
          }}
        >
          {t('open.enableAlerts')}
        </button>
      )}
      {reqs === null && <ListSkeleton rows={2} />}
      {reqs !== null && reqs.length === 0 && (
        <p className="card mt-3">
          {t('open.empty')}{IS_CARE ? ` ${t('open.emptyBank')}` : ''}
        </p>
      )}
      {(reqs ?? []).map((r) => {
        const responded = mine.has(r.id)
        return (
          <article key={r.id} className="card mt-3" style={r.urgency === 'critical' ? { borderColor: 'var(--warn)' } : undefined}>
            <div className="flex flex-wrap gap-2">
              <span className="chip"><strong>{r.blood_group}</strong></span>
              <span className="chip">{t('mine.units', { n: String(r.units) })}</span>
              <span className="chip">{t(URGENCY_KEY[r.urgency])}</span>
            </div>
            <p className="mt-2 font-semibold">{r.hospital}, {r.city}</p>
            <p className="text-sm">{t('open.posted', { ago: ago(r.created_at, t) })}</p>
            {r.patient_note && <p className="mt-2">{r.patient_note}</p>}
            {responded ? (
              <div className="mt-3">
                <p>{t('open.offered')}</p>
                {contacts[r.id] ? (
                  <a className="btn mt-2 block text-center" href={`tel:${contacts[r.id]}`}>{t('mine.call', { phone: contacts[r.id] })}</a>
                ) : (
                  <p className="mt-1">{t('common.loading')}</p>
                )}
                <button className="btn btn-quiet mt-3" onClick={() => withdraw(r.id)}>{t('open.withdraw')}</button>
              </div>
            ) : open === r.id ? (
              <RespondBox id={r.id} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load() }} />
            ) : (
              <button className="btn mt-3" onClick={() => setOpen(r.id)}>{IS_CARE ? t('open.weCanHelp') : t('open.iCanHelp')}</button>
            )}
          </article>
        )
      })}
    </section>
  )
}