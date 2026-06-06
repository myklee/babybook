<script setup lang="ts">
// BottleAmountInput — draggable bottle SVG for setting feeding amounts.
// Fill lives in the bottle body only; cap/neck/shoulder are decorative.
// Drag up = increase, drag down = decrease. Snaps to unit increment on every move.
import { ref, computed } from 'vue'
import type { MeasurementUnit } from '../lib/measurements'
import { getInputStep } from '../lib/measurements'

const props = defineProps<{
  modelValue: number
  unit: MeasurementUnit
  max: number
  min?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

// ─── Layout constants (SVG coordinate space) ──────────────────────────────────
const SVG_W = 60
const CAP_H = 6       // flat cap at top
const NECK_H = 18     // narrow neck below cap
const SHOULDER_H = 18 // trapezoid shoulder widening to body
const BODY_H = 120    // draggable fill lives here
const SVG_H = CAP_H + NECK_H + SHOULDER_H + BODY_H

const BODY_TOP = CAP_H + NECK_H + SHOULDER_H   // y where body starts
const BODY_BOTTOM = BODY_TOP + BODY_H           // y where body ends

// Neck x bounds
const NECK_X1 = 20
const NECK_X2 = 40
// Body x bounds
const BODY_X1 = 8
const BODY_X2 = 52

// ─── State ───────────────────────────────────────────────────────────────────
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartValue = ref(0)

// ─── Computed ────────────────────────────────────────────────────────────────
const effectiveMin = computed(() => props.min ?? 0)

const snapIncrement = computed(() => parseFloat(getInputStep(props.unit)))

const fillFraction = computed(() => {
  const range = props.max - effectiveMin.value
  if (range <= 0) return 0
  return Math.min(1, Math.max(0, (props.modelValue - effectiveMin.value) / range))
})

const fillPx = computed(() => Math.round(fillFraction.value * BODY_H))
const fillY = computed(() => BODY_TOP + (BODY_H - fillPx.value))

const amountLabel = computed(() => {
  if (props.unit === 'imperial') {
    return `${parseFloat(props.modelValue.toFixed(2))} oz`
  }
  return `${Math.round(props.modelValue)} ml`
})

const ariaValueText = computed(() => {
  if (props.unit === 'imperial') {
    return `${parseFloat(props.modelValue.toFixed(2))} ounces`
  }
  return `${Math.round(props.modelValue)} milliliters`
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function snap(raw: number): number {
  const inc = snapIncrement.value
  const snapped = Math.round(raw / inc) * inc
  return Math.min(props.max, Math.max(effectiveMin.value, snapped))
}

function yDeltaToValueDelta(deltaY: number): number {
  // Upward drag (negative deltaY) → increase value
  const range = props.max - effectiveMin.value
  return -(deltaY / BODY_H) * range
}

function applyDelta(currentY: number) {
  const deltaY = currentY - dragStartY.value
  const snapped = snap(dragStartValue.value + yDeltaToValueDelta(deltaY))
  if (snapped !== props.modelValue) {
    emit('update:modelValue', snapped)
  }
}

// ─── Pointer (mouse + stylus) ─────────────────────────────────────────────────
function onPointerDown(e: PointerEvent) {
  if (props.disabled) return
  e.preventDefault()
  isDragging.value = true
  dragStartY.value = e.clientY
  dragStartValue.value = props.modelValue
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  applyDelta(e.clientY)
}

function onPointerUp(e: PointerEvent) {
  if (!isDragging.value) return
  applyDelta(e.clientY)
  isDragging.value = false
}

// ─── Touch ───────────────────────────────────────────────────────────────────
function onTouchStart(e: TouchEvent) {
  if (props.disabled) return
  isDragging.value = true
  dragStartY.value = e.touches[0].clientY
  dragStartValue.value = props.modelValue
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  e.preventDefault() // block page scroll during drag
  applyDelta(e.touches[0].clientY)
}

function onTouchEnd(e: TouchEvent) {
  if (!isDragging.value) return
  applyDelta(e.changedTouches[0].clientY)
  isDragging.value = false
}

// ─── Keyboard ────────────────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return
  const inc = snapIncrement.value
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      emit('update:modelValue', snap(props.modelValue + inc))
      break
    case 'ArrowDown':
      e.preventDefault()
      emit('update:modelValue', snap(props.modelValue - inc))
      break
    case 'Home':
      e.preventDefault()
      emit('update:modelValue', effectiveMin.value)
      break
    case 'End':
      e.preventDefault()
      emit('update:modelValue', props.max)
      break
  }
}
</script>

<template>
  <div class="bottle-amount-input" :class="{ 'bottle-amount-input--disabled': disabled }">
    <svg
      class="bottle-svg"
      :class="{ 'bottle-svg--dragging': isDragging }"
      :width="SVG_W"
      :height="SVG_H"
      :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
      role="slider"
      tabindex="0"
      aria-label="Feeding amount"
      :aria-valuemin="effectiveMin"
      :aria-valuemax="max"
      :aria-valuenow="modelValue"
      :aria-valuetext="ariaValueText"
      :aria-disabled="disabled || undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="isDragging = false"
      @touchstart.passive="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @keydown="onKeyDown"
    >
      <defs>
        <!-- Clip path constrains fill to bottle interior -->
        <clipPath id="bottle-body-clip">
          <rect
            :x="BODY_X1 + 1"
            :y="BODY_TOP"
            :width="BODY_X2 - BODY_X1 - 2"
            :height="BODY_H"
            rx="5"
          />
        </clipPath>

        <!-- Warm milk gradient -->
        <linearGradient id="milk-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-milk-light, #fef3d0)" />
          <stop offset="100%" stop-color="var(--color-milk, #f9d77e)" />
        </linearGradient>
      </defs>

      <!-- ── Bottle body (background) ── -->
      <rect
        :x="BODY_X1"
        :y="BODY_TOP"
        :width="BODY_X2 - BODY_X1"
        :height="BODY_H"
        rx="6"
        class="bottle-body"
      />

      <!-- ── Milk fill (clipped to body interior) ── -->
      <g clip-path="url(#bottle-body-clip)">
        <rect
          :x="BODY_X1"
          :y="fillY"
          :width="BODY_X2 - BODY_X1"
          :height="fillPx"
          fill="url(#milk-fill)"
          class="bottle-fill"
        />
        <!-- Highlight shimmer on fill surface -->
        <rect
          v-if="fillPx > 6"
          :x="BODY_X1 + 4"
          :y="fillY + 3"
          width="5"
          height="2"
          rx="1"
          class="bottle-fill-shine"
        />
      </g>

      <!-- ── Measurement ticks on the right side of body ── -->
      <line
        v-for="tick in 3"
        :key="tick"
        :x1="BODY_X2 - 1"
        :y1="BODY_TOP + (BODY_H / 4) * tick"
        :x2="BODY_X2 + 4"
        :y2="BODY_TOP + (BODY_H / 4) * tick"
        class="bottle-tick"
      />

      <!-- ── Shoulder (trapezoid) ── -->
      <polygon
        :points="`${NECK_X1},${CAP_H + NECK_H} ${NECK_X2},${CAP_H + NECK_H} ${BODY_X2},${BODY_TOP} ${BODY_X1},${BODY_TOP}`"
        class="bottle-shoulder"
      />

      <!-- ── Neck ── -->
      <rect
        :x="NECK_X1"
        :y="CAP_H"
        :width="NECK_X2 - NECK_X1"
        :height="NECK_H"
        rx="2"
        class="bottle-neck"
      />

      <!-- ── Cap ── -->
      <rect
        :x="NECK_X1 - 2"
        y="0"
        :width="NECK_X2 - NECK_X1 + 4"
        :height="CAP_H + 2"
        rx="3"
        class="bottle-cap"
      />
    </svg>

    <span class="bottle-label" aria-hidden="true">{{ amountLabel }}</span>
  </div>
</template>

<style scoped>
.bottle-amount-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  user-select: none;
  -webkit-user-select: none;
}

.bottle-amount-input--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.bottle-svg {
  cursor: grab;
  touch-action: none;
  outline: none;
  overflow: visible; /* allow ticks to extend beyond viewBox */
  border-radius: 4px;
}

.bottle-svg:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 6px;
  border-radius: 4px;
}

.bottle-svg--dragging {
  cursor: grabbing;
}

/* ── Bottle shape ── */
.bottle-body {
  fill: var(--color-surface, #1e1e2e);
  stroke: var(--color-primary-light, #ba68c8);
  stroke-width: 1.5;
}

.bottle-shoulder {
  fill: var(--color-surface, #1e1e2e);
  stroke: var(--color-primary-light, #ba68c8);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.bottle-neck {
  fill: var(--color-surface, #1e1e2e);
  stroke: var(--color-primary-light, #ba68c8);
  stroke-width: 1.5;
}

.bottle-cap {
  fill: var(--color-primary-light, #ba68c8);
  stroke: none;
}

/* ── Fill ── */
.bottle-fill {
  transition: y 0.06s linear, height 0.06s linear;
}

.bottle-svg--dragging .bottle-fill {
  transition: none; /* instant tracking during drag */
}

.bottle-fill-shine {
  fill: rgba(255, 255, 255, 0.55);
}

/* ── Ticks ── */
.bottle-tick {
  stroke: var(--color-border, #555);
  stroke-width: 1;
}

/* ── Label ── */
.bottle-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  min-width: 5ch;
  letter-spacing: 0.01em;
}
</style>
