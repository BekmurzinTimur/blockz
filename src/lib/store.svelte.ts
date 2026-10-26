import Dexie from 'dexie'
import { dayKeyFor } from './day'
import { db, newId, type CubeRecord } from './db'
import { feedback } from './feedback'
import type { Pose } from './glass/physics'
import type { Block } from './model'

export interface Settings {
  /** Local hour (0–6) when a new day begins; late nights count toward the day still being lived. */
  dayStartHour: number
  sound: boolean
  haptics: boolean
}

const DEFAULT_SETTINGS: Settings = { dayStartHour: 4, sound: true, haptics: true }

type BlockFields = Pick<Block, 'name' | 'color' | 'size'>

class AppStore {
  // Raw state: records are replaced, never mutated in place, and stay plain for IndexedDB.
  blocks = $state.raw<Block[]>([])
  todayCubes = $state.raw<CubeRecord[]>([])
  loaded = $state(false)
  /** The day being lived, as `YYYY-MM-DD`; it changes at the day boundary, not at midnight. */
  dayKey = $state('')
  /** Index of today's glass being filled; every lower index is a full glass on the shelf. */
  currentGlass = $state(0)

  glassesToday = $derived(this.currentGlass + 1)
  currentCubes = $derived(this.todayCubes.filter((c) => c.glassIndex === this.currentGlass))

  settings = $state<Settings>({ ...DEFAULT_SETTINGS })

  async load() {
    navigator.storage?.persist?.().catch(() => {})
    const saved = new Map((await db.settings.toArray()).map((s) => [s.key, s.value]))
    // Keep only saved values of the expected type, so a bad backup can't break the app.
    const valid = Object.entries(DEFAULT_SETTINGS).filter(([key, value]) => typeof saved.get(key) === typeof value)
    this.settings = { ...DEFAULT_SETTINGS, ...Object.fromEntries(valid.map(([key]) => [key, saved.get(key)])) }
    this.applyFeedback()
    const all = await db.blocks.orderBy('order').toArray()
    this.blocks = all.filter((b) => !b.deletedAt)
    this.dayKey = this.todayKey()
    await this.loadDay()
    this.loaded = true
  }

  /** Reads the current day's cubes from storage, e.g. when a changed day start lands on a day that has some. */
  async loadDay() {
    this.todayCubes = await db.cubes
      .where('[dayKey+droppedAt]')
      .between([this.dayKey, Dexie.minKey], [this.dayKey, Dexie.maxKey])
      .toArray()
    this.currentGlass = Math.max(0, ...this.todayCubes.map((c) => c.glassIndex))
  }

  todayKey() {
    return dayKeyFor(new Date(), this.settings.dayStartHour)
  }

  /** Saves one setting. Callers run `checkDay()` after changing the day start, since today may shift. */
  async updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.settings[key] = value
    this.applyFeedback()
    await db.settings.put({ key, value })
  }

  private applyFeedback() {
    feedback.sound = this.settings.sound
    feedback.haptics = this.settings.haptics
  }

  /**
   * Starts a fresh day if the day boundary has passed. Returns true when it did.
   * Past cubes are already stored with their poses, so nothing needs saving here.
   */
  checkDay(): boolean {
    const key = this.todayKey()
    if (key === this.dayKey) return false
    this.dayKey = key
    this.todayCubes = []
    this.currentGlass = 0
    return true
  }

  /** The current glass is full: start the next one, moving the carried cubes into it. */
  sealGlass(carryIds: string[]) {
    const next = this.currentGlass + 1
    const carry = new Set(carryIds)
    this.todayCubes = this.todayCubes.map((c) => (carry.has(c.id) ? { ...c, glassIndex: next, pose: undefined } : c))
    this.currentGlass = next
    db.cubes
      .bulkUpdate(carryIds.map((key) => ({ key, changes: { glassIndex: next, pose: undefined } })))
      .catch(reportError)
  }

  async createBlock(fields: BlockFields) {
    const order = Math.max(0, ...this.blocks.map((b) => b.order + 1))
    const block: Block = { id: newId(), ...fields, order }
    await db.blocks.add(block)
    this.blocks = [...this.blocks, block]
  }

  async updateBlock(id: string, fields: BlockFields) {
    await db.blocks.update(id, fields)
    this.blocks = this.blocks.map((b) => (b.id === id ? { ...b, ...fields } : b))
  }

  async deleteBlock(id: string) {
    await db.blocks.update(id, { deletedAt: Date.now() })
    this.blocks = this.blocks.filter((b) => b.id !== id)
  }

  async reorderBlocks(ids: string[]) {
    const byId = new Map(this.blocks.map((b) => [b.id, b]))
    this.blocks = ids.map((id, order) => ({ ...byId.get(id)!, order }))
    await db.blocks.bulkPut(this.blocks)
  }

  /**
   * Records a cube immediately; the write finishes in the background so the drop is instant.
   * Callers run `checkDay()` first so a tap after the boundary never lands in yesterday's glass.
   */
  mineCube(block: Block): CubeRecord {
    const now = Date.now()
    const cube: CubeRecord = {
      id: newId(),
      blockId: block.id,
      name: block.name,
      color: block.color,
      size: block.size,
      droppedAt: now,
      dayKey: this.dayKey,
      glassIndex: this.currentGlass,
    }
    this.todayCubes = [...this.todayCubes, cube]
    db.cubes.add(cube).catch(reportError)
    return cube
  }

  /** Removes the most recent cube in the current glass and returns its id. Full glasses are never touched. */
  undoLast(): string | undefined {
    const last = this.currentCubes.at(-1)
    if (!last) return
    this.todayCubes = this.todayCubes.filter((c) => c !== last)
    // IndexedDB runs write transactions in order, so this never overtakes the add.
    db.cubes.delete(last.id).catch(reportError)
    return last.id
  }

  async savePose(id: string, pose: Pose) {
    // Ignore poses of cubes that were undone while settling.
    if (!this.todayCubes.some((c) => c.id === id)) return
    await db.cubes.update(id, { pose })
  }
}

export const store = new AppStore()
