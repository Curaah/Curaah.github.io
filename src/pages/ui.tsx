import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../lib/app'
import { useI18n } from '../lib/i18n'

export function Shell({ children, back }: { children: ReactNode; back?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-12 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{APP_NAME}</span>
        {back && <Link to="/" className="underline">{t('common.back')}</Link>}
      </header>
      {children}
    </div>
  )
}

export function Splash() {
  const { t } = useI18n()
  return <Shell><p>{t('common.loading')}</p></Shell>
}