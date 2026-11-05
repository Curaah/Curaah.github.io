import { tr } from './i18n'

type Err = { message?: string; code?: string } | null | undefined

// Turns raw technical errors into short, friendly messages in the user's language.
export function friendly(err: Err): string {
  const raw = err?.message ?? ''
  const msg = raw.toLowerCase()
  const code = err?.code ?? ''

  if (code === 'P0001') {
    if (msg.includes('sign in first')) return tr('err.signIn')
    if (msg.includes('only curaah accounts')) return tr('err.curaahOnly')
    if (msg.includes('share your contact with people who respond')) return tr('err.consentRequester')
    if (msg.includes('share your contact with the requester')) return tr('err.consentResponder')
    if (msg.includes('already have 3 open')) return tr('err.maxOpen')
    if (msg.includes('already responded')) return tr('err.alreadyResponded')
    if (msg.includes('closed, expired, or not a match')) return tr('err.notMatch')
    if (msg.includes('not your request')) return tr('err.permission')
    if (msg.includes('invalid status')) return tr('err.invalid')
    // Our own database messages are already written for people, so show them as they are.
    return raw || tr('err.generic')
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) return tr('err.network')
  if (msg.includes('invalid login credentials') || code === 'invalid_credentials') return tr('err.credentials')
  if (msg.includes('already registered') || code === 'user_already_exists') return tr('err.exists')
  if (msg.includes('rate limit') || code.includes('rate_limit')) return tr('err.rateLimit')
  if (code === 'weak_password' || (msg.includes('password') && msg.includes('least'))) return tr('err.weakPassword')
  if (code === '23505' || msg.includes('duplicate key')) return tr('err.duplicate')
  if (code === '42501' || msg.includes('row-level security')) return tr('err.permission')
  if (code === '23514' || msg.includes('check constraint')) return tr('err.invalid')
  return tr('err.generic')
}