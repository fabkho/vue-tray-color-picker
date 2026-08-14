<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  resolveAxes,
  shadesFor,
  VIVID_SATURATION_INDEX,
  type ColorRange,
} from 'vue-tray-color-picker'

const hue = ref(210)

const ladders = computed(() =>
  (['identity', 'full'] satisfies ColorRange[]).map(range => ({
    range,
    shades: shadesFor(hue.value, VIVID_SATURATION_INDEX, range),
  })),
)

/** The cases where the ladder cannot express the input — the ring must stay off. */
const OFF_LADDER = ['#7a8b99', '#8a8a8f', '#12203f', '#f5c6d0', '#2b6af8']

const offLadder = computed(() =>
  OFF_LADDER.map((hex) => {
    const axes = resolveAxes(hex, 'identity')!
    const shades = shadesFor(axes.hue, axes.saturationIndex, 'identity')
    return { hex, shades, ringed: shades.indexOf(hex) }
  }),
)
</script>

<template>
  <h1>vue-tray-color-picker</h1>
  <p class="subtitle">
    Development surface. Cases are seeded with the awkward inputs, not a happy path.
  </p>

  <section class="case">
    <h2 class="case__title">
      The ladder
    </h2>
    <p class="case__note">
      Hue {{ hue }}°. Identity stays in the legible middle; full range reaches the extremes.
    </p>

    <input
      v-model.number="hue"
      type="range"
      min="0"
      max="360"
      style="width: 100%; max-width: 24rem"
    >

    <div
      v-for="ladder in ladders"
      :key="ladder.range"
      class="row"
    >
      <span class="row__label">{{ ladder.range }}</span>
      <span
        v-for="shade in ladder.shades"
        :key="shade"
        class="chip"
        :style="{ background: shade }"
        :title="shade"
      />
    </div>
  </section>

  <section class="case">
    <h2 class="case__title">
      Off the ladder
    </h2>
    <p class="case__note">
      The input, then the rungs nearest to it. Nothing is ringed because the input is none
      of them — pointing at one would claim a colour the preview does not show.
    </p>

    <div
      v-for="case_ in offLadder"
      :key="case_.hex"
      class="row"
    >
      <span
        class="chip chip--input"
        :style="{ background: case_.hex }"
        :title="case_.hex"
      />
      <span class="row__label">{{ case_.hex }}</span>
      <span
        v-for="shade in case_.shades"
        :key="shade"
        class="chip"
        :class="{ 'chip--ringed': shade === case_.hex }"
        :style="{ background: shade }"
        :title="shade"
      />
      <span class="row__verdict">
        {{ case_.ringed === -1 ? 'no ring' : `ringed rung ${case_.ringed}` }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.row__label {
  width: 5.5rem;
  color: light-dark(#71717a, #a1a1aa);
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
}

.row__verdict {
  margin-left: 0.5rem;
  color: light-dark(#71717a, #a1a1aa);
  font-size: 0.75rem;
}

.chip {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 8%);
}

.chip--input {
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 8%), 0 0 0 2px light-dark(#18181b, #e4e4e7);
}

.chip--ringed {
  box-shadow: 0 0 0 4px rgb(0 0 0 / 25%);
}
</style>
