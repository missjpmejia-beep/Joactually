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
