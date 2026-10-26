/**
 * Sound and touch feedback. Everything is synthesised with Web Audio, so it
 * needs no files and works offline. Haptics use the Vibration API, which
 * Android supports and iOS Safari ignores; a native wrapper can replace
 * `haptic()` later without touching callers.
 */

/** Kept in sync with the saved settings by the store. */
export const feedback = { sound: true, haptics: true }

/** Impacts slower than this (world units per step) stay silent. */
const MIN_SPEED = 1.2
const MIN_GAP_MS = 35

let audio: AudioContext | undefined
let lastClinkAt = 0

/** Call from a user gesture: browsers (iOS especially) only start audio after one. */
export function unlockAudio() {
  if (!feedback.sound) return
  audio ??= new AudioContext()
  if (audio.state === 'suspended') audio.resume().catch(() => {})
}

/**
 * An ice clink: three inharmonic partials with a quick decay. The pitch and
 * decay vary on every call so repeated clinks never sound mechanical.
 */
export function clink(speed: number, quiet = false) {
  if (!feedback.sound || !audio || audio.state !== 'running' || speed < MIN_SPEED) return
  const now = performance.now()
  if (now - lastClinkAt < MIN_GAP_MS) return
  lastClinkAt = now

  const t = audio.currentTime
  const strength = Math.min(1, (speed - MIN_SPEED) / 10)
  const volume = (quiet ? 0.05 : 0.14) * (0.35 + 0.65 * strength)
  const base = 1900 + Math.random() * 800
  const decay = 0.08 + Math.random() * 0.14
  for (const [ratio, gain] of [
    [1, 1],
    [2.76, 0.45],
    [5.4, 0.2],
  ]) {
    tone(base * ratio, t, volume * gain, decay / ratio ** 0.3)
  }
}

/** A soft rising three-note chime for a full glass. */
export function chime() {
  if (!feedback.sound || !audio || audio.state !== 'running') return
  const t = audio.currentTime
  ;[1318.5, 1661.2, 1975.5].forEach((freq, i) => tone(freq, t + i * 0.09, 0.07, 0.9))
}

export function haptic() {
  // Only after a tap: cubes re-dropped on launch shouldn't buzz, and browsers block it anyway.
  if (feedback.haptics && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(8)
}

function tone(freq: number, start: number, volume: number, decay: number) {
  const osc = audio!.createOscillator()
  const gain = audio!.createGain()
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay)
  osc.connect(gain).connect(audio!.destination)
  osc.start(start)
  osc.stop(start + decay + 0.02)
}
