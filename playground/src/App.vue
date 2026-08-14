<script setup lang="ts">
import { ref } from 'vue'
import { ColorSurface } from 'vue-tray-color-picker'

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
</script>

<template>
  <h1>vue-tray-color-picker</h1>
  <p class="subtitle">
    Development surface. Cases are seeded with the awkward inputs, not a happy path.
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
