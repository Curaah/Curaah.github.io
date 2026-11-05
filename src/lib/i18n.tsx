import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DICTS, type Key } from './locales-all'

export type Lang = 'en' | 'hi' | 'pa'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
]

const STORAGE_KEY = 'curaah_lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'hi' || saved === 'pa') return saved
  } catch {
    // Storage can be unavailable (private mode). Fall through to the device language.
  }
  const device = navigator.language.slice(0, 2)
  return device === 'hi' || device === 'pa' ? device : 'en'
}

let currentLang: Lang = initialLang()

function translate(lang: Lang, key: Key, vars?: Record<string, string>): string {
  let text: string = DICTS[lang][key] ?? DICTS.en[key]
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(value)
  return text
}

// For code that is not a React component (for example, error messages).
export function tr(key: Key, vars?: Record<string, string>): string {
  return translate(currentLang, key, vars)
}

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: Key, vars?: Record<string, string>) => string
}

const I18nCtx = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (key) => DICTS.en[key] })
export const useI18n = () => useContext(I18nCtx)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    currentLang = l
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // Ignore: the choice just won't be remembered.
    }
  }, [])

  const t = useCallback((key: Key, vars?: Record<string, string>) => translate(lang, key, vars), [lang])

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n()
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>{t('lang.label')}</span>
      <select
        className="field"
        style={{ width: 'auto', padding: '.35rem .6rem' }}
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  )
}