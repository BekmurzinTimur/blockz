<script lang="ts">
  import BlockBar from './lib/BlockBar.svelte'
  import GlassView from './lib/glass/GlassView.svelte'
  import { DEMO_BLOCKS } from './lib/model'

  let glass: GlassView

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
</script>

<main>
  <header>{today}</header>
  <section class="glass">
    <GlassView bind:this={glass} />
  </section>
  <footer>
    <BlockBar blocks={DEMO_BLOCKS} onTap={(block) => glass.drop(block)} />
  </footer>
</main>

<style>
  main {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    padding: env(safe-area-inset-top) 0 calc(env(safe-area-inset-bottom) + 12px);
  }

  header {
    position: relative;
    z-index: 1;
    padding: 12px 16px 0;
    text-align: center;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .glass {
    min-height: 0;
    /* Lets cubes fall in from above the header, at the very top of the screen. */
    margin-top: calc(-1 * (env(safe-area-inset-top) + 32px));
  }

  footer {
    padding-top: 12px;
  }
</style>
