import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/errors'
import { APP_NAME, IS_CARE } from '../lib/app'
import { LanguageSwitcher, useI18n } from '../lib/i18n'
import { Shell } from './ui'

export default function Auth() {
  const { t } = useI18n()
  const [signUp, setSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    if (signUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(friendly(error))
      else if (!data.session) setNotice(t('auth.created'))
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(friendly(error))
    }
    setBusy(false)
  }

  return (
    <Shell>
      <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-3xl font-bold">{signUp ? t('auth.join', { app: APP_NAME }) : t('auth.welcome', { app: APP_NAME })}</h1>
      <p className="mt-2 mb-6">{IS_CARE ? t('auth.promise.care') : t('auth.promise.curaah')}</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="email">{t('auth.email')}</label>
        <input id="email" className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label" htmlFor="password">{t('auth.password')}</label>
        <input id="password" className="field" type="password" required minLength={8} autoComplete={signUp ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="err" role="alert">{error}</p>}
        {notice && <p className="mt-3" role="status">{notice}</p>}
        <div className="mt-6">
          <button className="btn" disabled={busy}>{busy ? t('auth.wait') : signUp ? t('auth.createAccount') : t('auth.signIn')}</button>
        </div>
      </form>
      <p className="mt-5">
        {signUp ? t('auth.haveAccount') : t('auth.newHere')}{' '}
        <button type="button" className="underline" style={{ color: 'var(--accent)' }} onClick={() => { setSignUp(!signUp); setError(''); setNotice('') }}>
          {signUp ? t('auth.signIn') : t('auth.createLink')}
        </button>
      </p>
    </Shell>
  )
}