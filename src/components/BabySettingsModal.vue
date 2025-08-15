<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { 
  getDisplayValue, 
  getStorageValue, 
  getInputStep, 
  getUnitLabel
} from '../lib/measurements'

const props = defineProps<{
  babyId: string
  babyName: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useBabyStore()

// Form data
const feedingIntervalHours = ref(3)
const defaultBreastDisplayAmount = ref(0)
const defaultFormulaDisplayAmount = ref(0)
const includeSolidsInSchedule = ref(false)
const isSaving = ref(false)
const showRetry = ref(false)
const lastFailedUpdate = ref<any>(null)

// Computed properties for unit handling
const unitLabel = computed(() => getUnitLabel(store.measurementUnit))
const inputStep = computed(() => getInputStep(store.measurementUnit))

// Refs for input fields
const breastAmountInput = ref<HTMLInputElement | null>(null)
const formulaAmountInput = ref<HTMLInputElement | null>(null)

// Functions to select all text when focusing amount fields
function selectBreastAmountText() {
  if (breastAmountInput.value) {
    breastAmountInput.value.select()
  }
}

function selectFormulaAmountText() {
  if (formulaAmountInput.value) {
    formulaAmountInput.value.select()
  }
}

onMounted(() => {
  // Lock body scroll when modal opens
  document.body.style.overflow = 'hidden'
  
  // Load current settings
  const settings = store.getBabySettings(props.babyId)
  if (settings) {
    feedingIntervalHours.value = settings.feeding_interval_hours
    defaultBreastDisplayAmount.value = getDisplayValue(settings.default_breast_amount, store.measurementUnit)
    defaultFormulaDisplayAmount.value = getDisplayValue(settings.default_formula_amount, store.measurementUnit)
    includeSolidsInSchedule.value = settings.include_solids_in_schedule || false
  }
})

onUnmounted(() => {
  // Restore body scroll when modal is destroyed
  document.body.style.overflow = ''
})

async function handleSubmit() {
  await performUpdate()
}

async function performUpdate() {
  isSaving.value = true
  showRetry.value = false
  
  // Store the update data for potential retry
  const updateData = {
    feeding_interval_hours: feedingIntervalHours.value,
    default_breast_amount: getStorageValue(defaultBreastDisplayAmount.value, store.measurementUnit),
    default_formula_amount: getStorageValue(defaultFormulaDisplayAmount.value, store.measurementUnit),
    include_solids_in_schedule: includeSolidsInSchedule.value
  }
  
  // Store original values for potential revert
  const originalValues = {
    feedingIntervalHours: feedingIntervalHours.value,
    defaultBreastDisplayAmount: defaultBreastDisplayAmount.value,
    defaultFormulaDisplayAmount: defaultFormulaDisplayAmount.value,
    includeSolidsInSchedule: includeSolidsInSchedule.value
  }
  
  try {
    await store.updateBabySettings(props.babyId, updateData)

    // Success notification is handled by the store
    console.log('Baby settings updated successfully')
    
    emit('saved')
    emit('close')
  } catch (error: any) {
    console.error('Error updating baby settings:', error)
    
    // Check if this is a retryable error (network/server errors)
    const isRetryable = error?.code?.startsWith?.('5') || 
                       error?.message?.toLowerCase?.()?.includes?.('network') ||
                       error?.message?.toLowerCase?.()?.includes?.('timeout') ||
                       error?.message?.toLowerCase?.()?.includes?.('fetch')
    
    if (isRetryable) {
      showRetry.value = true
      lastFailedUpdate.value = updateData
    }
    
    // Error notification is handled by the store's error handling
    // Just revert the form to previous values
    const settings = store.getBabySettings(props.babyId)
    if (settings) {
      feedingIntervalHours.value = settings.feeding_interval_hours
      defaultBreastDisplayAmount.value = getDisplayValue(settings.default_breast_amount, store.measurementUnit)
      defaultFormulaDisplayAmount.value = getDisplayValue(settings.default_formula_amount, store.measurementUnit)
      includeSolidsInSchedule.value = settings.include_solids_in_schedule || false
    } else {
      // If no settings available, revert to original form values
      feedingIntervalHours.value = originalValues.feedingIntervalHours
      defaultBreastDisplayAmount.value = originalValues.defaultBreastDisplayAmount
      defaultFormulaDisplayAmount.value = originalValues.defaultFormulaDisplayAmount
      includeSolidsInSchedule.value = originalValues.includeSolidsInSchedule
    }
  } finally {
    isSaving.value = false
  }
}

async function handleRetry() {
  if (!lastFailedUpdate.value) return
  
  try {
    await store.updateBabySettings(props.babyId, lastFailedUpdate.value)
    
    // Success - close modal
    showRetry.value = false
    lastFailedUpdate.value = null
    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Retry failed:', error)
    // Error notification will be shown by store
  }
}
</script>

<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <h3 class="modal-title">Feeding Settings for {{ babyName }}</h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Feeding Interval (hours)</label>
          <input 
            type="number" 
            v-model="feedingIntervalHours" 
            min="1" 
            max="24" 
            required
          >
          <small>How often to feed (e.g., 3 = every 3 hours)</small>
        </div>

        <div class="form-group">
          <label>Default Breast Amount ({{ unitLabel }})</label>
          <input 
            type="number" 
            v-model="defaultBreastDisplayAmount" 
            min="0" 
            :step="inputStep"
            ref="breastAmountInput"
            inputmode="numeric"
            pattern="[0-9]*"
            @focus="selectBreastAmountText"
          >
          <small>Default amount for breast feedings (0 = no default)</small>
        </div>

        <div class="form-group">
          <label>Default Formula Amount ({{ unitLabel }})</label>
          <input 
            type="number" 
            v-model="defaultFormulaDisplayAmount" 
            min="0" 
            :step="inputStep"
            ref="formulaAmountInput"
            inputmode="numeric"
            pattern="[0-9]*"
            @focus="selectFormulaAmountText"
          >
          <small>Default amount for formula feedings (0 = no default)</small>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="includeSolidsInSchedule"
              class="checkbox-input"
              :disabled="isSaving"
            >
            <span class="checkbox-text">Include solid foods in feeding schedule</span>
          </label>
          <small class="form-help-text">
            When enabled, solid food feedings will count towards feeding intervals and reminders. 
            When disabled (default), only milk feedings (breast, formula, nursing) affect the schedule.
          </small>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-save" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
          <button type="button" class="btn btn-cancel" @click="emit('close')" :disabled="isSaving">
            Cancel
          </button>
        </div>

        <!-- Retry section for network errors -->
        <div v-if="showRetry" class="retry-section">
          <p class="retry-message">
            Settings could not be saved due to a connection issue.
          </p>
          <div class="retry-actions">
            <button 
              type="button" 
              class="btn btn-retry" 
              @click="handleRetry"
              :disabled="isSaving"
            >
              {{ isSaving ? 'Retrying...' : 'Try Again' }}
            </button>
            <button 
              type="button" 
              class="btn btn-cancel-retry" 
              @click="showRetry = false"
              :disabled="isSaving"
            >
              Dismiss
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--form-label-text);
}

.checkbox-input {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--form-input-border);
  border-radius: 4px;
  background-color: var(--form-input-bg);
  cursor: pointer;
  position: relative;
  padding:0;
  flex-shrink: 0;
  margin-top: 0.125rem; /* Align with first line of text */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.checkbox-input:hover {
  border-color: var(--form-input-border-focus);
  background-color: var(--form-input-bg-focus);
}

.checkbox-input:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.checkbox-input:checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.checkbox-input:checked::after {
  content: '';
  position: absolute;
  top: -2px;
  left: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-surface);
}

.checkbox-label:has(.checkbox-input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-text {
  flex: 1;
  line-height: 1.5;
}

.form-help-text {
  color: var(--color-text-quaternary);
  font-size: 0.875rem;
  line-height: 1.4;
  margin-top: 0.25rem;
}

/* Ensure proper spacing for the checkbox form group */
.form-group:has(.checkbox-label) {
  margin-bottom: 1.5rem;
}

/* Dark theme adjustments */
[data-theme="dark"] .checkbox-input:checked::after {
  border-color: white;
}

/* Light theme adjustments */
[data-theme="light"] .checkbox-input:checked::after {
  border-color: white;
}

/* High contrast theme adjustments */
[data-theme="high-contrast"] .checkbox-input {
  border-width: 3px;
}

[data-theme="high-contrast"] .checkbox-input:checked::after {
  border-width: 0 3px 3px 0;
  top: 1px;
  left: 4px;
}

/* Retry section styles */
.retry-section {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--color-warning-bg, #fef3c7);
  border: 1px solid var(--color-warning-border, #f59e0b);
  border-radius: 6px;
}

.retry-message {
  margin: 0 0 0.75rem 0;
  color: var(--color-warning-text, #92400e);
  font-size: 0.875rem;
  line-height: 1.4;
}

.retry-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-retry {
  background-color: var(--color-warning, #f59e0b);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.btn-retry:hover:not(:disabled) {
  background-color: var(--color-warning-hover, #d97706);
}

.btn-retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel-retry {
  background-color: transparent;
  color: var(--color-warning-text, #92400e);
  border: 1px solid var(--color-warning-border, #f59e0b);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel-retry:hover:not(:disabled) {
  background-color: var(--color-warning-bg-hover, #fde68a);
}

.btn-cancel-retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Dark theme adjustments for retry section */
[data-theme="dark"] .retry-section {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}

[data-theme="dark"] .retry-message {
  color: #fbbf24;
}

[data-theme="dark"] .btn-cancel-retry {
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
}

[data-theme="dark"] .btn-cancel-retry:hover:not(:disabled) {
  background-color: rgba(245, 158, 11, 0.1);
}
</style> 