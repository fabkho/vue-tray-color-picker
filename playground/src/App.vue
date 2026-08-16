<script setup lang="ts">
import { ref } from 'vue'
import { ColorPicker, ColorPopover, ColorSurface } from 'vue-tray-color-picker'

/** Off the ladder in every direction: muted, near-grey, too dark, too pale, and
    a brand blue that is simply more saturated than any rung. */
const offLadder = ref<Record<string, string>>({
  '#7a8b99 muted slate': '#7a8b99',
  '#8a8a8f near grey': '#8a8a8f',
  '#12203f deep navy': '#12203f',
  '#f5c6d0 pale pink': '#f5c6d0',
  '#2b6af8 brand blue': '#2b6af8',
})

const identity = ref<string | null>('#1bc98e')
const full = ref<string | null>('#f2f4f6')
const unset = ref<string | null>(null)
const live = ref<string | null>('#8e5dca')

const floating = ref<string | null>('#e2a04f')
const clipped = ref<string | null>('#00dbcb')
/** The seam: same surface, someone else's container. */
const inline = ref<string | null>('#d33e8a')
const inlineOpen = ref(false)

const brand = ref<string | null>('#1bc98e')
const background = ref<string | null>(null)
const shared = ref<string | null>('#e64759')
const alsoShared = ref<string | null>('#8e5dca')
const liveTray = ref<string | null>('#e2a04f')
</script>

<template>
  <h1>vue-tray-color-picker</h1>
  <p class="subtitle">
    Every case below is live — open a tray, drag a band, type a hex. They are the
    awkward inputs rather than a happy path, because those are the ones worth seeing.
    <a href="https://github.com/fabkho/vue-tray-color-picker">Source</a>
  </p>

  <section class="case">
    <h2 class="case__title">
      Identity range
    </h2>
    <p class="case__note">
      No greys, no hex. Committed: <code>{{ identity ?? 'null' }}</code>
    </p>
    <ColorSurface
      v-model="identity"
      class="boxed"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      Full range
    </h2>
    <p class="case__note">
      Greyscale rung and hex entry, ladder reaching near-white. Committed:
      <code>{{ full ?? 'null' }}</code>
    </p>
    <ColorSurface
      v-model="full"
      range="full"
      class="boxed"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      The tray
    </h2>
    <p class="case__note">
      Presets, then anything mixed in the surface. Committed:
      <code>{{ brand ?? 'null' }}</code>
    </p>
    <ColorPicker
      v-model="brand"
      range="full"
      recent-key="pg:brand"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      Clearable, with a CSS-variable default
    </h2>
    <p class="case__note">
      The default is <code>var(--pg-default)</code>, which the surface cannot decompose —
      it is read back off the trigger when the tray opens. Committed:
      <code>{{ background ?? 'null (using the default)' }}</code>
    </p>
    <ColorPicker
      v-model="background"
      range="full"
      clearable
      default-value="var(--pg-default)"
      recent-key="pg:background"
      class="with-default"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      Separate histories
    </h2>
    <p class="case__note">
      Two pickers, two keys. Mix a colour in one; it must not appear in the other.
      Then the third shares the first's key and must show it.
    </p>
    <div class="pickers">
      <ColorPicker
        v-model="shared"
        range="full"
        recent-key="pg:a"
      />
      <ColorPicker
        v-model="alsoShared"
        range="full"
        recent-key="pg:b"
      />
      <ColorPicker
        v-model="shared"
        range="full"
        recent-key="pg:a"
      />
    </div>
  </section>

  <section class="case">
    <h2 class="case__title">
      Tray in immediate mode
    </h2>
    <p class="case__note">
      The surface writes as you drag and has no footer. The history must stay empty until
      the panel is dismissed, and then hold one entry. Live:
      <code>{{ liveTray ?? 'null' }}</code>
    </p>
    <ColorPicker
      v-model="liveTray"
      range="full"
      commit="immediate"
      recent-key="pg:live"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      Floating layer
    </h2>
    <p class="case__note">
      Escape and outside-click dismiss; focus returns to the trigger. Committed:
      <code>{{ floating ?? 'null' }}</code>
    </p>
    <ColorPopover>
      <template #trigger="{ toggle, triggerAttrs }">
        <button
          class="swatch"
          :style="{ background: floating ?? undefined }"
          v-bind="triggerAttrs"
          @click="toggle"
        />
      </template>
      <template #default="{ close }">
        <ColorSurface
          v-model="floating"
          range="full"
          @close="close"
        />
      </template>
    </ColorPopover>
  </section>

  <section class="case">
    <h2 class="case__title">
      Inside a clipping ancestor
    </h2>
    <p class="case__note">
      The trigger sits in an <code>overflow: hidden</code> box 3rem tall. The panel must
      escape it, not be sliced off — the classic failure of a hand-rolled layer.
    </p>
    <div class="clip">
      <ColorPopover>
        <template #trigger="{ toggle, triggerAttrs }">
          <button
            class="swatch"
            :style="{ background: clipped ?? undefined }"
            v-bind="triggerAttrs"
            @click="toggle"
          />
        </template>
        <template #default="{ close }">
          <ColorSurface
            v-model="clipped"
            @close="close"
          />
        </template>
      </ColorPopover>
    </div>
  </section>

  <section class="case">
    <h2 class="case__title">
      Swap-out seam — someone else's container
    </h2>
    <p class="case__note">
      No <code>ColorPopover</code> at all: the surface rendered inside a hand-rolled
      disclosure. This is the contract a consumer with their own dropdown relies on.
      Committed: <code>{{ inline ?? 'null' }}</code>
    </p>
    <button
      class="plain"
      :aria-expanded="inlineOpen"
      @click="inlineOpen = !inlineOpen"
    >
      {{ inlineOpen ? 'Hide' : 'Show' }} surface
    </button>
    <div
      v-if="inlineOpen"
      class="boxed"
      style="margin-top: 0.75rem; width: fit-content"
    >
      <ColorSurface
        v-model="inline"
        range="full"
        @close="inlineOpen = false"
      />
    </div>
  </section>

  <section class="case">
    <h2 class="case__title">
      Off the ladder — nothing should be ringed
    </h2>
    <p class="case__note">
      Each opens on a colour the ladder cannot express. The preview shows the real colour;
      no rung claims to be it. Touch any control and the ring appears and stays.
    </p>
    <div class="grid">
      <div
        v-for="(_, label) in offLadder"
        :key="label"
        class="grid__cell"
      >
        <span class="grid__label">{{ label }}</span>
        <ColorSurface
          v-model="offLadder[label]!"
          class="boxed"
        />
        <code class="grid__value">{{ offLadder[label] }}</code>
      </div>
    </div>
  </section>

  <section class="case">
    <h2 class="case__title">
      Unset
    </h2>
    <p class="case__note">
      No value: falls back to the palette blue. Committed: <code>{{ unset ?? 'null' }}</code>
    </p>
    <ColorSurface
      v-model="unset"
      class="boxed"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      Immediate commit
    </h2>
    <p class="case__note">
      No footer; writes on every move. The value below must track the drag without the
      axes jumping back. Live: <code>{{ live ?? 'null' }}</code>
    </p>
    <ColorSurface
      v-model="live"
      range="full"
      commit="immediate"
      class="boxed"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      Disabled
    </h2>
    <ColorSurface
      :model-value="'#e64759'"
      range="full"
      disabled
      class="boxed"
    />
  </section>

  <section class="case">
    <h2 class="case__title">
      Themed with custom properties only
    </h2>
    <p class="case__note">
      No component changes — every value below comes from <code>--vtcp-*</code>.
    </p>
    <ColorSurface
      :model-value="'#00dbcb'"
      range="full"
      class="boxed themed"
    />
  </section>
</template>

<style scoped>
.boxed {
  border: 1px solid light-dark(rgb(0 0 0 / 10%), rgb(255 255 255 / 12%));
}

.themed {
  --vtcp-radius: 0;
  --vtcp-swatch-size: 1.5rem;
  --vtcp-gap: 0.25rem;
  --vtcp-surface: light-dark(#fffbeb, #2a1f05);
  --vtcp-text: light-dark(#78350f, #fde68a);
  --vtcp-border: light-dark(#fbbf24, #92400e);
}

.with-default {
  --pg-default: #00dbcb;
}

.pickers {
  display: flex;
  gap: 1rem;
}

.swatch {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background-image: radial-gradient(circle at 30% 30%, rgb(255 255 255 / 55%), transparent 60%);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
  cursor: pointer;
}

.plain {
  padding: 0.375rem 0.75rem;
  border: 1px solid light-dark(rgb(0 0 0 / 15%), rgb(255 255 255 / 20%));
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.clip {
  overflow: hidden;
  width: 12rem;
  height: 3rem;
  padding: 0.25rem;
  border: 1px dashed light-dark(rgb(0 0 0 / 25%), rgb(255 255 255 / 25%));
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 1.5rem;
}

.grid__cell {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.grid__label,
.grid__value {
  color: light-dark(#71717a, #a1a1aa);
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
}
</style>
