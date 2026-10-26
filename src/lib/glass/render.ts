import { TINTS, type BlockColor, type BlockSize } from '../model'
import { CUBE_UNIT, GLASS, cubeSide, innerOutline } from './geometry'
import type { Cube } from './physics'

/** A cube to draw: its look and its pose in world units. Decoupled from physics so snapshots can draw too. */
export interface CubeDraw {
  color: BlockColor
  size: BlockSize
  x: number
  y: number
  angle: number
  /** Vertical speed, for motion streaks on falling cubes. */
  vy?: number
}

export function cubeDraw(cube: Cube): CubeDraw {
  const { position, angle, velocity } = cube.body
  return { color: cube.color, size: cube.size, x: position.x, y: position.y, angle, vy: velocity.y }
}

export interface FadingCube {
  cube: CubeDraw
  /** 0 when the fade starts, 1 when the cube is gone. */
  progress: number
}

/** The full-glass celebration: `glow` brightens the glass, `sweep` moves the glints across it. */
export interface Shimmer {
  glow: number
  sweep: number
}

/** Colours of the glass and cube shading on the Bone background. */
const THEME = {
  /** Glass outline: warm grey ink. */
  edge: '#3a352c',
  edgeAlpha: 0.3,
  /** The accent green, used for the full-glass celebration. */
  accent: '#4f6b4a',
  cubeShadow: 0.14,
  tableShadow: 0.16,
}

/** Extra sprite margin around a cube for its soft shadow, as a fraction of the side. */
const GLOW_PAD = 0.45
/** World units per CSS pixel of the mockup, where a small cube is 34px. */
const MOCKUP_PX = CUBE_UNIT / 34
/** Falling speed (world units per step) above which motion streaks appear. */
const STREAK_SPEED = 7

/**
 * Draws the glass and its cubes. The context is expected to already carry the
 * world-to-screen transform; `pixelScale` is device pixels per world unit and
 * is only used to rasterise cube sprites at full resolution.
 */
const pool = new Map<number, GlassRenderer>()

/** A shared renderer per pixel scale, so many snapshots reuse the same cube sprites. */
export function rendererFor(pixelScale: number): GlassRenderer {
  const key = Math.round(pixelScale * 100) / 100
  let renderer = pool.get(key)
  if (!renderer) {
    renderer = new GlassRenderer()
    renderer.setPixelScale(key)
    pool.set(key, renderer)
  }
  return renderer
}

export class GlassRenderer {
  private sprites = new Map<string, HTMLCanvasElement>()
  private pixelScale = 1

  setPixelScale(scale: number) {
    if (scale === this.pixelScale) return
    this.pixelScale = scale
    this.sprites.clear()
  }

  draw(
    ctx: CanvasRenderingContext2D,
    cubes: Iterable<CubeDraw>,
    fading: Iterable<FadingCube> = [],
    shimmer: Shimmer = { glow: 0, sweep: 0 },
  ) {
    drawGlassBack(ctx, shimmer.glow)
    for (const cube of cubes) {
      drawStreaks(ctx, cube)
      this.drawCube(ctx, cube)
    }
    for (const { cube, progress } of fading) {
      this.drawCube(ctx, cube, 1 - progress, progress * cubeSide(cube.size) * 0.8)
    }
    if (shimmer.glow > 0) drawGlints(ctx, shimmer)
    drawGlassFront(ctx, shimmer.glow)
  }

  /** Draws a cube at its pose, optionally faded and lifted (for undo). */
  drawCube(ctx: CanvasRenderingContext2D, cube: CubeDraw, alpha = 1, lift = 0) {
    const sprite = this.sprite(cube.color, cube.size)
    const extent = cubeSide(cube.size) * (1 + GLOW_PAD * 2)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cube.x, cube.y - lift)
    ctx.rotate(cube.angle)
    ctx.drawImage(sprite, -extent / 2, -extent / 2, extent, extent)
    ctx.restore()
  }

  private sprite(color: BlockColor, size: BlockSize): HTMLCanvasElement {
    const key = `${color}:${size}`
    let sprite = this.sprites.get(key)
    if (!sprite) {
      sprite = renderCubeSprite(TINTS[color], cubeSide(size), this.pixelScale)
      this.sprites.set(key, sprite)
    }
    return sprite
  }
}

/** A tinted ice cube on paper: frosted top-left, a soft darker edge, inner shading and a small cast shadow. */
function renderCubeSprite(tint: string, side: number, pixelScale: number): HTMLCanvasElement {
  const extent = side * (1 + GLOW_PAD * 2)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.ceil(extent * pixelScale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(canvas.width / extent, canvas.height / extent)
  ctx.translate(extent / 2, extent / 2)

  const s = side
  const h = s / 2
  const px = MOCKUP_PX
  const body = new Path2D()
  body.roundRect(-h, -h, s, s, s * 0.22)
  // Everything outside the cube, for inset effects drawn as shadows of the surround.
  const surround = new Path2D()
  surround.rect(-extent, -extent, extent * 2, extent * 2)
  surround.addPath(body)

  // Body: a 150° gradient from frosted tint to full tint, slightly see-through, with a soft cast shadow.
  ctx.save()
  ctx.shadowColor = `rgba(60,50,40,${THEME.cubeShadow})`
  ctx.shadowBlur = s * 0.16 * pixelScale
  ctx.shadowOffsetY = s * 0.05 * pixelScale
  const dx = Math.sin((150 * Math.PI) / 180) * h * 1.2
  const dy = -Math.cos((150 * Math.PI) / 180) * h * 1.2
  const fill = ctx.createLinearGradient(-dx, -dy, dx, dy)
  fill.addColorStop(0, rgba(mix(tint, '#ffffff', 0.45), 0.82))
  fill.addColorStop(0.4, rgba(tint, 0.8))
  fill.addColorStop(1, rgba(mix(tint, '#000000', 0.08), 0.84))
  ctx.fillStyle = fill
  ctx.fill(body)
  ctx.restore()

  ctx.save()
  ctx.clip(body)
  // Inset shading towards the bottom-right.
  ctx.shadowColor = 'rgba(40,30,20,0.14)'
  ctx.shadowBlur = 10 * px * pixelScale
  ctx.shadowOffsetX = -3 * px * pixelScale
  ctx.shadowOffsetY = -5 * px * pixelScale
  ctx.fillStyle = '#000'
  ctx.fill(surround, 'evenodd')
  // Bright inner top edge.
  ctx.shadowColor = 'rgba(255,255,255,0.5)'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1.2 * px * pixelScale
  ctx.fill(surround, 'evenodd')
  ctx.restore()

  ctx.lineWidth = px
  ctx.strokeStyle = rgba(mix(tint, '#000000', 0.25), 0.45)
  const edge = new Path2D()
  edge.roundRect(-h + px / 2, -h + px / 2, s - px, s - px, s * 0.22 - px / 2)
  ctx.stroke(edge)

  return canvas
}

/** Faint vertical motion lines trailing a fast-falling cube. */
function drawStreaks(ctx: CanvasRenderingContext2D, cube: CubeDraw) {
  const vy = cube.vy ?? 0
  if (vy < STREAK_SPEED) return
  const side = cubeSide(cube.size)
  const { x, y } = cube
  const alpha = Math.min(0.22, (vy - STREAK_SPEED) * 0.03)
  const top = y - side * 0.7
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = 2.5
  for (const [offset, length, a] of [
    [-0.32, 5, 1],
    [0, 7, 0.7],
    [0.32, 4.2, 1],
  ]) {
    ctx.strokeStyle = rgba(TINTS[cube.color], alpha * a)
    ctx.beginPath()
    ctx.moveTo(x + offset * side, top)
    ctx.lineTo(x + offset * side, top - vy * length)
    ctx.stroke()
  }
  ctx.restore()
}

function outlinePath(): Path2D {
  const path = new Path2D()
  innerOutline().forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)))
  return path
}

function drawGlassBack(ctx: CanvasRenderingContext2D, glow: number) {
  const { cx, rimY, floorY, half, bottomBand } = GLASS
  const body = outlinePath()
  body.closePath()

  // The glass rests on the table: a soft shadow under its base.
  ctx.save()
  ctx.translate(cx, floorY + 8)
  ctx.scale(1, 0.12)
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 1.2)
  shadow.addColorStop(0, `rgba(60,50,40,${THEME.tableShadow})`)
  shadow.addColorStop(1, 'rgba(60,50,40,0)')
  ctx.fillStyle = shadow
  ctx.fillRect(-half * 1.2, -half * 1.2, half * 2.4, half * 2.4)
  ctx.restore()

  if (glow > 0) {
    // A soft green halo behind a full glass.
    ctx.save()
    ctx.shadowColor = rgba(THEME.accent, 0.22 * glow)
    ctx.shadowBlur = 60
    ctx.fillStyle = rgba(THEME.accent, 0.06 * glow)
    ctx.beginPath()
    ctx.roundRect(cx - half - 20, rimY + 40, half * 2 + 40, floorY - rimY - 30, 50)
    ctx.fill()
    ctx.restore()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.38)'
  ctx.fill(body)

  // Solid glass at the bottom reads slightly denser.
  ctx.save()
  ctx.clip(body)
  ctx.fillStyle = 'rgba(80,70,55,0.08)'
  ctx.fillRect(cx - half, floorY - bottomBand, half * 2, bottomBand)
  ctx.restore()
}

/** Two diagonal light bands sweeping across the glass. */
function drawGlints(ctx: CanvasRenderingContext2D, { glow, sweep }: Shimmer) {
  const { cx, rimY, floorY, half } = GLASS
  const body = outlinePath()
  body.closePath()
  const travel = floorY - rimY + half * 2
  const y = rimY - half + sweep * travel
  ctx.save()
  ctx.clip(body)
  ctx.translate(cx, y)
  ctx.rotate((-28 * Math.PI) / 180)
  for (const [offset, width, alpha] of [
    [0, 22, 0.5],
    [48, 8, 0.4],
  ]) {
    const g = ctx.createLinearGradient(0, offset - width, 0, offset + width)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * glow})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(-half * 2, offset - width, half * 4, width * 2)
  }
  ctx.restore()
}

function drawGlassFront(ctx: CanvasRenderingContext2D, glow: number) {
  const { cx, rimY, half } = GLASS
  // World units per mockup pixel, where the glass is 236px wide.
  const u = (half * 2) / 236

  // Bright vertical reflections: a wide one on the left, a thin one on the right.
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath()
  ctx.roundRect(cx - half + 14 * u, rimY + 28 * u, 6 * u, 330 * u, 3 * u)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.roundRect(cx + half - 21 * u, rimY + 60 * u, 3 * u, 120 * u, 1.5 * u)
  ctx.fill()

  // The edge warms to the accent green while a full glass celebrates.
  const edge = mix(THEME.edge, THEME.accent, 0.6 * glow)
  ctx.lineWidth = 1.5 * u
  ctx.strokeStyle = rgba(edge, THEME.edgeAlpha + 0.15 * glow)
  ctx.stroke(outlinePath())

  ctx.beginPath()
  ctx.ellipse(cx, rimY, half, 6 * u, 0, 0, Math.PI * 2)
  ctx.strokeStyle = rgba(edge, THEME.edgeAlpha * 0.9 + 0.15 * glow)
  ctx.stroke()
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** Blends two hex colours: t = 0 gives `a`, t = 1 gives `b`. */
function mix(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  const ch = (shift: number) => Math.round(((x >> shift) & 255) * (1 - t) + ((y >> shift) & 255) * t)
  return '#' + [16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')
}
