<script setup lang="ts">
import { autoUpdate, computePosition, flip, offset, shift, type Placement } from '@floating-ui/dom'
import { nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue'

/**
 * The default floating layer, and the designated swap-out point: a consumer with
 * their own dropdown ignores this file and renders `ColorSurface` inside theirs.
 *
 * Two responsibilities, resolved separately. Top layer, light dismiss and Escape
 * come from the native Popover API — free, and it deletes the outside-click
 * bookkeeping this would otherwise carry. Positioning is delegated, because
 * collision detection against scroll containers is the genuinely hard part.
 */

const {
  placement = 'bottom-start',
  gap = 8,
  disabled = false,
} = defineProps<{
  placement?: Placement
  /** Distance from the trigger, in pixels. */
  gap?: number
  disabled?: boolean
}>()

defineSlots<{
  trigger(scope: { open: boolean, toggle: () => void, triggerAttrs: Record<string, string> }): unknown
  default(scope: { close: () => void }): unknown
}>()

const open = defineModel<boolean>('open', { default: false })

const triggerEl = useTemplateRef('triggerEl')
const panelEl = useTemplateRef('panelEl')

/** Must be SSR-stable: a random id renders differently on the server and the
    client, and hydration reports a mismatch on both id and aria-controls. */
const panelId = useId()

const triggerAttrs = ref<Record<string, string>>({
  'aria-haspopup': 'dialog',
  'aria-expanded': 'false',
  'aria-controls': panelId,
})

watch(open, (isOpen) => {
  triggerAttrs.value = { ...triggerAttrs.value, 'aria-expanded': isOpen ? 'true' : 'false' }
})

// ─── Positioning ───

let stopAutoUpdate: (() => void) | null = null

function position() {
  const reference = triggerEl.value
  const floating = panelEl.value
  if (!reference || !floating) return
  computePosition(reference, floating, {
    placement,
    strategy: 'fixed',
    middleware: [offset(gap), flip(), shift({ padding: 8 })],
  }).then(({ x, y }) => {
    floating.style.left = `${x}px`
    floating.style.top = `${y}px`
  })
}

function startPositioning() {
  const reference = triggerEl.value
  const floating = panelEl.value
  if (!reference || !floating) return
  stopAutoUpdate = autoUpdate(reference, floating, position)
}

function stopPositioning() {
  stopAutoUpdate?.()
  stopAutoUpdate = null
}

// ─── Open / close ───

function toggle() {
  if (disabled) return
  open.value = !open.value
}

function close() {
  open.value = false
}

async function syncPopoverState(isOpen: boolean) {
  const panel = panelEl.value
  if (!panel) return

  if (isOpen) {
    panel.showPopover()
    // Panel content is often mounted by the same state change, so wait for it —
    // otherwise there is nothing to focus yet and the keyboard user is left
    // behind the panel.
    await nextTick()
    startPositioning()
    focusables(panel)[0]?.focus()
    return
  }

  stopPositioning()
  if (panel.matches(':popover-open')) panel.hidePopover()
  // The anchor is a wrapper, not the control — return focus to whatever the
  // consumer put inside it.
  if (triggerEl.value) focusables(triggerEl.value)[0]?.focus()
}

watch(open, syncPopoverState)

/* A watcher only fires on change, so a popover mounted with `open` already true
   would never be promoted to the top layer — it would sit in the page, unshown
   and unpositioned. Consumers who restore an open panel from their own state do
   exactly that. */
onMounted(() => {
  if (open.value) syncPopoverState(true)
})

/**
 * Light dismiss and Escape close the popover without going through `open`, so
 * the model has to be told. Without this the trigger's aria-expanded would lie
 * and the next click would toggle the wrong way.
 */
function onToggleEvent(event: Event) {
  const isOpen = (event as ToggleEvent).newState === 'open'
  if (!isOpen && open.value) open.value = false
}

// ─── Focus containment ───

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement)
}

/**
 * A popover lives in the top layer but keeps its place in the tab order, so Tab
 * would walk straight out into the page behind it. Wrap instead.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const panel = panelEl.value
  if (!panel) return

  const items = focusables(panel)
  if (items.length === 0) return

  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement

  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(stopPositioning)
</script>

<template>
  <span
    ref="triggerEl"
    class="vtcp-popover__anchor"
  >
    <slot
      name="trigger"
      :open="open"
      :toggle="toggle"
      :trigger-attrs="triggerAttrs"
    />
  </span>

  <div
    :id="panelId"
    ref="panelEl"
    popover="auto"
    class="vtcp vtcp-popover"
    role="dialog"
    @toggle="onToggleEvent"
    @keydown="onKeydown"
  >
    <slot :close="close" />
  </div>
</template>
