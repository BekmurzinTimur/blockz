<script lang="ts">
  let {
    visible,
    label,
    message,
    onUndo,
  }: {
    visible: boolean
    label?: string
    /** A short status (e.g. "Glass full. Saved to your shelf.") shown instead of Undo. */
    message?: string
    onUndo: () => void
  } = $props()
</script>

<div class="slot">
  {#if message}
    {#key message}
      <p class="pill status" role="status">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        {message}
      </p>
    {/key}
  {:else if visible}
    <div class="pill">
      {#if label}<span class="label">{label}</span>{/if}
      <button type="button" onclick={onUndo}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
        Undo
      </button>
    </div>
  {/if}
</div>

<style>
  /* Reserves the pill's height so the blocks below never jump. */
  .slot {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 52px;
    padding: 0 16px;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    height: 40px;
    padding: 0 4px 0 16px;
    border-radius: 20px;
    border: 1px solid var(--hairline);
    background: var(--surface);
    box-shadow: 0 4px 16px var(--shadow);
    font-size: 13px;
    color: var(--icon);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    animation: appear 200ms ease-out;
  }

  .status svg {
    color: var(--primary);
  }

  .status {
    gap: 8px;
    margin: 0;
    padding: 0 18px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  button {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-radius: 16px;
    background: var(--primary);
    color: var(--on-primary);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  button:active {
    background: color-mix(in srgb, var(--primary) 85%, #000);
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }
</style>
