import { Link, NavLink, Outlet } from 'react-router-dom'
import { BookOpen, CalendarDays, ClipboardList, Droplets, House, UserRound } from 'lucide-react'
import { APP_NAME, IS_CARE } from '../lib/app'
import { useI18n } from '../lib/i18n'

export default function Layout() {
  const { t } = useI18n()
  const tabs = [
    { to: '/', label: t('nav.home'), Icon: House, end: true },
    { to: '/events', label: t('nav.events'), Icon: CalendarDays, end: false },
    { to: '/programs', label: 'Programs', Icon: ClipboardList, end: false },
    { to: '/learn', label: IS_CARE ? t('nav.content') : t('nav.learn'), Icon: BookOpen, end: false },
    { to: '/me', label: IS_CARE ? t('nav.account') : t('nav.me'), Icon: UserRound, end: false },
  ]

  return (
    <div className="min-h-screen md:flex">
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t bg-white md:static md:min-h-screen md:w-60 md:shrink-0 md:border-r md:border-t-0 md:px-4 md:py-6"
        style={{ borderColor: 'var(--line)' }}
      >
        <p className="mb-6 hidden px-3 text-xl font-bold md:block" style={{ color: 'var(--accent)' }}>{APP_NAME}</p>
        <ul className="flex md:flex-col md:gap-1">
          {tabs.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1 md:flex-none">
              <NavLink to={to} end={end} className="nav-link">
                <Icon size={22} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--paper) 90%, transparent)' }}>
          <span className="text-xl font-bold md:invisible" style={{ color: 'var(--accent)' }}>{APP_NAME}</span>
          {!IS_CARE && (
            <Link to="/request-blood" className="btn-emergency">
              <Droplets size={18} aria-hidden="true" />
              {t('cta.requestBlood')}
            </Link>
          )}
        </header>
        <main className="mx-auto w-full max-w-xl px-5 pb-28 pt-2 md:pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}