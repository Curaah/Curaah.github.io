import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Flame, Heart, HandHeart, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { IS_CARE } from '../lib/app'
import { friendly } from '../lib/errors'
import { ListSkeleton } from './Skeleton'

type Row = {
  slot: number
  task_id: string
  title: string
  instruction: string
  kind: 'timer' | 'tick' | 'read' | 'event' | 'donation'
  category: string
  duration_seconds: number | null
  points_health: number
  points_volunteer: number
  started_at: string | null
  completed_at: string | null
  swaps_left: number
}

type Progress = { health_total: number; volunteer_total: number; streak: number; done_today: number }

function Ring({ fraction }: { fraction: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const f = Math.min(1, Math.max(0, fraction))
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
      <circle
        cx="64" cy="64" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - f)} transform="rotate(-90 64 64)"
      />
    </svg>
  )
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function TodayQueue() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const checkpoint = useRef<Record<number, number>>({})
  const buzzed = useRef<Set<number>>(new Set())

  const load = useCallback(async () => {
    const [q, p] = await Promise.all([supabase.rpc('today_queue'), supabase.rpc('my_progress')])
    if (q.error) {
      setError(friendly(q.error))
      setRows([])
      return
    }
    setRows((q.data as Row[] | null) ?? [])
    setProgress(((p.data as Progress[] | null) ?? [])[0] ?? null)
  }, [])

  useEffect(() => {
    if (!IS_CARE) load()
  }, [load])

  const active = rows?.find((r) => !r.completed_at)
  const startMs = active?.started_at ? Date.parse(active.started_at) : null
  const isTimer = active?.kind === 'timer' && Boolean(active.duration_seconds)
  const running = isTimer && startMs !== null

  // Tick once a second while a timer is running.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  // Longer timers get one random "are you still with it?" tap, somewhere in the middle.
  useEffect(() => {
    if (active && isTimer && (active.duration_seconds ?? 0) >= 90 && checkpoint.current[active.slot] === undefined) {
      checkpoint.current[active.slot] = Math.round((active.duration_seconds ?? 0) * (0.4 + Math.random() * 0.3))
    }
  }, [active, isTimer])

  const duration = active?.duration_seconds ?? 0
  const elapsed = startMs !== null ? (now - startMs) / 1000 : 0
  const remaining = Math.max(0, Math.ceil(duration - elapsed))
  const cp = active ? checkpoint.current[active.slot] : undefined
  const checkpointDue = running && cp !== undefined && elapsed >= cp && !checked[active!.slot]
  const timerFinished = running && remaining === 0

  useEffect(() => {
    if (active && checkpointDue && !buzzed.current.has(active.slot)) {
      buzzed.current.add(active.slot)
      navigator.vibrate?.(150)
    }
  }, [active, checkpointDue])

  async function run(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>, after?: () => void) {
    setBusy(true)
    setError('')
    const { error: e } = await action()
    if (e) setError(friendly(e))
    else after?.()
    await load()
    setBusy(false)
  }

  async function complete(slot: number) {
    setBusy(true)
    setError('')
    setMsg('')
    const { data, error: e } = await supabase.rpc('complete_queue_task', { p_slot: slot })
    if (e) {
      setError(/finish the timer/i.test(e.message) ? 'Almost there. Give it a few more seconds, then tap Done again.' : friendly(e))
    } else {
      const r = ((data as { health_points: number; volunteer_points: number }[] | null) ?? [])[0]
      const parts = [r?.health_points ? `+${r.health_points} health` : '', r?.volunteer_points ? `+${r.volunteer_points} volunteer` : ''].filter(Boolean)
      setMsg(parts.length ? `Nice. ${parts.join(', ')}.` : 'Nice.')
    }
    await load()
    setBusy(false)
  }

  if (IS_CARE) return null
  if (rows === null) return <section className="mt-6"><h2 className="text-lg font-semibold">Today</h2><ListSkeleton rows={1} /></section>
  if (rows.length === 0 && !error) return null

  const done = rows.filter((r) => r.completed_at)
  const doneCount = done.length

  return (
    <section className="mt-6">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-semibold">Today</h2>
        <p className="text-sm">{doneCount} of 5 done · 3 makes a good day</p>
      </div>

      <div className="mt-2 flex gap-2" role="img" aria-label={`${doneCount} of 5 tasks done`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="h-2 flex-1 rounded-full"
            style={{
              background: n <= doneCount ? 'var(--accent)' : 'var(--line)',
              opacity: n > doneCount && n > doneCount + 1 ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {progress && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="chip inline-flex items-center gap-1"><Flame size={14} aria-hidden="true" />{progress.streak > 0 ? `${progress.streak}-day streak` : 'Do 3 tasks to start a streak'}</span>
          <span className="chip inline-flex items-center gap-1"><Heart size={14} aria-hidden="true" />{progress.health_total} health</span>
          <span className="chip inline-flex items-center gap-1"><HandHeart size={14} aria-hidden="true" />{progress.volunteer_total} volunteer</span>
        </div>
      )}

      {doneCount >= 3 && doneCount < 5 && <p className="mt-3 font-semibold">A good day. Anything more is a bonus.</p>}
      {doneCount >= 5 && <p className="mt-3 font-semibold">All done for today. See you tomorrow.</p>}
      {msg && <p className="mt-3" role="status">{msg}</p>}
      {error && <p className="err" role="alert">{error}</p>}

      {active && (
        <article className="card mt-3">
          <div className="flex flex-wrap gap-2">
            {active.slot >= 4 && <span className="chip inline-flex items-center gap-1"><Sparkles size={14} aria-hidden="true" />Bonus</span>}
            {active.points_health > 0 && <span className="chip">+{active.points_health} health</span>}
            {active.points_volunteer > 0 && <span className="chip">+{active.points_volunteer} volunteer</span>}
          </div>
          <h3 className="mt-2 text-xl font-semibold">{active.title}</h3>
          <p className="mt-1">{active.instruction}</p>

          {isTimer && !running && (
            <button className="btn mt-4" disabled={busy} onClick={() => run(() => supabase.rpc('start_queue_task', { p_slot: active.slot }))}>
              I’m ready: start
            </button>
          )}

          {isTimer && running && (
            <div className="mt-4 flex flex-col items-center">
              <div className="relative">
                <Ring fraction={duration ? elapsed / duration : 0} />
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">{timerFinished ? '0:00' : mmss(remaining)}</span>
              </div>
              <p className="mt-2 text-sm">{timerFinished ? 'Well done. Tap Done when you are ready.' : 'Take your time. There is no rush.'}</p>
              {checkpointDue && (
                <button className="btn btn-quiet mt-3" onClick={() => setChecked((c) => ({ ...c, [active.slot]: true }))}>
                  Still with it? Tap once
                </button>
              )}
              <button className="btn mt-3" disabled={busy || !timerFinished || checkpointDue} onClick={() => complete(active.slot)}>Done</button>
            </div>
          )}

          {active.kind === 'tick' && (
            <button className="btn mt-4" disabled={busy} onClick={() => complete(active.slot)}>Done</button>
          )}

          {active.kind === 'read' && (
            <div className="mt-4 grid gap-3">
              <Link to="/learn" className="btn btn-quiet text-center">Open Learn</Link>
              <button className="btn" disabled={busy} onClick={() => complete(active.slot)}>I have read it</button>
            </div>
          )}

          {active.swaps_left > 0 && !active.started_at && (
            <button className="mt-4 underline" style={{ color: 'var(--accent)' }} disabled={busy} onClick={() => run(() => supabase.rpc('swap_queue_task', { p_slot: active.slot }))}>
              Not for me right now ({active.swaps_left} {active.swaps_left === 1 ? 'swap' : 'swaps'} left today)
            </button>
          )}
        </article>
      )}

      {done.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {done.map((r) => (
            <li key={r.slot} className="flex items-center gap-2 text-sm">
              <Check size={16} aria-hidden="true" style={{ color: 'var(--accent)' }} />
              <span>{r.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}