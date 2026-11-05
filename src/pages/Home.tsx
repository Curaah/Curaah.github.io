import { Link } from 'react-router-dom'
import { useSession } from '../lib/session'
import { IS_CARE } from '../lib/app'
import { useI18n } from '../lib/i18n'
import VerificationCard from './VerificationCard'
import MyRequests from './MyRequests'
import OpenRequests from './OpenRequests'
import TodayQueue from './TodayQueue'
import NearYou from './NearYou'
import MedicineCard from './MedicineCard'
import ProgramSessionsToday from './ProgramSessionsToday'

const ORG_KEY = { ngo: 'org.ngo', blood_bank: 'org.blood_bank', professional: 'org.professional' } as const

export default function Home() {
  const { profile } = useSession()
  const { t } = useI18n()
  if (!profile) return null
  const chips = IS_CARE
    ? [profile.org_type ? t(ORG_KEY[profile.org_type]) : '']
    : [
        profile.user_type === 'patient' ? t('role.patient') : t('role.healthy'),
        profile.is_volunteer && t('role.volunteer'),
        profile.is_caregiver && t('role.caregiver'),
      ].filter(Boolean)

  return (
    <>
      <h1 className="text-2xl font-bold">{t('home.hello', { name: profile.full_name.split(' ')[0] })}</h1>
      {IS_CARE && profile.org_name && <p className="mt-1">{profile.org_name}{profile.city ? `, ${profile.city}` : ''}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{chips.map((c) => <span key={String(c)} className="chip">{c}</span>)}</div>

      <MyRequests />
      <OpenRequests />
      {IS_CARE && <VerificationCard />}
      <MedicineCard />
      <ProgramSessionsToday />
      <TodayQueue />
      <NearYou />

      {!IS_CARE && (
        <section className="card mt-6" style={{ borderColor: 'var(--warn)' }}>
          <h2 className="text-lg font-semibold">{t('home.needBlood.title')}</h2>
          <p className="mt-1">{t('home.needBlood.body')}</p>
          <Link to="/request-blood" className="btn mt-3 block text-center">{t('cta.requestBlood')}</Link>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/events" className="card text-center font-semibold">{t('home.eventsNear')}</Link>
        <Link to="/learn" className="card text-center font-semibold">{IS_CARE ? t('home.healthContent') : t('nav.learn')}</Link>
      </div>
    </>
  )
}