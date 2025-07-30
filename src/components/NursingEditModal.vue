<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { format } from 'date-fns'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import BreastSelector from './BreastSelector.vue'
import type { CompletedNursingSession, BreastType } from '../types/nursing'

interface Props {
  isOpen: boolean
  session: CompletedNursingSession | null
  babyName?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'save', updatedSession: CompletedNursingSession): void
  (e: 'cancel'): void
  (e: 'delete', sessionId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Modal refs
const modalRef = ref<HTMLElement>()
const firstInputRef = ref<HTMLElement>()

// Form state
const editSession = ref<CompletedNursingSession | null>(null)
const isSaving = ref(false)
const isDeleting = ref(false)
const showDeleteConfirmation = ref(false)
const validationErrors = ref<Array<{ field: string; message: string }>>([])

// Form fields
const startDate = ref('')
const startTime = ref<{ hour: string; minute: string; ampm: 'AM' | 'PM' }>({ 
  hour: '12', 
  minute: '00', 
  ampm: 'AM' 
})
const endDate = ref('')
const endTime = ref<{ hour: string; minute: string; ampm: 'AM' | 'PM' }>({ 
  hour: '12', 
  minute: '00', 
  ampm: 'AM' 
})
const breastUsed = ref<BreastType>('left')
const notes = ref('')

// Focus management
let previousActiveElement: HTMLElement | null = null

// Computed properties
const isValid = computed(() => {
  return validationErrors.value.length === 0 && editSession.value !== null
})

// Helper function to get errors for a specific field
const getFieldErrors = (fieldName: string) => {
  return validationErrors.value.filter(error => error.field === fieldName)
}

// Helper function to check if a field has errors
const hasFieldError = (fieldName: string) => {
  return validationErrors.value.some(error => error.field === fieldName)
}

// Computed properties for field-specific error states
const startDateErrors = computed(() => getFieldErrors('start_date'))
const startTimeErrors = computed(() => getFieldErrors('start_time'))
const endDateErrors = computed(() => getFieldErrors('end_date'))
const endTimeErrors = computed(() => getFieldErrors('end_time'))
const durationErrors = computed(() => getFieldErrors('duration'))
const notesErrors = computed(() => getFieldErrors('notes'))

// Computed property for general errors (not field-specific)
const generalErrors = computed(() => {
  return validationErrors.value.filter(error => 
    !['start_date', 'start_time', 'end_date', 'end_time', 'duration', 'notes'].includes(error.field)
  )
})

const calculatedDuration = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  
  const startDateTime = getDateTimeFromInputs(startDate.value, startTime.value)
  const endDateTime = getDateTimeFromInputs(endDate.value, endTime.value)
  
  if (!startDateTime || !endDateTime) return 0
  
  const durationMs = endDateTime.getTime() - startDateTime.getTime()
  return Math.max(0, Math.floor(durationMs / 1000)) // Duration in seconds
})

const durationDisplay = computed(() => {
  const totalSeconds = calculatedDuration.value
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  
  if (minutes === 0) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  } else if (seconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
  }
})

// Utility functions
function getDateTimeFromInputs(dateStr: string, timeObj: { hour: string; minute: string; ampm: 'AM' | 'PM' }): Date | null {
  if (!dateStr || !timeObj.hour || !timeObj.minute) return null
  
  const [year, month, day] = dateStr.split('-').map(Number)
  let hour = Number(timeObj.hour)
  
  // Convert 12-hour to 24-hour format
  if (timeObj.ampm === 'PM' && hour < 12) hour += 12
  if (timeObj.ampm === 'AM' && hour === 12) hour = 0
  
  return new Date(year, month - 1, day, hour, Number(timeObj.minute), 0, 0)
}

function setDateTimeInputs(timestamp: string, isEndTime = false) {
  const date = new Date(timestamp)
  const dateString = format(date, 'yyyy-MM-dd')
  const hour = date.getHours()
  const minute = date.getMinutes()
  
  const timeObj = {
    ampm: (hour >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
    hour: String(hour === 0 ? 12 : hour > 12 ? hour - 12 : hour),
    minute: String(minute).padStart(2, '0')
  }
  
  if (isEndTime) {
    endDate.value = dateString
    endTime.value = timeObj
  } else {
    startDate.value = dateString
    startTime.value = timeObj
  }
}

// Validation
function validateSession(): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = []
  
  // Validate required fields
  if (!startDate.value) {
    errors.push({ field: 'start_date', message: 'Start date is required' })
  }
  
  if (!endDate.value) {
    errors.push({ field: 'end_date', message: 'End date is required' })
  }
  
  if (!startTime.value.hour || !startTime.value.minute) {
    errors.push({ field: 'start_time', message: 'Start time is required' })
  }
  
  if (!endTime.value.hour || !endTime.value.minute) {
    errors.push({ field: 'end_time', message: 'End time is required' })
  }
  
  // Validate time logic if all required fields are present
  if (startDate.value && endDate.value && startTime.value.hour && endTime.value.hour) {
    const startDateTime = getDateTimeFromInputs(startDate.value, startTime.value)
    const endDateTime = getDateTimeFromInputs(endDate.value, endTime.value)
    
    if (!startDateTime) {
      errors.push({ field: 'start_time', message: 'Invalid start date or time format' })
    }
    
    if (!endDateTime) {
      errors.push({ field: 'end_time', message: 'Invalid end date or time format' })
    }
    
    if (startDateTime && endDateTime) {
      const now = new Date()
      const durationMs = endDateTime.getTime() - startDateTime.getTime()
      const durationMinutes = durationMs / (1000 * 60)
      const durationHours = durationMs / (1000 * 60 * 60)
      
      // Check if start time is in the future
      if (startDateTime > now) {
        errors.push({ field: 'start_time', message: 'Start time cannot be in the future' })
      }
      
      // Check if end time is in the future
      if (endDateTime > now) {
        errors.push({ field: 'end_time', message: 'End time cannot be in the future' })
      }
      
      // Check if end time is after start time
      if (endDateTime <= startDateTime) {
        const timeDiff = Math.abs(durationMinutes)
        if (timeDiff < 1) {
          errors.push({ field: 'end_time', message: 'End time must be at least 1 minute after start time' })
        } else {
          errors.push({ field: 'end_time', message: 'End time must be after start time' })
        }
      }
      
      // Only validate duration if end time is after start time
      if (endDateTime > startDateTime) {
        // Check for very short duration (less than 30 seconds)
        if (durationMs < 30000) {
          errors.push({ field: 'duration', message: 'Session duration must be at least 30 seconds' })
        }
        
        // Check for unreasonably short duration (less than 1 minute) with warning
        else if (durationMinutes < 1) {
          errors.push({ field: 'duration', message: 'Session duration is very short (less than 1 minute). Please verify the times are correct.' })
        }
        
        // Check for very long duration (more than 4 hours) with warning
        else if (durationHours > 4) {
          if (durationHours > 24) {
            errors.push({ field: 'duration', message: 'Session duration cannot exceed 24 hours' })
          } else {
            errors.push({ field: 'duration', message: `Session duration is ${Math.round(durationHours * 10) / 10} hours. Please verify this is correct.` })
          }
        }
        
        // Check for sessions spanning multiple days
        const startDay = startDateTime.toDateString()
        const endDay = endDateTime.toDateString()
        if (startDay !== endDay && durationHours > 12) {
          errors.push({ field: 'duration', message: 'Multi-day sessions longer than 12 hours should be split into separate sessions' })
        }
      }
      
      // Validate date range (not more than 1 year ago)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      if (startDateTime < oneYearAgo) {
        errors.push({ field: 'start_date', message: 'Start date cannot be more than 1 year ago' })
      }
      
      if (endDateTime < oneYearAgo) {
        errors.push({ field: 'end_date', message: 'End date cannot be more than 1 year ago' })
      }
    }
  }
  
  // Validate notes length
  if (notes.value && notes.value.length > 500) {
    errors.push({ field: 'notes', message: 'Notes cannot exceed 500 characters' })
  }
  
  return errors
}

// Event handlers
function handleSave() {
  if (isSaving.value || !editSession.value) return
  
  // Validate the session
  const errors = validateSession()
  validationErrors.value = errors
  
  if (errors.length > 0) {
    // Focus the first field with an error
    const firstErrorField = errors[0].field
    nextTick(() => {
      const errorElement = modalRef.value?.querySelector(`[data-field="${firstErrorField}"]`) as HTMLElement
      if (errorElement) {
        errorElement.focus()
      }
    })
    return
  }
  
  isSaving.value = true
  
  try {
    const startDateTime = getDateTimeFromInputs(startDate.value, startTime.value)
    const endDateTime = getDateTimeFromInputs(endDate.value, endTime.value)
    
    if (!startDateTime || !endDateTime) {
      throw new Error('Invalid date/time values')
    }
    
    // Calculate durations based on breast used
    const totalDurationSeconds = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000)
    let leftDuration = 0
    let rightDuration = 0
    
    // Distribute duration based on breast selection
    if (breastUsed.value === 'left') {
      leftDuration = totalDurationSeconds
    } else if (breastUsed.value === 'right') {
      rightDuration = totalDurationSeconds
    } else if (breastUsed.value === 'both') {
      // For 'both', split the duration evenly
      leftDuration = Math.floor(totalDurationSeconds / 2)
      rightDuration = totalDurationSeconds - leftDuration
    }
    
    const updatedSession: CompletedNursingSession = {
      ...editSession.value,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      left_duration: leftDuration,
      right_duration: rightDuration,
      total_duration: totalDurationSeconds,
      breast_used: breastUsed.value,
      notes: notes.value.trim(),
      amount: null, // Always null for nursing sessions
      duration_minutes: Math.floor(totalDurationSeconds / 60),
      duration_display: durationDisplay.value
    }
    
    emit('save', updatedSession)
  } catch (error) {
    console.error('Error saving nursing session:', error)
    validationErrors.value = [{ field: 'general', message: 'Failed to save session. Please try again.' }]
  } finally {
    isSaving.value = false
  }
}

function handleCancel() {
  emit('cancel')
  emit('close')
}

function handleClose() {
  emit('close')
}

function handleDeleteClick() {
  showDeleteConfirmation.value = true
}

function handleDeleteCancel() {
  showDeleteConfirmation.value = false
}

async function handleDeleteConfirm() {
  if (!editSession.value || isDeleting.value) return
  
  isDeleting.value = true
  
  try {
    emit('delete', editSession.value.id)
    showDeleteConfirmation.value = false
  } catch (error) {
    console.error('Error deleting nursing session:', error)
    validationErrors.value = [{ field: 'general', message: 'Failed to delete session. Please try again.' }]
  } finally {
    isDeleting.value = false
  }
}

// Handle backdrop click
function handleBackdropClick(event: MouseEvent | TouchEvent) {
  if (event.target === event.currentTarget) {
    handleCancel()
  }
}

// Keyboard handling
function handleKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return

  switch (event.key) {
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      handleCancel()
      break
    
    case 'Enter':
      // Only handle Enter if not in textarea
      if (event.target instanceof HTMLElement && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault()
        event.stopPropagation()
        handleSave()
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

// Setup and cleanup
function setupModal() {
  // Store the previously focused element
  previousActiveElement = document.activeElement as HTMLElement
  
  // Lock body scroll
  document.body.style.overflow = 'hidden'
  
  // Add event listeners
  document.addEventListener('keydown', handleKeydown, true)
  document.addEventListener('keydown', trapFocus, true)
  
  // Focus the first input after next tick
  nextTick(() => {
    try {
      if (firstInputRef.value) {
        // Check if it's a Vue component with $el or a DOM element
        const element = (firstInputRef.value as any)?.$el || firstInputRef.value
        if (element && typeof element.focus === 'function') {
          element.focus()
        } else if (element && element.querySelector) {
          // Try to find a focusable element within the component
          const focusable = element.querySelector('input, select, textarea, button')
          if (focusable && typeof focusable.focus === 'function') {
            focusable.focus()
          }
        }
      } else if (modalRef.value) {
        modalRef.value.focus()
      }
    } catch (error) {
      console.warn('Could not focus first input:', error)
      // Fallback to modal focus
      if (modalRef.value) {
        modalRef.value.focus()
      }
    }
  })
}

function cleanupModal() {
  // Clear validation timeout
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value)
    validationTimeout.value = null
  }
  
  // Reset delete confirmation state
  showDeleteConfirmation.value = false
  isDeleting.value = false
  
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

// Initialize form data when session changes
function initializeFormData() {
  if (!props.session) {
    editSession.value = null
    return
  }
  
  editSession.value = { ...props.session }
  
  // Set form fields from session data
  setDateTimeInputs(props.session.start_time, false)
  setDateTimeInputs(props.session.end_time, true)
  breastUsed.value = props.session.breast_used
  notes.value = props.session.notes || ''
  
  // Clear validation errors
  validationErrors.value = []
}

// Watchers
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    initializeFormData()
    setupModal()
  } else {
    cleanupModal()
  }
}, { immediate: false })

watch(() => props.session, () => {
  if (props.isOpen) {
    initializeFormData()
  }
}, { immediate: true })

// Real-time validation with debouncing for better performance
const validationTimeout = ref<NodeJS.Timeout | null>(null)

function debounceValidation() {
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value)
  }
  
  validationTimeout.value = setTimeout(() => {
    if (props.isOpen && editSession.value) {
      validationErrors.value = validateSession()
    }
  }, 300) // 300ms debounce
}

// Real-time validation for time inputs
watch([startDate, startTime, endDate, endTime], () => {
  debounceValidation()
}, { deep: true })

// Real-time validation for notes
watch(notes, () => {
  debounceValidation()
})

// Immediate validation for critical fields (no debounce)
watch([startDate, endDate], () => {
  if (props.isOpen && editSession.value) {
    // Immediate validation for date changes
    const currentErrors = validateSession()
    const dateErrors = currentErrors.filter(error => 
      error.field === 'start_date' || 
      error.field === 'end_date' ||
      error.field === 'start_time' ||
      error.field === 'end_time'
    )
    
    // Update only date-related errors immediately
    validationErrors.value = [
      ...validationErrors.value.filter(error => 
        error.field !== 'start_date' && 
        error.field !== 'end_date' &&
        error.field !== 'start_time' &&
        error.field !== 'end_time'
      ),
      ...dateErrors
    ]
  }
})

// Lifecycle
onMounted(() => {
  if (props.isOpen) {
    initializeFormData()
    setupModal()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      name="modal"
      appear
    >
      <div
        v-if="isOpen"
        class="nursing-edit-modal-overlay"
        @click="handleBackdropClick"
        @touchstart.passive="handleBackdropClick"
      >
        <div
          ref="modalRef"
          class="nursing-edit-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`Edit nursing session${babyName ? ` for ${babyName}` : ''}`"
          tabindex="-1"
          @click.stop
        >
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">
              Edit Nursing Session
              <span v-if="babyName" class="baby-name">for {{ babyName }}</span>
            </h2>
            <button
              class="modal-close-button"
              type="button"
              aria-label="Close edit modal"
              @click="handleClose"
            >
              <span class="close-icon" aria-hidden="true">&times;</span>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <form @submit.prevent="handleSave" class="edit-form">
              <!-- Start Time Section -->
              <div class="form-section">
                <h3 class="section-title">Start Time</h3>
                <div class="time-inputs">
                  <div class="form-group">
                    <label for="start-date" class="form-label">Date</label>
                    <DatePicker 
                      id="start-date"
                      ref="firstInputRef"
                      v-model="startDate"
                      data-field="start_date"
                      :class="{ 'error': hasFieldError('start_date') }"
                    />
                    <div v-if="startDateErrors.length > 0" class="field-errors">
                      <div v-for="error in startDateErrors" :key="error.message" class="field-error">
                        {{ error.message }}
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="start-time" class="form-label">Time</label>
                    <TimePicker 
                      v-model="startTime"
                      data-field="start_time"
                      :class="{ 'error': hasFieldError('start_time') }"
                    />
                    <div v-if="startTimeErrors.length > 0" class="field-errors">
                      <div v-for="error in startTimeErrors" :key="error.message" class="field-error">
                        {{ error.message }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- End Time Section -->
              <div class="form-section">
                <h3 class="section-title">End Time</h3>
                <div class="time-inputs">
                  <div class="form-group">
                    <label for="end-date" class="form-label">Date</label>
                    <DatePicker 
                      id="end-date"
                      v-model="endDate"
                      data-field="end_date"
                      :class="{ 'error': hasFieldError('end_date') }"
                    />
                    <div v-if="endDateErrors.length > 0" class="field-errors">
                      <div v-for="error in endDateErrors" :key="error.message" class="field-error">
                        {{ error.message }}
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="end-time" class="form-label">Time</label>
                    <TimePicker 
                      v-model="endTime"
                      data-field="end_time"
                      :class="{ 'error': hasFieldError('end_time') }"
                    />
                    <div v-if="endTimeErrors.length > 0" class="field-errors">
                      <div v-for="error in endTimeErrors" :key="error.message" class="field-error">
                        {{ error.message }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Duration Display -->
              <div class="form-section">
                <div class="duration-display" :class="{ 'error': hasFieldError('duration') }">
                  <span class="duration-label">Duration:</span>
                  <span class="duration-value">{{ durationDisplay }}</span>
                  <span class="duration-note">(calculated automatically)</span>
                </div>
                <div v-if="durationErrors.length > 0" class="field-errors">
                  <div v-for="error in durationErrors" :key="error.message" class="field-error">
                    {{ error.message }}
                  </div>
                </div>
              </div>

              <!-- Breast Selection -->
              <div class="form-section">
                <h3 class="section-title">Breast Used</h3>
                <BreastSelector 
                  v-model="breastUsed"
                  size="medium"
                  :show-labels="true"
                />
              </div>

              <!-- Notes -->
              <div class="form-section">
                <div class="form-group">
                  <label for="notes" class="form-label">
                    Notes
                    <span class="character-count">({{ notes.length }}/500)</span>
                  </label>
                  <textarea
                    id="notes"
                    v-model="notes"
                    class="notes-textarea"
                    :class="{ 'error': hasFieldError('notes') }"
                    placeholder="Add any notes about this nursing session..."
                    rows="3"
                    maxlength="500"
                  ></textarea>
                  <div v-if="notesErrors.length > 0" class="field-errors">
                    <div v-for="error in notesErrors" :key="error.message" class="field-error">
                      {{ error.message }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- General Validation Errors -->
              <div v-if="generalErrors.length > 0" class="validation-errors">
                <h4 class="errors-title">Please fix the following errors:</h4>
                <ul class="errors-list">
                  <li v-for="error in generalErrors" :key="error.field" class="error-item">
                    {{ error.message }}
                  </li>
                </ul>
              </div>
            </form>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <div class="footer-left">
              <button
                type="button"
                class="btn btn-delete"
                @click="handleDeleteClick"
                :disabled="isSaving || isDeleting"
              >
                Delete Session
              </button>
            </div>
            <div class="footer-right">
              <button
                type="button"
                class="btn btn-cancel"
                @click="handleCancel"
                :disabled="isSaving || isDeleting"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-save"
                @click="handleSave"
                :disabled="!isValid || isSaving || isDeleting"
              >
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Delete Confirmation Dialog -->
  <Teleport to="body">
    <Transition name="modal" appear>
      <div
        v-if="showDeleteConfirmation"
        class="delete-confirmation-overlay"
        @click="handleDeleteCancel"
      >
        <div
          class="delete-confirmation-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirmation-title"
          @click.stop
        >
          <div class="delete-confirmation-header">
            <h3 id="delete-confirmation-title" class="delete-confirmation-title">
              Delete Nursing Session
            </h3>
          </div>
          
          <div class="delete-confirmation-content">
            <p class="delete-confirmation-message">
              Are you sure you want to delete this nursing session? This action cannot be undone.
            </p>
            <div v-if="editSession" class="session-details">
              <p class="session-detail">
                <strong>Start:</strong> {{ format(new Date(editSession.start_time), 'MMM d, yyyy h:mm a') }}
              </p>
              <p class="session-detail">
                <strong>Duration:</strong> {{ durationDisplay }}
              </p>
              <p class="session-detail">
                <strong>Breast:</strong> {{ editSession.breast_used === 'left' ? 'Left' : editSession.breast_used === 'right' ? 'Right' : 'Both' }}
              </p>
            </div>
          </div>
          
          <div class="delete-confirmation-footer">
            <button
              type="button"
              class="btn btn-cancel"
              @click="handleDeleteCancel"
              :disabled="isDeleting"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-delete-confirm"
              @click="handleDeleteConfirm"
              :disabled="isDeleting"
            >
              {{ isDeleting ? 'Deleting...' : 'Delete Session' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.nursing-edit-modal-overlay {
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
.nursing-edit-modal {
  position: relative;
  background: white;
  border-radius: 1rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 10px 20px rgba(0, 0, 0, 0.1);
  outline: none;
  display: flex;
  flex-direction: column;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.baby-name {
  font-weight: 400;
  color: #6b7280;
}

.modal-close-button {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close-button:hover {
  background: rgba(0, 0, 0, 0.1);
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

/* Content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Form Sections */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

/* Duration Display */
.duration-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: border-color 0.2s ease;
}

.duration-display.error {
  border-color: #dc2626;
  background: #fef2f2;
}

.duration-label {
  font-weight: 500;
  color: #374151;
}

.duration-value {
  font-weight: 600;
  color: #059669;
  font-size: 1.125rem;
}

.duration-note {
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

/* Notes Textarea */
.notes-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 4rem;
  transition: border-color 0.2s ease;
}

.notes-textarea:focus {
  outline: none;
  border-color: #dda0dd;
  box-shadow: 0 0 0 3px rgba(221, 160, 221, 0.1);
}

/* Character Count */
.character-count {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 400;
  margin-left: 0.5rem;
}

/* Field-specific Error Messages */
.field-errors {
  margin-top: 0.25rem;
}

.field-error {
  font-size: 0.75rem;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.125rem;
}

.field-error:last-child {
  margin-bottom: 0;
}

.field-error::before {
  content: "⚠";
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* Validation Errors */
.validation-errors {
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
}

.errors-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 0.5rem 0;
}

.errors-list {
  margin: 0;
  padding-left: 1.25rem;
  list-style-type: disc;
}

.error-item {
  font-size: 0.875rem;
  color: #dc2626;
  margin-bottom: 0.25rem;
}

.error-item:last-child {
  margin-bottom: 0;
}

/* Error State */
.error {
  border-color: #dc2626 !important;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 2rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.footer-left {
  display: flex;
  align-items: center;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 6rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f9fafb;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-save {
  background: #dda0dd;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #d8a2d8;
  transform: translateY(-1px);
}

.btn-delete {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.btn-delete:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #fca5a5;
}

.btn-delete-confirm {
  background: #dc2626;
  color: white;
}

.btn-delete-confirm:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-1px);
}

.btn-save:focus,
.btn-cancel:focus,
.btn-delete:focus,
.btn-delete-confirm:focus {
  outline: 2px solid #dda0dd;
  outline-offset: 2px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .nursing-edit-modal-overlay {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  .nursing-edit-modal {
    border-radius: 0;
    max-width: none;
    max-height: none;
    height: 100vh;
    width: 100vw;
  }

  .modal-header {
    padding: 1rem 1.5rem 0.75rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-content {
    padding: 1rem 1.5rem;
  }

  .modal-footer {
    padding: 0.75rem 1.5rem 1rem;
    flex-direction: column;
    gap: 0.75rem;
  }

  .footer-left,
  .footer-right {
    width: 100%;
    justify-content: center;
  }

  .footer-left {
    order: 2;
  }

  .footer-right {
    order: 1;
  }

  .time-inputs {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .duration-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .btn {
    padding: 0.875rem 1.25rem;
    min-width: 5rem;
  }
}

/* Tablet Responsive */
@media (max-width: 1024px) and (min-width: 769px) {
  .nursing-edit-modal-overlay {
    padding: 0.5rem;
  }

  .nursing-edit-modal {
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

.modal-enter-from .nursing-edit-modal,
.modal-leave-to .nursing-edit-modal {
  transform: scale(0.9) translateY(2rem);
}

.modal-enter-to .nursing-edit-modal,
.modal-leave-from .nursing-edit-modal {
  transform: scale(1) translateY(0);
}

/* Delete Confirmation Dialog */
.delete-confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
  backdrop-filter: blur(2px);
}

.delete-confirmation-modal {
  position: relative;
  background: white;
  border-radius: 1rem;
  max-width: 500px;
  width: 100%;
  overflow: hidden;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.2),
    0 10px 20px rgba(0, 0, 0, 0.15);
  outline: none;
}

.delete-confirmation-header {
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.delete-confirmation-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0;
}

.delete-confirmation-content {
  padding: 1.5rem 2rem;
}

.delete-confirmation-message {
  font-size: 1rem;
  color: #374151;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.session-details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.session-detail {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.session-detail:last-child {
  margin-bottom: 0;
}

.session-detail strong {
  color: #374151;
}

.delete-confirmation-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 2rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .nursing-edit-modal {
    background: #1f2937;
    color: white;
  }

  .modal-header {
    border-bottom-color: #374151;
  }

  .modal-title {
    color: #f9fafb;
  }

  .baby-name {
    color: #9ca3af;
  }

  .modal-close-button {
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-close-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .close-icon {
    color: #d1d5db;
  }

  .section-title {
    color: #e5e7eb;
  }

  .form-label {
    color: #d1d5db;
  }

  .duration-display {
    background: #374151;
    border-color: #4b5563;
  }

  .duration-label {
    color: #d1d5db;
  }

  .duration-note {
    color: #9ca3af;
  }

  .notes-textarea {
    background: #374151;
    border-color: #4b5563;
    color: white;
  }

  .notes-textarea:focus {
    border-color: #a78bfa;
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
  }

  .character-count {
    color: #9ca3af;
  }

  .field-error {
    color: #fca5a5;
  }

  .duration-display.error {
    border-color: #dc2626;
    background: #7f1d1d;
  }

  .validation-errors {
    background: #7f1d1d;
    border-color: #dc2626;
  }

  .errors-title {
    color: #fca5a5;
  }

  .error-item {
    color: #fca5a5;
  }

  .modal-footer {
    border-top-color: #374151;
  }

  .btn-cancel {
    background: #374151;
    color: #d1d5db;
    border-color: #4b5563;
  }

  .btn-cancel:hover:not(:disabled) {
    background: #4b5563;
    border-color: #6b7280;
  }

  .btn-save {
    background: #a78bfa;
  }

  .btn-save:hover:not(:disabled) {
    background: #8b5cf6;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .nursing-edit-modal {
    border: 3px solid #000;
  }

  .modal-close-button {
    border: 2px solid #000;
    background: white;
  }

  .close-icon {
    color: #000;
  }

  .btn-save {
    background: #000;
    border: 2px solid #000;
  }

  .btn-cancel {
    background: white;
    border: 2px solid #000;
    color: #000;
  }

  .field-error {
    color: #000;
    font-weight: 600;
  }

  .duration-display.error {
    border: 3px solid #000;
    background: #fff;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-close-button,
  .btn {
    transition: none;
  }

  .modal-enter-from .nursing-edit-modal,
  .modal-leave-to .nursing-edit-modal {
    transform: none;
  }

  .btn-save:hover:not(:disabled) {
    transform: none;
  }
}

/* Focus Visible */
.modal-close-button:focus-visible,
.btn:focus-visible {
  outline: 2px solid #dda0dd;
  outline-offset: 2px;
}

/* Print Styles */
@media print {
  .nursing-edit-modal-overlay {
    position: static;
    background: none;
    backdrop-filter: none;
  }

  .nursing-edit-modal {
    box-shadow: none;
    border: 1px solid #000;
  }

  .modal-close-button {
    display: none;
  }

  .modal-footer {
    display: none;
  }
}

/* Large Screens */
@media (min-width: 1200px) {
  .nursing-edit-modal {
    max-width: 700px;
  }
}

/* Landscape Mobile */
@media (max-height: 600px) and (orientation: landscape) {
  .nursing-edit-modal-overlay {
    align-items: flex-start;
    padding-top: 0.5rem;
  }

  .nursing-edit-modal {
    max-height: calc(100vh - 1rem);
  }
}

/* Safe Area Support for iOS */
@supports (padding: max(0px)) {
  @media (max-width: 768px) {
    .nursing-edit-modal {
      padding-top: max(0px, env(safe-area-inset-top));
      padding-bottom: max(0px, env(safe-area-inset-bottom));
      padding-left: max(0px, env(safe-area-inset-left));
      padding-right: max(0px, env(safe-area-inset-right));
    }

    .modal-header {
      padding-top: max(1rem, calc(env(safe-area-inset-top) + 1rem));
    }
  }
}
</style>