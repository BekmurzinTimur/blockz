import { TINTS, type BlockColor, type BlockSize } from '../model'
import { GLASS, cubeSide, innerOutline } from './geometry'
import type { Cube } from './physics'

/** Extra sprite margin around a cube for its soft glow, as a fraction of the side. */
const GLOW_PAD = 0.3

/**
 * Draws the glass and its cubes. The context is expected to already carry the
 * world-to-screen transform; `pixelScale` is device pixels per world unit and
 * is only used to rasterise cube sprites at full resolution.
 */
export class GlassRenderer {
  private sprites = new Map<string, HTMLCanvasElement>()
  private pixelScale = 1

  setPixelScale(scale: number) {
    if (scale === this.pixelScale) return
    this.pixelScale = scale
    this.sprites.clear()
  }

  draw(ctx: CanvasRenderingContext2D, cubes: Iterable<Cube>) {
    drawGlassBack(ctx)
    for (const cube of cubes) {
      const { position, angle } = cube.body
      const sprite = this.sprite(cube.color, cube.size)
      const extent = cube.side * (1 + GLOW_PAD * 2)
      ctx.save()
      ctx.translate(position.x, position.y)
      ctx.rotate(angle)
      ctx.drawImage(sprite, -extent / 2, -extent / 2, extent, extent)
      ctx.restore()
    }
    drawGlassFront(ctx)
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

function renderCubeSprite(tint: string, side: number, pixelScale: number): HTMLCanvasElement {
  const extent = side * (1 + GLOW_PAD * 2)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.ceil(extent * pixelScale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(canvas.width / extent, canvas.height / extent)
  ctx.translate(extent / 2, extent / 2)

  const s = side
  const h = s / 2
  const r = s * 0.18
  const body = new Path2D()
  body.roundRect(-h, -h, s, s, r)

  // Translucent tinted body with a soft glow so it reads against the dark.
  ctx.save()
  ctx.shadowColor = rgba(tint, 0.35)
  ctx.shadowBlur = s * 0.22 * pixelScale
  const fill = ctx.createLinearGradient(-h, -h, h, h)
  fill.addColorStop(0, rgba(tint, 0.82))
  fill.addColorStop(0.55, rgba(tint, 0.55))
  fill.addColorStop(1, rgba(tint, 0.68))
  ctx.fillStyle = fill
  ctx.fill(body)
  ctx.restore()

  ctx.save()
  ctx.clip(body)

  // Light passing through: a bright frosty core, offset towards the light.
  const core = ctx.createRadialGradient(-s * 0.12, -s * 0.15, 0, -s * 0.05, -s * 0.05, s * 0.7)
  core.addColorStop(0, 'rgba(255,255,255,0.32)')
  core.addColorStop(0.5, 'rgba(255,255,255,0.08)')
  core.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = core
  ctx.fillRect(-h, -h, s, s)

  // Shaded far edge (bottom-right) for depth.
  const shade = ctx.createLinearGradient(-h, -h, h, h)
  shade.addColorStop(0.6, 'rgba(10,20,40,0)')
  shade.addColorStop(1, 'rgba(10,20,40,0.22)')
  ctx.fillStyle = shade
  ctx.fillRect(-h, -h, s, s)

  // Bright rim just inside the edge.
  ctx.lineWidth = s * 0.07
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.stroke(body)
  ctx.restore()

  ctx.lineWidth = Math.max(s * 0.02, 0.8)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.stroke(body)

  // Glossy specular highlight near the top-left corner.
  const spec = new Path2D()
  spec.roundRect(-h + s * 0.14, -h + s * 0.11, s * 0.36, s * 0.1, s * 0.05)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fill(spec)
  ctx.beginPath()
  ctx.arc(-h + s * 0.18, -h + s * 0.32, s * 0.035, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fill()

  return canvas
}

function drawGlassBack(ctx: CanvasRenderingContext2D) {
  const { cx, rimY, floorY, rimHalf, floorHalf, base, wall } = GLASS

  // Soft shadow the glass casts on the table.
  const shadowY = floorY + base + 4
  ctx.save()
  ctx.translate(cx, shadowY)
  ctx.scale(1, 0.14)
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, floorHalf * 1.5)
  shadow.addColorStop(0, 'rgba(0,0,0,0.45)')
  shadow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = shadow
  ctx.fillRect(-floorHalf * 1.5, -floorHalf * 1.5, floorHalf * 3, floorHalf * 3)
  ctx.restore()

  // Faint body of the glass, slightly brighter towards the bottom.
  const inner = innerOutline()
  ctx.beginPath()
  inner.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.closePath()
  const body = ctx.createLinearGradient(0, rimY, 0, floorY)
  body.addColorStop(0, 'rgba(255,255,255,0.025)')
  body.addColorStop(1, 'rgba(255,255,255,0.06)')
  ctx.fillStyle = body
  ctx.fill()

  // Back half of the rim, seen through the glass.
  ctx.beginPath()
  ctx.ellipse(cx, rimY, rimHalf + wall / 2, 9, 0, Math.PI, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function drawGlassFront(ctx: CanvasRenderingContext2D) {
  const { cx, rimY, floorY, rimHalf, floorHalf, base, wall } = GLASS
  const [rimL, floorL, floorR, rimR] = innerOutline()

  // Heavy glass base.
  const baseW = (floorHalf + wall) * 2
  const basePath = new Path2D()
  basePath.roundRect(cx - baseW / 2, floorY, baseW, base, [0, 0, 10, 10])
  const baseFill = ctx.createLinearGradient(0, floorY, 0, floorY + base)
  baseFill.addColorStop(0, 'rgba(255,255,255,0.14)')
  baseFill.addColorStop(1, 'rgba(255,255,255,0.05)')
  ctx.fillStyle = baseFill
  ctx.fill(basePath)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.2
  ctx.stroke(basePath)

  // Walls: a faint thick band with crisp inner and outer edges.
  for (const [top, bottom, out] of [
    [rimL, floorL, -1],
    [rimR, floorR, 1],
  ] as const) {
    const o = (wall / 2) * out
    ctx.beginPath()
    ctx.moveTo(top.x + o, top.y)
    ctx.lineTo(bottom.x + o, bottom.y)
    ctx.lineWidth = wall
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.stroke()
    for (const [edge, alpha] of [
      [0, 0.22],
      [wall * out, 0.38],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(top.x + edge, top.y)
      ctx.lineTo(bottom.x + edge, bottom.y + (edge ? base - 6 : 0))
      ctx.lineWidth = 1.2
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`
      ctx.stroke()
    }
  }

  // Long vertical reflection streak near the left wall, and a thinner one on the right.
  streak(ctx, rimL.x + 18, floorL.x + 16, rimY + 30, floorY - 40, 16, 0.13)
  streak(ctx, rimR.x - 30, floorR.x - 26, rimY + 60, floorY - 120, 6, 0.08)

  // Front half of the rim.
  ctx.beginPath()
  ctx.ellipse(cx, rimY, rimHalf + wall / 2, 9, 0, 0, Math.PI)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 1.8
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx, rimY, rimHalf + wall / 2, 9, 0, Math.PI, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.stroke()
}

function streak(
  ctx: CanvasRenderingContext2D,
  xTop: number,
  xBottom: number,
  yTop: number,
  yBottom: number,
  width: number,
  alpha: number,
) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.25, `rgba(255,255,255,${alpha})`)
  g.addColorStop(0.75, `rgba(255,255,255,${alpha})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  ctx.moveTo(xTop, yTop)
  ctx.lineTo(xTop + width, yTop)
  ctx.lineTo(xBottom + width, yBottom)
  ctx.lineTo(xBottom, yBottom)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
