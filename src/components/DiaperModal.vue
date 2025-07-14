<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'

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

const options = [
  { value: 'pee', label: 'Pee' },
  { value: 'poop', label: 'Poop' },
  { value: 'both', label: 'Both' }
]

onMounted(() => {
  // Lock body scroll when modal opens
  document.body.style.overflow = 'hidden'
  
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
  // Restore body scroll when modal is destroyed
  document.body.style.overflow = ''
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
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <h3 class="modal-title">Record Diaper Change for {{ babyName }}</h3>
      
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

        <div class="form-group">
          <label>Notes</label>
          <textarea v-model="notes" rows="2"></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-save" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
          <button type="button" class="btn btn-cancel" @click="emit('close')" :disabled="isSaving">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
</style> 