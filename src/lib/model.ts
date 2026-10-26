export type BlockColor = 'green' | 'clay' | 'amber' | 'rose' | 'violet' | 'blue'
export type BlockSize = 's' | 'm' | 'l'

export interface Block {
  id: string
  name: string
  color: BlockColor
  size: BlockSize
  order: number
  /** Deleted blocks are kept so their history stays intact. */
  deletedAt?: number
}

export const COLORS = Object.keys({
  green: 0,
  clay: 0,
  amber: 0,
  rose: 0,
  violet: 0,
  blue: 0,
} satisfies Record<BlockColor, 0>) as BlockColor[]

export const SIZES: BlockSize[] = ['s', 'm', 'l']

export const SIZE_LABELS: Record<BlockSize, string> = { s: 'Small', m: 'Medium', l: 'Large' }

export const SIZE_HINTS: Record<BlockSize, string> = { s: 'Quick', m: 'Some effort', l: 'Takes guts' }

/** Dusty, earthy tints that read as tinted ice on the warm Bone background. */
export const TINTS: Record<BlockColor, string> = {
  green: '#839a7c',
  clay: '#c99a7e',
  amber: '#d1b375',
  rose: '#ca9b9b',
  violet: '#a492ab',
  blue: '#8a9fb2',
}

/** Colours retired from the palette, and what stored data using them becomes. */
export const RENAMED_COLORS: Record<string, BlockColor> = { teal: 'clay' }

/** Cube side relative to the base unit: large is 2× small. */
export const SIZE_SCALE: Record<BlockSize, number> = { s: 1, m: 1.5, l: 2 }
