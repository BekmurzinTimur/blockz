<script lang="ts">
  import { eraseAll, exportData, parseBackup, restore, type Backup } from '../backup'
  import ConfirmDialog from '../ConfirmDialog.svelte'
  import { store, type Settings } from '../store.svelte'

  let { onBack, onDayStartChanged }: { onBack: () => void; onDayStartChanged: () => void } = $props()

  const DAY_START_HOURS = [0, 1, 2, 3, 4, 5, 6]

  let fileInput: HTMLInputElement
  // Raw: the backup must stay a plain object, since IndexedDB can't store Svelte's state proxies.
  let pending = $state.raw<{ kind: 'import'; backup: Backup } | { kind: 'erase' } | null>(null)
  let error = $state<string>()

  function hourLabel(hour: number) {
    return `${hour === 0 ? 12 : hour}:00 AM`
  }

  async function setDayStart(event: Event) {
    await store.updateSetting('dayStartHour', Number((event.currentTarget as HTMLSelectElement).value))
    onDayStartChanged()
  }

  function toggle(key: keyof Pick<Settings, 'sound' | 'haptics'>) {
    store.updateSetting(key, !store.settings[key])
  }

  async function pickFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    error = undefined
    try {
      pending = { kind: 'import', backup: parseBackup(await file.text()) }
    } catch (e) {
      error = (e as Error).message
    }
  }

  async function confirm() {
    if (!pending) return
    if (pending.kind === 'import') await restore(pending.backup)
    else await eraseAll()
    // Start clean from what's now stored, exactly like opening the app.
    location.replace(location.pathname)
  }
</script>

<div class="screen">
  <div class="screen-inner">
    <header>
      <button type="button" class="back" aria-label="Back to today" onclick={onBack}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <h1>Settings</h1>
    </header>

    <section class="card rows" aria-label="Feel">
      <div class="row">
        <label class="text" for="day-start">
          <span class="title">Day starts at</span>
          <span class="hint">Late nights count toward today</span>
        </label>
        <select id="day-start" class="value" value={store.settings.dayStartHour} onchange={setDayStart}>
          {#each DAY_START_HOURS as hour (hour)}
            <option value={hour}>{hourLabel(hour)}</option>
          {/each}
        </select>
      </div>

      {#each [['sound', 'Sound'], ['haptics', 'Haptics']] as const as [key, label] (key)}
        <div class="row">
          <span class="title" id="label-{key}">{label}</span>
          <button
            type="button"
            class="switch"
            role="switch"
            aria-checked={store.settings[key]}
            aria-labelledby="label-{key}"
            onclick={() => toggle(key)}
          >
            <span class="knob"></span>
          </button>
        </div>
      {/each}

      <div class="row">
        <span class="title">Background</span>
        <!-- Only Bone for now; other backgrounds may come later. -->
        <span class="value static">Bone</span>
      </div>
    </section>

    <section class="data" aria-labelledby="data-title">
      <h2 id="data-title">Your data</h2>
      <div class="card actions">
        <button type="button" onclick={exportData}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" /></svg>
          Export data
        </button>
        <button type="button" onclick={() => fileInput.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4" /><path d="M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>
          Import data
        </button>
        <button type="button" class="danger" onclick={() => (pending = { kind: 'erase' })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
          Erase everything
        </button>
      </div>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={pickFile} />
    </section>

    <p class="footer">Everything stays on this phone.<br />No accounts, no reminders, no streaks.</p>
  </div>
</div>

{#if pending?.kind === 'import'}
  <ConfirmDialog
    title="Restore this backup?"
    message={`It replaces everything here with ${pending.backup.blocks.filter((b) => !b.deletedAt).length} blocks and ${pending.backup.cubes.length} cubes from ${new Date(pending.backup.exportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
    confirmLabel="Restore"
    onConfirm={confirm}
    onCancel={() => (pending = null)}
  />
{:else if pending?.kind === 'erase'}
  <ConfirmDialog
    title="Erase everything?"
    message="Your blocks and every glass will be deleted from this phone. This can’t be undone."
    confirmLabel="Erase"
    onConfirm={confirm}
    onCancel={() => (pending = null)}
  />
{/if}

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

  .rows {
    padding: 0 16px;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 60px;
  }

  .row + .row {
    border-top: 1px solid var(--hairline);
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 15px;
    font-weight: 600;
  }

  .hint {
    font-size: 12px;
    color: var(--text-muted);
  }

  .value {
    height: 40px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
  }

  select.value {
    appearance: none;
    -webkit-appearance: none;
    text-align: center;
    cursor: pointer;
  }

  .value.static {
    display: inline-flex;
    align-items: center;
  }

  .switch {
    position: relative;
    flex: none;
    width: 52px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 16px;
    background: var(--fill-strong);
    cursor: pointer;
    transition: background 200ms ease;
  }

  .switch[aria-checked='true'] {
    background: var(--primary);
  }

  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 26px;
    height: 26px;
    border-radius: 13px;
    background: var(--surface-strong);
    box-shadow: 0 1px 3px var(--shadow);
    transition:
      left 200ms ease,
      background 200ms ease;
  }

  .switch[aria-checked='true'] .knob {
    left: 23px;
    background: var(--surface);
  }

  .data {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h2 {
    margin: 0 0 0 4px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .actions {
    padding: 0 6px;
  }

  .actions button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 0 10px;
    border: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .actions button + button {
    border-top: 1px solid var(--hairline);
  }

  .actions svg {
    color: var(--primary);
  }

  .actions .danger svg {
    color: inherit;
  }

  .actions .danger {
    color: var(--danger);
  }

  .error {
    margin: 0 4px;
    font-size: 13px;
    color: var(--danger);
  }

  .footer {
    margin: 0;
    text-align: center;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
  }
</style>
