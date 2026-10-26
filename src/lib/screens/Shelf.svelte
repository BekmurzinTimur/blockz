<script lang="ts">
  import type { CubeRecord } from '../db'
  import GlassSnapshot from '../glass/GlassSnapshot.svelte'
  import type { BlockColor } from '../model'
  import { addDays, daysBackTo, glassCount, loadHistory, longDay, shortDay } from '../stats'
  import WeekBalance from './WeekBalance.svelte'

  let {
    todayKey,
    activeColors,
    onBack,
    onOpenDay,
  }: {
    todayKey: string
    activeColors: BlockColor[]
    onBack: () => void
    onOpenDay: (dayKey: string) => void
  } = $props()

  const PER_ROW = 4

  let history = $state.raw<Map<string, CubeRecord[]>>()

  $effect(() => {
    // Read fresh on every open, so glasses filled since last time are on the shelf.
    loadHistory().then((h) => (history = h))
  })

  const firstDay = $derived(history?.keys().next().value)
  const pastDays = $derived.by(() => {
    const yesterday = addDays(todayKey, -1)
    return firstDay && firstDay <= yesterday ? daysBackTo(yesterday, firstDay) : []
  })
  const rows = $derived(
    Array.from({ length: Math.ceil(pastDays.length / PER_ROW) }, (_, i) =>
      pastDays.slice(i * PER_ROW, (i + 1) * PER_ROW),
    ),
  )

  /** A day shows its first glass, the full one when there were several. */
  function shelfGlass(cubes: CubeRecord[]) {
    return cubes.filter((c) => c.glassIndex === 0)
  }

  function ariaFor(dayKey: string, cubes: CubeRecord[], glasses: number) {
    if (!cubes.length) return `${longDay(dayKey)}, empty glass`
    return `${longDay(dayKey)}, ${cubes.length} ${cubes.length === 1 ? 'cube' : 'cubes'}${glasses > 1 ? `, ${glasses} glasses` : ''}`
  }
</script>

<div class="screen">
  <div class="screen-inner">
    <header>
      <button type="button" class="back" aria-label="Back to today" onclick={onBack}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <h1>Shelf</h1>
    </header>

    {#if history}
      <WeekBalance {history} {todayKey} {firstDay} {activeColors} />

      {#if rows.length}
        <div class="shelves">
          {#each rows as row, r (r)}
            <div class="shelf">
              {#each row as dayKey (dayKey)}
                {@const cubes = history.get(dayKey) ?? []}
                {@const glasses = glassCount(cubes)}
                <button
                  type="button"
                  class="day"
                  class:empty={!cubes.length}
                  disabled={!cubes.length}
                  aria-label={ariaFor(dayKey, cubes, glasses)}
                  onclick={() => onOpenDay(dayKey)}
                >
                  <span class="glass">
                    <GlassSnapshot cubes={shelfGlass(cubes)} />
                    {#if glasses > 1}<span class="badge">×{glasses}</span>{/if}
                  </span>
                  <span class="label">{shortDay(dayKey)}</span>
                </button>
              {/each}
              <div class="plank" aria-hidden="true"></div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-note">Past days will stand here, one glass each.</p>
      {/if}
    {/if}
  </div>
</div>

<style>
  .screen-inner {
    gap: 22px;
  }

  header {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .shelves {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .shelf {
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding-top: 8px;
  }

  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .day:disabled {
    cursor: default;
  }

  .glass {
    position: relative;
    display: block;
    width: 60px;
    height: 104px;
    transition: transform 150ms ease;
  }

  .day:not(:disabled):active .glass {
    transform: scale(0.95);
  }

  .day.empty .glass {
    opacity: 0.45;
  }

  .badge {
    position: absolute;
    right: -12px;
    top: -10px;
    padding: 3px 7px;
    border-radius: 9px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 11px;
    font-weight: 800;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .plank {
    position: absolute;
    left: -6px;
    right: -6px;
    top: 112px;
    height: 6px;
    border-radius: 3px;
    background: #d8d1c1;
    box-shadow: 0 8px 16px rgb(60 50 40 / 0.12);
    pointer-events: none;
  }

  .empty-note {
    margin: 12px 0 0;
    text-align: center;
    font-size: 14px;
    color: var(--text-muted);
  }
</style>
