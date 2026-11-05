import { DICTS as core } from './locales'
import { common } from './locales-common'
import { emergency } from './locales-emergency'
import { mine } from './locales-mine'
import { volunteer } from './locales-volunteer'
import { events } from './locales-events'

const en = { ...core.en, ...common.en, ...emergency.en, ...mine.en, ...volunteer.en, ...events.en }
const hi = { ...core.hi, ...common.hi, ...emergency.hi, ...mine.hi, ...volunteer.hi, ...events.hi }
const pa = { ...core.pa, ...common.pa, ...emergency.pa, ...mine.pa, ...volunteer.pa, ...events.pa }

export type Key = keyof typeof en
export const DICTS: Record<'en' | 'hi' | 'pa', Record<Key, string>> = { en, hi, pa }