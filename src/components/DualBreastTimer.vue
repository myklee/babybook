<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BreastTimer from './BreastTimer.vue'
import type { BreastTimerState } from '../types/nursing'
import { validateDualTimerNursingSession, computeBreastUsed } from '../types/nursing'
import { useHapticFeedback } from '../composables/useHapticFeedback'

interface Props {
  babyId: string
  babyName: string
}

interface Emits {
  (e: 'save', leftDuration: number, rightDuration: number, notes?: string): void
  (e: 'cancel'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// Haptic feedback
const haptic = useHapticFeedback()

// Component state
const leftDuration = ref(0)
const rightDuration = ref(0)
const notes = ref('')
const isSaving = ref(false)
const hasStartedAnyTimer = ref(false)

// Timer state tracking
const leftTimerState = ref<BreastTimerState>({
  isActive: false,
  isPaused: false,
  startTime: null,
  pausedDuration: 0,
  currentDuration: 0,
  lastPauseStart: null
})

const rightTimerState = ref<BreastTimerState>({
  isActive: false,
  isPaused: false,
  startTime: null,
  pausedDuration: 0,
  currentDuration: 0,
  lastPauseStart: null
})

// Computed properties
const totalDuration = computed(() => leftDuration.value + rightDuration.value)

const breastUsed = computed(() => {
  if (leftDuration.value === 0 && rightDuration.value === 0) {
    return null
  }
  return computeBreastUsed(leftDuration.value, rightDuration.value)
})

const validation = computed(() => {
  // Enhanced validation with edge case handling
  const baseValidation = validateDualTimerNursingSession(leftDuration.value, rightDuration.value)
  
  // Additional edge case validations
  const additionalErrors: Array<{field: string, message: string}> = []
  const additionalWarnings: Array<{field: string, message: string}> = []
  
  // Check for extremely long sessions (over 2 hours)
  const totalMinutes = Math.floor((leftDuration.value + rightDuration.value) / 60)
  if (totalMinutes > 120) {
    additionalWarnings.push({
      field: 'duration',
      message: 'This is a very long nursing session. Please verify the duration is correct.'
    })
  }
  
  // Check for very short sessions (under 30 seconds)
  if (hasStartedAnyTimer.value && (leftDuration.value + rightDuration.value) < 30) {
    additionalWarnings.push({
      field: 'duration',
      message: 'This is a very short nursing session. Consider if this was intentional.'
    })
  }
  
  // Check for unbalanced sessions (one side much longer than the other)
  if (leftDuration.value > 0 && rightDuration.value > 0) {
    const ratio = Math.max(leftDuration.value, rightDuration.value) / Math.min(leftDuration.value, rightDuration.value)
    if (ratio > 5) {
      additionalWarnings.push({
        field: 'balance',
        message: 'One breast was used much longer than the other. This is normal but worth noting.'
      })
    }
  }
  
  return {
    ...baseValidation,
    errors: [...baseValidation.errors, ...additionalErrors],
    warnings: [...baseValidation.warnings, ...additionalWarnings]
  }
})

const canSave = computed(() => {
  return validation.value.is_valid && !isSaving.value && hasStartedAnyTimer.value
})

const isAnyTimerActive = computed(() => {
  return (leftTimerState.value.isActive && !leftTimerState.value.isPaused) ||
         (rightTimerState.value.isActive && !rightTimerState.value.isPaused)
})

const formattedTotalDuration = computed(() => {
  const minutes = Math.floor(totalDuration.value / 60)
  const seconds = totalDuration.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Event handlers
function handleLeftDurationChange(duration: number) {
  leftDuration.value = duration
  if (duration > 0) {
    hasStartedAnyTimer.value = true
  }
}

function handleRightDurationChange(duration: number) {
  rightDuration.value = duration
  if (duration > 0) {
    hasStartedAnyTimer.value = true
  }
}

function handleLeftStateChange(state: BreastTimerState) {
  leftTimerState.value = { ...state }
}

function handleRightStateChange(state: BreastTimerState) {
  rightTimerState.value = { ...state }
}

async function handleSave() {
  if (!canSave.value) return

  isSaving.value = true
  
  try {
    haptic.success()
    emit('save', leftDuration.value, rightDuration.value, notes.value || undefined)
  } catch (error) {
    console.error('Error saving nursing session:', error)
    haptic.error()
    // Handle error - could emit an error event or show a toast
  } finally {
    isSaving.value = false
  }
}

function handleCancel() {
  // Check if any timers are active and warn user
  if (isAnyTimerActive.value || hasStartedAnyTimer.value) {
    const confirmCancel = confirm(
      'You have active timers or recorded time. Are you sure you want to cancel without saving?'
    )
    if (!confirmCancel) {
      return
    }
  }
  
  haptic.lightTap()
  emit('cancel')
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleCancel()
  } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    if (canSave.value) {
      handleSave()
    }
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="dual-breast-timer">
    <!-- Header -->
    <div class="timer-header">
      <h2 class="timer-title">
        <span class="nursing-icon">🤱</span>
        Nursing Timer - {{ babyName }}
      </h2>
      <div v-if="totalDuration > 0" class="total-duration">
        Total: {{ formattedTotalDuration }}
        <span v-if="breastUsed" class="breast-indicator">
          ({{ breastUsed === 'both' ? 'Both' : breastUsed === 'left' ? 'Left' : 'Right' }})
        </span>
      </div>
    </div>

    <!-- Timer Controls -->
    <div class="timer-controls">
      <div class="breast-timers">
        <div class="timer-container">
          <BreastTimer
            breast="left"
            size="large"
            @duration-change="handleLeftDurationChange"
            @state-change="handleLeftStateChange"
          />
        </div>
        
        <div class="timer-separator">
          <div class="separator-line"></div>
          <div class="separator-text">vs</div>
          <div class="separator-line"></div>
        </div>
        
        <div class="timer-container">
          <BreastTimer
            breast="right"
            size="large"
            @duration-change="handleRightDurationChange"
            @state-change="handleRightStateChange"
          />
        </div>
      </div>
    </div>

    <!-- Notes Section -->
    <div class="notes-section">
      <label for="nursing-notes" class="notes-label">
        Notes (optional)
      </label>
      <textarea
        id="nursing-notes"
        v-model="notes"
        class="notes-input"
        placeholder="Add any notes about this nursing session..."
        rows="3"
        maxlength="500"
      ></textarea>
      <div class="notes-counter">
        {{ notes.length }}/500
      </div>
    </div>

    <!-- Validation Messages -->
    <div v-if="validation.errors.length > 0" class="validation-messages errors">
      <div class="validation-title">Please fix the following:</div>
      <ul class="validation-list">
        <li v-for="error in validation.errors" :key="error.field" class="validation-item">
          {{ error.message }}
        </li>
      </ul>
    </div>

    <div v-if="validation.warnings.length > 0" class="validation-messages warnings">
      <div class="validation-title">Please note:</div>
      <ul class="validation-list">
        <li v-for="warning in validation.warnings" :key="warning.field" class="validation-item">
          {{ warning.message }}
        </li>
      </ul>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button
        type="button"
        class="action-button cancel-button"
        @click="handleCancel"
        :disabled="isSaving"
      >
        Cancel
      </button>
      
      <button
        type="button"
        class="action-button save-button"
        @click="handleSave"
        :disabled="!canSave"
        :class="{ saving: isSaving }"
      >
        <span v-if="isSaving" class="saving-spinner"></span>
        {{ isSaving ? 'Saving...' : 'Save Session' }}
      </button>
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div class="keyboard-shortcuts">
      <span class="shortcut">
        <kbd>Esc</kbd> Cancel
      </span>
      <span class="shortcut">
        <kbd>⌘</kbd> + <kbd>Enter</kbd> Save
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Main Container */
.dual-breast-timer {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Header */
.timer-header {
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.timer-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.nursing-icon {
  font-size: 1.75rem;
}

.total-duration {
  font-size: 1.125rem;
  font-weight: 600;
  color: #6b7280;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.breast-indicator {
  font-size: 0.875rem;
  font-weight: 500;
  color: #9ca3af;
  font-family: inherit;
}

/* Timer Controls */
.timer-controls {
  flex: 1;
}

.breast-timers {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  justify-content: center;
}

.timer-container {
  flex: 1;
  max-width: 200px;
}

.timer-separator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  opacity: 0.6;
}

.separator-line {
  width: 1px;
  height: 2rem;
  background: #d1d5db;
}

.separator-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Notes Section */
.notes-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notes-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.notes-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;
}

.notes-input:focus {
  outline: none;
  border-color: #dda0dd;
  box-shadow: 0 0 0 3px rgba(221, 160, 221, 0.1);
}

.notes-input::placeholder {
  color: #9ca3af;
}

.notes-counter {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: right;
}

/* Validation Messages */
.validation-messages {
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.validation-messages.errors {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.validation-messages.warnings {
  background: #fffbeb;
  border: 1px solid #fed7aa;
  color: #d97706;
}

.validation-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.validation-list {
  margin: 0;
  padding-left: 1.25rem;
}

.validation-item {
  margin-bottom: 0.25rem;
}

.validation-item:last-child {
  margin-bottom: 0;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: center;
}

.cancel-button {
  background: white;
  border: 2px solid #d1d5db;
  color: #6b7280;
}

.cancel-button:hover:not(:disabled) {
  border-color: #9ca3af;
  color: #374151;
}

.save-button {
  background: #dda0dd;
  border: 2px solid #dda0dd;
  color: white;
}

.save-button:hover:not(:disabled) {
  background: #d8b4fe;
  border-color: #d8b4fe;
}

.save-button:disabled {
  background: #e5e7eb;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.save-button.saving {
  background: #a78bfa;
  border-color: #a78bfa;
}

.saving-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Keyboard Shortcuts */
.keyboard-shortcuts {
  display: flex;
  gap: 1rem;
  justify-content: center;
  font-size: 0.75rem;
  color: #6b7280;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

kbd {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.6875rem;
  font-family: inherit;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .dual-breast-timer {
    padding: 1rem;
    gap: 1.5rem;
  }

  .timer-title {
    font-size: 1.25rem;
  }

  .breast-timers {
    flex-direction: column;
    gap: 1rem;
  }

  .timer-separator {
    flex-direction: row;
    width: 100%;
  }

  .separator-line {
    width: 2rem;
    height: 1px;
    flex: 1;
  }

  .timer-container {
    max-width: none;
    width: 100%;
  }

  .action-buttons {
    flex-direction: column-reverse;
  }

  .action-button {
    width: 100%;
  }

  .keyboard-shortcuts {
    display: none;
  }
}

/* Tablet Responsive */
@media (max-width: 768px) and (min-width: 641px) {
  .breast-timers {
    gap: 1rem;
  }

  .timer-container {
    max-width: 180px;
  }
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .dual-breast-timer {
    background: #1f2937;
    color: white;
  }

  .timer-title {
    color: white;
  }

  .total-duration {
    color: #d1d5db;
  }

  .breast-indicator {
    color: #9ca3af;
  }

  .notes-label {
    color: #f3f4f6;
  }

  .notes-input {
    background: #374151;
    border-color: #4b5563;
    color: white;
  }

  .notes-input:focus {
    border-color: #a78bfa;
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
  }

  .notes-input::placeholder {
    color: #6b7280;
  }

  .notes-counter {
    color: #9ca3af;
  }

  .validation-messages.errors {
    background: #7f1d1d;
    border-color: #dc2626;
    color: #fca5a5;
  }

  .validation-messages.warnings {
    background: #78350f;
    border-color: #d97706;
    color: #fcd34d;
  }

  .cancel-button {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }

  .cancel-button:hover:not(:disabled) {
    border-color: #6b7280;
    color: #f3f4f6;
  }

  .keyboard-shortcuts {
    color: #9ca3af;
    border-color: #374151;
  }

  kbd {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .dual-breast-timer {
    border: 3px solid #000;
  }

  .action-button {
    border-width: 3px;
  }

  .notes-input {
    border-width: 3px;
  }

  .validation-messages {
    border-width: 3px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .action-button,
  .notes-input,
  .saving-spinner {
    transition: none;
    animation: none;
  }
}

/* Print Styles */
@media print {
  .dual-breast-timer {
    box-shadow: none;
    border: 1px solid #000;
  }

  .action-buttons,
  .keyboard-shortcuts {
    display: none;
  }

  .validation-messages {
    border: 1px solid #000;
    background: white;
    color: black;
  }
}
</style>