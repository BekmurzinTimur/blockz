import { db, type CubeRecord, type Setting } from './db'
import { RENAMED_COLORS, type Block } from './model'

/** Bump when the file shape changes; older versions stay importable. */
const FORMAT_VERSION = 1

export interface Backup {
  app: 'blockz'
  version: number
  exportedAt: string
  blocks: Block[]
  cubes: CubeRecord[]
  settings: Setting[]
}

/** Everything on this device, as a file the browser downloads. */
export async function exportData() {
  const backup: Backup = {
    app: 'blockz',
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    blocks: await db.blocks.toArray(),
    cubes: await db.cubes.toArray(),
    settings: await db.settings.toArray(),
  }
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  // Local date for the name (exportedAt is UTC, which can be a different day).
  link.download = `blockz-backup-${new Date().toLocaleDateString('sv-SE')}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Reads a backup file, or throws a message fit to show the person. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file isn’t a Blockz backup.')
  }
  const b = data as Partial<Backup>
  if (b?.app !== 'blockz' || !Array.isArray(b.blocks) || !Array.isArray(b.cubes)) {
    throw new Error('That file isn’t a Blockz backup.')
  }
  if (typeof b.version !== 'number' || b.version > FORMAT_VERSION) {
    throw new Error('This backup comes from a newer version of Blockz.')
  }
  const ok =
    b.blocks.every((x) => typeof x?.id === 'string' && typeof x.name === 'string') &&
    b.cubes.every((x) => typeof x?.id === 'string' && typeof x.dayKey === 'string')
  if (!ok) throw new Error('This backup looks damaged, so nothing was changed.')
  // Older backups may use colours since retired from the palette.
  const recolor = <T extends { color: string }>(row: T): T =>
    row.color in RENAMED_COLORS ? { ...row, color: RENAMED_COLORS[row.color] } : row
  return {
    ...b,
    blocks: b.blocks.map(recolor),
    cubes: b.cubes.map(recolor),
    settings: Array.isArray(b.settings) ? b.settings : [],
  } as Backup
}

/** Replaces everything on this device with the backup, all or nothing. */
export async function restore(backup: Backup) {
  await db.transaction('rw', db.blocks, db.cubes, db.settings, async () => {
    await Promise.all([db.blocks.clear(), db.cubes.clear(), db.settings.clear()])
    await db.blocks.bulkAdd(backup.blocks)
    await db.cubes.bulkAdd(backup.cubes)
    await db.settings.bulkAdd(backup.settings)
  })
}

export async function eraseAll() {
  await db.transaction('rw', db.blocks, db.cubes, db.settings, async () => {
    await Promise.all([db.blocks.clear(), db.cubes.clear(), db.settings.clear()])
  })
}
