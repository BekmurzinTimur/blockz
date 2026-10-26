<script lang="ts">
  import { TINTS, type BlockColor } from './model'

  let { color, size, rotate = -10 }: { color: BlockColor; size: number; rotate?: number } = $props()
</script>

<!-- A small CSS ice cube, the same look as the cubes in the glass. -->
<span
  class="cube"
  aria-hidden="true"
  style:--tint={TINTS[color]}
  style:--size="{size}px"
  style:transform="rotate({rotate}deg)"
></span>

<style>
  .cube {
    display: block;
    flex: none;
    width: var(--size);
    height: var(--size);
    border-radius: calc(var(--size) * 0.24);
    border: 1px solid color-mix(in srgb, color-mix(in srgb, var(--tint) 75%, #000) 50%, transparent);
    background: linear-gradient(
      150deg,
      color-mix(in srgb, var(--tint) 55%, #fff) 0%,
      var(--tint) 40%,
      color-mix(in srgb, var(--tint) 92%, #000) 100%
    );
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.5),
      inset -2px -3px 6px rgb(40 30 20 / 0.12),
      0 1px 3px rgb(60 50 40 / 0.18);
    transition: background 200ms ease;
  }
</style>
