<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import type { Placement } from '@floating-ui/dom'
import ColorPopover from './ColorPopover.vue'
import ColorSurface from './ColorSurface.vue'
import { expandHex, type ColorRange } from './color'
import { withDefaults as withLabelDefaults, type ColorPickerLabels } from './labels'
import { useRecentColors } from './recents'
import { DEFAULT_SUGGESTIONS, type ColorSuggestion } from './suggestions'

const {
  modelValue,
  suggestions = DEFAULT_SUGGESTIONS,
  defaultColor = '#2b6af8',
  range = 'identity',
  commit = 'confirm',
  clearable = false,
  disabled = false,
  placement = 'bottom-start',
  recentKey = 'vtcp:recent',
  recentLimit = 3,
  labels,
} = defineProps<{
  modelValue: string | null
  /** One-tap swatches; the surface stays available regardless. */
  suggestions?: readonly ColorSuggestion[]
  /** Shown in the trigger while the model is empty. May be a CSS variable. */
  defaultColor?: string
  range?: ColorRange
  commit?: 'confirm' | 'immediate'
  /** Offers a swatch that unsets the value, falling back to `defaultColor`. */
  clearable?: boolean
  disabled?: boolean
  placement?: Placement
  /** Storage key for recents. `null` disables persistence. */
  recentKey?: string | null
  recentLimit?: number
  labels?: Partial<ColorPickerLabels>
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string | null]
}>()

const t = computed(() => withLabelDefaults(labels))

const trayOpen = ref(false)
const surfaceOpen = ref(false)

// ─── Swatches ───
// Presets first, then colours the user mixed, so a custom choice is one tap away
// next time.

const { colors: recentColors, remember } = useRecentColors(() => recentKey, () => recentLimit)

const isPreset = (value: string) =>
  suggestions.some(suggestion => suggestion.value.toLowerCase() === value.toLowerCase())

const swatches = computed(() => [
  ...suggestions.map(suggestion => ({ value: suggestion.value, label: suggestion.label })),
  // A mixed colour has nothing to call it but its hex.
  ...recentColors.value.map(value => ({ value, label: value })),
])

/** Hex casing varies by source: the surface writes lower, presets are authored. */
const isSelected = (value: string) =>
  modelValue?.toLowerCase() === value.toLowerCase()

// ─── Trigger ───

const triggerEl = useTemplateRef('triggerEl')

/**
 * `defaultColor` is often a CSS variable, which the surface cannot decompose.
 * Reading it back off the rendered element returns the substituted value.
 * Resolved when the tray opens rather than per render — getComputedStyle forces
 * a style recalculation, and it is meaningless on the server.
 */
const seed = ref<string | null>(null)

function resolveSeed() {
  if (modelValue) {
    seed.value = expandHex(modelValue) ?? modelValue
    return
  }
  const resolved = triggerEl.value
    ? getComputedStyle(triggerEl.value).getPropertyValue('--vtcp-trigger-color').trim()
    : ''
  seed.value = expandHex(resolved)
}

watch(trayOpen, open => open && resolveSeed())

// ─── Selection ───

function selectSwatch(color: string) {
  emit('update:modelValue', color)
  trayOpen.value = false
}

function clearColor() {
  emit('update:modelValue', null)
  trayOpen.value = false
}

const swatchRefs = useTemplateRef('swatchRefs')

const selectedIndex = computed(() =>
  swatches.value.findIndex(swatch => isSelected(swatch.value)),
)

/** The group is one tab stop; arrows move within it. */
const activeIndex = computed(() => Math.max(selectedIndex.value, 0))

/** Arrow keys both move focus and select, per the radio-group pattern. */
function selectAt(index: number) {
  const swatch = swatches.value[index]
  if (!swatch) return
  emit('update:modelValue', swatch.value)
  nextTick(() => swatchRefs.value?.[index]?.focus())
}

function moveSelection(offset: number) {
  const total = swatches.value.length
  if (total === 0) return
  selectAt((activeIndex.value + offset + total) % total)
}

// ─── Surface ───

function applyCustom(color: string) {
  emit('update:modelValue', color)
  // Immediate mode writes on every move; those intermediates are not choices, so
  // both remembering and collapsing wait for the panel to be dismissed.
  if (commit === 'immediate') return
  remember(color, isPreset)
  surfaceOpen.value = false
  trayOpen.value = false
}

function closeSurface() {
  if (commit === 'immediate') remember(modelValue, isPreset)
  surfaceOpen.value = false
}
</script>

<template>
  <ColorPopover
    v-model:open="trayOpen"
    :placement="placement"
    :disabled="disabled"
  >
    <template #trigger="{ toggle, triggerAttrs }">
      <button
        ref="triggerEl"
        type="button"
        class="vtcp vtcp-trigger"
        :style="{ '--vtcp-trigger-color': modelValue || defaultColor }"
        :aria-label="t.selectColor"
        :disabled="disabled"
        v-bind="triggerAttrs"
        @click="toggle"
      />
    </template>

    <template #default>
      <div class="vtcp-tray">
        <button
          v-if="clearable"
          type="button"
          class="vtcp-swatch vtcp-swatch--clear"
          :style="{ '--color': defaultColor }"
          :aria-label="t.useDefault"
          :aria-pressed="!modelValue"
          @click="clearColor"
        />

        <div
          class="vtcp-tray__group"
          role="radiogroup"
          :aria-label="t.selectColor"
        >
          <button
            v-for="(swatch, index) in swatches"
            ref="swatchRefs"
            :key="swatch.value"
            type="button"
            role="radio"
            class="vtcp-swatch"
            :style="{ '--color': swatch.value }"
            :aria-label="swatch.label"
            :aria-checked="isSelected(swatch.value)"
            :tabindex="index === activeIndex ? 0 : -1"
            @click="selectSwatch(swatch.value)"
            @keydown.left.prevent="moveSelection(-1)"
            @keydown.up.prevent="moveSelection(-1)"
            @keydown.right.prevent="moveSelection(1)"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.home.prevent="selectAt(0)"
            @keydown.end.prevent="selectAt(swatches.length - 1)"
          />
        </div>

        <!-- Nested layer, so the tray stays open while the surface is in use. -->
        <ColorPopover
          v-model:open="surfaceOpen"
          placement="right-start"
        >
          <template #trigger="{ toggle, triggerAttrs }">
            <button
              type="button"
              class="vtcp-swatch vtcp-swatch--custom"
              :aria-label="t.custom"
              v-bind="triggerAttrs"
              @click="toggle"
            >
              <slot name="custom-icon">
                +
              </slot>
            </button>
          </template>

          <template #default>
            <ColorSurface
              :model-value="seed"
              :range="range"
              :commit="commit"
              :labels="labels"
              @update:model-value="applyCustom"
              @close="closeSurface"
            />
          </template>
        </ColorPopover>
      </div>
    </template>
  </ColorPopover>
</template>
