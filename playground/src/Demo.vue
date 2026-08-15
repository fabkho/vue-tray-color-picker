<script setup lang="ts">
import { ref } from 'vue'
import { ColorPicker } from 'vue-tray-color-picker'

/**
 * The single scene recorded for the readme GIF. Kept separate from App.vue so
 * the demo can be re-recorded without a scroll through every awkward case.
 */
const color = ref<string | null>('#1bc98e')
</script>

<template>
  <main class="stage">
    <div class="card">
      <div class="row">
        <span class="row__label">Accent colour</span>
        <ColorPicker
          v-model="color"
          range="full"
          clearable
          default-color="#8a8a8f"
          recent-key="demo:recent"
        />
      </div>
      <code class="value">{{ color ?? 'null' }}</code>
    </div>
  </main>
</template>

<style>
/**
 * On the root element, not the stage: `rem` resolves against the root, so
 * scaling anything else leaves every rem in the component at the browser
 * default and the demo never actually grows.
 *
 * Sized against the viewport so the recording can be supersampled — at twice
 * the viewport this draws at twice the size, which is real detail to crop into
 * rather than an upscale.
 */
html {
  font-size: clamp(20px, 1.75vw, 42px);
}
</style>

<style scoped>
.stage {
  /* Fixed rather than flowed: body padding would otherwise make the page taller
     than the viewport, and the shot would sit off-centre. */
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: light-dark(#f4f4f6, #131316);
}

.card {
  display: grid;
  gap: 1rem;
  width: 22rem;
  padding: 1.75rem;
  border: 1px solid light-dark(rgb(0 0 0 / 8%), rgb(255 255 255 / 10%));
  border-radius: 1rem;
  background: light-dark(#fff, #1e1e21);
  box-shadow: 0 12px 32px rgb(0 0 0 / 8%);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.row__label {
  font-size: 0.9375rem;
  font-weight: 500;
}

.value {
  color: light-dark(#71717a, #a1a1aa);
  font-size: 0.8125rem;
  font-family: ui-monospace, monospace;
}
</style>
