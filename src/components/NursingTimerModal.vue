<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import DualBreastTimer from './DualBreastTimer.vue'
import { useBabyStore } from '../stores/babyStore'

interface Props {
  isOpen: boolean
  babyId: string
  babyName: string
}

interface Emits {
  (e: 'close'): void
  (e: 'save', leftDuration: number, rightDuration: number, notes?: string, startTime?: Date): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const babyStore = useBabyStore()
const modalRef = ref<HTMLElement>()
const dualTimerRef = ref<InstanceType<typeof DualBreastTimer>>()
const isSaving = ref(false)

// Session persistence state
const hasActiveSession = ref(false)
const sessionStartTime = ref<Date | null>(null)
const sessionNotes = ref('')
const isRecoveringSession = ref(false)

// Focus management
let previousActiveElement: HTMLElement | null = null

const activeSession = computed(() => {
  return babyStore.getActiveNursingSession(props.babyId)
})

// Watch for active session changes
watch(() => activeSession.value, (newSession) => {
  hasActiveSession.value = !!newSession
  if (newSession) {
    sessionStartTime.value = new Date(newSession.start_time)
    sessionNotes.value = newSession.notes || ''
  }
}, { immediate: true })

// Handle save from dual timer
async function handleSave(leftDuration: number, rightDuration: number, notes?: string, startTime?: Date) {
  if (isSaving.value) return
  
  isSaving.value = true
  
  try {
    // If we have an active session, end it instead of creating a new one
    if (hasActiveSession.value) {
      // Update the active session with final durations and notes
      babyStore.updateActiveNursingSession(props.babyId, {
        left_duration: leftDuration,
        right_duration: rightDuration,
        notes: notes || ''
      })
      
      // End the active session and save to database
      await babyStore.endActiveNursingSession(props.babyId)
    } else {
      // Create a new session (fallback for non-persistent sessions)
      await babyStore.saveNursingSession(props.babyId, leftDuration, rightDuration, notes, startTime)
    }
    
    emit('save', leftDuration, rightDuration, notes, startTime)
    
    // Clear session state and close modal
    clearSessionState()
    handleClose()
  } catch (error) {
    console.error('Error saving nursing session:', error)
    // Error handling is done in the DualBreastTimer component
  } finally {
    isSaving.value = false
  }
}

// Handle cancel from dual timer
function handleCancel() {
  // If there's an active session, cancel it properly
  if (hasActiveSession.value) {
    try {
      babyStore.cancelActiveNursingSession(props.babyId)
      clearSessionState()
    } catch (error) {
      console.error('Error canceling active session:', error)
    }
  }
  
  handleClose()
}

// Handle modal close
function handleClose() {
  emit('close')
}


// Clear session state
function clearSessionState() {
  hasActiveSession.value = false
  sessionStartTime.value = null
  sessionNotes.value = ''
  isRecoveringSession.value = false
}

// Recover session when modal opens
function recoverSession() {
  if (!props.isOpen) return
  
  const existingSession = babyStore.getActiveNursingSession(props.babyId)
  if (existingSession) {
    isRecoveringSession.value = true
    hasActiveSession.value = true
    sessionStartTime.value = new Date(existingSession.start_time)
    sessionNotes.value = existingSession.notes || ''
    
    console.log('Recovered active nursing session:', existingSession.id)
    
    // Notify the dual timer to recover its state
    nextTick(() => {
      if (dualTimerRef.value && typeof dualTimerRef.value.recoverSession === 'function') {
        dualTimerRef.value.recoverSession(existingSession)
      }
      isRecoveringSession.value = false
    })
  }
}

// Handle backdrop click
function handleBackdropClick(event: MouseEvent | TouchEvent) {
  if (event.target === event.currentTarget) {
    handleCancel()
  }
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return

  switch (event.key) {
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      handleCancel()
      break
    
    case ' ': // Spacebar
      // Only handle spacebar if not focused on input elements
      if (
        event.target instanceof HTMLElement &&
        !['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)
      ) {
        event.preventDefault()
        event.stopPropagation()
        // This would toggle timers, but we'll let the DualBreastTimer handle it
        // since it has the logic for which timer to toggle
      }
      break
  }
}

// Focus management
function trapFocus(event: KeyboardEvent) {
  if (!props.isOpen || event.key !== 'Tab') return

  const modal = modalRef.value
  if (!modal) return

  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}

// Handle app backgrounding and visibility changes
function handleVisibilityChange() {
  if (document.hidden && hasActiveSession.value) {
    // App is being backgrounded with active session
    console.log('App backgrounded with active nursing session')
    // Session continues in background via store's background timer
  } else if (!document.hidden && hasActiveSession.value) {
    // App is being foregrounded with active session
    console.log('App foregrounded with active nursing session')
    // Recover session state if needed
    recoverSession()
  }
}

// Lifecycle management
onMounted(() => {
  if (props.isOpen) {
    setupModal()
  }
  
  // Add visibility change listener for background handling
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  cleanupModal()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// Watch for isOpen changes
function setupModal() {
  // Store the previously focused element
  previousActiveElement = document.activeElement as HTMLElement
  
  // Lock body scroll
  document.body.style.overflow = 'hidden'
  
  // Add event listeners
  document.addEventListener('keydown', handleKeydown, true)
  document.addEventListener('keydown', trapFocus, true)
  
  // Recover session when modal opens
  recoverSession()
  
  // Focus the modal after next tick to ensure it's rendered
  nextTick(() => {
    if (modalRef.value) {
      modalRef.value.focus()
    }
  })
}

function cleanupModal() {
  // Restore body scroll
  document.body.style.overflow = ''
  
  // Remove event listeners
  document.removeEventListener('keydown', handleKeydown, true)
  document.removeEventListener('keydown', trapFocus, true)
  
  // Restore focus to previously active element
  if (previousActiveElement) {
    previousActiveElement.focus()
    previousActiveElement = null
  }
}


// Watch for prop changes
watch(() => props.isOpen, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    if (newValue) {
      setupModal()
    } else {
      cleanupModal()
    }
  }
}, { immediate: false })
</script>

<template>
  <Teleport to="body">
    <Transition
      name="modal"
      appear
    >
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="handleBackdropClick"
        @touchstart.passive="handleBackdropClick"
      >
        <div
          ref="modalRef"
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`Nursing timer for ${babyName}`"
          tabindex="-1"
          @click.stop
        >
          <h3 class="modal-title">
            Nursing Timer for {{ babyName }}
          </h3>

          <!-- Session recovery indicator -->
          <div v-if="isRecoveringSession" class="session-recovery">
            <div class="recovery-spinner"></div>
            <span>Recovering session...</span>
          </div>

          <!-- Main content -->
          <DualBreastTimer
            ref="dualTimerRef"
            :baby-id="babyId"
            :baby-name="babyName"
            :has-active-session="hasActiveSession"
            :session-start-time="sessionStartTime"
            :session-notes="sessionNotes"
            :session-type="'nursing'"
            @save="handleSave"
            @cancel="handleCancel"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Session Recovery Indicator */
.session-recovery {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
  font-size: 0.875rem;
  color: var(--color-periwinkle);
  justify-content: center;
}

.recovery-spinner {
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
</style>
