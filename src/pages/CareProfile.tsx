import { useEffect, useState } from 'react'
import { Flame, Heart, HandHeart, BadgeCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { IS_CARE } from '../lib/app'

type Progress = { health_total: number; volunteer_total: number; streak: number; done_today: number }
type Ledger = { kind: 'health' | 'volunteer'; amount: number; reason: string; ref_id: string; created_at: string }
type Item = { id: string; title: string; organizer_id: string }
type Activity = { key: string; reason: string; health: number; volunteer: number; when: string; title: string; org: string }

const HEALTH_LEVELS: [number, string][] = [[0, 'Starter'], [30, 'Steady'], [100, 'Active'], [250, 'Thriving']]
const VOLUNTEER_LEVELS: [number, string][] = [[0, 'New'], [40, 'Helper'], [120, 'Responder'], [300, 'Community leader']]
const REASON: Record<string, string> = { event_attendance: 'Attended', training: 'Completed training', blood_donation: 'Blood donation', program: 'Completed program' }

function level(points: number, levels: [number, string][]) {
  let i = 0
  levels.forEach(([at], idx) => { if (points >= at) i = idx })
  const next = levels[i + 1]
  const from = levels[i][0]
  return { name: levels[i][1], next, pct: next ? Math.min(100, ((points - from) / (next[0] - from)) * 100) : 100 }
}

function LevelBlock({ icon, label, points, levels }: { icon: React.ReactNode; label: string; points: number; levels: [number, string][] }) {
  const l = level(points, levels)
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-semibold">{icon}{label}: {l.name}</span>
        <span className="text-sm">{points} points</span>
      </div>
      <div className="mt-1 h-2 rounded-full" style={{ background: 'var(--line)' }}>
        <div className="h-2 rounded-full" style={{ width: `${l.pct}%`, background: 'var(--accent)' }} />
      </div>
      <p className="mt-1 text-sm">{l.next ? `${l.next[0] - points} more points to ${l.next[1]}` : 'Highest level reached'}</p>
    </div>
  )
}

export default function CareProfile() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [tasks, setTasks] = useState(0)

  useEffect(() => {
    if (IS_CARE) return
    ;(async () => {
      const [p, l, t] = await Promise.all([
        supabase.rpc('my_progress'),
        supabase
          .from('points_ledger')
          .select('kind, amount, reason, ref_id, created_at')
          .in('reason', ['event_attendance', 'training', 'blood_donation', 'program'])
          .order('created_at', { ascending: false })
          .limit(60),
        supabase.from('task_completions').select('id', { count: 'exact', head: true }),
      ])
      setProgress(((p.data as Progress[] | null) ?? [])[0] ?? null)
      setTasks(t.count ?? 0)
      const ledger = (l.data as Ledger[] | null) ?? []
      const ids = [...new Set(ledger.map((x) => x.ref_id))]
      // The reference is an event for camps, trainings and donations, and a program for completed programs.
      const [ev, pr] = ids.length
        ? await Promise.all([
            supabase.from('events').select('id, title, organizer_id').in('id', ids),
            supabase.from('programs').select('id, title, organizer_id').in('id', ids),
          ])
        : [{ data: [] }, { data: [] }]
      const items = [...(((ev.data as Item[] | null) ?? [])), ...(((pr.data as Item[] | null) ?? []))]
      const orgIds = [...new Set(items.map((e) => e.organizer_id))]
      const orgs = orgIds.length ? ((await supabase.from('verified_orgs').select('user_id, org_name').in('user_id', orgIds)).data as { user_id: string; org_name: string }[] | null) ?? [] : []
      const orgName = new Map(orgs.map((o) => [o.user_id, o.org_name]))
      const itemMap = new Map(items.map((e) => [e.id, e]))
      const grouped = new Map<string, Activity>()
      for (const x of ledger) {
        const key = `${x.reason}:${x.ref_id}`
        const it = itemMap.get(x.ref_id)
        const g = grouped.get(key) ?? { key, reason: x.reason, health: 0, volunteer: 0, when: x.created_at, title: it?.title ?? 'Activity', org: it ? orgName.get(it.organizer_id) ?? 'a verified organization' : 'a verified organization' }
        if (x.kind === 'health') g.health += x.amount
        else g.volunteer += x.amount
        grouped.set(key, g)
      }
      setActivity([...grouped.values()])
    })()
  }, [])

  if (IS_CARE || !progress) return null

  const events = activity.filter((a) => a.reason === 'event_attendance').length
  const trainings = activity.filter((a) => a.reason === 'training').length
  const donations = activity.filter((a) => a.reason === 'blood_donation').length
  const programs = activity.filter((a) => a.reason === 'program').length

  return (
    <section className="card mt-6">
      <h2 className="text-lg font-semibold">My care profile</h2>
      <LevelBlock icon={<Heart size={16} aria-hidden="true" />} label="Health" points={progress.health_total} levels={HEALTH_LEVELS} />
      <LevelBlock icon={<HandHeart size={16} aria-hidden="true" />} label="Volunteer" points={progress.volunteer_total} levels={VOLUNTEER_LEVELS} />

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="chip inline-flex items-center gap-1"><Flame size={14} aria-hidden="true" />{progress.streak}-day streak</span>
        <span className="chip">{tasks} daily tasks done</span>
        <span className="chip">{events} events attended</span>
        <span className="chip">{trainings} trainings</span>
        <span className="chip">{programs} programs completed</span>
        <span className="chip">{donations} blood donations</span>
      </div>

      <h3 className="mt-5 inline-flex items-center gap-2 font-semibold"><BadgeCheck size={16} aria-hidden="true" />Verified by organizations</h3>
      {activity.length === 0 && <p className="mt-1 text-sm">Camps, trainings, programs and donations confirmed by an organization will appear here.</p>}
      <ul className="mt-2 grid gap-2">
        {activity.map((a) => (
          <li key={a.key} className="text-sm">
            <span className="font-semibold">{REASON[a.reason] ?? 'Activity'}: {a.title}</span>
            <br />
            {a.org} · {new Date(a.when).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}+{a.health} health{a.volunteer ? `, +${a.volunteer} volunteer` : ''}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs">Only you can see this for now. Later you will be able to choose to share it with organizations.</p>
    </section>
  )
}