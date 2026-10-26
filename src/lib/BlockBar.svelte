<script lang="ts">
  import MiniCube from './MiniCube.svelte'
  import { TINTS, type Block, type BlockSize } from './model'

  let {
    blocks,
    arranging,
    highlightId,
    onTap,
    onEdit,
    onCreate,
    onReorder,
    onDoneArranging,
  }: {
    blocks: Block[]
    /** In arrange mode blocks are dragged to reorder and taps drop nothing. */
    arranging: boolean
    /** A block to light up, e.g. the one just tapped while Undo is offered. */
    highlightId?: string
    onTap: (block: Block) => void
    onEdit: (block: Block) => void
    onCreate: () => void
    onReorder: (ids: string[]) => void
    onDoneArranging: () => void
  } = $props()

  const LONG_PRESS_MS = 500
  const MOVE_TOLERANCE_PX = 8
  const ICON_SIZE: Record<BlockSize, number> = { s: 10, m: 14, l: 19 }

  /** Restarts the glow animation on every tap, including repeated taps on the same block. */
  let pulses = $state<Record<string, number>>({})
  let dragging = $state<string | null>(null)
  /** The dice's suggestion. Only a highlight: nothing is logged until a block is tapped. */
  let picked = $state<string | null>(null)

  let grid = $state<HTMLDivElement>()
  let press: { id: string; x: number; y: number; timer: number } | null = null
  /** Set when a long-press fired, so the click that follows the release is ignored. */
  let suppressClick = false

  function roll() {
    const choices = blocks.filter((b) => b.id !== picked)
    if (!choices.length) return
    picked = choices[Math.floor(Math.random() * choices.length)].id
    grid
      ?.querySelector<HTMLElement>(`[data-id="${picked}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }

  function onPointerDown(event: PointerEvent, block: Block) {
    // A new gesture: a long-press that ended without a click must not swallow this one.
    suppressClick = false
    if (arranging) {
      dragging = block.id
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      return
    }
    cancelPress()
    press = {
      id: block.id,
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(() => openEditor(block), LONG_PRESS_MS),
    }
  }

  /** Long-press, touch context menu or desktop right-click: whichever comes first opens the editor. */
  function openEditor(block: Block) {
    if (arranging || suppressClick) return
    cancelPress()
    suppressClick = true
    onEdit(block)
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging) {
      reorderUnder(event.clientX, event.clientY)
    } else if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > MOVE_TOLERANCE_PX) {
      cancelPress()
    }
  }

  function onPointerEnd() {
    cancelPress()
    dragging = null
  }

  function cancelPress() {
    if (press) clearTimeout(press.timer)
    press = null
  }

  /** Moves the dragged block into the slot of whichever block is under the pointer. */
  function reorderUnder(x: number, y: number) {
    const target = [...(grid?.querySelectorAll<HTMLElement>('[data-id]') ?? [])].find((el) => {
      const r = el.getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    })
    const targetId = target?.dataset.id
    if (!targetId || targetId === dragging) return
    const ids = blocks.map((b) => b.id).filter((id) => id !== dragging)
    ids.splice(
      blocks.findIndex((b) => b.id === targetId),
      0,
      dragging!,
    )
    onReorder(ids)
  }

  function onClick(block: Block) {
    if (suppressClick) {
      suppressClick = false
      return
    }
    if (arranging) return
    picked = null
    pulses[block.id] = (pulses[block.id] ?? 0) + 1
    onTap(block)
  }
</script>

<section class="panel">
  {#if !blocks.length}
    <div class="intro">
      <h2>Create your first block</h2>
      <p>Something tiny. Two push-ups is plenty.</p>
    </div>
    <button type="button" class="primary" onclick={onCreate}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
      New block
    </button>
  {:else}
    <div class="head">
      <h2 class="label">Your blocks</h2>
      <div class="actions">
        {#if arranging}
          <button type="button" class="done" onclick={onDoneArranging}>Done</button>
        {:else}
          <button type="button" class="icon outline" aria-label="Pick one for me" onclick={roll}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>
          </button>
          <button type="button" class="icon solid" aria-label="New block" onclick={onCreate}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          </button>
        {/if}
      </div>
    </div>

    <div class="grid" class:arranging bind:this={grid}>
      {#each blocks as block, i (block.id)}
        <button
          type="button"
          class="chip"
          class:hot={block.id === (picked ?? highlightId)}
          class:picked={block.id === picked}
          class:dragging={dragging === block.id}
          data-id={block.id}
          style:--tint={TINTS[block.color]}
          style:--wiggle-delay="{(i % 4) * -90}ms"
          onpointerdown={(e) => onPointerDown(e, block)}
          onpointermove={onPointerMove}
          onpointerup={onPointerEnd}
          onpointercancel={onPointerEnd}
          onpointerleave={() => !dragging && cancelPress()}
          oncontextmenu={(e) => {
            e.preventDefault()
            openEditor(block)
          }}
          onclick={() => onClick(block)}
        >
          {#key pulses[block.id]}
            <span class="glow" class:active={pulses[block.id]}></span>
          {/key}
          <span class="icon-slot"><MiniCube color={block.color} size={ICON_SIZE[block.size]} rotate={-12} /></span>
          <span class="name">{block.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 20px calc(env(safe-area-inset-bottom) + 24px);
    border-radius: 28px 28px 0 0;
    border-top: 1px solid var(--hairline);
    background: var(--panel);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  button {
    font: inherit;
    cursor: pointer;
    -webkit-touch-callout: none;
  }

  /* First launch */

  .intro {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 8px;
  }

  h2 {
    margin: 0;
  }

  .intro h2 {
    font-size: 17px;
    font-weight: 700;
  }

  .intro p {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 54px;
    margin-top: 4px;
    border: 0;
    border-radius: 18px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 16px;
    font-weight: 700;
  }

  /* Header row */

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }

  .outline {
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--icon);
  }

  .outline:active {
    background: var(--fill-strong);
  }

  .solid {
    border: 0;
    background: var(--primary);
    color: var(--on-primary);
  }

  .done {
    height: 44px;
    padding: 0 18px;
    border: 0;
    border-radius: 14px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 14px;
    font-weight: 700;
  }

  /* Chips: two rows that scroll sideways */

  .grid {
    display: grid;
    grid-template-rows: repeat(2, 52px);
    grid-auto-flow: column;
    grid-auto-columns: 168px;
    gap: 10px;
    margin: 0 -20px;
    padding: 2px 20px;
    overflow-x: auto;
    scroll-padding: 0 20px;
    scrollbar-width: none;
  }

  .grid::-webkit-scrollbar {
    display: none;
  }

  .chip {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 14px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    text-align: left;
    overflow: hidden;
    transition:
      transform 120ms ease,
      background 200ms ease,
      border-color 200ms ease,
      box-shadow 200ms ease;
  }

  .chip:active {
    transform: scale(0.96);
  }

  .chip.hot {
    border: 1.5px solid color-mix(in srgb, var(--tint) 85%, #000);
    background: color-mix(in srgb, var(--tint) 22%, var(--surface));
    box-shadow: 0 4px 16px color-mix(in srgb, var(--tint) 28%, transparent);
  }

  .chip.picked {
    animation: suggest 1.6s ease-in-out infinite;
  }

  @keyframes suggest {
    50% {
      box-shadow: 0 4px 24px color-mix(in srgb, var(--tint) 55%, transparent);
    }
  }

  .icon-slot {
    flex: 0 0 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .name {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .glow {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
  }

  .glow.active {
    animation: glow 500ms ease-out;
  }

  @keyframes glow {
    from {
      opacity: 1;
      box-shadow: inset 0 0 18px color-mix(in srgb, var(--tint) 60%, transparent);
    }
    to {
      opacity: 0;
    }
  }

  /* Arrange mode */

  .arranging .chip {
    touch-action: none;
    cursor: grab;
    animation: wiggle 260ms ease-in-out infinite alternate;
    animation-delay: var(--wiggle-delay);
  }

  .arranging .chip.dragging {
    cursor: grabbing;
    animation: none;
    transform: scale(1.05);
    border-color: color-mix(in srgb, var(--tint) 85%, #000);
    box-shadow: 0 8px 22px var(--shadow);
  }

  @keyframes wiggle {
    from {
      transform: rotate(-1deg);
    }
    to {
      transform: rotate(1deg);
    }
  }
</style>
