<script setup lang="ts">
import { ref } from 'vue'
import { ColorSurface } from 'vue-tray-color-picker'

/** Side-by-side candidates. Nothing here ships; it exists to be chosen from. */

const THUMBS = [
  { key: 'thumb-a', name: 'A — Lens', note: 'Current. Clear centre, so the band reads through it.' },
  { key: 'thumb-b', name: 'B — Bead', note: 'Opaque frosted glass. Solid object, hides the track under it.' },
  { key: 'thumb-c', name: 'C — Halo', note: 'Hairline ring and a soft glow. Nearly invisible until you look.' },
  { key: 'thumb-d', name: 'D — Loupe', note: 'Thick bezel, oversized. Reads as an instrument.' },
  { key: 'thumb-e', name: 'E — Droplet', note: 'Taller than wide, wet highlight. Points at a position rather than covering one.' },
] as const

const BUTTONS = [
  {
    key: 'default',
    name: '1 — Default',
    note: 'What ships. No class, no slot.',
    save: '',
    cancel: '',
  },
  {
    key: 'anny',
    name: '2 — Host classes',
    note: 'saveClass / cancelClass only — the light-touch route, no slot involved.',
    save: 'btn-anny btn-anny--primary',
    cancel: 'btn-anny btn-anny--secondary',
  },
  {
    key: 'square',
    name: '3 — Squared, uppercase',
    note: 'Same route, a different house style.',
    save: 'btn-square vtcp-action--primary',
    cancel: 'btn-square vtcp-action--secondary',
  },
  {
    key: 'ghost',
    name: '4 — Text buttons',
    note: 'Quiet footer for a panel that is already busy.',
    save: 'btn-ghost--strong',
    cancel: 'btn-ghost',
  },
  {
    key: 'slot',
    name: '5 — Own markup, via the slot',
    note: 'The #actions slot replaces the footer entirely; save() and cancel() are handed to you.',
    save: '',
    cancel: '',
  },
] as const

const thumbValues = ref(Object.fromEntries(THUMBS.map(t => [t.key, '#2b6af8'])))
const buttonValues = ref(Object.fromEntries(BUTTONS.map(b => [b.key, '#1bc98e'])))
const log = ref<string[]>([])

function note(message: string) {
  log.value = [message, ...log.value].slice(0, 6)
}
</script>

<template>
  <h1>Variants</h1>
  <p class="subtitle">
    Candidates to choose from. <a href="/">Back to the playground</a>
  </p>

  <section class="case">
    <h2 class="case__title">
      Band thumb
    </h2>
    <p class="case__note">
      Drag each one. The question is whether the thumb should reveal the colour under it
      or sit on top of it.
    </p>
    <div class="grid">
      <div
        v-for="thumb in THUMBS"
        :key="thumb.key"
        class="grid__cell"
      >
        <span class="grid__label">{{ thumb.name }}</span>
        <span class="grid__note">{{ thumb.note }}</span>
        <ColorSurface
          v-model="thumbValues[thumb.key]!"
          range="full"
          :class="['boxed', thumb.key]"
        />
      </div>
    </div>
  </section>

  <section class="case">
    <h2 class="case__title">
      Footer buttons
    </h2>
    <p class="case__note">
      1–4 pass <code>saveClass</code> / <code>cancelClass</code>. 5 replaces the footer
      through the <code>#actions</code> slot. Last action:
      <code>{{ log[0] ?? '—' }}</code>
    </p>
    <div class="grid">
      <div
        v-for="button in BUTTONS"
        :key="button.key"
        class="grid__cell"
      >
        <span class="grid__label">{{ button.name }}</span>
        <span class="grid__note">{{ button.note }}</span>

        <ColorSurface
          v-if="button.key !== 'slot'"
          v-model="buttonValues[button.key]!"
          range="full"
          class="boxed"
          :save-class="button.save"
          :cancel-class="button.cancel"
          @close="note(`${button.name}: closed`)"
        />

        <ColorSurface
          v-else
          v-model="buttonValues[button.key]!"
          range="full"
          class="boxed"
          @close="note(`${button.name}: closed`)"
        >
          <template #actions="{ save, cancel, value }">
            <button
              class="own own--ghost"
              @click="cancel"
            >
              Discard
            </button>
            <button
              class="own own--fill"
              :style="{ background: value }"
              @click="save"
            >
              Use {{ value }}
            </button>
          </template>
        </ColorSurface>
      </div>
    </div>
  </section>
</template>

<style scoped>
.boxed {
  border: 1px solid light-dark(rgb(0 0 0 / 10%), rgb(255 255 255 / 12%));
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 1.75rem;
}

.grid__cell {
  display: grid;
  gap: 0.375rem;
  justify-items: start;
  align-content: start;
}

.grid__label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.grid__note {
  min-height: 2.4em;
  color: light-dark(#71717a, #a1a1aa);
  font-size: 0.75rem;
}

.own {
  flex: 1;
  padding: 0.5rem;
  border: 0;
  border-radius: 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.own--ghost {
  background: light-dark(#f1f2f4, #2a2a2e);
  color: inherit;
}

.own--fill {
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 2px rgb(0 0 0 / 35%);
}
</style>
