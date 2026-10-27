<script lang="ts">
  import { untrack, type Snippet } from 'svelte'
  import type { CubeRecord } from '../db'
  import { GLASS, WORLD_HEIGHT, WORLD_WIDTH } from './geometry'
  import { GlassWorld, type CollisionKind, type FullSplit, type Pose } from './physics'
  import { GlassRenderer, cubeDraw, type CubeDraw } from './render'

  let {
    initialCubes,
    onSettled,
    onFull,
    onLand,
    onCollide,
    children,
  }: {
    /** The current glass's cubes to restore on mount, oldest first. */
    initialCubes: CubeRecord[]
    onSettled: (id: string, pose: Pose) => void
    /** The glass filled up; `carryIds` are the cubes that move on to the next glass. */
    onFull: (carryIds: string[]) => void
    onLand: (speed: number) => void
    onCollide: (speed: number, kind: CollisionKind) => void
    /** Content laid over the inside of the glass, e.g. the empty-glass message. */
    children?: Snippet
  } = $props()

  const FADE_MS = 350
  const REFILL_GAP_MS = 250
  // Full-glass swap timeline (ms): celebrate, then the full glass leaves and a fresh one arrives.
  const GLOW_IN = 250
  const GLOW_OUT_AT = 900
  const SWEEP_MS = 700
  const LEAVE_AT = 450
  const LEAVE_MS = 800
  const ARRIVE_AT = 650
  const ARRIVE_MS = 650
  const TILT = (-3 * Math.PI) / 180

  /** How often to look for a full glass; it runs after a physics step, never inside one. */
  const FULL_CHECK_MS = 200

  let canvas: HTMLCanvasElement
  let lastFullCheck = 0
  const world = new GlassWorld({
    onSettled: (id, pose) => onSettled(id, pose),
    onLand: (_, speed) => onLand(speed),
    onCollide: (speed, kind) => onCollide(speed, kind),
  })
  const renderer = new GlassRenderer()
  let fading: { cube: CubeDraw; startedAt: number }[] = []
  /** The full glass on its way to the shelf, with the cubes it holds (frozen poses). */
  let swap: { cubes: CubeDraw[]; startedAt: number } | null = null
  /** The glass's inner area in CSS pixels, for positioning `children`. */
  let glassBox = $state({ left: 0, top: 0, width: 0, height: 0 })

  export function drop(cube: CubeRecord) {
    world.dropCube(cube)
  }

  /** Empties the glass instantly, e.g. when a new day begins. */
  export function reset() {
    world.clear()
    world.holdSpawns = false
    swap = null
    fading = []
  }

  /** Replaces the glass's contents with stored cubes, which fall in again. */
  export function restore(cubes: CubeRecord[]) {
    reset()
    place(cubes)
  }

  /** On reopening, the glass refills itself: every cube falls again, oldest first, one after another. */
  function place(cubes: CubeRecord[]) {
    for (const cube of cubes) world.dropCube(cube, REFILL_GAP_MS)
  }

  function startSwap(split: FullSplit, now: number) {
    world.clear()
    world.holdSpawns = true
    swap = { cubes: split.stay.map(cubeDraw), startedAt: now }
    for (const cube of split.carry) world.dropCube(cube)
    onFull(split.carry.map((c) => c.id))
  }

  /** Takes a cube out of the glass; it floats up and fades away. */
  export function remove(id: string) {
    const cube = world.removeCube(id)
    if (cube) fading.push({ cube: cubeDraw(cube), startedAt: performance.now() })
  }

  $effect(() => {
    // Restore once on mount; later cubes arrive through drop().
    place(untrack(() => initialCubes))

    const ctx = canvas.getContext('2d')!
    // World-to-CSS-pixel transform, recomputed whenever the canvas resizes.
    let scale = 1
    let offsetX = 0
    let offsetY = 0
    let dpr = 1

    const fit = () => {
      const { width, height } = canvas.getBoundingClientRect()
      dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT)
      offsetX = (width - WORLD_WIDTH * scale) / 2
      // Sit the glass low, near the blocks, leaving the extra room above for falling.
      offsetY = height - WORLD_HEIGHT * scale
      // Cubes spawn just above the top edge of the screen, wherever that is in world space.
      world.spawnTop = -offsetY / scale
      renderer.setPixelScale(scale * dpr)
      glassBox = {
        left: offsetX + (GLASS.cx - GLASS.half) * scale,
        top: offsetY + GLASS.rimY * scale,
        width: GLASS.half * 2 * scale,
        height: (GLASS.floorY - GLASS.rimY) * scale,
      }
    }

    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    fit()

    let frame = 0
    let last = 0
    const tick = (now: number) => {
      world.step(last ? now - last : 0)
      last = now
      if (!swap && now - lastFullCheck > FULL_CHECK_MS) {
        lastFullCheck = now
        const split = world.checkFull()
        if (split) startSwap(split, now)
      }
      fading = fading.filter((f) => now - f.startedAt < FADE_MS)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offsetX * dpr, offsetY * dpr)

      let arriveDx = 0
      if (swap) {
        const t = now - swap.startedAt
        // How far, in world units, a glass must travel to be fully off-screen on either side.
        const leftEdge = -offsetX / scale
        const rightEdge = canvas.width / dpr / scale - offsetX / scale
        const leave = easeInOut(clamp((t - LEAVE_AT) / LEAVE_MS))
        const tilt = clamp((t - LEAVE_AT) / 300)
        ctx.save()
        ctx.translate(GLASS.cx + leave * (leftEdge - (GLASS.cx + GLASS.half) - 40), GLASS.floorY)
        ctx.rotate(TILT * tilt)
        ctx.scale(1 - 0.06 * tilt, 1 - 0.06 * tilt)
        ctx.translate(-GLASS.cx, -GLASS.floorY)
        renderer.draw(ctx, swap.cubes, [], {
          glow: clamp(t / GLOW_IN) * (1 - clamp((t - GLOW_OUT_AT) / 400)),
          sweep: clamp(t / SWEEP_MS),
        })
        ctx.restore()
        arriveDx = (1 - easeOut(clamp((t - ARRIVE_AT) / ARRIVE_MS))) * (rightEdge - (GLASS.cx - GLASS.half) + 40)
        if (t >= ARRIVE_AT + ARRIVE_MS) {
          swap = null
          world.holdSpawns = false
        }
      }

      ctx.save()
      ctx.translate(arriveDx, 0)
      renderer.draw(
        ctx,
        [...world.cubes.values()].map(cubeDraw),
        fading.map((f) => ({ cube: f.cube, progress: (now - f.startedAt) / FADE_MS })),
      )
      ctx.restore()
      frame = requestAnimationFrame(tick)
    }

    const onVisibility = () => {
      cancelAnimationFrame(frame)
      if (document.visibilityState === 'visible') {
        last = 0
        frame = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })

  function clamp(x: number) {
    return Math.min(1, Math.max(0, x))
  }

  function easeInOut(x: number) {
    return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
  }

  function easeOut(x: number) {
    return 1 - (1 - x) ** 3
  }
</script>

<div class="view">
  <canvas bind:this={canvas}></canvas>
  {#if children}
    <div
      class="overlay"
      style:left="{glassBox.left}px"
      style:top="{glassBox.top}px"
      style:width="{glassBox.width}px"
      style:height="{glassBox.height}px"
    >
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .view {
    position: relative;
    width: 100%;
    height: 100%;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .overlay {
    position: absolute;
    pointer-events: none;
  }
</style>
