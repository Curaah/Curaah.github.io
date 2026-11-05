import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Row = {
  as_volunteer: boolean
  display_name: string | null
  contact: string | null
  registered_at: string
}

export default function Attendees({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setError('')
    const { data, error } = await supabase.rpc('event_attendees', { p_event: eventId })
    if (error) {
      setError(error.message)
      return
    }
    setRows((data as Row[] | null) ?? [])
    setOpen(true)
  }

  const total = rows?.length ?? 0
  const volunteers = rows?.filter((r) => r.as_volunteer).length ?? 0
  const shared = (rows ?? []).filter((r) => r.display_name)

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
      <button className="btn btn-quiet" onClick={toggle}>{open ? 'Hide registrations' : 'View registrations'}</button>
      {error && <p className="err" role="alert">{error}</p>}
      {open && (
        <div className="mt-3">
          <p>
            <strong>{total}</strong> registered, <strong>{volunteers}</strong> as volunteers.
          </p>
          {shared.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {shared.map((r, i) => (
                <li key={i}>
                  {r.display_name}: {r.contact}
                  {r.as_volunteer ? ' (volunteer)' : ''}
                </li>
              ))}
            </ul>
          )}
          {total - shared.length > 0 && (
            <p className="mt-2">{total - shared.length} {total - shared.length === 1 ? 'person has' : 'people have'} not shared contact details.</p>
          )}
          <p className="mt-2 text-sm">These details were shared only for this event. Use them only to organize it.</p>
        </div>
      )}
    </div>
  )
}