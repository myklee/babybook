<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import BreastTimer from './BreastTimer.vue'
import type { BreastTimerState } from '../types/nursing'
import { computeBreastUsed } from '../types/nursing'
import { useHapticFeedback } from '../composables/useHapticFeedback'
import { useBabyStore } from '../stores/babyStore'

interface Props {
  babyId: string
  babyName: string
  hasActiveSession?: boolean
  sessionStartTime?: Date | null
  sessionNotes?: string
}

interface Emits {
  (e: 'save', leftDuration: number, rightDuration: number, notes?: string, startTime?: Date): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Haptic feedback and store
const haptic = useHapticFeedback()
const babyStore = useBabyStore()

// Component state
const leftDuration = ref(0)
const rightDuration = ref(0)
const notes = ref('')
const isSaving = ref(false)
const hasStartedAnyTimer = ref(false)
const isSessionRecovered = ref(false)
const showAdvanced = ref(false)

// Timer state tracking
// Template refs for timer components
const leftTimerRef = ref<InstanceType<typeof BreastTimer>>()
const rightTimerRef = ref<InstanceType<typeof BreastTimer>>()

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
    
    // Start active session if not already started and not recovered
    if (!props.hasActiveSession && !isSessionRecovered.value) {
      try {
        babyStore.startActiveNursingSession(props.babyId, 'left', notes.value)
      } catch (error) {
        // Only log if it's not the "already active" error
        if (error instanceof Error && !error.message.includes('already an active nursing session')) {
          console.error('Error starting active session:', error)
        }
      }
    }
  }
}

function handleRightDurationChange(duration: number) {
  rightDuration.value = duration
  if (duration > 0) {
    hasStartedAnyTimer.value = true
    
    // Start active session if not already started and not recovered
    if (!props.hasActiveSession && !isSessionRecovered.value) {
      try {
        babyStore.startActiveNursingSession(props.babyId, 'right', notes.value)
      } catch (error) {
        // Only log if it's not the "already active" error
        if (error instanceof Error && !error.message.includes('already an active nursing session')) {
          console.error('Error starting active session:', error)
        }
      }
    }
  }
}

function handleLeftStateChange(state: BreastTimerState) {
  leftTimerState.value = { ...state }
}

function handleRightStateChange(state: BreastTimerState) {
  rightTimerState.value = { ...state }
}

async function handleSave() {
  if (isSaving.value) return

  isSaving.value = true
  
  try {
    // Automatic time handling: Calculate actual start time from timer states
    const actualStartTime = calculateActualStartTime()
    
    haptic.success()
    emit('save', leftDuration.value, rightDuration.value, notes.value || undefined, actualStartTime)
    
    // Reset both timers after successful save, but preserve notes
    resetTimersOnly()
  } catch (error) {
    console.error('Error saving nursing session:', error)
    haptic.error()
    // Handle error - could emit an error event or show a toast
  } finally {
    isSaving.value = false
  }
}

// Calculate the actual start time based on timer states
function calculateActualStartTime(): Date {
  const now = new Date()
  
  // Find the earliest start time from both timers
  let earliestStartTime: Date | null = null
  
  if (leftTimerState.value.startTime) {
    earliestStartTime = leftTimerState.value.startTime
  }
  
  if (rightTimerState.value.startTime) {
    if (!earliestStartTime || rightTimerState.value.startTime < earliestStartTime) {
      earliestStartTime = rightTimerState.value.startTime
    }
  }
  
  // If we have an actual start time from timers, use it
  if (earliestStartTime) {
    return earliestStartTime
  }
  
  // Fallback: calculate from total duration (existing behavior)
  const totalDuration = leftDuration.value + rightDuration.value
  return new Date(now.getTime() - (totalDuration * 1000))
}

function handleCancel() {
  // Show simple confirmation if there's any timer activity or notes
  if (hasStartedAnyTimer.value || notes.value.trim()) {
    const shouldCancel = confirm('Cancel this nursing session?')
    
    if (shouldCancel) {
      // User chose "OK" (Cancel) - reset timers and close
      stopAllTimers()
      haptic.lightTap()
      emit('cancel')
    }
    // If user chose "Cancel" (Continue nursing session), do nothing - timers keep running
    return
  }
  
  // No activity, just close
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
    handleSave()
  }
}

// Session recovery method (called by parent modal)
function recoverSession(activeSession: any) {
  if (!activeSession) return
  
  console.log('Recovering session in DualBreastTimer:', activeSession)
  
  // Restore session data
  leftDuration.value = activeSession.left_duration || 0
  rightDuration.value = activeSession.right_duration || 0
  notes.value = activeSession.notes || ''
  hasStartedAnyTimer.value = true
  isSessionRecovered.value = true
  
  // The individual BreastTimer components will handle their own state recovery
  // based on the durations we've set here
}

// Reset only timers (called after successful save)
function resetTimersOnly() {
  // Stop timers via component refs
  if (leftTimerRef.value?.stopTimer) {
    leftTimerRef.value.stopTimer()
  }
  if (rightTimerRef.value?.stopTimer) {
    rightTimerRef.value.stopTimer()
  }
  
  // Reset timer state but preserve notes and advanced options
  leftDuration.value = 0
  rightDuration.value = 0
  hasStartedAnyTimer.value = false
  isSessionRecovered.value = false
}

// Stop all timers (called when cancelling session)
function stopAllTimers() {
  // Reset timers
  resetTimersOnly()
  
  // Also clear notes and advanced options
  notes.value = ''
  showAdvanced.value = false
}

// Initialize from props if active session exists
function initializeFromProps() {
  if (props.hasActiveSession && props.sessionNotes) {
    notes.value = props.sessionNotes
    hasStartedAnyTimer.value = true
  }
}

// Debounced notes update
let notesUpdateTimeout: ReturnType<typeof setTimeout> | null = null

// Watch for changes in notes and sync with active session
watch(notes, (newNotes) => {
  if (props.hasActiveSession && hasStartedAnyTimer.value) {
    // Clear existing timeout
    if (notesUpdateTimeout) {
      clearTimeout(notesUpdateTimeout)
    }
    
    // Set new timeout for debounced update
    notesUpdateTimeout = setTimeout(() => {
      try {
        babyStore.updateActiveNursingSession(props.babyId, {
          notes: newNotes
        })
      } catch (error) {
        console.error('Error updating session notes:', error)
      }
    }, 500)
  }
})

// Watch for duration changes and sync with active session
watch([leftDuration, rightDuration], ([newLeft, newRight]) => {
  if (props.hasActiveSession && hasStartedAnyTimer.value) {
    try {
      babyStore.updateActiveNursingSession(props.babyId, {
        left_duration: newLeft,
        right_duration: newRight
      })
    } catch (error) {
      console.error('Error updating session durations:', error)
    }
  }
})

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  initializeFromProps()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  
  // Clean up notes update timeout
  if (notesUpdateTimeout) {
    clearTimeout(notesUpdateTimeout)
  }
})

// Expose methods for parent component
defineExpose({
  recoverSession,
  handleSave,
  stopAllTimers
})
</script>

<template>
  <div class="dual-breast-timer">
    <!-- Duration Display -->
    <div v-if="totalDuration > 0" class="duration-display">
      <span class="duration-time">{{ formattedTotalDuration }}</span>
      <span v-if="breastUsed" class="breast-used">
        {{ breastUsed === 'both' ? 'Both Breasts' : breastUsed === 'left' ? 'Left Breast' : 'Right Breast' }}
      </span>
    </div>

    <!-- Timer Controls -->
    <div class="timer-controls">
      <div class="breast-timers">
        <div class="timer-container">
          <BreastTimer
            ref="leftTimerRef"
            breast="left"
            size="large"
            @duration-change="handleLeftDurationChange"
            @state-change="handleLeftStateChange"
          />
        </div>
        
        <div class="timer-separator">
          <div class="separator-line"></div>
          <div class="separator-text">and</div>
          <div class="separator-line"></div>
        </div>
        
        <div class="timer-container">
          <BreastTimer
            ref="rightTimerRef"
            breast="right"
            size="large"
            @duration-change="handleRightDurationChange"
            @state-change="handleRightStateChange"
          />
        </div>
      </div>
    </div>

    <!-- Advanced Options Toggle -->
    <div class="advanced-toggle">
      <button
        type="button"
        @click="showAdvanced = !showAdvanced"
        class="toggle-btn"
      >
        <span>{{ showAdvanced ? "Hide" : "More" }} Options</span>
        <span class="arrow" :class="{ rotated: showAdvanced }">▼</span>
      </button>
    </div>

    <!-- Advanced Options -->
    <div v-if="showAdvanced" class="advanced-options">
      <div class="form-group">
        <label>Notes</label>
        <textarea
          v-model="notes"
          rows="2"
          placeholder="Optional notes..."
          maxlength="500"
        ></textarea>
        <div class="notes-counter">{{ notes.length }}/500</div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="form-actions">
      <button
        type="button"
        class="btn btn-save"
        @click="handleSave"
        :disabled="isSaving"
      >
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
      <button
        type="button"
        class="btn btn-cancel"
        @click="handleCancel"
        :disabled="isSaving"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Main Container */
.dual-breast-timer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0;
}

/* Duration Display */
.duration-display {
  text-align: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.duration-time {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-periwinkle);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  display: block;
}

.breast-used {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
  display: block;
}

/* Timer Controls */
.timer-controls {
  padding: 0 1rem;
}

.breast-timers {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.timer-container {
  flex: 1;
  max-width: 150px;
}

.timer-separator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  opacity: 0.6;
}

.separator-line {
  width: 1px;
  height: 1.5rem;
  background: rgba(255, 255, 255, 0.3);
}

.separator-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Advanced Toggle */
.advanced-toggle {
  margin: 1rem 0;
  text-align: center;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-periwinkle);
  text-decoration: underline;
}

.arrow {
  transition: transform 0.2s;
}

.arrow.rotated {
  transform: rotate(180deg);
}

/* Advanced Options */
.advanced-options {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.notes-counter {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  margin-top: 0.25rem;
}
</style>
