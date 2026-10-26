<script lang="ts">
  import type { CubeRecord } from '../db'
  import { GLASS, cubeSide } from './geometry'
  import { rendererFor, type CubeDraw } from './render'

  /** Without a `label` the snapshot is decorative (its container describes it). */
  let { cubes, label }: { cubes: CubeRecord[]; label?: string } = $props()

  // The part of the world a snapshot shows: the glass and a little room around it.
  const X0 = GLASS.cx - GLASS.half - 8
  const Y0 = GLASS.rimY - 10
  const W = (GLASS.half + 8) * 2
  const H = GLASS.floorY + 4 - Y0

  let canvas: HTMLCanvasElement

  const draws = $derived(placeAll(cubes))

  /** Saved poses as they settled; any cube without one (closed mid-fall) is stacked on top. */
  function placeAll(cubes: CubeRecord[]): CubeDraw[] {
    const placed: CubeDraw[] = []
    const loose: CubeRecord[] = []
    for (const c of cubes) {
      if (c.pose) placed.push({ color: c.color, size: c.size, ...c.pose })
      else loose.push(c)
    }
    let top = Math.min(GLASS.floorY, ...placed.map((p) => p.y - cubeSide(p.size) / 2))
    let x = GLASS.cx - GLASS.half
    let rowHeight = 0
    for (const c of loose) {
      const side = cubeSide(c.size)
      if (x + side > GLASS.cx + GLASS.half) {
        x = GLASS.cx - GLASS.half
        top -= rowHeight
        rowHeight = 0
      }
      placed.push({ color: c.color, size: c.size, x: x + side / 2, y: top - side / 2, angle: 0 })
      x += side
      rowHeight = Math.max(rowHeight, side)
    }
    return placed
  }

  $effect(() => {
    const items = draws
    let visible = false

    const paint = () => {
      if (!visible) return
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const scale = Math.min(width / W, height / H)
      const ox = (width - W * scale) / 2 - X0 * scale
      const oy = (height - H * scale) / 2 - Y0 * scale
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr)
      rendererFor(scale * dpr).draw(ctx, items)
    }

    // Only draw once near the viewport, so a long shelf stays cheap.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true
          paint()
        }
      },
      { rootMargin: '200px' },
    )
    const ro = new ResizeObserver(paint)
    io.observe(canvas)
    ro.observe(canvas)
    return () => {
      io.disconnect()
      ro.disconnect()
    }
  })
</script>

<canvas
  bind:this={canvas}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
