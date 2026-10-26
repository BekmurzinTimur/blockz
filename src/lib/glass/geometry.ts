import { SIZE_SCALE, type BlockSize } from '../model'

/**
 * The glass in fixed world units. Physics and rendering both read from here,
 * and the view scales the whole world to fit the screen.
 */
export const WORLD_WIDTH = 400
export const WORLD_HEIGHT = 772

const CX = WORLD_WIDTH / 2

/** A straight tumbler with a rounded bottom, in the mockup's 236×440 proportions. */
export const GLASS = {
  cx: CX,
  rimY: 200,
  floorY: 760,
  /** Inner half-width. */
  half: 150,
  /** Radius of the rounded bottom corners. */
  radius: 38,
  /** Height of the slightly brighter band of solid glass at the bottom. */
  bottomBand: 18,
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

const CORNER_SEGMENTS = 6

/** Inner outline of the glass as a polyline from the left rim, around the bottom, to the right rim. */
export function innerOutline(): Point[] {
  const { cx, rimY, floorY, half, radius } = GLASS
  const points: Point[] = [{ x: cx - half, y: rimY }]
  const corner = (centerX: number, from: number, to: number) => {
    for (let i = 0; i <= CORNER_SEGMENTS; i++) {
      const a = from + ((to - from) * i) / CORNER_SEGMENTS
      points.push({ x: centerX + Math.cos(a) * radius, y: floorY - radius + Math.sin(a) * radius })
    }
  }
  corner(cx - half + radius, Math.PI, Math.PI / 2)
  corner(cx + half - radius, Math.PI / 2, 0)
  points.push({ x: cx + half, y: rimY })
  return points
}
