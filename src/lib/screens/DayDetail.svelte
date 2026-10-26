<script lang="ts">
  import Dexie from 'dexie'
  import { db, type CubeRecord } from '../db'
  import GlassSnapshot from '../glass/GlassSnapshot.svelte'
  import MiniCube from '../MiniCube.svelte'
  import { SIZE_LABELS, type BlockSize } from '../model'
  import { dayGroups, glassCount, longDay } from '../stats'

  let { dayKey, onBack }: { dayKey: string; onBack: () => void } = $props()

  const ICON_SIZE: Record<BlockSize, number> = { s: 11, m: 15, l: 20 }

  let cubes = $state.raw<CubeRecord[]>([])
  let selected = $state(0)

  $effect(() => {
    db.cubes
      .where('[dayKey+droppedAt]')
      .between([dayKey, Dexie.minKey], [dayKey, Dexie.maxKey])
      .toArray()
      .then((c) => (cubes = c))
  })

  const glasses = $derived(glassCount(cubes))
  const groups = $derived(dayGroups(cubes))
  const shown = $derived(cubes.filter((c) => c.glassIndex === selected))
  const summary = $derived(
    `${glasses} ${glasses === 1 ? 'glass' : 'glasses'} · ${cubes.length} ${cubes.length === 1 ? 'block' : 'blocks'}`,
  )
</script>

<div class="screen">
  <div class="screen-inner">
    <header>
      <button type="button" class="back" aria-label="Back to shelf" onclick={onBack}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div>
        <h1>{longDay(dayKey)}</h1>
        {#if cubes.length}<p>{summary}</p>{/if}
      </div>
    </header>

    {#if glasses > 1}
      <div class="tabs" role="tablist" aria-label="Glasses">
        {#each Array.from({ length: glasses }, (_, i) => i) as i (i)}
          <button type="button" role="tab" aria-selected={selected === i} onclick={() => (selected = i)}>
            Glass {i + 1}
          </button>
        {/each}
      </div>
    {/if}

    <div class="glass">
      <GlassSnapshot
        cubes={shown}
        label={`Glass ${selected + 1}${selected < glasses - 1 ? ', full' : ''}, ${shown.length} cubes`}
      />
    </div>

    {#if groups.length}
      <section class="card list" aria-label="What I did">
        <ul>
          {#each groups as group, i (i)}
            <li>
              <span class="icon"><MiniCube color={group.color} size={ICON_SIZE[group.size]} rotate={-12} /></span>
              <span class="text">
                <span class="name">{group.name}</span>
                <span class="size">{SIZE_LABELS[group.size]}</span>
              </span>
              <span class="count">×{group.count}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>

<style>
  .screen-inner {
    gap: 18px;
  }

  header {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  h1 {
    margin: 0 0 2px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  header p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .tabs {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 4px;
    padding: 4px;
    border-radius: 16px;
    background: var(--fill);
  }

  .tabs button {
    height: 40px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .tabs button[aria-selected='true'] {
    background: var(--primary);
    color: var(--on-primary);
  }

  .glass {
    align-self: center;
    width: 164px;
    height: 286px;
    padding-top: 6px;
  }

  .list {
    padding: 6px 16px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 46px;
    padding: 6px 0;
  }

  li + li {
    border-top: 1px solid var(--hairline);
  }

  .icon {
    flex: 0 0 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .text {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .name {
    font-size: 15px;
    font-weight: 600;
  }

  .size {
    font-size: 12px;
    color: var(--text-muted);
  }

  .count {
    font-size: 15px;
    font-weight: 700;
    color: var(--icon);
  }
</style>
