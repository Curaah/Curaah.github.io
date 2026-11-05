export const KIND: 'curaah' | 'careconnect' =
  import.meta.env.VITE_APP_KIND === 'careconnect' ? 'careconnect' : 'curaah'

export const IS_CARE = KIND === 'careconnect'
export const APP_NAME = IS_CARE ? 'Curaah Careconnect' : 'Curaah'
export const ACCOUNT_KIND = IS_CARE ? 'stakeholder' : 'individual'
export const PROMISE = IS_CARE
  ? 'Reach people who need you, find volunteers, and work with other organizations in one place.'
  : 'Your health, your community, and people who show up when it matters.'
