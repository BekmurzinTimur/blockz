<script lang="ts">
  import { untrack } from 'svelte'
  import MiniCube from './MiniCube.svelte'
  import { COLORS, SIZES, SIZE_HINTS, SIZE_LABELS, type Block, type BlockSize } from './model'
  import { store } from './store.svelte'

  let {
    block,
    onClose,
    onRearrange,
  }: {
    /** The block being edited; absent when creating a new one. */
    block?: Block
    onClose: () => void
    onRearrange: () => void
  } = $props()

  const PREVIEW_SIZE: Record<BlockSize, number> = { s: 16, m: 24, l: 32 }

  // The sheet is mounted fresh for each open, so capturing the initial block is intended.
  const initial = untrack(() => block)
  let name = $state(initial?.name ?? '')
  let color = $state(initial?.color ?? COLORS[store.blocks.length % COLORS.length])
  let size = $state(initial?.size ?? 's')
  let confirmingDelete = $state(false)
  let input: HTMLInputElement

  const trimmed = $derived(name.trim())
  const title = initial ? 'Edit block' : 'New block'

  $effect(() => {
    // Only pop the keyboard when creating; editing usually means changing colour or size.
    if (!initial) input.focus()
  })

  async function save(event: SubmitEvent) {
    event.preventDefault()
    if (!trimmed) return
    const fields = { name: trimmed, color, size }
    if (initial) await store.updateBlock(initial.id, fields)
    else await store.createBlock(fields)
    onClose()
  }

  async function remove() {
    if (!initial) return
    if (!confirmingDelete) {
      confirmingDelete = true
      return
    }
    await store.deleteBlock(initial.id)
    onClose()
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<button type="button" class="backdrop" aria-label="Close" tabindex="-1" onclick={onClose}></button>

<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
  <div class="handle" aria-hidden="true"></div>
  <form onsubmit={save}>
    <div class="title-row">
      <h1 id="sheet-title">{title}</h1>
      <button type="button" class="close" aria-label="Close" onclick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
      </button>
    </div>

    <div class="field">
      <label class="label" for="block-name">Name</label>
      <input
        id="block-name"
        bind:this={input}
        bind:value={name}
        maxlength="30"
        placeholder="2 push-ups"
        autocomplete="off"
        enterkeyhint="done"
      />
      <p class="hint">Keep it tiny. Under two minutes is perfect.</p>
    </div>

    <fieldset>
      <legend class="label">Color</legend>
      <div class="swatches">
        {#each COLORS as c (c)}
          <button
            type="button"
            class="swatch"
            class:selected={color === c}
            aria-label={c}
            aria-pressed={color === c}
            onclick={() => (color = c)}
          >
            <MiniCube color={c} size={24} />
          </button>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend class="label">Size</legend>
      <div class="sizes">
        {#each SIZES as s (s)}
          <button
            type="button"
            class="size"
            class:selected={size === s}
            aria-pressed={size === s}
            onclick={() => (size = s)}
          >
            <span class="preview"><MiniCube {color} size={PREVIEW_SIZE[s]} /></span>
            <span class="size-label">{SIZE_LABELS[s]}</span>
            <span class="size-hint">{SIZE_HINTS[s]}</span>
          </button>
        {/each}
      </div>
    </fieldset>

    <button type="submit" class="primary" disabled={!trimmed}>{initial ? 'Save' : 'Add block'}</button>

    {#if initial}
      <div class="secondary">
        <button type="button" class="link" onclick={onRearrange}>Rearrange blocks</button>
        <button type="button" class="link danger" onclick={remove}>
          {confirmingDelete ? 'Tap again to delete — past cubes stay' : 'Delete block'}
        </button>
      </div>
    {/if}
  </form>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    border: 0;
    background: var(--scrim);
    animation: fade 200ms ease-out;
  }

  .sheet {
    position: fixed;
    left: 50%;
    bottom: 0;
    z-index: 11;
    width: min(100%, 480px);
    max-height: 92dvh;
    overflow-y: auto;
    padding: 10px 20px calc(env(safe-area-inset-bottom) + 28px);
    border-radius: 28px 28px 0 0;
    border-top: 1px solid var(--hairline);
    background: var(--sheet);
    box-shadow: 0 -8px 30px var(--shadow);
    transform: translateX(-50%);
    animation: rise 280ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }

  .handle {
    width: 40px;
    height: 4px;
    margin: 0 auto 8px;
    border-radius: 2px;
    background: rgb(36 32 27 / 0.18);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin-right: -10px;
    border: 0;
    border-radius: 14px;
    background: none;
    color: var(--icon);
  }

  .label {
    display: block;
    padding: 0;
    margin-bottom: 10px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .field .label {
    margin-bottom: 8px;
  }

  input {
    width: 100%;
    height: 52px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
    color: var(--text);
    font: inherit;
    font-size: 16px;
    font-weight: 600;
    outline: none;
    user-select: text;
    -webkit-user-select: text;
  }

  input::placeholder {
    color: rgb(103 98 87 / 0.55);
  }

  input:focus {
    border-color: var(--primary);
  }

  .hint {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .swatches {
    display: flex;
    justify-content: space-between;
  }

  .swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    padding: 0;
    border-radius: 15px;
    border: 1px solid var(--line);
    background: rgb(255 255 255 / 0.45);
  }

  .swatch.selected {
    border: 2px solid var(--primary);
    background: var(--surface-strong);
  }

  .sizes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .size {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 6px 14px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: var(--surface);
  }

  .size.selected {
    border: 2px solid var(--primary);
    background: var(--surface-strong);
  }

  .preview {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
  }

  .size-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }

  .size-hint {
    font-size: 12px;
    color: var(--text-muted);
  }

  .primary {
    height: 54px;
    margin-top: 6px;
    border: 0;
    border-radius: 18px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 16px;
    font-weight: 700;
  }

  .primary:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .secondary {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: -6px;
  }

  .link {
    padding: 8px 0;
    border: 0;
    background: none;
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 600;
  }

  .danger {
    color: var(--danger);
  }

  @keyframes rise {
    from {
      transform: translate(-50%, 100%);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
