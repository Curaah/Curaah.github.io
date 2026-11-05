import { Link } from 'react-router-dom'
import EventList from './EventList'
import { useVerified } from '../lib/useVerified'
import { useI18n } from '../lib/i18n'

export default function Events() {
  const verified = useVerified()
  const { t } = useI18n()
  return (
    <>
      <h1 className="text-2xl font-bold">{t('nav.events')}</h1>
      {verified && <Link to="/events/new" className="btn mt-4 block text-center">{t('ev.create')}</Link>}
      <EventList />
    </>
  )
}