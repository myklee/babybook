<script setup lang="ts">
import { computed, watch } from 'vue'
import type { BreastTimerState } from '../types/nursing'
import { formatDuration } from '../types/nursing'
import { useBackgroundTimer } from '../composables/useBackgroundTimer'
import { useHapticFeedback } from '../composables/useHapticFeedback'

interface Props {
  breast: 'left' | 'right'
  onDurationChange?: (duration: number) => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

interface Emits {
  (e: 'durationChange', duration: number): void
  (e: 'stateChange', state: BreastTimerState): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'medium'
})

const emit = defineEmits<Emits>()

// Haptic feedback
const haptic = useHapticFeedback()

// Background timer with persistence
const backgroundTimer = useBackgroundTimer({
  onTick: (duration) => {
    emit('durationChange', duration)
    if (props.onDurationChange) {
      props.onDurationChange(duration)
    }
  },
  onStateChange: (state) => {
    // Convert background timer state to BreastTimerState
    const breastTimerState: BreastTimerState = {
      isActive: state.isActive,
      isPaused: state.isPaused,
      startTime: state.startTime ? new Date(state.startTime) : null,
      pausedDuration: state.pausedDuration,
      currentDuration: backgroundTimer.currentDuration.value,
      lastPauseStart: state.lastPauseStart ? new Date(state.lastPauseStart) : null
    }
    emit('stateChange', breastTimerState)
  },
  persistKey: `breast-timer-${props.breast}`
})

// Current duration from background timer
const currentDuration = computed(() => backgroundTimer.currentDuration.value)

// Formatted duration for display (memoized for performance)
const formattedDuration = computed(() => {
  return formatDuration(currentDuration.value)
})

// Timer state computed properties
const isRunning = computed(() => backgroundTimer.isActive() && !backgroundTimer.isPaused())
const isPaused = computed(() => backgroundTimer.isPaused() && backgroundTimer.state.startTime !== null)
const isStopped = computed(() => !backgroundTimer.state.startTime)

// Button text based on state
const buttonText = computed(() => {
  if (isStopped.value) {
    return 'Start'
  } else if (isRunning.value) {
    return 'Pause'
  } else if (isPaused.value) {
    return 'Resume'
  }
  return 'Start'
})

// Button state class
const buttonStateClass = computed(() => {
  if (isRunning.value) {
    return 'active'
  } else if (isPaused.value) {
    return 'paused'
  } else {
    return 'stopped'
  }
})

// ARIA label for accessibility
const ariaLabel = computed(() => {
  const breastName = props.breast === 'left' ? 'Left breast' : 'Right breast'
  const duration = formattedDuration.value
  
  if (isStopped.value) {
    return `${breastName} timer, not started. Tap to start.`
  } else if (isRunning.value) {
    return `${breastName} timer, running for ${duration}. Tap to pause.`
  } else if (isPaused.value) {
    return `${breastName} timer, paused at ${duration}. Tap to resume.`
  }
  return `${breastName} timer`
})

// Toggle timer function
function toggleTimer() {
  if (props.disabled) return

  if (isStopped.value) {
    // Start timer
    startTimer()
  } else if (isRunning.value) {
    // Pause timer
    pauseTimer()
  } else if (isPaused.value) {
    // Resume timer
    resumeTimer()
  }
}

// Start timer
function startTimer() {
  backgroundTimer.start()
  haptic.timerStart()
}

// Pause timer
function pauseTimer() {
  backgroundTimer.pause()
  haptic.timerStop()
}

// Resume timer
function resumeTimer() {
  backgroundTimer.start() // start() handles resume logic
  haptic.timerStart()
}

// Reset timer (for external use)
function resetTimer() {
  backgroundTimer.reset()
  haptic.lightTap()
}

// Watch for duration changes to emit
watch(currentDuration, (newDuration) => {
  emit('durationChange', newDuration)
  if (props.onDurationChange) {
    props.onDurationChange(newDuration)
  }
})

// Keyboard event handler
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleTimer()
  }
}

// Expose methods for parent components
defineExpose({
  resetTimer,
  getCurrentDuration: () => currentDuration.value,
  getTimerState: () => ({
    isActive: backgroundTimer.isActive(),
    isPaused: backgroundTimer.isPaused(),
    startTime: backgroundTimer.state.startTime ? new Date(backgroundTimer.state.startTime) : null,
    pausedDuration: backgroundTimer.state.pausedDuration,
    currentDuration: currentDuration.value,
    lastPauseStart: backgroundTimer.state.lastPauseStart ? new Date(backgroundTimer.state.lastPauseStart) : null
  })
})
</script>

<template>
  <div 
    class="breast-timer" 
    :class="[
      `size-${size}`,
      `breast-${breast}`,
      buttonStateClass,
      { disabled }
    ]"
  >
    <button
      type="button"
      class="timer-button"
      :class="[buttonStateClass, { disabled }]"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-pressed="isRunning"
      @click="toggleTimer"
      @keydown="handleKeydown"
    >
      <!-- Breast Icon -->
      <div class="breast-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M12 2C8.5 2 6 4.5 6 8C6 12 8 14 10 16C11 17 12 18 12 20V22H14V20C14 18 15 17 16 16C18 14 20 12 20 8C20 4.5 17.5 2 14 2H12Z" 
            :fill="isRunning ? 'currentColor' : 'none'"
            :stroke="isRunning ? 'none' : 'currentColor'"
            stroke-width="2"
          />
          <circle cx="15" cy="8" r="1.5" fill="currentColor" />
        </svg>
      </div>

      <!-- Timer Info -->
      <div class="timer-info">
        <span class="breast-label">{{ breast === 'left' ? 'Left' : 'Right' }} Breast</span>
        <span class="timer-duration">{{ formattedDuration }}</span>
        <span class="timer-status">{{ buttonText }}</span>
      </div>

      <!-- State Indicator -->
      <div class="state-indicator" :class="buttonStateClass">
        <div v-if="isRunning" class="pulse-dot"></div>
        <div v-else-if="isPaused" class="pause-icon">⏸</div>
        <div v-else class="play-icon">▶</div>
      </div>
    </button>
  </div>
</template>

<style scoped>
/* Base Component Styles */
.breast-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 200px;
}

.timer-button {
  width: 100%;
  padding: 1.5rem 1rem;
  border: 3px solid #e5e7eb;
  border-radius: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  min-height: 140px;
  
  /* Touch-friendly for mobile */
  min-width: 44px;
  min-height: 44px;
  touch-action: manipulation;
}

.timer-button:hover:not(.disabled) {
  border-color: #dda0dd;
  background: #faf5ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(221, 160, 221, 0.2);
}

.timer-button:focus {
  outline: none;
  border-color: #dda0dd;
  box-shadow: 0 0 0 3px rgba(221, 160, 221, 0.3);
}

.timer-button:active:not(.disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(221, 160, 221, 0.3);
}

/* State-based button styles */
.timer-button.stopped {
  border-color: #d1d5db;
  background: #f9fafb;
  color: #6b7280;
}

.timer-button.stopped:hover:not(.disabled) {
  border-color: #10b981;
  background: #ecfdf5;
  color: #065f46;
}

.timer-button.active {
  border-color: #10b981;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  animation: pulse-border 2s infinite;
}

.timer-button.paused {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

.timer-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Pulse animation for active state */
@keyframes pulse-border {
  0%, 100% { 
    border-color: #10b981;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% { 
    border-color: #059669;
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
}

/* Breast Icon */
.breast-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.breast-icon svg {
  width: 100%;
  height: 100%;
}

/* Timer Info */
.timer-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
  flex-grow: 1;
}

.breast-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: currentColor;
  opacity: 0.8;
}

.timer-duration {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: currentColor;
  letter-spacing: -0.02em;
  line-height: 1;
}

.timer-status {
  font-size: 0.75rem;
  font-weight: 500;
  color: currentColor;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

/* State Indicator */
.state-indicator {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.75rem;
}

.state-indicator.active {
  background: rgba(16, 185, 129, 0.2);
}

.state-indicator.paused {
  background: rgba(245, 158, 11, 0.2);
}

.state-indicator.stopped {
  background: rgba(107, 114, 128, 0.2);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.pause-icon,
.play-icon {
  color: currentColor;
  opacity: 0.7;
}

/* Size Variations */
.size-small .timer-button {
  padding: 1rem 0.75rem;
  min-height: 120px;
}

.size-small .breast-icon {
  width: 2.5rem;
  height: 2.5rem;
}

.size-small .timer-duration {
  font-size: 1.25rem;
}

.size-small .breast-label {
  font-size: 0.8125rem;
}

.size-small .timer-status {
  font-size: 0.6875rem;
}

.size-large .timer-button {
  padding: 2rem 1.25rem;
  min-height: 180px;
}

.size-large .breast-icon {
  width: 3.5rem;
  height: 3.5rem;
}

.size-large .timer-duration {
  font-size: 1.75rem;
}

.size-large .breast-label {
  font-size: 1rem;
}

.size-large .timer-status {
  font-size: 0.875rem;
}

/* Breast-specific styling */
.breast-left .timer-button.active {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #3b82f6;
  color: #1e40af;
}

.breast-left .timer-button.active .pulse-dot {
  background: #3b82f6;
}

.breast-right .timer-button.active {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  border-color: #ec4899;
  color: #be185d;
}

.breast-right .timer-button.active .pulse-dot {
  background: #ec4899;
}

/* Responsive Design */
@media (max-width: 640px) {
  .breast-timer {
    max-width: none;
  }
  
  .timer-button {
    padding: 1.25rem 1rem;
    min-height: 130px;
  }
  
  .breast-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .timer-duration {
    font-size: 1.25rem;
  }
  
  .breast-label {
    font-size: 0.8125rem;
  }
  
  .timer-status {
    font-size: 0.6875rem;
  }
  
  .state-indicator {
    width: 1.25rem;
    height: 1.25rem;
    top: 0.5rem;
    right: 0.5rem;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .timer-button {
    border-width: 4px;
  }
  
  .timer-button.active {
    background: #000;
    color: white;
    border-color: #000;
  }
  
  .timer-button.paused {
    background: #ffff00;
    color: #000;
    border-color: #000;
  }
  
  .timer-button.stopped {
    background: #fff;
    color: #000;
    border-color: #000;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .timer-button,
  .pulse-dot,
  .state-indicator {
    animation: none;
    transition: none;
  }
  
  .timer-button:hover:not(.disabled) {
    transform: none;
  }
  
  .timer-button:active:not(.disabled) {
    transform: none;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .timer-button {
    background: #374151;
    border-color: #4b5563;
    color: white;
  }
  
  .timer-button:hover:not(.disabled) {
    background: #4b5563;
    border-color: #a78bfa;
  }
  
  .timer-button.stopped {
    background: #1f2937;
    border-color: #374151;
    color: #9ca3af;
  }
  
  .timer-button.active {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
    border-color: #10b981;
    color: #a7f3d0;
  }
  
  .timer-button.paused {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
    border-color: #f59e0b;
    color: #fde68a;
  }
  
  .state-indicator.active {
    background: rgba(16, 185, 129, 0.3);
  }
  
  .state-indicator.paused {
    background: rgba(245, 158, 11, 0.3);
  }
  
  .state-indicator.stopped {
    background: rgba(156, 163, 175, 0.3);
  }
}

/* Print Styles */
@media print {
  .breast-timer {
    break-inside: avoid;
  }
  
  .timer-button {
    border: 2px solid #000;
    background: white;
    color: black;
  }
  
  .state-indicator,
  .pulse-dot {
    display: none;
  }
}
</style>