import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'

type Ev = { id: string; title: string; event_type: string; city: string | null; is_online: boolean; starts_at: string }
type Pts = Record<string, { health: number; volunteer: number }>

const LABEL: Record<string, string> = {
  blood_camp: 'Blood donation camp',
  health_camp: 'Health checkup camp',
  training: 'Training',
  awareness: 'Awareness session',
  webinar: 'Webinar',
}

// Which task in the library says how many points each kind of event is worth.
const SLUG: Record<string, string> = {
  blood_camp: 'v-camp',
  health_camp: 'v-camp',
  training: 'v-training',
  awareness: 'v-awareness',
  webinar: 'v-webinar',
}

// Shows real opportunities only. If nothing is happening nearby, this section does not appear at all.
export default function NearYou() {
  const { profile } = useSession()
  const [events, setEvents] = useState<Ev[] | null>(null)
  const [pts, setPts] = useState<Pts>({})
  const city = profile?.city?.trim().toLowerCase() ?? ''

  useEffect(() => {
    if (IS_CARE) return
    const now = new Date()
    const soon = new Date(now.getTime() + 14 * 24 * 3600 * 1000)
    supabase
      .from('events')
      .select('id, title, event_type, city, is_online, starts_at')
      .eq('status', 'published')
      .in('event_type', Object.keys(SLUG))
      .gte('starts_at', now.toISOString())
      .lte('starts_at', soon.toISOString())
      .order('starts_at')
      .limit(30)
      .then(({ data }) => {
        const list = ((data as Ev[] | null) ?? []).filter(
          (e) =>
            (city !== '' && (e.city ?? '').toLowerCase() === city) ||
            (e.is_online && ['training', 'webinar', 'awareness'].includes(e.event_type)),
        )
        setEvents(list.slice(0, 3))
      })
    supabase
      .from('task_templates')
      .select('slug, points_health, points_volunteer')
      .in('slug', [...new Set(Object.values(SLUG))])
      .then(({ data }) => {
        const bySlug = Object.fromEntries(((data as { slug: string; points_health: number; points_volunteer: number }[] | null) ?? []).map((t) => [t.slug, t]))
        const out: Pts = {}
        for (const [type, slug] of Object.entries(SLUG)) {
          if (bySlug[slug]) out[type] = { health: bySlug[slug].points_health, volunteer: bySlug[slug].points_volunteer }
        }
        setPts(out)
      })
  }, [city])

  if (IS_CARE || !events || events.length === 0) return null

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Near you in the next two weeks</h2>
      {events.map((e) => {
        const p = pts[e.event_type]
        return (
          <Link key={e.id} to="/events" className="card mt-3 block">
            <div className="flex flex-wrap gap-2">
              <span className="chip inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" />{LABEL[e.event_type] ?? 'Event'}</span>
              {p && p.health > 0 && <span className="chip">+{p.health} health</span>}
              {p && p.volunteer > 0 && profile?.is_volunteer && <span className="chip">+{p.volunteer} volunteer</span>}
            </div>
            <p className="mt-2 font-semibold">{e.title}</p>
            <p className="text-sm">
              {new Date(e.starts_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              {e.is_online ? ' · Online' : e.city ? ` · ${e.city}` : ''}
            </p>
          </Link>
        )
      })}
      <p className="mt-2 text-xs">Points arrive after the organizer confirms you attended.</p>
    </section>
  )
}