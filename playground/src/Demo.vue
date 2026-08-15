<script setup lang="ts">
import { ref } from 'vue'
import { ColorPicker } from 'vue-tray-color-picker'

/**
 * The scene the readme stills are taken from. Kept apart from App.vue so shots
 * can be retaken without a scroll through every awkward case.
 */
const accent = ref<string | null>('#1bc98e')
const surfaceColor = ref<string | null>('#f2f4f6')
const brand = ref<string | null>('#8e5dca')
</script>

<template>
  <main class="stage">
    <!-- A settings panel rather than one lonely row: the picker is a form
         control, and it reads as one when it is sitting among others. -->
    <section class="card">
      <h1 class="card__title">
        Appearance
      </h1>

      <div class="row">
        <span class="row__label">Accent</span>
        <ColorPicker
          v-model="accent"
          range="full"
          clearable
          default-color="#8a8a8f"
          recent-key="demo:accent"
        />
      </div>

      <div class="row">
        <span class="row__label">Surface</span>
        <ColorPicker
          v-model="surfaceColor"
          range="full"
          clearable
          default-color="#f2f4f6"
          recent-key="demo:surface"
        />
      </div>

      <div class="row">
        <span class="row__label">Brand</span>
        <ColorPicker
          v-model="brand"
          range="full"
          recent-key="demo:brand"
        />
      </div>
    </section>
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
  font-size: clamp(20px, 2vw, 48px);
}

/**
 * `?bare` drops the stage so screenshots can be taken with a transparent
 * background. The card keeps its own shadow, so the component floats on
 * whatever it is later placed on instead of arriving with a grey rectangle
 * around it.
 */
html.bare,
html.bare body,
html.bare .stage {
  background: none;
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
  gap: 0.25rem;
  width: 20rem;
  padding: 1.25rem 1.5rem 1.5rem;
  border: 1px solid light-dark(rgb(0 0 0 / 8%), rgb(255 255 255 / 10%));
  border-radius: 1rem;
  background: light-dark(#fff, #1e1e21);
  box-shadow: 0 12px 32px rgb(0 0 0 / 8%);
}

.card__title {
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Swatch first. With the trigger against the card's right edge the tray has
   nowhere to open into and gets shifted back across the card; from the left it
   opens cleanly into the space beside it. */
.row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.5rem 0;
}

.row__label {
  font-size: 0.9375rem;
  font-weight: 450;
  color: light-dark(#3f3f46, #d4d4d8);
}
</style>
