<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useBabyStore } from '../stores/babyStore'

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
const customTime = ref('')
const isSaving = ref(false)
const timeInput = ref<HTMLInputElement | null>(null)

const options = [
  { value: 'pee', label: 'Pee' },
  { value: 'poop', label: 'Poop' },
  { value: 'both', label: 'Both' }
]

onMounted(async () => {
  console.log('DiaperModal mounted with babyName:', props.babyName)
  
  // Pre-fill current date and time
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  customDate.value = `${year}-${month}-${day}`
  customTime.value = `${hours}:${minutes}`

  await nextTick()
  timeInput.value?.focus()
})

async function handleSubmit() {
  isSaving.value = true
  try {
    const timestamp = customDate.value && customTime.value ? new Date(`${customDate.value}T${customTime.value}`) : new Date()
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
          <label>Time</label>
          <div class="datetime-group">
            <input 
              type="date" 
              v-model="customDate" 
              required
            >
            <input
              ref="timeInput"
              type="time" 
              v-model="customTime" 
              required
            >
          </div>
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