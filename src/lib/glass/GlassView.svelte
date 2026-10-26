<script lang="ts">
  import type { Block } from '../model'
  import { WORLD_HEIGHT, WORLD_WIDTH } from './geometry'
  import { GlassWorld } from './physics'
  import { GlassRenderer } from './render'

  let canvas: HTMLCanvasElement
  const world = new GlassWorld()
  const renderer = new GlassRenderer()

  let nextId = 0

  export function drop(block: Block) {
    world.dropCube({ id: `cube-${nextId++}`, color: block.color, size: block.size })
  }

  $effect(() => {
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
    }

    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    fit()

    let frame = 0
    let last = 0
    const tick = (now: number) => {
      world.step(last ? now - last : 0)
      last = now
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offsetX * dpr, offsetY * dpr)
      renderer.draw(ctx, world.cubes.values())
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
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
