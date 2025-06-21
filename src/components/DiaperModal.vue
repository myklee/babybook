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
  <div class="diaper-modal-overlay" @click="emit('close')">
    <div class="diaper-modal" @click.stop>
      <h3>Record Diaper Change for {{ babyName }}</h3>
      
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
.diaper-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.datetime-group {
  display: flex;
  gap: 0.5rem;
}

.datetime-group input {
  flex: 1;
}

.diaper-modal {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.diaper-modal h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
  font-size: 1rem;
}

.btn-save {
  background-color: #9c27b0;
}

.btn-save:hover {
  background-color: #7b1fa2;
}

.btn-cancel {
  background-color: #9e9e9e;
}

.btn-cancel:hover {
  background-color: #757575;
}
</style> 