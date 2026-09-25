<script lang="ts">
import type { Placement } from '@floating-ui/dom'

/**
 * The default floating layer, and the designated swap-out point: a consumer with
 * their own dropdown ignores this file and renders `ColorSurface` inside theirs.
 *
 * Two responsibilities, resolved separately. Top layer, light dismiss and Escape
 * come from the native Popover API — free, and it deletes the outside-click
 * bookkeeping this would otherwise carry. Positioning is delegated, because
 * collision detection against scroll containers is the genuinely hard part.
 */

/* Named and exported because this is a documented extension point: swapping the
   floating layer means writing a component that stands in for this one, and that
   cannot be typed against an anonymous literal. */
export interface ColorPopoverProps {
  placement?: Placement
  /** Distance from the trigger, in pixels. */
  gap?: number
  disabled?: boolean
  /** Names the dialog. The trigger promises `aria-haspopup="dialog"`, and a
      dialog with no name is announced as just "dialog" — say which one. */
  ariaLabel?: string
}
</script>

<script setup lang="ts">
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { computed, nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue'

const {
  placement = 'bottom-start',
  gap = 8,
  disabled = false,
  ariaLabel,
} = defineProps<ColorPopoverProps>()

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

/* Derived, not seeded-and-corrected: a watcher only fires on change, so a
   popover mounted with `open` already true — the case `onMounted` below exists
   to handle — would render `aria-expanded="false"` until the first toggle. */
const triggerAttrs = computed<Record<string, string>>(() => ({
  'aria-haspopup': 'dialog',
  'aria-expanded': open.value ? 'true' : 'false',
  'aria-controls': panelId,
}))

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
  // Idempotent: starting twice without this drops the first registration's
  // cleanup on the floor, and its scroll/resize observers outlive the close.
  stopPositioning()
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
    // A close can land during that await — a double click, or a programmatic
    // dismiss. It runs to completion first, hiding the panel; resuming blind
    // would then position a hidden panel, register an autoUpdate nothing will
    // ever cancel, and pull focus into a `display: none` subtree.
    if (!open.value) return
    startPositioning()
    initialFocus(panel)?.focus()
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

// ─── Focus ───
//
// Deliberately no Tab trap. `popover="auto"` is non-modal by definition: the
// page behind stays live and stays reachable, and a trap would give the
// keyboard a boundary that the pointer and the screen-reader cursor do not
// share — two navigation models disagreeing about where the dialog ends. The
// consistent alternatives are both worse here: `aria-modal` plus `inert` on the
// background buys real modality this UI does not want, and the trap without
// them was only ever half of it.
//
// Nothing needs to replace it. The panel is nested inside the anchor, so
// document order runs trigger → panel → whatever follows, and Tab already walks
// into the panel and back out to the right place on its own.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Tab stops, not merely focusable elements. A roving-tabindex radio is still a
 * `button:not([disabled])`, so the selector alone would hand back every rung of
 * a group that offers exactly one tab stop — and `initialFocus` would then land
 * on a rung the group did not choose.
 */
function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement)
    .filter(el => el.tabIndex >= 0)
}

/**
 * A roving-tabindex group carries its own idea of where the user is: the one
 * member holding `tabindex="0"`. Landing on the first focusable instead would
 * drop a keyboard user somewhere the group did not choose, and their first
 * arrow key would then move from the wrong place.
 */
function initialFocus(panel: HTMLElement): HTMLElement | undefined {
  const items = focusables(panel)
  return items.find(el => el.getAttribute('tabindex') === '0') ?? items[0]
}

onBeforeUnmount(stopPositioning)
</script>

<template>
  <!--
    One root, with the panel nested inside the anchor rather than beside it. As
    two roots this is a fragment, and Vue silently drops fallthrough class and
    style onto a fragment — so `<ColorPicker class="...">` did nothing at all,
    which is a surprising way for a component to behave.

    Nesting costs nothing: the panel is promoted to the top layer, so where it
    sits in the tree does not affect how it paints.
  -->
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

    <div
      :id="panelId"
      ref="panelEl"
      popover="auto"
      class="vtcp vtcp-popover"
      role="dialog"
      :aria-label="ariaLabel"
      @toggle="onToggleEvent"
    >
      <slot :close="close" />
    </div>
  </span>
</template>
