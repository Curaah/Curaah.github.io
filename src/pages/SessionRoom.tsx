import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtIST, fmtTimeIST } from '../lib/programs'
import { Shell } from './ui'

type Info = { title: string; starts_at: string; duration_minutes: number; program_id: string; format: string }
type Room = { url: string; token: string; title: string; program_title: string; role: 'host' | 'guest'; starts_at: string; ends_at: string }

// The live class, shown inside Curaah. Attendance is recorded only when the person taps "Join now".
export default function SessionRoom() {
  const { id } = useParams()
  const nav = useNavigate()
  const [info, setInfo] = useState<Info | null | undefined>(undefined)
  const [programTitle, setProgramTitle] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('program_sessions').select('title, starts_at, duration_minutes, program_id, format').eq('id', id!).maybeSingle()
      const s = (data as Info | null) ?? null
      setInfo(s)
      if (s) {
        const { data: p } = await supabase.from('programs').select('title').eq('id', s.program_id).maybeSingle()
        setProgramTitle((p as { title: string } | null)?.title ?? '')
      }
    })()
  }, [id])

  async function join() {
    setBusy(true)
    setError('')
    const { data, error: err } = await supabase.functions.invoke('join-session', { body: { session_id: id } })
    setBusy(false)
    if (err) {
      setError('We could not reach the class room service. Please check your connection and try again. If this keeps happening, live video may not be set up yet.')
      return
    }
    const d = data as (Room & { error?: string }) | null
    if (!d || d.error) {
      setError(d?.error ?? 'You cannot join this session.')
      return
    }
    setRoom(d)
  }

  const back = info ? `/programs/${info.program_id}` : '/programs'

  if (room) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{room.title}</p>
            <p className="text-sm">{room.program_title}</p>
          </div>
          <button className="btn btn-quiet" style={{ width: 'auto' }} onClick={() => nav(back)}>Leave class</button>
        </div>
        <iframe
          title={`Live class: ${room.title}`}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          src={`${room.url}?t=${encodeURIComponent(room.token)}`}
          className="mt-3 w-full flex-1 rounded-xl border"
          style={{ minHeight: '70vh', borderColor: 'var(--line)' }}
        />
        <p className="mt-2 text-xs">Your name is visible to others in this class. Curaah does not record classes.</p>
      </div>
    )
  }

  if (info === undefined) return <Shell back><p>Loading…</p></Shell>
  if (info === null || info.format !== 'live_video') {
    return <Shell back><p className="card">This class was not found, or it is not a live video class you are part of.</p></Shell>
  }

  return (
    <Shell back>
      <h1 className="text-2xl font-bold">{info.title}</h1>
      <p className="mt-1">{programTitle}</p>
      <p className="mt-2 text-sm">
        {fmtIST(info.starts_at)} – {fmtTimeIST(new Date(new Date(info.starts_at).getTime() + info.duration_minutes * 60000).toISOString())}
      </p>
      <div className="card mt-4">
        <p className="font-semibold">Before you join</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>Your browser will ask to use your camera and microphone. Please allow both.</li>
          <li>Other people in the class will see your first name.</li>
          <li>Find a quiet, safe space, and stop if you feel pain or dizziness. Classes are general wellbeing, not medical advice.</li>
          <li>You can join from 10 minutes before the class starts.</li>
        </ul>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn mt-4" disabled={busy} onClick={join}>{busy ? 'Opening the class…' : 'Join now'}</button>
    </Shell>
  )
}