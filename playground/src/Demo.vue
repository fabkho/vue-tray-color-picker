<script setup lang="ts">
import { computed, ref } from 'vue'
import { ColorPicker } from 'vue-tray-color-picker'

/**
 * The scene the readme stills are taken from. Kept apart from App.vue so shots
 * can be retaken without a scroll through every awkward case.
 *
 * `?container=` picks the surrounding UI. The picker is a form control and only
 * reads as one in company, but what that company looks like changes what the
 * shot says — so the candidates live here rather than in the shoot script.
 */
type Container = 'settings' | 'preview' | 'strip'

const container = computed<Container>(() => {
  const requested = new URLSearchParams(location.search).get('container')
  return (['settings', 'preview', 'strip'] as const).includes(requested as Container)
    ? requested as Container
    : 'settings'
})

const accent = ref<string | null>('#1bc98e')
const surfaceColor = ref<string | null>('#f2f4f6')
const brand = ref<string | null>('#8e5dca')
</script>

<template>
  <main class="stage">
    <!-- A. A settings list. Title and description per row, control on the
         right — what a real preferences pane looks like. -->
    <section
      v-if="container === 'settings'"
      class="panel"
    >
      <h1 class="panel__title">
        Appearance
      </h1>

      <div class="entry">
        <span class="entry__text">
          <b>Accent</b>
          Buttons, links and focus rings
        </span>
        <ColorPicker
          v-model="accent"
          range="full"
          clearable
          default-color="#8a8a8f"
          recent-key="demo:accent"
        />
      </div>

      <div class="entry">
        <span class="entry__text">
          <b>Surface</b>
          Page and panel background
        </span>
        <ColorPicker
          v-model="surfaceColor"
          range="full"
          clearable
          default-color="#f2f4f6"
          recent-key="demo:surface"
        />
      </div>

      <div class="entry">
        <span class="entry__text">
          <b>Brand</b>
          Logo, badges and marketing
        </span>
        <ColorPicker
          v-model="brand"
          range="full"
          placement="bottom-end"
          recent-key="demo:brand"
        />
      </div>
    </section>

    <!-- B. The colours doing something. A preview above, the controls beneath,
         so the shot shows what a choice is actually for. -->
    <section
      v-else-if="container === 'preview'"
      class="preview"
    >
      <div
        class="preview__canvas"
        :style="{ background: surfaceColor ?? '#f2f4f6' }"
      >
        <span
          class="preview__badge"
          :style="{ background: brand ?? '#8e5dca' }"
        >Pro</span>
        <span class="preview__line preview__line--wide" />
        <span class="preview__line" />
        <button
          class="preview__button"
          :style="{ background: accent ?? '#1bc98e' }"
        >
          Continue
        </button>
      </div>

      <div class="preview__controls">
        <ColorPicker
          v-model="accent"
          range="full"
          clearable
          default-color="#8a8a8f"
          recent-key="demo:accent"
        />
        <ColorPicker
          v-model="surfaceColor"
          range="full"
          clearable
          default-color="#f2f4f6"
          recent-key="demo:surface"
        />
        <ColorPicker
          v-model="brand"
          range="full"
          placement="bottom-end"
          recent-key="demo:brand"
        />
      </div>
    </section>

    <!-- C. A palette strip. No card at all — three swatches in a floating bar,
         the way a design tool holds a document's colours. -->
    <section
      v-else
      class="strip"
    >
      <span class="strip__label">Theme</span>
      <span class="strip__rule" />
      <ColorPicker
        v-model="accent"
        range="full"
        clearable
        default-color="#8a8a8f"
        recent-key="demo:accent"
      />
      <ColorPicker
        v-model="surfaceColor"
        range="full"
        clearable
        default-color="#f2f4f6"
        recent-key="demo:surface"
      />
      <ColorPicker
        v-model="brand"
        range="full"
        recent-key="demo:brand"
      />
    </section>
  </main>
</template>

<style>
/**
 * On the root element, not the stage: `rem` resolves against the root, so
 * scaling anything else leaves every rem in the component at the browser
 * default and the demo never actually grows.
 */
html {
  font-size: clamp(20px, 2vw, 48px);
}

/* Without this a height is the *content* box, and padding plus border land on
   top of it — which is why a panel asked for the surface's height came out
   fifty pixels taller than it. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/**
 * `?bare` drops the stage so screenshots can be taken with a transparent
 * background. The container keeps its own shadow, so it floats on whatever it
 * is later placed on instead of arriving with a grey rectangle around it.
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

.panel,
.preview,
.strip {
  border: 1px solid light-dark(rgb(0 0 0 / 8%), rgb(255 255 255 / 10%));
  background: light-dark(#fff, #1e1e21);
  box-shadow: 0 12px 32px rgb(0 0 0 / 8%);
}

/* ─── A. Settings ─────────────────────────────────────────────────────────── */

.panel {
  /**
   * Height matched to the surface panel — 16rem wide, and this tall once its
   * bands, shades, field and footer are stacked — so the two sit level in the
   * hero. In rem, so it holds at any root size rather than only at the one the
   * shots happen to be taken at.
   */
  display: flex;
  flex-direction: column;
  width: 24rem;
  height: 17.67rem;
  padding: 1.25rem 1.5rem 0.5rem;
  border-radius: 1rem;
}

.panel__title {
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Rows share whatever height is left, so the panel keeps its size whether it
   holds three colours or five. `min-height: 0` is what lets them: a flex item
   defaults to refusing to shrink below its content, which would push the panel
   past the height it was given. */
.entry {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.25rem 0;
}

/* Hairlines between, not around: the panel's own border closes the group. */
.entry + .entry {
  border-top: 1px solid light-dark(rgb(0 0 0 / 7%), rgb(255 255 255 / 8%));
}

.entry__text {
  font-size: 0.8125rem;
  line-height: 1.35;
  color: light-dark(#71717a, #a1a1aa);
}

.entry__text b {
  display: block;
  font-size: 0.9375rem;
  font-weight: 500;
  color: light-dark(#18181b, #e4e4e7);
}

/* ─── B. Preview ──────────────────────────────────────────────────────────── */

.preview {
  display: grid;
  gap: 1rem;
  width: 20rem;
  padding: 1rem;
  border-radius: 1.125rem;
}

.preview__canvas {
  display: grid;
  gap: 0.625rem;
  justify-items: start;
  padding: 1.125rem;
  border-radius: 0.75rem;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 5%);
}

.preview__badge {
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.preview__line {
  width: 55%;
  height: 0.4375rem;
  border-radius: 999px;
  background: light-dark(rgb(0 0 0 / 12%), rgb(255 255 255 / 18%));
}

.preview__line--wide {
  width: 80%;
}

.preview__button {
  margin-top: 0.375rem;
  padding: 0.4375rem 0.875rem;
  border: 0;
  border-radius: 999px;
  color: #fff;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
}

.preview__controls {
  display: flex;
  gap: 0.75rem;
  padding: 0 0.125rem 0.125rem;
}

/* ─── C. Strip ────────────────────────────────────────────────────────────── */

.strip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-radius: 999px;
}

.strip__label {
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: light-dark(#3f3f46, #d4d4d8);
}

.strip__rule {
  width: 1px;
  height: 1.5rem;
  background: light-dark(rgb(0 0 0 / 10%), rgb(255 255 255 / 14%));
}
</style>
