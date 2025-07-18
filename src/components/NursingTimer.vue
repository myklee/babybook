<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  babyId: string
  babyName: string
}

interface Emits {
  (e: 'save', data: { leftDuration: number; rightDuration: number; notes: string }): void
  (e: 'close'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// Timer states for each breast
const leftTimer = ref({
  isActive: false,
  startTime: null as Date | null,
  pausedTime: 0, // Total paused time in ms
  lastPauseStart: null as Date | null
})

const rightTimer = ref({
  isActive: false,
  startTime: null as Date | null,
  pausedTime: 0, // Total paused time in ms
  lastPauseStart: null as Date | null
})

const currentTime = ref(new Date())
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null)
const notes = ref('')
const isSaving = ref(false)

// Computed durations for each breast
const leftDuration = computed(() => {
  if (!leftTimer.value.startTime) return 0
  
  const now = currentTime.value
  const elapsed = now.getTime() - leftTimer.value.startTime.getTime()
  const pausedTime = leftTimer.value.pausedTime
  const currentPause = leftTimer.value.lastPauseStart 
    ? now.getTime() - leftTimer.value.lastPauseStart.getTime() 
    : 0
  
  return Math.max(0, elapsed - pausedTime - currentPause)
})

const rightDuration = computed(() => {
  if (!rightTimer.value.startTime) return 0
  
  const now = currentTime.value
  const elapsed = now.getTime() - rightTimer.value.startTime.getTime()
  const pausedTime = rightTimer.value.pausedTime
  const currentPause = rightTimer.value.lastPauseStart 
    ? now.getTime() - rightTimer.value.lastPauseStart.getTime() 
    : 0
  
  return Math.max(0, elapsed - pausedTime - currentPause)
})

// Format duration for display
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `0:${seconds.toString().padStart(2, '0')}`
  }
}

// Toggle left breast timer
function toggleLeftTimer() {
  if (!leftTimer.value.startTime) {
    // Start timer
    leftTimer.value.startTime = new Date()
    leftTimer.value.isActive = true
    leftTimer.value.pausedTime = 0
    leftTimer.value.lastPauseStart = null
  } else if (leftTimer.value.isActive) {
    // Pause timer
    leftTimer.value.isActive = false
    leftTimer.value.lastPauseStart = new Date()
  } else {
    // Resume timer
    if (leftTimer.value.lastPauseStart) {
      leftTimer.value.pausedTime += new Date().getTime() - leftTimer.value.lastPauseStart.getTime()
      leftTimer.value.lastPauseStart = null
    }
    leftTimer.value.isActive = true
  }
}

// Toggle right breast timer
function toggleRightTimer() {
  if (!rightTimer.value.startTime) {
    // Start timer
    rightTimer.value.startTime = new Date()
    rightTimer.value.isActive = true
    rightTimer.value.pausedTime = 0
    rightTimer.value.lastPauseStart = null
  } else if (rightTimer.value.isActive) {
    // Pause timer
    rightTimer.value.isActive = false
    rightTimer.value.lastPauseStart = new Date()
  } else {
    // Resume timer
    if (rightTimer.value.lastPauseStart) {
      rightTimer.value.pausedTime += new Date().getTime() - rightTimer.value.lastPauseStart.getTime()
      rightTimer.value.lastPauseStart = null
    }
    rightTimer.value.isActive = true
  }
}

// Get button text for breast timer
function getButtonText(timer: typeof leftTimer.value, side: 'Left' | 'Right'): string {
  if (!timer.startTime) {
    return `Start ${side}`
  } else if (timer.isActive) {
    return `Pause ${side}`
  } else {
    return `Resume ${side}`
  }
}

// Get button state class
function getButtonClass(timer: typeof leftTimer.value): string {
  if (!timer.startTime) {
    return 'start'
  } else if (timer.isActive) {
    return 'active'
  } else {
    return 'paused'
  }
}

// Check if any timer is running
const hasActiveTimer = computed(() => {
  return leftTimer.value.isActive || rightTimer.value.isActive
})

// Check if any timer has been started
const hasStartedTimer = computed(() => {
  return leftTimer.value.startTime || rightTimer.value.startTime
})

// Save nursing session
async function saveSession() {
  if (!hasStartedTimer.value) {
    alert('Please start at least one timer before saving.')
    return
  }

  isSaving.value = true
  
  try {
    // Calculate final durations in minutes
    const leftMinutes = Math.floor(leftDuration.value / (1000 * 60))
    const rightMinutes = Math.floor(rightDuration.value / (1000 * 60))
    
    emit('save', {
      leftDuration: leftMinutes,
      rightDuration: rightMinutes,
      notes: notes.value
    })
  } catch (error) {
    console.error('Error saving nursing session:', error)
    alert('Failed to save nursing session. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// Start the update interval
function startUpdateInterval() {
  if (timerInterval.value) return
  
  timerInterval.value = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
}

// Stop the update interval
function stopUpdateInterval() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

// Lifecycle hooks
onMounted(() => {
  startUpdateInterval()
})

onUnmounted(() => {
  stopUpdateInterval()
})
</script>

<template>
  <div class="nursing-timer-modal">
    <!-- Header -->
    <div class="modal-header">
      <h3 class="modal-title">
        <span class="nursing-icon">🤱</span>
        Nursing Timer - {{ babyName }}
      </h3>
      <button 
        type="button" 
        class="close-btn"
        @click="$emit('close')"
        aria-label="Close nursing timer"
      >
        ×
      </button>
    </div>

    <!-- Breast Timer Buttons -->
    <div class="breast-timers">
      <!-- Left Breast -->
      <div class="breast-timer">
        <button
          type="button"
          class="breast-btn"
          :class="getButtonClass(leftTimer)"
          @click="toggleLeftTimer"
          :aria-label="`${getButtonText(leftTimer, 'Left')} - ${formatDuration(leftDuration)}`"
        >
          <div class="breast-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 2C8.5 2 6 4.5 6 8C6 12 8 14 10 16C11 17 12 18 12 20V22H14V20C14 18 15 17 16 16C18 14 20 12 20 8C20 4.5 17.5 2 14 2H12Z" 
                :fill="leftTimer.isActive ? 'currentColor' : 'none'"
                :stroke="leftTimer.isActive ? 'none' : 'currentColor'"
                stroke-width="2"
              />
              <circle cx="15" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div class="breast-info">
            <span class="breast-label">Left Breast</span>
            <span class="breast-time">{{ formatDuration(leftDuration) }}</span>
            <span class="breast-status">{{ getButtonText(leftTimer, 'Left') }}</span>
          </div>
        </button>
      </div>

      <!-- Right Breast -->
      <div class="breast-timer">
        <button
          type="button"
          class="breast-btn"
          :class="getButtonClass(rightTimer)"
          @click="toggleRightTimer"
          :aria-label="`${getButtonText(rightTimer, 'Right')} - ${formatDuration(rightDuration)}`"
        >
          <div class="breast-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 2C8.5 2 6 4.5 6 8C6 12 8 14 10 16C11 17 12 18 12 20V22H14V20C14 18 15 17 16 16C18 14 20 12 20 8C20 4.5 17.5 2 14 2H12Z" 
                :fill="rightTimer.isActive ? 'currentColor' : 'none'"
                :stroke="rightTimer.isActive ? 'none' : 'currentColor'"
                stroke-width="2"
              />
              <circle cx="15" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div class="breast-info">
            <span class="breast-label">Right Breast</span>
            <span class="breast-time">{{ formatDuration(rightDuration) }}</span>
            <span class="breast-status">{{ getButtonText(rightTimer, 'Right') }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Session Summary -->
    <div v-if="hasStartedTimer" class="session-summary">
      <div class="summary-item">
        <span class="summary-label">Total Time:</span>
        <span class="summary-value">
          {{ formatDuration(leftDuration + rightDuration) }}
        </span>
      </div>
      <div v-if="hasActiveTimer" class="active-indicator">
        <span class="pulse-dot"></span>
        <span>Session in progress...</span>
      </div>
    </div>

    <!-- Notes Section -->
    <div class="notes-section">
      <label for="nursing-notes" class="notes-label">Notes (optional)</label>
      <textarea
        id="nursing-notes"
        v-model="notes"
        placeholder="Add any notes about this nursing session..."
        rows="2"
        class="notes-input"
      ></textarea>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button
        type="button"
        class="action-btn save-btn"
        @click="saveSession"
        :disabled="!hasStartedTimer || isSaving"
      >
        <svg v-if="!isSaving" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div v-else class="spinner"></div>
        <span v-if="isSaving">Saving...</span>
        <span v-else>End Nursing</span>
      </button>
      
      <button
        type="button"
        class="action-btn cancel-btn"
        @click="$emit('close')"
        :disabled="isSaving"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Modal Container */
.nursing-timer-modal {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #7c3aed;
}

.nursing-icon {
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Breast Timer Buttons */
.breast-timers {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  justify-content: center;
}

.breast-timer {
  flex: 1;
  max-width: 200px;
}

.breast-btn {
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
}

.breast-btn:hover {
  border-color: #dda0dd;
  background: #faf5ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(221, 160, 221, 0.2);
}

.breast-btn.start {
  border-color: #d1d5db;
  background: #f9fafb;
}

.breast-btn.active {
  border-color: #10b981;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  animation: pulse 2s infinite;
}

.breast-btn.paused {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.breast-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breast-icon svg {
  width: 100%;
  height: 100%;
}

.breast-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
}

.breast-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.breast-time {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: #1f2937;
  letter-spacing: -0.02em;
}

.breast-status {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Session Summary */
.session-summary {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.summary-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.summary-value {
  font-size: 1.125rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: #1f2937;
}

.active-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #059669;
  font-weight: 500;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Notes Section */
.notes-section {
  padding: 1.5rem;
}

.notes-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.notes-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s ease;
}

.notes-input:focus {
  border-color: #dda0dd;
  box-shadow: 0 0 0 3px rgba(221, 160, 221, 0.1);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn svg {
  width: 1rem;
  height: 1rem;
}

.save-btn {
  background: #10b981;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.save-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinner Animation */
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 640px) {
  .nursing-timer-modal {
    width: 95%;
    margin: 1rem;
  }
  
  .breast-timers {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .breast-timer {
    max-width: none;
  }
  
  .breast-btn {
    padding: 1.25rem 1rem;
  }
  
  .breast-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .breast-time {
    font-size: 1.25rem;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .breast-btn {
    border-width: 4px;
  }
  
  .breast-btn.active {
    background: #000;
    color: white;
    border-color: #000;
  }
  
  .breast-btn.paused {
    background: #ffff00;
    color: #000;
    border-color: #000;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .breast-btn,
  .action-btn {
    transition: none;
  }
  
  .breast-btn:hover,
  .action-btn:hover {
    transform: none;
  }
  
  .pulse-dot,
  .breast-btn.active {
    animation: none;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .nursing-timer-modal {
    background: #1f2937;
    color: white;
  }
  
  .modal-header {
    border-bottom-color: #374151;
  }
  
  .modal-title {
    color: #a78bfa;
  }
  
  .close-btn {
    color: #9ca3af;
  }
  
  .close-btn:hover {
    background: #374151;
    color: #f3f4f6;
  }
  
  .breast-btn {
    background: #374151;
    border-color: #4b5563;
    color: white;
  }
  
  .breast-btn:hover {
    background: #4b5563;
    border-color: #a78bfa;
  }
  
  .session-summary {
    background: #374151;
    border-color: #4b5563;
  }
  
  .notes-input {
    background: #374151;
    border-color: #4b5563;
    color: white;
  }
  
  .notes-input:focus {
    border-color: #a78bfa;
  }
  
  .cancel-btn {
    background: #374151;
    color: #f3f4f6;
  }
  
  .cancel-btn:hover {
    background: #4b5563;
  }
}
</style>