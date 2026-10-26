import { db, type CubeRecord } from './db'
import { SIZE_SCALE, type BlockColor, type BlockSize } from './model'

/** Every stored cube, grouped by day, each day in the order the cubes were dropped. */
export async function loadHistory(): Promise<Map<string, CubeRecord[]>> {
  const days = new Map<string, CubeRecord[]>()
  for (const cube of await db.cubes.orderBy('[dayKey+droppedAt]').toArray()) {
    const day = days.get(cube.dayKey)
    if (day) day.push(cube)
    else days.set(cube.dayKey, [cube])
  }
  return days
}

/* Day keys are local `YYYY-MM-DD` strings; noon avoids DST edge cases when shifting. */

function toDate(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00`)
}

function toKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function addDays(dayKey: string, n: number): string {
  const date = toDate(dayKey)
  date.setDate(date.getDate() + n)
  return toKey(date)
}

/** Day keys from `from` back to `to`, inclusive, newest first. */
export function daysBackTo(from: string, to: string): string[] {
  const out: string[] = []
  for (let key = from; key >= to; key = addDays(key, -1)) out.push(key)
  return out
}

/** "Sun 25" */
export function shortDay(dayKey: string): string {
  const date = toDate(dayKey)
  return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${date.getDate()}`
}

/** "Sunday, 25 October" */
export function longDay(dayKey: string): string {
  const date = toDate(dayKey)
  return `${date.toLocaleDateString('en-GB', { weekday: 'long' })}, ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
}

export interface Week {
  days: string[]
  /** "20 – 26 October", or "28 September – 4 October" across months. */
  label: string
}

/** A rolling 7-day week ending `offset` weeks before today. */
export function weekRange(todayKey: string, offset: number): Week {
  const last = addDays(todayKey, -7 * offset)
  const first = addDays(last, -6)
  const days = daysBackTo(last, first).reverse()
  const a = toDate(first)
  const b = toDate(last)
  const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' })
  const label =
    a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} ${month(b)}`
      : `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`
  return { days, label }
}

export interface ColorShare {
  color: BlockColor
  /** Size-weighted: a large cube counts twice a small one. */
  weight: number
  count: number
}

export function colorBalance(cubes: CubeRecord[]): ColorShare[] {
  const shares = new Map<BlockColor, ColorShare>()
  for (const cube of cubes) {
    const share = shares.get(cube.color) ?? { color: cube.color, weight: 0, count: 0 }
    share.weight += SIZE_SCALE[cube.size]
    share.count += 1
    shares.set(cube.color, share)
  }
  return [...shares.values()].sort((a, b) => b.weight - a.weight)
}

const QUIET_SHARE = 0.1

/**
 * A gentle one-line read of the week: which colours led, and which of your
 * colours got little attention. Observational only; never a reproach.
 */
export function balanceSentence(balance: ColorShare[], activeColors: BlockColor[]): string {
  if (!balance.length) return 'A quiet week. Fresh glasses ahead.'
  const name = (c: BlockColor) => c[0].toUpperCase() + c.slice(1)
  const [first, second] = balance
  const led =
    second && second.weight >= first.weight * 0.6
      ? `${name(first.color)} and ${second.color} led this week.`
      : `${name(first.color)} led this week.`
  const total = balance.reduce((sum, s) => sum + s.weight, 0)
  const leaders = new Set(balance.slice(0, 2).map((s) => s.color))
  const quiet = activeColors
    .filter((c) => !leaders.has(c))
    .map((c) => ({ color: c, share: (balance.find((s) => s.color === c)?.weight ?? 0) / total }))
    .filter((q) => q.share < QUIET_SHARE)
    .sort((a, b) => a.share - b.share)[0]
  return quiet ? `${led} ${name(quiet.color)} was quiet.` : led
}

export interface DayGroup {
  name: string
  color: BlockColor
  size: BlockSize
  count: number
}

/** What was done on a day: one row per block as it looked when earned, in first-tapped order. */
export function dayGroups(cubes: CubeRecord[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const cube of cubes) {
    const key = `${cube.blockId}|${cube.name}|${cube.color}|${cube.size}`
    const group = groups.get(key)
    if (group) group.count += 1
    else groups.set(key, { name: cube.name, color: cube.color, size: cube.size, count: 1 })
  }
  return [...groups.values()]
}

/** Number of glasses a day used. */
export function glassCount(cubes: CubeRecord[]): number {
  return cubes.length ? Math.max(...cubes.map((c) => c.glassIndex)) + 1 : 0
}
