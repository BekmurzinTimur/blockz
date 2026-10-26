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
  /** Whether the cube has touched anything since it was dropped. */
  landed: boolean
  /** Consecutive physics steps the cube has been nearly still. */
  stillSteps: number
}

/** How a full glass splits: what stays in it, and what moves on to the next glass. */
export interface FullSplit {
  stay: Cube[]
  carry: CubeSpec[]
}

export type CollisionKind = 'glass' | 'cube'

export interface GlassWorldEvents {
  /** Speed is the relative impact speed in world units per step. */
  onCollide?: (speed: number, kind: CollisionKind) => void
  /** Fired once per dropped cube, on its first contact. */
  onLand?: (id: string, speed: number) => void
  /** Fired when a cube comes to rest; the pose is what should be persisted. */
  onSettled?: (id: string, pose: Pose) => void
}

/** A resting cube whose top is this close to the rim makes the glass full. */
const FULL_MARGIN = 4
/**
 * A cube counts as resting after this many still steps (~⅓ s). Waiting for Matter's
 * sleep isn't enough: steady tapping keeps waking the pile, so it might never sleep.
 */
const REST_STEPS = 20
const STILL_SPEED = 0.35

export class GlassWorld {
  readonly cubes = new Map<string, Cube>()
  /** World y where new cubes appear; the view keeps this at the top edge of the screen. */
  spawnTop = 0
  /** While set, queued cubes wait (e.g. while a fresh glass slides in). */
  holdSpawns = false

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
  private byBody = new Map<number, Cube>()

  constructor(private events: GlassWorldEvents = {}) {
    Composite.add(this.engine.world, createWalls())
    Events.on(this.engine, 'collisionStart', (e) => this.handleCollisions(e.pairs))
  }

  /** Queue a cube; it spawns as soon as the previous one has cleared the spawn point. */
  dropCube(spec: CubeSpec) {
    this.queue.push(spec)
  }

  /** Removes a cube and returns it (for a fade-out), or nothing if it hadn't spawned yet. */
  removeCube(id: string): Cube | undefined {
    this.queue = this.queue.filter((c) => c.id !== id)
    const cube = this.cubes.get(id)
    if (!cube) return
    this.detach(cube)
    // Cubes resting on the removed one must notice it's gone.
    for (const other of this.cubes.values()) Sleeping.set(other.body, false)
    return cube
  }

  /** Advance by real elapsed time using a fixed physics step. */
  step(dtMs: number) {
    this.accumulator = Math.min(this.accumulator + dtMs, STEP_MS * MAX_STEPS_PER_FRAME)
    while (this.accumulator >= STEP_MS) {
      this.spawnNext()
      Engine.update(this.engine, STEP_MS)
      for (const cube of this.cubes.values()) {
        cube.stillSteps = cube.body.speed < STILL_SPEED ? cube.stillSteps + 1 : 0
      }
      this.simTime += STEP_MS
      this.accumulator -= STEP_MS
    }
  }

  /** Put a cube straight into its saved resting pose, asleep, so it doesn't re-fall. */
  placeCube(spec: CubeSpec, pose: Pose) {
    const body = this.addCubeBody(spec, pose)
    this.cubes.get(spec.id)!.landed = true
    Sleeping.set(body, true)
  }

  /**
   * Whether the pile has reached the rim. If so, says which cubes stay in this
   * glass and which move on: anything still queued or in flight, and cubes
   * sticking out above the rim, so no tap is ever lost.
   */
  checkFull(): FullSplit | undefined {
    const resting = [...this.cubes.values()].filter(
      (c) => c.body.isSleeping || (c.landed && c.stillSteps >= REST_STEPS),
    )
    if (!resting.some((c) => c.body.bounds.min.y <= GLASS.rimY + FULL_MARGIN)) return
    const stay: Cube[] = []
    const carry: CubeSpec[] = []
    for (const cube of this.cubes.values()) {
      // A landed cube may still be jostling in the pile; it belongs to this glass.
      if (cube.landed && cube.body.position.y > GLASS.rimY) stay.push(cube)
      else carry.push(spec(cube))
    }
    return { stay, carry: [...carry, ...this.queue] }
  }

  /** Empties the glass and the queue, returning the cubes that were in it. */
  clear(): Cube[] {
    const removed = [...this.cubes.values()]
    for (const cube of removed) this.detach(cube)
    this.queue = []
    return removed
  }

  private detach(cube: Cube) {
    Composite.remove(this.engine.world, cube.body)
    this.cubes.delete(cube.id)
    this.byBody.delete(cube.body.id)
  }

  private spawnNext() {
    if (this.holdSpawns || !this.queue.length || this.simTime - this.lastSpawnAt < SPAWN_GAP_MS) return
    const spec = this.queue.shift()!
    const side = cubeSide(spec.size)
    const spread = (GLASS.half * 2 - side) * 0.5
    const body = this.addCubeBody(spec, {
      x: GLASS.cx + (Math.random() - 0.5) * spread,
      y: this.spawnTop - side * 0.75,
      angle: (Math.random() - 0.5) * 0.6,
    })
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08)
    this.lastSpawnAt = this.simTime
  }

  private addCubeBody(spec: CubeSpec, pose: Pose): Matter.Body {
    const side = cubeSide(spec.size)
    const body = Bodies.rectangle(pose.x, pose.y, side, side, {
      chamfer: { radius: side * 0.16 },
      angle: pose.angle,
      restitution: 0.15,
      friction: 0.5,
      frictionStatic: 0.9,
      frictionAir: 0.012,
    })
    Events.on(body, 'sleepStart', () => {
      this.events.onSettled?.(spec.id, { x: body.position.x, y: body.position.y, angle: body.angle })
    })
    const cube: Cube = { ...spec, body, side, landed: false, stillSteps: 0 }
    this.cubes.set(spec.id, cube)
    this.byBody.set(body.id, cube)
    Composite.add(this.engine.world, body)
    return body
  }

  private handleCollisions(pairs: Matter.Pair[]) {
    for (const { bodyA, bodyB } of pairs) {
      const speed = Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y)
      // Matter reports collisions on compound parts; resolve to the parent body.
      const landing = [bodyA.parent, bodyB.parent]
        .map((b) => this.byBody.get(b.id))
        .find((c) => c && !c.landed)
      if (landing) {
        landing.landed = true
        this.events.onLand?.(landing.id, speed)
      } else {
        this.events.onCollide?.(speed, bodyA.isStatic || bodyB.isStatic ? 'glass' : 'cube')
      }
    }
  }
}

function spec({ id, color, size }: CubeSpec): CubeSpec {
  return { id, color, size }
}

/** Thick static walls whose inner faces sit exactly on the glass outline. */
function createWalls(): Matter.Body[] {
  const outline = innerOutline()
  const rimL = outline[0]
  const rimR = outline[outline.length - 1]
  const half = WALL_THICKNESS / 2
  const tallAbove = 4000
  const walls = outline.slice(1).map((b, i) => edgeWall(outline[i], b))
  // Invisible extensions above the rim so a cube can never bounce out.
  walls.push(
    Bodies.rectangle(rimL.x - half, GLASS.rimY - tallAbove / 2, WALL_THICKNESS, tallAbove, { isStatic: true }),
    Bodies.rectangle(rimR.x + half, GLASS.rimY - tallAbove / 2, WALL_THICKNESS, tallAbove, { isStatic: true }),
  )
  return walls
}

/** A wall slab lying just outside the edge a→b. The outline is convex, so slabs never intrude. */
function edgeWall(a: Point, b: Point): Matter.Body {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  let nx = -dy / len
  let ny = dx / len
  // Point the normal away from the inside of the glass.
  if (nx * (mx - GLASS.cx) + ny * (my - (GLASS.rimY + GLASS.floorY) / 2) < 0) {
    nx = -nx
    ny = -ny
  }
  const half = WALL_THICKNESS / 2
  return Bodies.rectangle(mx + nx * half, my + ny * half, len + WALL_THICKNESS, WALL_THICKNESS, {
    isStatic: true,
    angle: Math.atan2(dy, dx),
  })
}
