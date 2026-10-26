export type BlockColor = 'blue' | 'teal' | 'green' | 'amber' | 'rose' | 'violet'
export type BlockSize = 's' | 'm' | 'l'

export interface Block {
  id: string
  name: string
  color: BlockColor
  size: BlockSize
}

/** Soft ice tints, chosen to glow against the dark backdrop. */
export const TINTS: Record<BlockColor, string> = {
  blue: '#8ec5ff',
  teal: '#7fe0d6',
  green: '#a8e6a3',
  amber: '#f6d38a',
  rose: '#f5a8c0',
  violet: '#c3a8f5',
}

/** Cube side relative to the base unit: large is 2× small. */
export const SIZE_SCALE: Record<BlockSize, number> = { s: 1, m: 1.5, l: 2 }

// Temporary until blocks are user-created and persisted (milestone 2).
export const DEMO_BLOCKS: Block[] = [
  { id: 'pushups', name: '2 push-ups', color: 'amber', size: 's' },
  { id: 'reading', name: '1 min reading', color: 'blue', size: 's' },
  { id: 'breathing', name: 'Square breathing', color: 'teal', size: 'm' },
  { id: 'mirror', name: 'Mirror work', color: 'rose', size: 'm' },
  { id: 'belief', name: 'A better belief', color: 'violet', size: 's' },
  { id: 'client', name: 'Call a client', color: 'green', size: 'l' },
]
