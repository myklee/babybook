<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import ResponsiveModal from './ResponsiveModal.vue'

const props = defineProps<{
  babyId: string
  babyName: string
  diaperType: 'pee' | 'poop' | 'both'
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useBabyStore()

// Form data
const type = ref<'pee' | 'poop' | 'both'>(props.diaperType)
const notes = ref('')
const customDate = ref('')
const time = ref<{ hour: string; minute: string; ampm: 'AM' | 'PM' }>({ hour: '', minute: '', ampm: 'AM' })
const isSaving = ref(false)

// UI state
const showAdvanced = ref(false)

const options = [
  { value: 'pee', label: 'Pee' },
  { value: 'poop', label: 'Poop' },
  { value: 'both', label: 'Both' }
]

// Dynamic modal title
const modalTitle = computed(() => `Record Diaper Change for ${props.babyName}`)

onMounted(() => {
  // ResponsiveModal handles body scroll locking
  
  console.log('DiaperModal mounted with babyName:', props.babyName)
  
  // Pre-fill current date and time
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  customDate.value = `${year}-${month}-${day}`
  
  // Set default hour, minute, and ampm
  let hour = now.getHours()
  time.value.ampm = hour >= 12 ? 'PM' : 'AM'
  let hour12 = hour % 12
  if (hour12 === 0) hour12 = 12
  time.value.hour = String(hour12)
  time.value.minute = String(now.getMinutes()).padStart(2, '0')
})

onUnmounted(() => {
  // ResponsiveModal handles body scroll restoration
})

function getSelectedDateTime() {
  if (!customDate.value) return new Date()
  const [year, month, day] = customDate.value.split('-').map(Number)
  let hour = Number(time.value.hour)
  if (time.value.ampm === 'PM' && hour < 12) hour += 12
  if (time.value.ampm === 'AM' && hour === 12) hour = 0
  return new Date(year, month - 1, day, hour, Number(time.value.minute), 0, 0)
}

async function handleSubmit() {
  isSaving.value = true
  try {
    const timestamp = getSelectedDateTime()
    await store.addDiaperChange(
      props.babyId,
      type.value,
      notes.value,
      timestamp
    )

    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error adding diaper change:', error)
    alert('Failed to add diaper change. Please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <ResponsiveModal
    :is-open="true"
    :title="modalTitle"
    :close-on-backdrop="true"
    max-width="450px"
    @close="emit('close')"
  >
    <!-- Form Content -->
    <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="diaper-date">Date</label>
          <DatePicker v-model="customDate" id="diaper-date" />
        </div>
        <div class="form-group">
          <label for="diaper-time">Time</label>
          <TimePicker v-model="time" />
        </div>

        <div class="form-group">
          <label>Type</label>
          <select v-model="type">
            <option v-for="option in options" :value="option.value">{{ option.label }}</option>
          </select>
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
            <textarea v-model="notes" rows="2" placeholder="Optional notes..."></textarea>
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
          @keydown.enter="handleSubmit"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </template>
  </ResponsiveModal>
</template>

<style scoped>
/* Form Layout */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--color-text-tertiary);
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--form-input-border);
  border-radius: 0.5rem;
  background: var(--form-input-bg);
  color: var(--form-input-text);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  background: var(--form-input-bg-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.form-group select::placeholder,
.form-group textarea::placeholder {
  color: var(--form-input-placeholder);
}

/* Advanced Options Toggle */
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
  color: var(--color-text-quaternary);
  text-decoration: none;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-lavendar);
  background-color: var(--color-midnight);
  text-decoration: underline;
}

.arrow {
  transition: transform 0.2s;
}

.arrow.rotated {
  transform: rotate(180deg);
}

.advanced-options {
  padding-top: 1rem;
  margin-top: 1rem;
}

/* Import shared modal button styles */
@import '../styles/modal-buttons.css';

/* Mobile Responsiveness */
@media (max-width: 768px) {
  /* Mobile button styles handled by shared CSS */
}
</style> 