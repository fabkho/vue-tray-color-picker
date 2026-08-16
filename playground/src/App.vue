<script setup lang="ts">
import { ref } from 'vue'
import { ColorPicker, ColorSurface } from 'vue-tray-color-picker'

/**
 * The live page. Every case is something a consumer would actually build rather
 * than a tour of the internals — the floating layer in particular stays quiet,
 * since most projects will drop the surface into a dropdown they already have.
 */
const showcase = ref<string | null>('#1bc98e')
const accent = ref<string | null>('#1bc98e')
const surfaceColor = ref<string | null>('#f2f4f6')
const brand = ref<string | null>('#8e5dca')

const identity = ref<string | null>('#1bc98e')
const full = ref<string | null>('#f2f4f6')
const live = ref<string | null>('#8e5dca')
const background = ref<string | null>(null)

const teamA = ref<string | null>('#e64759')
const teamB = ref<string | null>('#2b6af8')

const inline = ref<string | null>('#d33e8a')
const inlineOpen = ref(false)
</script>

<template>
  <header class="masthead">
    <h1>vue-tray-color-picker</h1>
    <p>
      A tray of presets one tap away, and behind the <code>+</code> a picker whose every
      reachable colour is one worth shipping. Everything below is live.
      <a href="https://github.com/fabkho/vue-tray-color-picker">Source</a>
    </p>
  </header>

  <main class="cases">
    <!-- The tray first and on its own. It is the reason to use this over any
         other picker, and it has to be tapped to be understood. -->
    <section class="card card--wide showcase">
      <h2>Tap the swatch</h2>
      <p>
        The presets burst out of the trigger, one tap from the value you probably want.
        The plus opens the full picker without closing the tray.
      </p>
      <div class="showcase__stage">
        <ColorPicker
          v-model="showcase"
          range="full"
          clearable
          recent-key="pg:showcase"
        />
        <code>{{ showcase ?? 'null' }}</code>
      </div>
    </section>

    <section class="card card--wide">
      <h2>In a form</h2>
      <p>Where it usually lives. Take a preset, or mix your own behind the plus.</p>

      <div class="rows">
        <div class="row">
          <span>Accent</span>
          <ColorPicker
            v-model="accent"
            range="full"
            clearable
            default-value="#8a8a8f"
            recent-key="pg:accent"
          />
          <code>{{ accent ?? 'null' }}</code>
        </div>
        <div class="row">
          <span>Surface</span>
          <ColorPicker
            v-model="surfaceColor"
            range="full"
            clearable
            default-value="#f2f4f6"
            recent-key="pg:surface"
          />
          <code>{{ surfaceColor ?? 'null' }}</code>
        </div>
        <div class="row">
          <span>Brand</span>
          <ColorPicker
            v-model="brand"
            range="full"
            placement="bottom-end"
            recent-key="pg:brand"
          />
          <code>{{ brand ?? 'null' }}</code>
        </div>
      </div>
    </section>

    <div class="demos">
      <section class="card">
        <h2>Identity range</h2>
        <p>
          The default. No greys and no hex — every rung stays legible as a label or a chart
          series. <code>{{ identity ?? 'null' }}</code>
        </p>
        <ColorSurface v-model="identity" />
      </section>

      <section class="card">
        <h2>Full range</h2>
        <p>
          For surface and theme colours: a greyscale rung, hex entry, and a ladder reaching
          near-white. <code>{{ full ?? 'null' }}</code>
        </p>
        <ColorSurface
          v-model="full"
          range="full"
        />
      </section>

      <section class="card">
        <h2>Immediate commit</h2>
        <p>
          No footer — it writes as you drag, for surfaces that preview the colour live.
          <code>{{ live ?? 'null' }}</code>
        </p>
        <ColorSurface
          v-model="live"
          range="full"
          commit="immediate"
        />
      </section>

      <section class="card">
        <h2>Disabled</h2>
        <p>Every control locked, with no consumer css required.</p>
        <ColorSurface
          :model-value="'#e64759'"
          range="full"
          disabled
        />
      </section>
    </div>

    <section class="card card--wide">
      <h2>A default to fall back to</h2>
      <p>
        <code>clearable</code> adds a swatch that unsets the value. The default here is a
        css variable, which the picker reads off the trigger rather than parsing.
        Currently <code>{{ background ?? 'null — using the default' }}</code>
      </p>
      <div class="inline-demo">
        <ColorPicker
          v-model="background"
          range="full"
          clearable
          default-value="var(--pg-default)"
          recent-key="pg:background"
          style="--pg-default: #00dbcb"
        />
      </div>
    </section>

    <section class="card card--wide">
      <h2>Recent colours, scoped per field</h2>
      <p>
        Mix a colour behind the plus on the left and it is remembered there — and only
        there. Two fields, two histories.
      </p>
      <div class="inline-demo">
        <ColorPicker
          v-model="teamA"
          range="full"
          recent-key="pg:team-a"
        />
        <ColorPicker
          v-model="teamB"
          range="full"
          recent-key="pg:team-b"
        />
      </div>
    </section>

    <section class="card card--wide">
      <h2>Bring your own container</h2>
      <p>
        The surface renders anywhere — a dropdown you already have, a modal, or inline. A
        floating layer ships with the package so it works out of the box, but nothing
        depends on it. <code>{{ inline ?? 'null' }}</code>
      </p>
      <button
        class="plain"
        :aria-expanded="inlineOpen"
        @click="inlineOpen = !inlineOpen"
      >
        {{ inlineOpen ? 'Hide' : 'Show' }} the surface
      </button>
      <ColorSurface
        v-if="inlineOpen"
        v-model="inline"
        range="full"
        @close="inlineOpen = false"
      />
    </section>
  </main>
</template>

<style scoped>
.masthead {
  max-width: 46rem;
  margin: 0 auto 3rem;
  text-align: center;
}

.masthead h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.masthead p {
  margin: 0;
  color: #4a5560;
  font-size: 0.9375rem;
  line-height: 1.55;
}

.cases {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  align-items: start;
  gap: 1.25rem;
  max-width: 72rem;
  margin: 0 auto;
}

/**
 * The surface demos share a grid of their own so they can share a height. The
 * panels themselves differ — full range adds a saturation band and a hex field,
 * immediate mode drops the footer — and a row of cards that steps up and down
 * with its contents reads as broken rather than as varied.
 *
 * `grid-auto-rows: 1fr` is why they match; it cannot go on the outer grid,
 * where it would stretch the full-width cards to the same height as well.
 */
/* Two lines reserved for every description, so the heading block is the same
   height in every card. */
.demos .card p {
  min-height: 3em;
}

/**
 * Heading, description, then a row that takes whatever is left — so the panel
 * sits in the middle of the space below the text rather than against the top
 * of a card that is taller than it needs to be.
 *
 * The panels are genuinely different sizes: full range carries a saturation
 * band and a hex field, immediate mode has no footer. Centring shares the
 * difference out above and below instead of letting it all fall to the bottom.
 */
.demos .card {
  grid-template-rows: auto auto 1fr;
  align-content: stretch;
}

.demos .card .vtcp-surface {
  place-self: center;
}

.demos {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  grid-auto-rows: 1fr;
  gap: 1.25rem;
}

.card--wide {
  grid-column: 1 / -1;
}

/* `.card.showcase`, not `.showcase`: the base card rule is declared later in
   this sheet and at equal specificity would win the alignment back. */
.card.showcase {
  justify-items: center;
  padding: 2.5rem 1.5rem 3rem;
  text-align: center;
}

.showcase h2 {
  font-size: 1.25rem;
}

.showcase p {
  max-width: 32rem;
}

/* Room beneath for the tray to open into, so the first thing a visitor tries
   does not push the page around. */
.showcase__stage {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 5.5rem;
}

/**
 * Frosted, like the hero: a pale sheet over the ground rather than an opaque
 * card on it, so the gradient stays visible through the page.
 */
.card {
  display: grid;
  justify-items: start;
  /* Rows keep their natural size and the slack collects at the bottom. Grid
     stretches auto rows by default, which spread the spare height of an
     equal-height card between its rows and pushed each panel down by a
     different amount. */
  align-content: start;
  gap: 0.5rem;
  padding: 1.5rem;
  border-radius: 1.25rem;
  background: rgb(255 255 255 / 42%);
  backdrop-filter: blur(30px) saturate(140%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 55%),
    0 18px 40px rgb(20 40 55 / 8%);
}

.card h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card p {
  margin: 0 0 0.75rem;
  max-width: 42rem;
  color: #4a5560;
  font-size: 0.8125rem;
  line-height: 1.5;
}

code {
  padding: 0.0625rem 0.3125rem;
  border-radius: 0.25rem;
  background: rgb(255 255 255 / 55%);
  color: #33404b;
  font-size: 0.8125em;
  font-family: ui-monospace, monospace;
}

.rows {
  display: grid;
  gap: 0.25rem;
  width: 100%;
}

.row {
  display: grid;
  grid-template-columns: 5rem auto 1fr;
  align-items: center;
  gap: 0.875rem;
  padding: 0.375rem 0;
  font-size: 0.9375rem;
}

/* Otherwise the chip stretches across the whole free column and reads as an
   input rather than a value. */
.row code {
  justify-self: start;
}

.inline-demo {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.plain {
  margin-bottom: 0.75rem;
  padding: 0.4375rem 0.875rem;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 70%);
  box-shadow: inset 0 0 0 1px rgb(20 40 55 / 10%);
  color: #33404b;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

a {
  color: #2b6af8;
}
</style>
