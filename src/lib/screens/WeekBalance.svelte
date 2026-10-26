<script lang="ts">
  import type { CubeRecord } from '../db'
  import { TINTS, type BlockColor } from '../model'
  import { balanceSentence, colorBalance, weekRange } from '../stats'

  let {
    history,
    todayKey,
    firstDay,
    activeColors,
  }: {
    history: Map<string, CubeRecord[]>
    todayKey: string
    /** The earliest day with any cube; earlier weeks have nothing to show. */
    firstDay?: string
    activeColors: BlockColor[]
  } = $props()

  /** 0 is the 7 days ending today, 1 the 7 before that, and so on. */
  let offset = $state(0)
  let showCounts = $state(false)

  const week = $derived(weekRange(todayKey, offset))
  const balance = $derived(colorBalance(week.days.flatMap((d) => history.get(d) ?? [])))
  const sentence = $derived(balanceSentence(balance, activeColors))
  const title = $derived(offset === 0 ? 'This week' : offset === 1 ? 'Last week' : 'Earlier')
  const canGoBack = $derived(!!firstDay && week.days[0] > firstDay)
  const total = $derived(balance.reduce((sum, s) => sum + s.weight, 0))
</script>

<section class="card week" aria-label="Weekly color balance">
  <div class="head">
    <div>
      <h2>{title}</h2>
      <p class="range">{week.label}</p>
    </div>
    <div class="nav">
      <button type="button" aria-label="Previous week" disabled={!canGoBack} onclick={() => offset++}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button type="button" aria-label="Next week" disabled={offset === 0} onclick={() => offset--}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  </div>

  {#if balance.length}
    <button
      type="button"
      class="bar"
      aria-expanded={showCounts}
      aria-label={`${balance.map((s) => `${s.color} ${Math.round((s.weight / total) * 100)}%`).join(', ')}. Show counts`}
      onclick={() => (showCounts = !showCounts)}
    >
      {#each balance as share (share.color)}
        <span class="segment" style:flex-grow={share.weight} style:--tint={TINTS[share.color]}></span>
      {/each}
    </button>
    {#if showCounts}
      <ul class="legend">
        {#each balance as share (share.color)}
          <li style:--tint={TINTS[share.color]}>
            <span class="dot"></span>{share.color}
            <span class="count">{share.count}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <div class="bar empty" aria-hidden="true"></div>
  {/if}

  <p class="sentence">{sentence}</p>
</section>

<style>
  .week {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    margin: 0 0 2px;
    font-size: 15px;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .nav {
    display: flex;
    gap: 2px;
    margin-right: -8px;
  }

  .nav button {
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

  .nav button:disabled {
    color: var(--disabled);
    cursor: default;
  }

  .bar {
    display: flex;
    gap: 3px;
    height: 14px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .bar.empty {
    border-radius: 7px;
    background: var(--fill);
  }

  .segment {
    flex: 1 1 0;
    min-width: 6px;
    border-radius: 3px;
    background: var(--tint);
  }

  .segment:first-child {
    border-radius: 7px 3px 3px 7px;
  }

  .segment:last-child {
    border-radius: 3px 7px 7px 3px;
  }

  .segment:only-child {
    border-radius: 7px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    color: var(--text-muted);
    text-transform: capitalize;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 3px;
    background: var(--tint);
  }

  .count {
    font-weight: 700;
    color: var(--text);
  }

  .sentence {
    line-height: 1.5;
  }
</style>
