import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { friendly } from '../lib/errors'
import { useI18n } from '../lib/i18n'

type Req = {
  id: string
  blood_group: string
  units: number
  hospital: string
  city: string
  urgency: string
  created_at: string
  expires_at: string
}

type Resp = {
  request_id: string
  responder_kind: 'volunteer' | 'blood_bank'
  contact: string
  note: string | null
}

type Reach = { volunteers_label: string; blood_banks_label: string; offers: number }

const URGENCY_KEY = {
  critical: 'mine.urg.critical',
  today: 'mine.urg.today',
  within_3_days: 'mine.urg.within_3_days',
} as const

export default function MyRequests() {
  const { session } = useSession()
  const { t } = useI18n()
  const uid = session!.user.id
  const [reqs, setReqs] = useState<Req[] | null>(null)
  const [resps, setResps] = useState<Record<string, Resp[]>>({})
  const [reach, setReach] = useState<Record<string, Reach>>({})
  const [msg, setMsg] = useState('')

  // The reach labels come from the database in English; show them in the user's language.
  const label = (s: string) => (s === 'None' ? t('mine.none') : s === 'Fewer than 5' ? t('mine.fewer') : s)

  async function load() {
    const { data } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('requester_id', uid)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    const list = (data as Req[] | null) ?? []
    setReqs(list)
    const reachEntries = await Promise.all(
      list.map(async (x) => {
        const { data: rr } = await supabase.rpc('request_reach', { p_request: x.id })
        return [x.id, (rr as Reach[] | null)?.[0]] as const
      }),
    )
    setReach(Object.fromEntries(reachEntries.filter(([, v]) => v)) as Record<string, Reach>)
    if (!list.length) {
      setResps({})
      return
    }
    const { data: r } = await supabase
      .from('blood_responses')
      .select('request_id, responder_kind, contact, note')
      .in('request_id', list.map((x) => x.id))
      .order('created_at')
    const grouped: Record<string, Resp[]> = {}
    for (const x of (r as Resp[] | null) ?? []) {
      grouped[x.request_id] = [...(grouped[x.request_id] ?? []), x]
    }
    setResps(grouped)
  }

  useEffect(() => {
    if (IS_CARE) return
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [])

  async function close(id: string, status: 'fulfilled' | 'cancelled') {
    const ask = status === 'fulfilled' ? t('mine.confirmFulfilled') : t('mine.confirmCancel')
    if (!window.confirm(ask)) return
    const { error } = await supabase.rpc('close_blood_request', { p_request: id, p_status: status })
    setMsg(error ? friendly(error) : status === 'fulfilled' ? t('mine.doneFulfilled') : t('mine.doneCancelled'))
    load()
  }

  if (IS_CARE || !reqs || reqs.length === 0) return msg ? <p className="mt-6" role="status">{msg}</p> : null

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{t('mine.title')}</h2>
      <p className="mt-1 text-sm">{t('mine.help')}</p>
      {msg && <p className="mt-3" role="status">{msg}</p>}
      {reqs.map((r) => {
        const list = resps[r.id] ?? []
        const expired = new Date(r.expires_at).getTime() < Date.now()
        const urgencyKey = URGENCY_KEY[r.urgency as keyof typeof URGENCY_KEY]
        const rc = reach[r.id]
        return (
          <article key={r.id} className="card mt-3">
            <div className="flex flex-wrap gap-2">
              <span className="chip"><strong>{r.blood_group}</strong></span>
              <span className="chip">{t('mine.units', { n: String(r.units) })}</span>
              <span className="chip">{urgencyKey ? t(urgencyKey) : r.urgency}</span>
            </div>
            <p className="mt-2 font-semibold">{r.hospital}, {r.city}</p>
            {rc && (
              <div className="mt-2 text-sm">
                <p>{t('mine.volunteers', { city: r.city })} <strong>{label(rc.volunteers_label)}</strong></p>
                <p>{t('mine.banks', { city: r.city })} <strong>{label(rc.blood_banks_label)}</strong></p>
                {rc.volunteers_label === 'None' && rc.blood_banks_label === 'None' && (
                  <p className="mt-1 font-semibold">{t('mine.noMatch')}</p>
                )}
              </div>
            )}
            {expired && <p className="err">{t('mine.expired')}</p>}
            <p className="mt-2">{t('mine.offers', { n: String(list.length) })}</p>
            {list.map((x, i) => (
              <div key={i} className="mt-2 rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
                <p className="font-semibold">{x.responder_kind === 'blood_bank' ? t('mine.kind.bank') : t('mine.kind.volunteer')}</p>
                {x.note && <p className="text-sm">{x.note}</p>}
                <a className="btn mt-2 block text-center" href={`tel:${x.contact}`}>{t('mine.call', { phone: x.contact })}</a>
              </div>
            ))}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn" onClick={() => close(r.id, 'fulfilled')}>{t('mine.received')}</button>
              <button className="btn btn-quiet" onClick={() => close(r.id, 'cancelled')}>{t('mine.cancel')}</button>
            </div>
          </article>
        )
      })}
    </section>
  )
}