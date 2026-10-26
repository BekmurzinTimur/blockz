<script lang="ts">
  let {
    title,
    message,
    confirmLabel,
    onConfirm,
    onCancel,
  }: {
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
    onCancel: () => void
  } = $props()

  let cancel: HTMLButtonElement

  $effect(() => {
    // Destructive choices start on the safe button.
    cancel.focus()
  })
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onCancel()} />

<button type="button" class="backdrop" aria-label="Cancel" tabindex="-1" onclick={onCancel}></button>
<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
  <h2 id="confirm-title">{title}</h2>
  <p id="confirm-message">{message}</p>
  <div class="actions">
    <button type="button" class="cancel" bind:this={cancel} onclick={onCancel}>Cancel</button>
    <button type="button" class="confirm" onclick={onConfirm}>{confirmLabel}</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    border: 0;
    background: var(--scrim);
    animation: fade 180ms ease-out;
  }

  .dialog {
    position: fixed;
    left: 50%;
    top: 50%;
    z-index: 21;
    width: min(calc(100% - 40px), 360px);
    padding: 22px 20px 18px;
    border-radius: 24px;
    border: 1px solid var(--hairline);
    background: var(--sheet);
    box-shadow: 0 12px 40px var(--shadow);
    transform: translate(-50%, -50%);
    animation: pop 200ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }

  h2 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 800;
  }

  p {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  .cancel,
  .confirm {
    height: 48px;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 700;
  }

  .cancel {
    border: 1px solid var(--line);
    background: var(--surface-strong);
    color: var(--text);
  }

  .confirm {
    border: 0;
    background: var(--danger);
    color: #fff;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translate(-50%, -46%);
    }
  }
</style>
