/**
 * The day a moment belongs to, as `YYYY-MM-DD`. Days begin at `startHour`
 * local time, so late-night activity counts toward the day still being lived.
 */
export function dayKeyFor(date: Date, startHour: number): string {
  const shifted = new Date(date)
  shifted.setHours(shifted.getHours() - startHour)
  const y = shifted.getFullYear()
  const m = String(shifted.getMonth() + 1).padStart(2, '0')
  const d = String(shifted.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
