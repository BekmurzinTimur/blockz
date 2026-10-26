import { SIZE_SCALE, type BlockSize } from '../model'

/**
 * The glass in fixed world units. Physics and rendering both read from here,
 * and the view scales the whole world to fit the screen.
 */
export const WORLD_WIDTH = 400
export const WORLD_HEIGHT = 780

const CX = WORLD_WIDTH / 2

export const GLASS = {
  cx: CX,
  rimY: 200,
  floorY: 730,
  /** Inner half-widths at the rim and at the floor (slight taper). */
  rimHalf: 150,
  floorHalf: 128,
  /** Visual thickness of the glass wall and the heavier base. */
  wall: 7,
  base: 26,
}

/** Side of a small cube; medium and large scale from this. */
export const CUBE_UNIT = 46

export function cubeSide(size: BlockSize): number {
  return CUBE_UNIT * SIZE_SCALE[size]
}

export interface Point {
  x: number
  y: number
}

/** Inner outline of the glass: rim-left, floor-left, floor-right, rim-right. */
export function innerOutline(): Point[] {
  const { cx, rimY, floorY, rimHalf, floorHalf } = GLASS
  return [
    { x: cx - rimHalf, y: rimY },
    { x: cx - floorHalf, y: floorY },
    { x: cx + floorHalf, y: floorY },
    { x: cx + rimHalf, y: rimY },
  ]
}
