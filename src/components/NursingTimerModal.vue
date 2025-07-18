<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import DualBreastTimer from './DualBreastTimer.vue'
import { useBabyStore } from '../stores/babyStore'

interface Props {
  isOpen: boolean
  babyId: string
  babyName: string
}

interface Emits {
  (e: 'close'): void
  (e: 'save', leftDuration: number, rightDuration: number, notes?: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const babyStore = useBabyStore()
const modalRef = ref<HTMLElement>()
const dualTimerRef = ref<InstanceType<typeof DualBreastTimer>>()
const isSaving = ref(false)

// Focus management
let previousActiveElement: HTMLElement | null = null

// Handle save from dual timer
async function handleSave(leftDuration: number, rightDuration: number, notes?: string) {
  if (isSaving.value) return
  
  isSaving.value = true
  
  try {
    await babyStore.saveNursingSession(props.babyId, leftDuration, rightDuration, notes)
    emit('save', leftDuration, rightDuration, notes)
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
  handleClose()
}

// Handle modal close
function handleClose() {
  emit('close')
}

// Handle backdrop click
function handleBackdropClick(event: MouseEvent | TouchEvent) {
  if (event.target === event.currentTarget) {
    // Just emit cancel, the DualBreastTimer will handle confirmation
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
      // Let the DualBreastTimer handle the cancel logic through its own event handler
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

// Lifecycle management
onMounted(() => {
  if (props.isOpen) {
    setupModal()
  }
})

onUnmounted(() => {
  cleanupModal()
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
function handleOpenChange() {
  if (props.isOpen) {
    setupModal()
  } else {
    cleanupModal()
  }
}

// Use a watcher-like effect
let isOpenWatcher: boolean = props.isOpen
function checkOpenChange() {
  if (isOpenWatcher !== props.isOpen) {
    isOpenWatcher = props.isOpen
    handleOpenChange()
  }
  requestAnimationFrame(checkOpenChange)
}
checkOpenChange()
</script>

<template>
  <Teleport to="body">
    <Transition
      name="modal"
      appear
    >
      <div
        v-if="isOpen"
        class="nursing-timer-modal-overlay"
        @click="handleBackdropClick"
        @touchstart.passive="handleBackdropClick"
      >
        <div
          ref="modalRef"
          class="nursing-timer-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`Nursing timer for ${babyName}`"
          tabindex="-1"
          @click.stop
        >
          <!-- Close button for accessibility -->
          <button
            class="modal-close-button"
            type="button"
            aria-label="Close nursing timer"
            @click="handleClose"
          >
            <span class="close-icon" aria-hidden="true">&times;</span>
          </button>

          <!-- Main content -->
          <div class="modal-content">
            <DualBreastTimer
              ref="dualTimerRef"
              :baby-id="babyId"
              :baby-name="babyName"
              @save="handleSave"
              @cancel="handleCancel"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.nursing-timer-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(2px);
}

/* Modal Container */
.nursing-timer-modal {
  position: relative;
  background: white;
  border-radius: 1rem;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 10px 20px rgba(0, 0, 0, 0.1);
  outline: none;
}

/* Close Button */
.modal-close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.modal-close-button:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.modal-close-button:focus {
  outline: 2px solid #dda0dd;
  outline-offset: 2px;
}

.close-icon {
  font-size: 1.5rem;
  color: #6b7280;
  line-height: 1;
}

/* Modal Content */
.modal-content {
  width: 100%;
  height: 100%;
}

/* Mobile Full-Screen Layout */
@media (max-width: 768px) {
  .nursing-timer-modal-overlay {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  .nursing-timer-modal {
    border-radius: 0;
    max-width: none;
    max-height: none;
    height: 100vh;
    width: 100vw;
    overflow-y: auto;
  }

  .modal-close-button {
    top: 0.75rem;
    right: 0.75rem;
    width: 2.25rem;
    height: 2.25rem;
    background: rgba(255, 255, 255, 0.95);
  }

  .close-icon {
    font-size: 1.25rem;
  }
}

/* Tablet Responsive */
@media (max-width: 1024px) and (min-width: 769px) {
  .nursing-timer-modal-overlay {
    padding: 0.5rem;
  }

  .nursing-timer-modal {
    max-width: 90vw;
    max-height: 95vh;
  }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .nursing-timer-modal,
.modal-leave-to .nursing-timer-modal {
  transform: scale(0.9) translateY(2rem);
}

.modal-enter-to .nursing-timer-modal,
.modal-leave-from .nursing-timer-modal {
  transform: scale(1) translateY(0);
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .nursing-timer-modal {
    background: #1f2937;
    color: white;
  }

  .modal-close-button {
    background: rgba(31, 41, 55, 0.9);
    color: #d1d5db;
  }

  .modal-close-button:hover {
    background: rgba(31, 41, 55, 1);
  }

  .modal-close-button:focus {
    outline-color: #a78bfa;
  }

  .close-icon {
    color: #d1d5db;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .nursing-timer-modal {
    border: 3px solid #000;
  }

  .modal-close-button {
    border: 2px solid #000;
    background: white;
  }

  .close-icon {
    color: #000;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-close-button {
    transition: none;
  }

  .modal-enter-from .nursing-timer-modal,
  .modal-leave-to .nursing-timer-modal {
    transform: none;
  }
}

/* Focus Visible */
.modal-close-button:focus-visible {
  outline: 2px solid #dda0dd;
  outline-offset: 2px;
}

/* Print Styles */
@media print {
  .nursing-timer-modal-overlay {
    position: static;
    background: none;
    backdrop-filter: none;
  }

  .nursing-timer-modal {
    box-shadow: none;
    border: 1px solid #000;
  }

  .modal-close-button {
    display: none;
  }
}

/* Large Screens */
@media (min-width: 1200px) {
  .nursing-timer-modal {
    max-width: 800px;
  }
}

/* Landscape Mobile */
@media (max-height: 600px) and (orientation: landscape) {
  .nursing-timer-modal-overlay {
    align-items: flex-start;
    padding-top: 0.5rem;
  }

  .nursing-timer-modal {
    max-height: calc(100vh - 1rem);
  }
}

/* Safe Area Support for iOS */
@supports (padding: max(0px)) {
  @media (max-width: 768px) {
    .nursing-timer-modal {
      padding-top: max(1rem, env(safe-area-inset-top));
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
      padding-left: max(0px, env(safe-area-inset-left));
      padding-right: max(0px, env(safe-area-inset-right));
    }

    .modal-close-button {
      top: max(0.75rem, calc(env(safe-area-inset-top) + 0.75rem));
      right: max(0.75rem, calc(env(safe-area-inset-right) + 0.75rem));
    }
  }
}
</style>