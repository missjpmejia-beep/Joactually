import type { CritterType } from '../components/Critter'
import { kindOf, type TrackedItem } from './types'

/** Which critter represents an item. No data changes: worked out from name, kind and direction. */
export function critterFor(item: TrackedItem): CritterType {
  const kind = kindOf(item)
  if (kind === 'sleep') return 'sleep'
  if (kind === 'medication') return 'meds'
  if (kind === 'event') return 'food'
  const name = item.name.trim().toLowerCase()
  if (name === 'mood') return 'mood'
  if (name === 'anxiety') return 'anxiety'
  if (name === 'energy') return 'energy'
  // Any other rating borrows the face set that matches its direction
  return item.direction === 'higher_is_worse' ? 'anxiety' : 'mood'
}

/** CSS colour name for a critter's shadow and score text. */
export const CRITTER_COLOUR: Record<CritterType, string> = {
  mood: 'pink',
  anxiety: 'blue',
  energy: 'yellow',
  food: 'green',
  sleep: 'pink',
  meds: 'green',
}

function opening(hour: number): string {
  if (hour < 12) return 'Morning, Jo!'
  if (hour < 18) return 'Afternoon, Jo!'
  return 'Evening, Jo!'
}

function nudge(item: TrackedItem): string {
  const kind = kindOf(item)
  if (kind === 'sleep') return 'Tell me about last night’s sleep and I’ll leave you alone.'
  if (kind === 'medication') return 'Meds whenever you’re ready, then I’ll leave you alone.'
  if (kind === 'event') return `Log a ${item.name.toLowerCase()} whenever it suits you.`
  return `How’s ${item.name.toLowerCase()} doing? One tap and I’ll leave you alone.`
}

/**
 * Speech bubble copy. Never comments on the scores themselves.
 * Nothing logged → start easy. Everything logged → go do something nice. Otherwise nudge one item.
 */
export function bubbleCopy(hour: number, shown: TrackedItem[], isLogged: (i: TrackedItem) => boolean): string {
  const open = opening(hour)
  const waiting = shown.filter((i) => !isLogged(i))
  if (shown.length > 0 && waiting.length === shown.length) return `${open} Start with whatever’s easiest.`
  if (waiting.length === 0) return `${open} All logged. Go do something nice.`
  // Sleep first in the morning, otherwise the first one in Jo's order
  const pick = (hour < 12 && waiting.find((i) => kindOf(i) === 'sleep')) || waiting[0]
  return `${open} ${nudge(pick)}`
}

/** The mini critter for a single entry: its face mirrors that entry. */
export function entryCritter(item: TrackedItem | undefined, entry: {
  value: number | null
  quality: number | null
  status: string | null
}): { type: CritterType; score: number | null; logged: boolean } {
  if (!item) return { type: 'mood', score: null, logged: false }
  const type = critterFor(item)
  if (type === 'sleep') return { type, score: entry.quality, logged: true }
  if (type === 'meds') return { type, score: null, logged: entry.status !== 'missed' }
  if (type === 'food') return { type, score: null, logged: true }
  // "None" on a symptom reads as calm
  return { type, score: entry.value === 0 ? 1 : entry.value, logged: true }
}

/** A friendly, typical face for an item, used in Settings. */
export function sampleCritter(item: TrackedItem): { type: CritterType; score: number | null; logged: boolean } {
  const type = critterFor(item)
  if (type === 'mood') return { type, score: 4, logged: true }
  if (type === 'anxiety') return { type, score: 2, logged: true }
  if (type === 'energy') return { type, score: 4, logged: true }
  if (type === 'sleep') return { type, score: 4, logged: true }
  return { type, score: null, logged: true }
}

/** Shadow colours that cycle down a page. */
export const SHADOW_CYCLE = ['var(--riso-blue)', 'var(--riso-pink)', 'var(--riso-yellow)', 'var(--riso-green)']
