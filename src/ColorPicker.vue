<script lang="ts">
import type { Placement } from '@floating-ui/dom'
import type { ColorRange } from './color'
import type { ColorPickerLabels } from './labels'
import type { ColorSuggestion } from './suggestions'

/* Declared in the plain block rather than inline in `defineProps`, because an
   interface is only nameable from outside the component if it is exported —
   and a wrapper component cannot be typed without a name for these. */
export interface ColorPickerProps {
  /** Hex, or `null`/absent for unset. */
  modelValue?: string | null
  /** One-tap swatches; the surface stays available regardless. */
  suggestions?: readonly ColorSuggestion[]
  /** Shown in the trigger while the model is empty. May be a CSS variable. */
  defaultValue?: string
  range?: ColorRange
  commit?: 'confirm' | 'immediate'
  /** Offers a swatch that unsets the value, falling back to `defaultValue`. */
  clearable?: boolean
  disabled?: boolean
  placement?: Placement
  /** Storage key for recents. `null` disables persistence. */
  recentKey?: string | null
  recentLimit?: number
  labels?: Partial<ColorPickerLabels>
  /** Dropped onto the surface's default Save button. */
  saveClass?: string
  /** Dropped onto the surface's default Cancel button. */
  cancelClass?: string
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import ColorPopover from './ColorPopover.vue'
import ColorSurface from './ColorSurface.vue'
import { expandHex } from './color'
import { withDefaults as withLabelDefaults } from './labels'
import { useRecentColors } from './recents'
import { DEFAULT_SUGGESTIONS } from './suggestions'

const {
  modelValue = null,
  suggestions = DEFAULT_SUGGESTIONS,
  defaultValue = '#2b6af8',
  range = 'identity',
  commit = 'confirm',
  clearable = false,
  disabled = false,
  placement = 'bottom-start',
  recentKey = 'vtcp:recent',
  recentLimit = 3,
  labels,
  saveClass = '',
  cancelClass = '',
} = defineProps<ColorPickerProps>()

defineSlots<{
  /** Replaces the surface's footer entirely. */
  actions?: (scope: { save: () => void, cancel: () => void, value: string }) => unknown
  /** The tray's custom-colour affordance. */
  'custom-icon'?: () => unknown
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

/* `remember` screens out presets, but only against the suggestions in force at
   the time of writing: a stored recent outlives any change to the prop, and the
   colour it names may be a preset by the next mount. Two swatches would then
   share a `:key`, which Vue patches wrongly and warns about. Filter here, where
   the whole list is in hand, rather than trusting the write side. */
const swatches = computed(() => {
  const seen = new Set<string>()
  return [
    ...suggestions.map(suggestion => ({ value: suggestion.value, label: suggestion.label })),
    // A mixed colour has nothing to call it but its hex.
    ...recentColors.value.map(value => ({ value, label: value })),
  ].filter(({ value }) => {
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

/** Hex casing varies by source: the surface writes lower, presets are authored. */
const isSelected = (value: string) =>
  modelValue?.toLowerCase() === value.toLowerCase()

// ─── Trigger ───

const triggerEl = useTemplateRef('triggerEl')

/**
 * `defaultValue` is often a CSS variable, which the surface cannot decompose.
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

/* Annotated rather than inferred: the ref sits inside the v-for element (the
   burst wrapper) rather than on it, which is where Volar stops inferring the
   array. */
const swatchRefs = useTemplateRef<HTMLButtonElement[]>('swatchRefs')

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

/**
 * Where the arrow starts from is where the user is, not what is selected. The
 * two normally agree — the popover opens onto the swatch holding `tabindex="0"`,
 * which is the selected one — but nothing guarantees it, and after any
 * divergence stepping from the selection would jump the focus somewhere the user
 * never was.
 */
function focusedIndex() {
  const index = swatchRefs.value?.indexOf(document.activeElement as HTMLButtonElement) ?? -1
  return index === -1 ? activeIndex.value : index
}

function moveSelection(offset: number) {
  const total = swatches.value.length
  if (total === 0) return
  selectAt((focusedIndex() + offset + total) % total)
}

// ─── Burst ───
// Positions are derived, not assigned by walking the DOM after mount: the order
// is already known here, and reordering can never leave a stale index behind.

const clearIndex = computed(() => (clearable ? 0 : -1))
const swatchOffset = computed(() => (clearable ? 1 : 0))
const customIndex = computed(() => swatchOffset.value + swatches.value.length)
const burstTotal = computed(() => customIndex.value + 1)

/**
 * The items start translated left of the pill — the last one by several
 * centimetres — so without clipping they are visible as a row of specks before
 * they fly in. The clip cannot simply stay on: the hover lift rises above the
 * pill and would be cut off. So it is applied for the duration of the burst and
 * released the moment the last item lands.
 */
const bursting = ref(false)
let landed = 0
let burstFallback: ReturnType<typeof setTimeout> | undefined

function onBurstEnd(event: AnimationEvent) {
  if (event.animationName !== 'vtcp-burst-in') return
  landed += 1
  if (landed >= burstTotal.value) bursting.value = false
}

watch(trayOpen, (open) => {
  clearTimeout(burstFallback)
  if (!open) {
    bursting.value = false
    // The tray body is `v-if`'d away with it, taking the nested popover along
    // before its own toggle event can report the close. Left set, that stale
    // `true` reopens the surface unbidden the next time the tray mounts.
    surfaceOpen.value = false
    return
  }
  landed = 0
  bursting.value = true
  // If the animation never runs — disabled by a host stylesheet, say — no
  // animationend arrives and the clip would strand the lift forever.
  burstFallback = setTimeout(() => { bursting.value = false }, 1200)
})

// Unmounting mid-burst — a route change with the tray still open — otherwise
// leaves the fallback to fire into a component that no longer exists.
onBeforeUnmount(() => clearTimeout(burstFallback))

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
  surfaceOpen.value = false
}

/**
 * Immediate mode has no footer, so the surface never emits `close` — the panel
 * goes away through Escape, an outside click or the trigger instead. Watching
 * the open state catches every one of those; hooking the close event caught
 * none of them, and the history stayed empty.
 */
watch(surfaceOpen, (open) => {
  if (open || commit !== 'immediate') return
  remember(modelValue, isPreset)
})
</script>

<template>
  <ColorPopover
    v-model:open="trayOpen"
    :placement="placement"
    :disabled="disabled"
    :aria-label="t.selectColor"
  >
    <template #trigger="{ toggle, triggerAttrs }">
      <button
        ref="triggerEl"
        type="button"
        class="vtcp vtcp-trigger"
        :style="{ '--vtcp-trigger-color': modelValue || defaultValue }"
        :aria-label="t.selectColor"
        :disabled="disabled"
        v-bind="triggerAttrs"
        @click="toggle"
      />
    </template>

    <template #default>
      <!-- Mounted fresh per open, so the burst plays on insertion rather than
           needing to be restarted by hand. -->
      <div
        v-if="trayOpen"
        class="vtcp-tray"
        :class="{ 'vtcp-tray--bursting': bursting }"
        :style="{ '--burst-total': burstTotal }"
        @animationend="onBurstEnd"
      >
        <span
          v-if="clearable"
          class="vtcp-tray__item"
          :style="{ '--burst-i': clearIndex }"
        >
          <button
            type="button"
            class="vtcp-swatch vtcp-swatch--clear"
            :style="{ '--color': defaultValue }"
            :aria-label="t.useDefault"
            :aria-pressed="!modelValue"
            @click="clearColor"
          />
        </span>

        <div
          class="vtcp-tray__group"
          role="radiogroup"
          :aria-label="t.selectColor"
        >
          <span
            v-for="(swatch, index) in swatches"
            :key="swatch.value"
            class="vtcp-tray__item"
            :style="{ '--burst-i': swatchOffset + index }"
          >
            <button
              ref="swatchRefs"
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
          </span>
        </div>

        <!-- Nested layer, so the tray stays open while the surface is in use. -->
        <span
          class="vtcp-tray__item"
          :style="{ '--burst-i': customIndex }"
        >
          <ColorPopover
            v-model:open="surfaceOpen"
            placement="right-start"
            :aria-label="t.custom"
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
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    aria-hidden="true"
                  >
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                </slot>
              </button>
            </template>

            <template #default>
              <ColorSurface
                :model-value="seed"
                :range="range"
                :commit="commit"
                :labels="labels"
                :save-class="saveClass"
                :cancel-class="cancelClass"
                @update:model-value="applyCustom"
                @close="closeSurface"
              >
                <template
                  v-if="$slots.actions"
                  #actions="scope"
                >
                  <slot
                    name="actions"
                    v-bind="scope"
                  />
                </template>
              </ColorSurface>
            </template>
          </ColorPopover>
        </span>
      </div>
    </template>
  </ColorPopover>
</template>
