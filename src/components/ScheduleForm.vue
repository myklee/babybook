<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useBabyStore } from '../stores/babyStore';
import { useNotifications } from '../composables/useNotifications';
import ResponsiveModal from './ResponsiveModal.vue';
import type { FeedingSchedule, CreateFeedingScheduleData, UpdateFeedingScheduleData } from '../types/feedingScheduleAutomation';
import { 
  validateScheduleName, 
  validateFeedingType, 
  validateDefaultAmount,
  canAddMoreSchedules,
  getMaxSchedulesPerBaby
} from '../utils/scheduleValidation';
import { getScheduleFeedingTypeDisplayName } from '../types/feedingScheduleAutomation';

interface Props {
  babyId: string;
  babyName: string;
  schedule?: FeedingSchedule; // If provided, we're editing; otherwise creating
}

interface Emits {
  (e: 'close'): void;
  (e: 'saved'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const store = useBabyStore();
const { showSuccess, showError, showWarning } = useNotifications();

// Form data
const scheduleName = ref('');
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast');
const defaultAmount = ref<number | undefined>(undefined);
const isActive = ref(true);
const isSaving = ref(false);
const saveAttempts = ref(0);

// Validation errors
const nameError = ref('');
const feedingTypeError = ref('');
const amountError = ref('');
const generalError = ref('');

// Computed properties
const modalTitle = computed(() => {
  return props.schedule 
    ? `Edit Schedule for ${props.babyName}` 
    : `Create Schedule for ${props.babyName}`;
});

const isEditMode = computed(() => !!props.schedule);

const showAmountField = computed(() => feedingType.value === 'formula');

const canSave = computed(() => {
  return scheduleName.value.trim() && 
         feedingType.value && 
         !isSaving.value &&
         !nameError.value &&
         !feedingTypeError.value &&
         !amountError.value;
});

// Check if user can add more schedules (Requirement 1.1)
const canAddSchedule = computed(() => {
  if (isEditMode.value) return true;
  const existingSchedules = store.getBabyFeedingSchedules(props.babyId);
  return canAddMoreSchedules(props.babyId, existingSchedules);
});

const maxSchedulesReached = computed(() => !canAddSchedule.value);

// Initialize form with existing schedule data if editing
onMounted(() => {
  if (props.schedule) {
    scheduleName.value = props.schedule.name;
    feedingType.value = props.schedule.feeding_type;
    defaultAmount.value = props.schedule.default_amount;
    isActive.value = props.schedule.is_active;
  } else {
    // Set default amount for formula
    if (feedingType.value === 'formula') {
      defaultAmount.value = 120; // Default 120ml
    }
    
    // Check if max schedules reached
    if (maxSchedulesReached.value) {
      showWarning(
        'Maximum Schedules Reached',
        `You can have up to ${getMaxSchedulesPerBaby()} active schedules per baby. Please disable or delete an existing schedule first.`,
        { duration: 8000 }
      );
    }
  }
});

// Watch feeding type changes to handle default amount
watch(feedingType, (newType) => {
  if (newType === 'formula' && !defaultAmount.value) {
    defaultAmount.value = 120; // Default 120ml
  } else if (newType !== 'formula') {
    defaultAmount.value = undefined;
  }
  // Clear amount error when type changes
  amountError.value = '';
});

// Validation functions
function validateName() {
  const existingSchedules = store.getBabyFeedingSchedules(props.babyId);
  const existingNames = existingSchedules
    .filter(s => !props.schedule || s.id !== props.schedule.id)
    .map(s => s.name);
  
  const errors = validateScheduleName(scheduleName.value, existingNames);
  nameError.value = errors.length > 0 ? errors[0] : '';
}

function validateType() {
  const errors = validateFeedingType(feedingType.value);
  feedingTypeError.value = errors.length > 0 ? errors[0] : '';
}

function validateAmount() {
  const errors = validateDefaultAmount(defaultAmount.value, feedingType.value);
  amountError.value = errors.length > 0 ? errors[0] : '';
}

// Handle form submission with retry logic
async function handleSubmit() {
  // Clear previous errors
  generalError.value = '';
  
  // Validate all fields
  validateName();
  validateType();
  validateAmount();

  // Check if there are any errors
  if (nameError.value || feedingTypeError.value || amountError.value) {
    showError(
      'Validation Error',
      'Please fix the errors in the form before saving.',
      { duration: 5000 }
    );
    return;
  }

  if (!canSave.value) return;

  // Check max schedules limit for new schedules
  if (!isEditMode.value && maxSchedulesReached.value) {
    showError(
      'Cannot Create Schedule',
      `Maximum of ${getMaxSchedulesPerBaby()} active schedules allowed per baby.`,
      { duration: 6000 }
    );
    return;
  }

  isSaving.value = true;
  saveAttempts.value++;

  try {
    if (isEditMode.value && props.schedule) {
      // Update existing schedule
      const updates: UpdateFeedingScheduleData = {
        name: scheduleName.value.trim(),
        feeding_type: feedingType.value,
        default_amount: feedingType.value === 'formula' ? defaultAmount.value : undefined,
        is_active: isActive.value,
      };

      await store.updateFeedingSchedule(props.schedule.id, updates);
      
      showSuccess(
        'Schedule Updated',
        `"${scheduleName.value}" has been updated successfully.`,
        { duration: 3000 }
      );
    } else {
      // Create new schedule
      const scheduleData: CreateFeedingScheduleData = {
        baby_id: props.babyId,
        name: scheduleName.value.trim(),
        feeding_type: feedingType.value,
        default_amount: feedingType.value === 'formula' ? defaultAmount.value : undefined,
        is_active: isActive.value,
      };

      await store.addFeedingSchedule(scheduleData);
      
      showSuccess(
        'Schedule Created',
        `"${scheduleName.value}" has been created successfully.`,
        { duration: 3000 }
      );
    }

    emit('saved');
    emit('close');
  } catch (error: any) {
    console.error('Error saving schedule:', error);
    
    // Handle specific error types
    if (error?.code === 'VALIDATION_ERROR') {
      generalError.value = error.message;
      showError(
        'Validation Error',
        error.message,
        { duration: 6000 }
      );
    } else if (error?.code === 'NETWORK_ERROR') {
      generalError.value = 'Network error. Please check your connection and try again.';
      // Network error notification is already shown by handleError in store
    } else if (error?.code === 'AUTH_ERROR') {
      generalError.value = 'Your session has expired. Please sign in again.';
      // Auth error notification is already shown by handleError in store
    } else {
      const errorMessage = error?.message || 'Failed to save schedule. Please try again.';
      generalError.value = errorMessage;
      // Generic error notification is already shown by handleError in store
    }
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <ResponsiveModal
    :is-open="true"
    :title="modalTitle"
    :close-on-backdrop="true"
    max-width="500px"
    @close="emit('close')"
  >
    <!-- General Error Message -->
    <div v-if="generalError" class="general-error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ generalError }}</span>
    </div>

    <!-- Max Schedules Warning -->
    <div v-if="!isEditMode && maxSchedulesReached" class="warning-banner">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">
        Maximum of {{ getMaxSchedulesPerBaby() }} active schedules reached. 
        Please disable or delete an existing schedule first.
      </span>
    </div>

    <!-- Form Content -->
    <form @submit.prevent="handleSubmit">
      <!-- Schedule Name -->
      <div class="form-group">
        <label for="schedule-name">Schedule Name <span class="required">*</span></label>
        <input
          id="schedule-name"
          v-model="scheduleName"
          type="text"
          placeholder="e.g., Morning Feeding"
          maxlength="50"
          required
          @blur="validateName"
          @input="nameError = ''"
          :class="{ 'input-error': nameError }"
        />
        <div v-if="nameError" class="error-message">{{ nameError }}</div>
        <div class="char-counter">{{ scheduleName.length }}/50</div>
      </div>

      <!-- Feeding Type -->
      <div class="form-group">
        <label for="feeding-type">Feeding Type <span class="required">*</span></label>
        <select
          id="feeding-type"
          v-model="feedingType"
          required
          @change="validateType"
          :class="{ 'input-error': feedingTypeError }"
        >
          <option value="breast">{{ getScheduleFeedingTypeDisplayName('breast') }}</option>
          <option value="formula">{{ getScheduleFeedingTypeDisplayName('formula') }}</option>
          <option value="solid">{{ getScheduleFeedingTypeDisplayName('solid') }}</option>
        </select>
        <div v-if="feedingTypeError" class="error-message">{{ feedingTypeError }}</div>
      </div>

      <!-- Default Amount (for formula only) -->
      <div v-if="showAmountField" class="form-group">
        <label for="default-amount">Default Amount (ml) <span class="required">*</span></label>
        <input
          id="default-amount"
          v-model.number="defaultAmount"
          type="number"
          min="1"
          max="500"
          step="1"
          placeholder="e.g., 120"
          required
          @blur="validateAmount"
          @input="amountError = ''"
          :class="{ 'input-error': amountError }"
        />
        <div v-if="amountError" class="error-message">{{ amountError }}</div>
        <div class="help-text">Amount must be between 1 and 500ml</div>
      </div>

      <!-- Enable/Disable Toggle -->
      <div class="form-group">
        <label class="toggle-label">
          <input
            type="checkbox"
            v-model="isActive"
            class="toggle-checkbox"
          />
          <span class="toggle-slider"></span>
          <span class="toggle-text">{{ isActive ? 'Active' : 'Inactive' }}</span>
        </label>
        <div class="help-text">
          {{ isActive ? 'This schedule can be used to create feeding entries' : 'This schedule is disabled and cannot be used' }}
        </div>
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <div class="btn-group-end">
        <button
          type="button"
          class="btn btn-cancel"
          @click="emit('close')"
          :disabled="isSaving"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-save"
          :class="{ 'btn-loading': isSaving }"
          @click="handleSubmit"
          :disabled="!canSave || (!isEditMode && maxSchedulesReached)"
        >
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </template>
  </ResponsiveModal>
</template>

<style scoped>
/* General error banner */
.general-error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-text {
  color: var(--color-error, #ef4444);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Warning banner */
.warning-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.warning-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.warning-text {
  color: var(--color-warning, #f59e0b);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Required field indicator */
.required {
  color: var(--color-error, #ff4444);
  margin-left: 0.25rem;
}

/* Character counter */
.char-counter {
  font-size: 0.75rem;
  color: var(--color-text-quaternary);
  text-align: right;
  margin-top: 0.25rem;
}

/* Error styling */
.input-error {
  border-color: var(--color-error, #ff4444) !important;
  background-color: rgba(255, 68, 68, 0.05);
}

.error-message {
  color: var(--color-error, #ff4444);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.error-message::before {
  content: '⚠';
  font-size: 1rem;
}

/* Help text */
.help-text {
  font-size: 0.875rem;
  color: var(--color-text-quaternary);
  margin-top: 0.5rem;
  font-style: italic;
}

/* Toggle switch styling */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-surface-border);
  border-radius: 28px;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 2px;
  top: 2px;
  background-color: var(--color-text-quaternary);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.toggle-checkbox:checked + .toggle-slider {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(22px);
  background-color: white;
}

.toggle-checkbox:focus + .toggle-slider {
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.toggle-text {
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Import shared modal button styles */
@import '../styles/modal-buttons.css';

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .toggle-label {
    gap: 0.75rem;
  }

  .toggle-slider {
    width: 44px;
    height: 24px;
  }

  .toggle-slider::before {
    width: 18px;
    height: 18px;
  }

  .toggle-checkbox:checked + .toggle-slider::before {
    transform: translateX(18px);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .toggle-slider {
    border-width: 3px;
  }

  .input-error {
    border-width: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .toggle-slider,
  .toggle-slider::before {
    transition: none;
  }
}
</style>
