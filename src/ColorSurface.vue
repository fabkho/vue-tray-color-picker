<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import {
  hexToHsl,
  hslToHex,
  isHex,
  lightnessSteps,
  resolveAxes,
  SATURATION_STEPS,
  shadesFor,
  VIVID_SATURATION_INDEX,
  type ColorRange,
} from './color'
import { withDefaults as withLabelDefaults, type ColorPickerLabels } from './labels'

const {
  modelValue,
  range = 'identity',
  commit = 'confirm',
  disabled = false,
  labels,
} = defineProps<{
  modelValue: string | null
  /** `full` adds the greyscale rung and hex entry, for surface and theme colours. */
  range?: ColorRange
  /** `immediate` writes on every move and drops the footer. */
  commit?: 'confirm' | 'immediate'
  disabled?: boolean
  labels?: Partial<ColorPickerLabels>
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
  'close': []
}>()

const t = computed(() => withLabelDefaults(labels))

// ─── Draft ───
// The draft starts as the incoming value verbatim and only becomes a generated
// colour once a control moves. Opening on #FFF must not silently snap it.

const FALLBACK = '#2b6af8'

const draft = ref(FALLBACK)
const hexInput = ref(FALLBACK)
const hue = ref(210)
const saturationIndex = ref(VIVID_SATURATION_INDEX)
const lightnessIndex = ref(2)

/** `echo` off when the change came from the hex field: rewriting it mid-typing
    moves the caret. */
function adopt(color: string, echo = true) {
  draft.value = color
  if (echo) hexInput.value = color.toUpperCase()
  const hsl = hexToHsl(color)
  const axes = resolveAxes(color, range)
  if (!hsl || !axes) return
  // A grey carries no usable hue — keep the one already showing, so dragging
  // saturation back up returns to the colour the user came from.
  if (hsl.s > 0) hue.value = axes.hue
  saturationIndex.value = axes.saturationIndex
  lightnessIndex.value = axes.lightnessIndex
}

/** In `immediate` mode our own writes come back through `modelValue`;
    re-adopting them re-snaps the axes under a control being dragged. */
watch(() => modelValue, (color) => {
  if (color?.toLowerCase() === draft.value.toLowerCase()) return
  adopt(color && isHex(color) ? color : FALLBACK)
}, { immediate: true })

function publish() {
  if (commit === 'immediate') emit('update:modelValue', draft.value)
}

/** Any control moving recomputes the draft from the three axes. */
function syncFromAxes() {
  const next = hslToHex(
    hue.value,
    SATURATION_STEPS[saturationIndex.value]!,
    lightnessSteps(range)[lightnessIndex.value]!,
  )
  draft.value = next
  hexInput.value = next.toUpperCase()
  publish()
}

watch(hexInput, (value) => {
  if (!isHex(value)) return
  // `adopt` writes the field in upper case, which lands back here. Re-adopting
  // would overwrite the draft with that upper-cased copy and emit it, so a
  // caller's `#7a8b99` would come back as `#7A8B99`.
  if (value.toLowerCase() === draft.value.toLowerCase()) return
  adopt(value, false)
  publish()
})

// ─── Shades ───

const shades = computed(() => shadesFor(hue.value, saturationIndex.value, range))

/**
 * The ring marks the rung the draft *is*, not the one it snapped to. An
 * off-ladder colour leaves every rung unringed rather than pointing at one that
 * is visibly a different colour from the preview.
 */
const selectedShade = computed(() =>
  shades.value.findIndex(shade => shade.toLowerCase() === draft.value.toLowerCase()),
)

/** Endpoints of the saturation band, at the rung currently chosen. */
const saturationTrack = computed(() => ({
  from: hslToHex(hue.value, SATURATION_STEPS[0]!, lightnessSteps(range)[lightnessIndex.value]!),
  to: hslToHex(hue.value, SATURATION_STEPS.at(-1)!, lightnessSteps(range)[lightnessIndex.value]!),
}))

const shadeRefs = useTemplateRef('shadeRefs')

/** Arrow keys move and select together, per the radio-group pattern. */
function selectShade(index: number) {
  lightnessIndex.value = index
  syncFromAxes()
  nextTick(() => shadeRefs.value?.[index]?.focus())
}

function moveShade(offset: number) {
  const total = lightnessSteps(range).length
  selectShade((lightnessIndex.value + offset + total) % total)
}

const hexInvalid = computed(() => hexInput.value.length > 0 && !isHex(hexInput.value))

/** Two surfaces on one page must not share a label's `for` target. */
const hexId = useId()

function save() {
  emit('update:modelValue', draft.value)
  emit('close')
}
</script>

<template>
  <div class="vtcp vtcp-surface">
    <div class="vtcp-surface__head">
      <span
        class="vtcp-surface__preview"
        :style="{ '--preview': draft }"
      />

      <div class="vtcp-surface__bands">
        <input
          v-model.number="hue"
          class="vtcp-band vtcp-band--hue"
          type="range"
          min="0"
          max="360"
          :disabled="disabled"
          :aria-label="t.hue"
          @input="syncFromAxes"
        >

        <input
          v-if="range === 'full'"
          v-model.number="saturationIndex"
          class="vtcp-band"
          type="range"
          min="0"
          :max="SATURATION_STEPS.length - 1"
          :style="{ '--from': saturationTrack.from, '--to': saturationTrack.to }"
          :disabled="disabled"
          :aria-label="t.saturation"
          @input="syncFromAxes"
        >
      </div>
    </div>

    <div
      class="vtcp-shades"
      role="radiogroup"
      :aria-label="t.shades"
    >
      <button
        v-for="(shade, index) in shades"
        ref="shadeRefs"
        :key="shade"
        type="button"
        role="radio"
        class="vtcp-shade"
        :style="{ '--color': shade }"
        :aria-label="shade"
        :aria-checked="index === selectedShade"
        :tabindex="index === lightnessIndex ? 0 : -1"
        :disabled="disabled"
        @click="selectShade(index)"
        @keydown.left.prevent="moveShade(-1)"
        @keydown.up.prevent="moveShade(-1)"
        @keydown.right.prevent="moveShade(1)"
        @keydown.down.prevent="moveShade(1)"
        @keydown.home.prevent="selectShade(0)"
        @keydown.end.prevent="selectShade(shades.length - 1)"
      />
    </div>

    <div v-if="range === 'full'">
      <label
        class="vtcp-sr-only"
        :for="hexId"
      >{{ t.hexValue }}</label>
      <input
        :id="hexId"
        v-model="hexInput"
        class="vtcp-hex"
        type="text"
        maxlength="7"
        spellcheck="false"
        autocomplete="off"
        :disabled="disabled"
        :aria-invalid="hexInvalid"
      >
    </div>

    <div
      v-if="commit === 'confirm'"
      class="vtcp-surface__footer"
    >
      <button
        type="button"
        class="vtcp-action vtcp-action--secondary"
        @click="emit('close')"
      >
        {{ t.cancel }}
      </button>
      <button
        type="button"
        class="vtcp-action vtcp-action--primary"
        :style="{ '--preview': draft }"
        :disabled="disabled"
        @click="save"
      >
        {{ t.save }}
      </button>
    </div>
  </div>
</template>
