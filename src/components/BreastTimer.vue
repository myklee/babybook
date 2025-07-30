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

// Timer state computed properties - access state reactively
const isRunning = computed(() => backgroundTimer.state.value.isActive && !backgroundTimer.state.value.isPaused)
const isPaused = computed(() => backgroundTimer.state.value.isPaused && backgroundTimer.state.value.startTime !== null)
const isStopped = computed(() => !backgroundTimer.state.value.startTime)


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

// Stop timer (for cancellation)
function stopTimer() {
  backgroundTimer.stop()
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
  stopTimer,
  getCurrentDuration: () => currentDuration.value,
  getTimerState: () => ({
    isActive: backgroundTimer.state.value.isActive,
    isPaused: backgroundTimer.state.value.isPaused,
    startTime: backgroundTimer.state.value.startTime ? new Date(backgroundTimer.state.value.startTime) : null,
    pausedDuration: backgroundTimer.state.value.pausedDuration,
    currentDuration: currentDuration.value,
    lastPauseStart: backgroundTimer.state.value.lastPauseStart ? new Date(backgroundTimer.state.value.lastPauseStart) : null
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
      <!-- Breast Label -->
      <div class="breast-header">
        <span class="breast-title">{{ breast === 'left' ? 'Left' : 'Right' }}</span>
      </div>

      <!-- Play/Pause Icon -->
      <div class="timer-icon">
        <svg v-if="isStopped" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg v-else-if="isRunning" class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        <svg v-else-if="isPaused" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>

      <!-- Timer Display -->
      <div class="timer-display">
        <span class="timer-duration">{{ formattedDuration }}</span>
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
  padding: 1rem 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--color-periwinkle);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-height: 120px;
  
  /* Touch-friendly for mobile */
  min-width: 44px;
  min-height: 44px;
  touch-action: manipulation;
}

.timer-button:hover:not(.disabled) {
  border-color: #9c27b0;
  background: rgba(156, 39, 176, 0.1);
}

.timer-button:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.timer-button:active:not(.disabled) {
  background: rgba(156, 39, 176, 0.15);
}

/* State-based button styles - simplified */
.timer-button.stopped {
  border-color: #d1d5db;
  background: white;
  color: #374151;
}

.timer-button.stopped:hover:not(.disabled) {
  border-color: #9ca3af;
  background: #f9fafb;
}

.timer-button.active {
  border-color: #10b981;
  background: #f0fdf4;
  color: #065f46;
}

.timer-button.paused {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #92400e;
}

.timer-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}



/* Breast Header */
.breast-header {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.5rem 0;
}

.breast-title {
  font-size: 1rem;
  font-weight: 600;
  color: currentColor;
  text-align: center;
}

/* Timer Icon */
.timer-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.5rem 0;
}

.play-icon,
.pause-icon {
  width: 3rem;
  height: 3rem;
  color: currentColor;
  opacity: 0.8;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.timer-button:hover .play-icon,
.timer-button:hover .pause-icon {
  opacity: 1;
  transform: scale(1.05);
}

/* Timer Display */
.timer-display {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}



.timer-duration {
  font-size: 1.75rem;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: currentColor;
  letter-spacing: -0.02em;
  line-height: 1;
}

/* Status Text */
.status-text {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.status-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: currentColor;
  opacity: 0.8;
}

/* Action Text */
.action-text {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.action-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: currentColor;
  text-transform: none;
}

/* Size Variations */
.size-small .timer-button {
  padding: 1rem 0.75rem;
  min-height: 120px;
}

.size-small .breast-title {
  font-size: 0.875rem;
}

.size-small .timer-duration {
  font-size: 1.5rem;
}

.size-small .status-label,
.size-small .action-label {
  font-size: 0.75rem;
}

.size-large .timer-button {
  padding: 2rem 1.25rem;
  min-height: 180px;
}

.size-large .breast-title {
  font-size: 1.125rem;
}

.size-large .timer-duration {
  font-size: 2rem;
}

.size-large .status-label,
.size-large .action-label {
  font-size: 1rem;
}

/* Simplified breast-specific styling */
.breast-left .timer-button.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1e40af;
}

.breast-right .timer-button.active {
  background: #fdf2f8;
  border-color: #ec4899;
  color: #be185d;
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
  
  .breast-title {
    font-size: 0.875rem;
  }
  
  .timer-duration {
    font-size: 1.5rem;
  }
  
  .status-label,
  .action-label {
    font-size: 0.75rem;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .timer-button {
    border-width: 3px;
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
  .timer-button {
    transition: none;
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
    border-color: #6b7280;
  }
  
  .timer-button.stopped {
    background: #1f2937;
    border-color: #374151;
    color: #9ca3af;
  }
  
  .timer-button.active {
    background: #064e3b;
    border-color: #10b981;
    color: #a7f3d0;
  }
  
  .timer-button.paused {
    background: #78350f;
    border-color: #f59e0b;
    color: #fde68a;
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
}
</style>