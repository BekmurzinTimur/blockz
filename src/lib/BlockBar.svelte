<script lang="ts">
  import { TINTS, type Block } from './model'

  let { blocks, onTap }: { blocks: Block[]; onTap: (block: Block) => void } = $props()

  /** Restarts the glow animation on every tap, including repeated taps on the same block. */
  let pulses = $state<Record<string, number>>({})

  function tap(block: Block) {
    pulses[block.id] = (pulses[block.id] ?? 0) + 1
    onTap(block)
  }
</script>

<div class="bar">
  {#each blocks as block (block.id)}
    <button type="button" style:--tint={TINTS[block.color]} onclick={() => tap(block)}>
      {#key pulses[block.id]}
        <span class="glow" class:active={pulses[block.id]}></span>
      {/key}
      <span class="cube size-{block.size}"></span>
      <span class="name">{block.name}</span>
    </button>
  {/each}
</div>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    max-height: 30dvh;
    overflow-y: auto;
    padding: 4px 16px;
  }

  button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: 1px solid color-mix(in srgb, var(--tint) 45%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--tint) 14%, rgb(255 255 255 / 0.03));
    color: var(--text);
    font: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    overflow: hidden;
    transition:
      transform 120ms ease,
      background 200ms ease;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }

  button:active {
    transform: scale(0.95);
    background: color-mix(in srgb, var(--tint) 26%, rgb(255 255 255 / 0.04));
  }

  @media (hover: hover) {
    button:hover {
      background: color-mix(in srgb, var(--tint) 20%, rgb(255 255 255 / 0.04));
    }
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
      box-shadow: inset 0 0 18px color-mix(in srgb, var(--tint) 70%, transparent);
    }
    to {
      opacity: 0;
    }
  }

  .cube {
    flex: none;
    border-radius: 3px;
    background: var(--tint);
    opacity: 0.85;
    box-shadow: 0 0 8px color-mix(in srgb, var(--tint) 50%, transparent);
  }
  .size-s {
    width: 8px;
    height: 8px;
  }
  .size-m {
    width: 11px;
    height: 11px;
  }
  .size-l {
    width: 14px;
    height: 14px;
  }

  .name {
    white-space: nowrap;
  }
</style>
