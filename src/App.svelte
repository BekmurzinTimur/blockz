<script lang="ts">
  import BlockBar from './lib/BlockBar.svelte'
  import BlockSheet from './lib/BlockSheet.svelte'
  import { chime, clink, haptic, unlockAudio } from './lib/feedback'
  import GlassView from './lib/glass/GlassView.svelte'
  import type { Block } from './lib/model'
  import DayDetail from './lib/screens/DayDetail.svelte'
  import Settings from './lib/screens/Settings.svelte'
  import Shelf from './lib/screens/Shelf.svelte'
  import { longDay } from './lib/stats'
  import { store } from './lib/store.svelte'
  import UndoPill from './lib/UndoPill.svelte'
  import { fly } from 'svelte/transition'

  /** Screens stack over Today, which stays mounted so the glass and falling cubes are never lost. */
  type View = { name: 'today' } | { name: 'shelf' } | { name: 'day'; dayKey: string } | { name: 'settings' }

  const UNDO_VISIBLE_MS = 5000
  const STATUS_VISIBLE_MS = 3200
  /** Matches the glass swap in GlassView: the panel dims until the fresh glass is in place. */
  const SWAP_MS = 1300
  const DAY_CHECK_MS = 60_000

  let glass = $state<GlassView>()
  /** The open block sheet: `{}` creates a block, `{ block }` edits one. */
  let sheet = $state<{ block?: Block } | null>(null)
  let arranging = $state(false)
  let undoVisible = $state(false)
  let undoTimer = 0
  let status = $state<string>()
  let statusTimer = 0
  let swapping = $state(false)

  const lastCube = $derived(store.currentCubes.at(-1))
  const today = $derived(store.dayKey ? longDay(store.dayKey) : '')
  const activeColors = $derived([...new Set(store.blocks.map((b) => b.color))])

  let view = $state<View>({ name: 'today' })

  store.load()

  // Mirror screens in browser history so the back button and back gesture work.
  history.replaceState({ name: 'today' } satisfies View, '')

  function navigate(next: View) {
    history.pushState(next, '')
    view = next
  }

  $effect(() => {
    const onPop = (e: PopStateEvent) => (view = (e.state as View | null) ?? { name: 'today' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  })

  $effect(() => {
    // A new day can begin while the app is open or sitting in the background.
    const timer = setInterval(checkDay, DAY_CHECK_MS)
    const onVisibility = () => document.visibilityState === 'visible' && checkDay()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })

  function checkDay() {
    if (!store.loaded || !store.checkDay()) return
    glass?.reset()
    undoVisible = false
    showStatus('Fresh glass')
  }

  /** A new day start can move "today" onto a day that already has cubes, so reload it. */
  async function dayStartChanged() {
    if (!store.checkDay()) return
    await store.loadDay()
    glass?.restore(store.currentCubes)
    undoVisible = false
  }

  function showStatus(message: string) {
    clearTimeout(statusTimer)
    status = message
    statusTimer = window.setTimeout(() => (status = undefined), STATUS_VISIBLE_MS)
  }

  function glassFull(carryIds: string[]) {
    store.sealGlass(carryIds)
    clearTimeout(undoTimer)
    undoVisible = false
    showStatus('Glass full. Saved to your shelf.')
    chime()
    haptic()
    swapping = true
    setTimeout(() => (swapping = false), SWAP_MS)
  }

  function showUndo() {
    clearTimeout(undoTimer)
    undoVisible = true
    undoTimer = window.setTimeout(() => (undoVisible = false), UNDO_VISIBLE_MS)
  }

  function mine(block: Block) {
    unlockAudio()
    checkDay()
    glass?.drop(store.mineCube(block))
    showUndo()
  }

  function undo() {
    const id = store.undoLast()
    if (id) glass?.remove(id)
    if (store.currentCubes.length) showUndo()
    else undoVisible = false
  }
</script>

<main>
  <header>
    <div class="title">
      <h1>Today</h1>
      <div class="date-row">
        <p>{today}</p>
        {#if store.glassesToday > 1}
          <span class="chip">{store.glassesToday} glasses today</span>
        {/if}
      </div>
    </div>
    <nav>
      <button type="button" aria-label="Shelf" onclick={() => navigate({ name: 'shelf' })}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18" /><path d="M3 11h18" /><path d="M6 11V5h3v6" /><path d="M12 11V7h3v4" /><path d="M6 20v-5h3v5" /><path d="M13 20v-6h3v6" /></svg>
      </button>
      <button type="button" aria-label="Settings" onclick={() => navigate({ name: 'settings' })}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h4" /><path d="M12 17h8" /><circle cx="10" cy="17" r="2" /></svg>
      </button>
    </nav>
  </header>

  {#if store.loaded}
    <section class="glass">
      <GlassView
        bind:this={glass}
        initialCubes={store.currentCubes}
        onSettled={(id, pose) => store.savePose(id, pose)}
        onFull={glassFull}
        onLand={(speed) => {
          clink(speed)
          haptic()
        }}
        onCollide={(speed) => clink(speed, true)}
      >
        {#if !store.blocks.length && !store.todayCubes.length}
          <div class="empty-glass">
            <p class="lead">An empty glass.</p>
            <p>Every small good thing you do becomes an ice cube.</p>
          </div>
        {/if}
      </GlassView>
    </section>
    <UndoPill visible={undoVisible} label={lastCube?.name} message={status} onUndo={undo} />
    <div class="blocks" class:dimmed={swapping}>
      <BlockBar
        blocks={store.blocks}
        {arranging}
        highlightId={undoVisible ? lastCube?.blockId : undefined}
        onTap={mine}
        onEdit={(block) => (sheet = { block })}
        onCreate={() => (sheet = {})}
        onReorder={(ids) => store.reorderBlocks(ids)}
        onDoneArranging={() => (arranging = false)}
      />
    </div>
  {/if}
</main>

{#if store.loaded && (view.name === 'shelf' || view.name === 'day')}
  <div class="layer" transition:fly={{ x: 48, duration: 220 }}>
    <Shelf
      todayKey={store.dayKey}
      {activeColors}
      onBack={() => history.back()}
      onOpenDay={(dayKey) => navigate({ name: 'day', dayKey })}
    />
  </div>
{/if}

{#if view.name === 'day'}
  <div class="layer" transition:fly={{ x: 48, duration: 220 }}>
    <DayDetail dayKey={view.dayKey} onBack={() => history.back()} />
  </div>
{/if}

{#if view.name === 'settings'}
  <div class="layer" transition:fly={{ x: 48, duration: 220 }}>
    <Settings onBack={() => history.back()} onDayStartChanged={dayStartChanged} />
  </div>
{/if}

{#if sheet}
  <BlockSheet
    block={sheet.block}
    onClose={() => (sheet = null)}
    onRearrange={() => {
      sheet = null
      arranging = true
    }}
  />
{/if}

<style>
  main {
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    /* minmax(0, …) stops the sideways-scrolling chip row from widening the whole layout. */
    grid-template-columns: minmax(0, 1fr);
    height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
  }

  header {
    grid-row: 1;
    grid-column: 1;
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: calc(env(safe-area-inset-top) + 28px) 20px 0 24px;
  }

  .title {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .date-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .date-row p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .chip {
    padding: 3px 9px;
    border-radius: 10px;
    background: var(--primary-soft);
    color: var(--on-primary-soft);
    font-size: 12px;
    font-weight: 700;
  }

  .blocks {
    transition: opacity 300ms ease;
  }

  .blocks.dimmed {
    opacity: 0.5;
  }

  nav {
    display: flex;
    gap: 4px;
  }

  nav button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 14px;
    background: none;
    color: var(--icon);
    cursor: pointer;
  }

  .layer {
    position: fixed;
    inset: 0;
    z-index: 5;
  }

  nav button:disabled {
    cursor: default;
    opacity: 0.35;
  }

  /* The glass spans the header row too, so cubes fall in from the very top of the screen. */
  .glass {
    grid-row: 1 / 3;
    grid-column: 1;
    min-height: 0;
  }

  .empty-glass {
    position: absolute;
    top: 31%;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0 28px;
    text-align: center;
  }

  .empty-glass p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .empty-glass .lead {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
  }
</style>
