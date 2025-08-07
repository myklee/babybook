<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { format } from 'date-fns'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import BreastSelector from './BreastSelector.vue'
import ResponsiveModal from './ResponsiveModal.vue'
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
    // ResponsiveModal handles focus management
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

// ResponsiveModal handles backdrop clicks, keyboard events, and focus management

function cleanupModal() {
  // Clear validation timeout
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value)
    validationTimeout.value = null
  }
  
  // Reset delete confirmation state
  showDeleteConfirmation.value = false
  isDeleting.value = false
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

// ResponsiveModal handles lifecycle management
</script>
<template>
<ResponsiveModal
    :is-open="isOpen"
    :title="`Edit Nursing Session${babyName ? ` for ${babyName}` : ''}`"
    @close="handleClose"
  >
    <form @submit.prevent="handleSave" class="edit-form">
      <!-- Start Time Section -->
      <div class="form-section">
        <h3 class="section-title">Start Time</h3>
        <div class="time-inputs">
          <div class="form-group">
            <label for="start-date" class="form-label">Date</label>
            <DatePicker 
              id="start-date"
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

    <template #footer>
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
    </template>
  </ResponsiveModal>

  <!-- Delete Confirmation Dialog -->
  <ResponsiveModal
    :is-open="showDeleteConfirmation"
    title="Delete Nursing Session"
    @close="handleDeleteCancel"
  >
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

    <template #footer>
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
    </template>
  </ResponsiveModal>
</template>

<style scoped>


</style>