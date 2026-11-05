export type Program = {
  id: string
  organizer_id: string
  title: string
  summary: string
  description: string
  topic: string
  mode: 'online' | 'offline' | 'hybrid'
  city: string | null
  duration_days: number
  starts_on: string
  price_inr: number
  seats: number | null
  image_path: string | null
  image_alt: string | null
  status: 'published' | 'closed' | 'hidden'
  created_at: string
}

export const MODES: [Program['mode'], string][] = [
  ['online', 'Online'],
  ['offline', 'In person'],
  ['hybrid', 'Online and in person'],
]
export const MODE_LABEL: Record<string, string> = Object.fromEntries(MODES)

export const STATUS_LABEL: Record<string, string> = {
  published: 'Open',
  closed: 'Closed to new sign-ups',
  hidden: 'Hidden by Curaah',
}

export const inr = (n: number) => (n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`)

export const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// Today's date in India as YYYY-MM-DD
export const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)


// Session times are shown in Indian time, whatever the phone's own time zone is.
export const fmtIST = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const fmtTimeIST = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })

export const FORMAT_LABEL: Record<string, string> = {
  live_video: 'Live video',
  in_person: 'In person',
  self_paced: 'Self-paced',
}

// Turns a date and time typed in Indian time into a timestamp the database understands.
export const istToIso = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`).toISOString()

export const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// 0 = Sunday ... 6 = Saturday, for a calendar date
export const weekdayOf = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}