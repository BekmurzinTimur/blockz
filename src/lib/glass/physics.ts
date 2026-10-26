import Matter from 'matter-js'
import type { BlockColor, BlockSize } from '../model'
import { GLASS, cubeSide, innerOutline, type Point } from './geometry'

const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter

const STEP_MS = 1000 / 60
const MAX_STEPS_PER_FRAME = 5
/** Minimum gap between spawns so rapid taps never create overlapping bodies. */
const SPAWN_GAP_MS = 90
const WALL_THICKNESS = 80

export interface CubeSpec {
  id: string
  color: BlockColor
  size: BlockSize
}

export interface Pose {
  x: number
  y: number
  angle: number
}

export interface Cube extends CubeSpec {
  body: Matter.Body
  side: number
}

export type CollisionKind = 'glass' | 'cube'

export interface GlassWorldEvents {
  /** Speed is the relative impact speed in world units per step. */
  onCollide?: (speed: number, kind: CollisionKind) => void
  /** Fired when a cube comes to rest; the pose is what should be persisted. */
  onSettled?: (id: string, pose: Pose) => void
}

export class GlassWorld {
  readonly cubes = new Map<string, Cube>()
  /** World y where new cubes appear; the view keeps this at the top edge of the screen. */
  spawnTop = 0

  private engine = Engine.create({
    enableSleeping: true,
    positionIterations: 10,
    velocityIterations: 8,
    gravity: { x: 0, y: 1.4, scale: 0.001 },
  })
  private queue: CubeSpec[] = []
  private accumulator = 0
  private simTime = 0
  private lastSpawnAt = -Infinity

  constructor(private events: GlassWorldEvents = {}) {
    Composite.add(this.engine.world, createWalls())
    Events.on(this.engine, 'collisionStart', (e) => this.handleCollisions(e.pairs))
  }

  /** Queue a cube; it spawns as soon as the previous one has cleared the spawn point. */
  dropCube(spec: CubeSpec) {
    this.queue.push(spec)
  }

  removeCube(id: string) {
    this.queue = this.queue.filter((c) => c.id !== id)
    const cube = this.cubes.get(id)
    if (!cube) return
    Composite.remove(this.engine.world, cube.body)
    this.cubes.delete(id)
    // Cubes resting on the removed one must notice it's gone.
    for (const other of this.cubes.values()) Sleeping.set(other.body, false)
  }

  /** Advance by real elapsed time using a fixed physics step. */
  step(dtMs: number) {
    this.accumulator = Math.min(this.accumulator + dtMs, STEP_MS * MAX_STEPS_PER_FRAME)
    while (this.accumulator >= STEP_MS) {
      this.spawnNext()
      Engine.update(this.engine, STEP_MS)
      this.simTime += STEP_MS
      this.accumulator -= STEP_MS
    }
  }

  private spawnNext() {
    if (!this.queue.length || this.simTime - this.lastSpawnAt < SPAWN_GAP_MS) return
    const spec = this.queue.shift()!
    const side = cubeSide(spec.size)
    const spread = (GLASS.rimHalf * 2 - side) * 0.5
    const body = Bodies.rectangle(
      GLASS.cx + (Math.random() - 0.5) * spread,
      this.spawnTop - side * 0.75,
      side,
      side,
      {
        chamfer: { radius: side * 0.16 },
        angle: (Math.random() - 0.5) * 0.6,
        restitution: 0.15,
        friction: 0.5,
        frictionStatic: 0.9,
        frictionAir: 0.012,
      },
    )
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08)
    Events.on(body, 'sleepStart', () => {
      this.events.onSettled?.(spec.id, { x: body.position.x, y: body.position.y, angle: body.angle })
    })
    this.cubes.set(spec.id, { ...spec, body, side })
    Composite.add(this.engine.world, body)
    this.lastSpawnAt = this.simTime
  }

  private handleCollisions(pairs: Matter.Pair[]) {
    if (!this.events.onCollide) return
    for (const { bodyA, bodyB } of pairs) {
      const speed = Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y)
      this.events.onCollide(speed, bodyA.isStatic || bodyB.isStatic ? 'glass' : 'cube')
    }
  }
}

/** Thick static walls whose inner faces sit exactly on the glass outline. */
function createWalls(): Matter.Body[] {
  const [rimL, floorL, floorR, rimR] = innerOutline()
  const half = WALL_THICKNESS / 2
  const tallAbove = 4000
  return [
    slantedWall(rimL, floorL),
    slantedWall(rimR, floorR),
    // Invisible extensions above the rim so a cube can never bounce out.
    Bodies.rectangle(rimL.x - half, GLASS.rimY - tallAbove / 2, WALL_THICKNESS, tallAbove, { isStatic: true }),
    Bodies.rectangle(rimR.x + half, GLASS.rimY - tallAbove / 2, WALL_THICKNESS, tallAbove, { isStatic: true }),
    Bodies.rectangle(GLASS.cx, GLASS.floorY + half, (GLASS.floorHalf + WALL_THICKNESS) * 2, WALL_THICKNESS, {
      isStatic: true,
    }),
  ]
}

function slantedWall(a: Point, b: Point): Matter.Body {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  let nx = -dy / len
  let ny = dx / len
  // Point the normal away from the glass centre so the body sits outside the line.
  if (Math.sign(nx) !== Math.sign(a.x - GLASS.cx)) {
    nx = -nx
    ny = -ny
  }
  const half = WALL_THICKNESS / 2
  return Bodies.rectangle(
    (a.x + b.x) / 2 + nx * half,
    (a.y + b.y) / 2 + ny * half,
    len + WALL_THICKNESS,
    WALL_THICKNESS,
    { isStatic: true, angle: Math.atan2(dy, dx) },
  )
}
