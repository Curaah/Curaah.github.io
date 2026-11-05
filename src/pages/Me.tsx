import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { LanguageSwitcher, useI18n } from '../lib/i18n'
import EmergencyProfile from './EmergencyProfile'

export default function Me() {
  const { session, profile } = useSession()
  const { t } = useI18n()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (IS_CARE) supabase.rpc('is_admin').then(({ data }) => setIsAdmin(Boolean(data)))
  }, [])

  if (!profile) return null

  return (
    <>
      <h1 className="text-2xl font-bold">{profile.full_name}</h1>
      <p className="mt-1">{session?.user.email}</p>
      {IS_CARE && profile.org_name && (
        <p>{profile.org_name}{profile.city ? `, ${profile.city}` : ''}</p>
      )}
      {!IS_CARE && profile.city && <p>{profile.city}</p>}

      <div className="mt-5"><LanguageSwitcher /></div>

      <EmergencyProfile />

      <div className="mt-6 grid gap-3">
        {isAdmin && <Link to="/admin" className="btn text-center">{t('me.adminReview')}</Link>}
        {!IS_CARE && <Link to="/medicines" className="btn btn-quiet text-center">Medicine reminders</Link>}
        <Link to="/settings" className="btn btn-quiet text-center">{t('me.notifications')}</Link>
        <button className="btn btn-quiet" onClick={() => supabase.auth.signOut()}>{t('me.signOut')}</button>
      </div>
    </>
  )
}