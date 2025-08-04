<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { format } from 'date-fns'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import { useBabyStore } from '../stores/babyStore'
import type { PumpingSession } from '../types/pumping'
import { 
  getDisplayValue, 
  getStorageValue, 
  getInputStep, 
  getUnitLabel,
  formatAmount
} from '../lib/measurements'

interface Props {
  isOpen: boolean
  session: PumpingSession | null
}

interface Emits {
  (e: 'close'): void
  (e: 'save', updatedSession: PumpingSession): void
  (e: 'cancel'): void
  (e: 'delete', sessionId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const babyStore = useBabyStore()

// Modal refs
const modalRef = ref<HTMLElement>()
const firstInputRef = ref<HTMLElement>()

// Form state
const editSession = ref<PumpingSession | null>(null)
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
const leftDisplayAmount = ref<number | null>(null)
const rightDisplayAmount = ref<number | null>(null)
const notes = ref('')

// Computed properties for unit handling
const unitLabel = computed(() => getUnitLabel(babyStore.measurementUnit))
const inputStep = computed(() => getInputStep(babyStore.measurementUnit))

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
const leftAmountErrors = computed(() => getFieldErrors('left_amount'))
const rightAmountErrors = computed(() => getFieldErrors('right_amount'))
const notesErrors = computed(() => getFieldErrors('notes'))

// Computed property for general errors (not field-specific)
const generalErrors = computed(() => {
  return validationErrors.value.filter(error => 
    !['start_date', 'start_time', 'end_date', 'end_time', 'duration', 'left_amount', 'right_amount', 'notes'].includes(error.field)
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

const totalDisplayAmount = computed(() => (leftDisplayAmount.value || 0) + (rightDisplayAmount.value || 0))

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
  
  // Validate amounts
  if (leftDisplayAmount.value !== null && leftDisplayAmount.value < 0) {
    errors.push({ field: 'left_amount', message: 'Left breast amount cannot be negative' })
  }
  
  if (rightDisplayAmount.value !== null && rightDisplayAmount.value < 0) {
    errors.push({ field: 'right_amount', message: 'Right breast amount cannot be negative' })
  }
  
  // Convert to ml for high amount validation
  const leftMl = leftDisplayAmount.value !== null ? getStorageValue(leftDisplayAmount.value, babyStore.measurementUnit) : null
  const rightMl = rightDisplayAmount.value !== null ? getStorageValue(rightDisplayAmount.value, babyStore.measurementUnit) : null
  
  if (leftMl !== null && leftMl > 1000) {
    errors.push({ field: 'left_amount', message: 'Left breast amount seems unusually high' })
  }
  
  if (rightMl !== null && rightMl > 1000) {
    errors.push({ field: 'right_amount', message: 'Right breast amount seems unusually high' })
  }
  
  // Validate notes length
  if (notes.value && notes.value.length > 500) {
    errors.push({ field: 'notes', message: 'Notes cannot exceed 500 characters' })
  }
  
  return errors
}

// Event handlers
async function handleSave() {
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
    
    // Calculate durations
    const totalDurationSeconds = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000)
    
    // For pumping, we need to distribute the duration based on which breasts were used
    // We'll determine this based on which amounts are provided
    let leftDuration = 0
    let rightDuration = 0
    
    const hasLeftAmount = leftDisplayAmount.value !== null && leftDisplayAmount.value > 0
    const hasRightAmount = rightDisplayAmount.value !== null && rightDisplayAmount.value > 0
    
    if (hasLeftAmount && hasRightAmount) {
      // Both breasts used, split duration evenly
      leftDuration = Math.floor(totalDurationSeconds / 2)
      rightDuration = totalDurationSeconds - leftDuration
    } else if (hasLeftAmount) {
      // Only left breast used
      leftDuration = totalDurationSeconds
    } else if (hasRightAmount) {
      // Only right breast used
      rightDuration = totalDurationSeconds
    } else {
      // No amounts specified, but we still need to assign duration
      // Default to splitting evenly if original session had both
      if (editSession.value.left_duration > 0 && editSession.value.right_duration > 0) {
        leftDuration = Math.floor(totalDurationSeconds / 2)
        rightDuration = totalDurationSeconds - leftDuration
      } else if (editSession.value.left_duration > 0) {
        leftDuration = totalDurationSeconds
      } else {
        rightDuration = totalDurationSeconds
      }
    }
    
    const updatedSession = await babyStore.updatePumpingSession(editSession.value.id, {
      start_time: startDateTime,
      end_time: endDateTime,
      left_duration: leftDuration,
      right_duration: rightDuration,
      total_duration: totalDurationSeconds,
      left_amount: leftDisplayAmount.value !== null ? getStorageValue(leftDisplayAmount.value, babyStore.measurementUnit) : null,
      right_amount: rightDisplayAmount.value !== null ? getStorageValue(rightDisplayAmount.value, babyStore.measurementUnit) : null,
      total_amount: totalDisplayAmount.value > 0 ? getStorageValue(totalDisplayAmount.value, babyStore.measurementUnit) : 0,
      notes: notes.value.trim() || undefined
    })
    
    emit('save', updatedSession)
  } catch (error) {
    console.error('Error saving pumping session:', error)
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
    await babyStore.deletePumpingSession(editSession.value.id)
    emit('delete', editSession.value.id)
    showDeleteConfirmation.value = false
  } catch (error) {
    console.error('Error deleting pumping session:', error)
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
  leftDisplayAmount.value = props.session.left_amount !== null ? getDisplayValue(props.session.left_amount, babyStore.measurementUnit) : null
  rightDisplayAmount.value = props.session.right_amount !== null ? getDisplayValue(props.session.right_amount, babyStore.measurementUnit) : null
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

// Real-time validation for amounts and notes
watch([leftDisplayAmount, rightDisplayAmount, notes], () => {
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
        class="pumping-edit-modal-overlay"
        @click="handleBackdropClick"
        @touchstart.passive="handleBackdropClick"
      >
        <div
          ref="modalRef"
          class="pumping-edit-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit pumping session"
          tabindex="-1"
          @click.stop
        >
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">
              Edit Pumping Session
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

              <!-- Amount Section -->
              <div class="form-section">
                <h3 class="section-title">Amount Pumped</h3>
                <div class="amount-inputs">
                  <div class="form-group">
                    <label for="left-amount" class="form-label">Left Breast ({{ unitLabel }})</label>
                    <input
                      id="left-amount"
                      v-model.number="leftDisplayAmount"
                      type="number"
                      min="0"
                      :step="inputStep"
                      placeholder="0"
                      class="amount-input"
                      data-field="left_amount"
                      :class="{ 'error': hasFieldError('left_amount') }"
                      aria-describedby="left-amount-help"
                      :aria-invalid="hasFieldError('left_amount')"
                    />
                    <div id="left-amount-help" class="sr-only">
                      Enter the amount of milk pumped from the left breast in milliliters
                    </div>
                    <div v-if="leftAmountErrors.length > 0" class="field-errors">
                      <div v-for="error in leftAmountErrors" :key="error.message" class="field-error">
                        {{ error.message }}
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="right-amount" class="form-label">Right Breast ({{ unitLabel }})</label>
                    <input
                      id="right-amount"
                      v-model.number="rightDisplayAmount"
                      type="number"
                      min="0"
                      :step="inputStep"
                      placeholder="0"
                      class="amount-input"
                      data-field="right_amount"
                      :class="{ 'error': hasFieldError('right_amount') }"
                      aria-describedby="right-amount-help"
                      :aria-invalid="hasFieldError('right_amount')"
                    />
                    <div id="right-amount-help" class="sr-only">
                      Enter the amount of milk pumped from the right breast in milliliters
                    </div>
                    <div v-if="rightAmountErrors.length > 0" class="field-errors">
                      <div v-for="error in rightAmountErrors" :key="error.message" class="field-error">
                        {{ error.message }}
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="totalDisplayAmount > 0" class="total-amount" role="status" aria-live="polite">
                  Total: {{ totalDisplayAmount }}{{ unitLabel }}
                </div>
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
                    placeholder="Add any notes about this pumping session..."
                    rows="3"
                    maxlength="500"
                    aria-describedby="notes-help"
                    :aria-invalid="hasFieldError('notes')"
                  ></textarea>
                  <div id="notes-help" class="sr-only">
                    Add any additional notes about this pumping session
                  </div>
                  <div v-if="notesErrors.length > 0" class="field-errors">
                    <div v-for="error in notesErrors" :key="error.message" class="field-error">
                      {{ error.message }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- General Validation Errors -->
              <div v-if="generalErrors.length > 0" class="validation-errors" role="alert" aria-live="assertive">
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
              Delete Pumping Session
            </h3>
          </div>
          
          <div class="delete-confirmation-content">
            <p class="delete-confirmation-message">
              Are you sure you want to delete this pumping session? This action cannot be undone.
            </p>
            <div v-if="editSession" class="session-details">
              <p class="session-detail">
                <strong>Start:</strong> {{ format(new Date(editSession.start_time), 'MMM d, yyyy h:mm a') }}
              </p>
              <p class="session-detail">
                <strong>Duration:</strong> {{ durationDisplay }}
              </p>
              <p class="session-detail">
                <strong>Total Amount:</strong> {{ formatAmount(editSession.total_amount, babyStore.measurementUnit) }}
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
<style 
scoped>
/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Modal Overlay */
.pumping-edit-modal-overlay {
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
.pumping-edit-modal {
  position: relative;
  background: var(--color-midnight);
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
  color: white;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.modal-close-button {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.modal-close-button:focus {
  outline: 2px solid var(--color-periwinkle);
  outline-offset: 2px;
}

.close-icon {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.8);
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
  color: white;
  margin: 0;
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.amount-inputs {
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
  color: rgba(255, 255, 255, 0.8);
}

.character-count {
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
}

/* Duration Display */
.duration-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: border-color 0.2s ease;
}

.duration-display.error {
  border-color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
}

.duration-label {
  font-weight: 500;
  color: white;
}

.duration-value {
  font-weight: 600;
  color: var(--color-periwinkle);
}

.duration-note {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* Amount Inputs */
.amount-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  text-align: center;
  transition: all 0.2s ease;
}

.amount-input:focus {
  outline: none;
  border-color: var(--color-periwinkle);
  background: rgba(255, 255, 255, 0.15);
}

.amount-input.error {
  border-color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
}

.amount-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.total-amount {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-periwinkle);
  font-weight: 600;
  margin-top: 0.5rem;
}

/* Notes Textarea */
.notes-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--color-periwinkle);
  background: rgba(255, 255, 255, 0.15);
}

.notes-textarea.error {
  border-color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
}

.notes-textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* Field Errors */
.field-errors {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-error {
  font-size: 0.75rem;
  color: #fca5a5;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.field-error::before {
  content: "⚠";
  color: #dc2626;
}

/* Validation Errors */
.validation-errors {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
}

.errors-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fca5a5;
  margin: 0 0 0.5rem 0;
}

.errors-list {
  margin: 0;
  padding-left: 1rem;
}

.error-item {
  font-size: 0.875rem;
  color: #fca5a5;
  margin-bottom: 0.25rem;
}

.error-item:last-child {
  margin-bottom: 0;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.footer-left {
  display: flex;
}

.footer-right {
  display: flex;
  gap: 1rem;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: none;
  letter-spacing: 0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-save {
  background: linear-gradient(135deg, var(--color-periwinkle) 0%, #8b5cf6 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-delete {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* Delete Confirmation Modal */
.delete-confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.delete-confirmation-modal {
  background: var(--color-midnight);
  border-radius: 1rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.3),
    0 10px 20px rgba(0, 0, 0, 0.2);
  outline: none;
  color: white;
}

.delete-confirmation-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.delete-confirmation-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0;
  text-align: center;
}

.delete-confirmation-content {
  padding: 1.5rem;
}

.delete-confirmation-message {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 1rem 0;
  text-align: center;
  line-height: 1.5;
}

.session-details {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.session-detail {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.5rem 0;
  display: flex;
  justify-content: space-between;
}

.session-detail:last-child {
  margin-bottom: 0;
}

.session-detail strong {
  color: white;
}

.delete-confirmation-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-delete-confirm {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

.btn-delete-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .pumping-edit-modal,
.modal-leave-to .pumping-edit-modal,
.modal-enter-from .delete-confirmation-modal,
.modal-leave-to .delete-confirmation-modal {
  transform: scale(0.9) translateY(2rem);
}

.modal-enter-to .pumping-edit-modal,
.modal-leave-from .pumping-edit-modal,
.modal-enter-to .delete-confirmation-modal,
.modal-leave-from .delete-confirmation-modal {
  transform: scale(1) translateY(0);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .pumping-edit-modal-overlay {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  .pumping-edit-modal {
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
    gap: 1rem;
  }

  .footer-left,
  .footer-right {
    width: 100%;
    justify-content: center;
  }

  .footer-right {
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn {
    width: 100%;
    padding: 1rem;
  }

  .time-inputs,
  .amount-inputs {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .delete-confirmation-overlay {
    padding: 1rem;
  }

  .delete-confirmation-modal {
    max-width: none;
  }

  .delete-confirmation-footer {
    flex-direction: column;
    gap: 0.75rem;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .btn,
  .amount-input,
  .notes-textarea,
  .modal-close-button {
    transition: none;
  }

  .modal-enter-from .pumping-edit-modal,
  .modal-leave-to .pumping-edit-modal,
  .modal-enter-from .delete-confirmation-modal,
  .modal-leave-to .delete-confirmation-modal {
    transform: none;
  }
}

/* Focus Styles */
.amount-input:focus,
.notes-textarea:focus {
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.btn:focus {
  outline: 2px solid var(--color-periwinkle);
  outline-offset: 2px;
}

.btn-delete:focus {
  outline-color: #dc2626;
}

.btn-delete-confirm:focus {
  outline-color: #dc2626;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .pumping-edit-modal {
    border: 2px solid white;
  }
  
  .field-error {
    background: rgba(220, 38, 38, 0.2);
    padding: 0.25rem;
    border-radius: 0.25rem;
  }
  
  .validation-errors {
    border-width: 2px;
  }
}
</style>