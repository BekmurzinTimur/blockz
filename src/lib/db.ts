import Dexie, { type EntityTable } from 'dexie'
import type { Pose } from './glass/physics'
import { RENAMED_COLORS, type Block, type BlockColor, type BlockSize } from './model'

export interface CubeRecord {
  id: string
  blockId: string
  /** The block's look at the moment the cube was earned; later edits never change it. */
  name: string
  color: BlockColor
  size: BlockSize
  droppedAt: number
  dayKey: string
  glassIndex: number
  /** Resting pose in world units, saved once the cube settles. */
  pose?: Pose
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('blockz') as Dexie & {
  blocks: EntityTable<Block, 'id'>
  cubes: EntityTable<CubeRecord, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  blocks: 'id, order',
  cubes: 'id, dayKey, [dayKey+droppedAt]',
  settings: 'key',
})

// v2: the Bone palette retired teal; existing blocks and cubes move to its replacement.
db.version(2).upgrade(async (tx) => {
  const recolor = (row: { color: string }) => {
    if (row.color in RENAMED_COLORS) row.color = RENAMED_COLORS[row.color]
  }
  await tx.table('blocks').toCollection().modify(recolor)
  await tx.table('cubes').toCollection().modify(recolor)
})

/** Short sortable ids; `crypto.randomUUID` is unavailable on plain-http LAN testing. */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
