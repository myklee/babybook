<script setup lang="ts">
import { ref } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const props = defineProps<{
  babyId: string
  type: 'feeding' | 'diaper'
}>()

const store = useBabyStore()
const showForm = ref(false)

// Feeding form data
const amount = ref(0)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const notes = ref('')
const customTimestamp = ref('')

// Diaper form data
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')

function handleSubmit() {
  if (props.type === 'feeding') {
    const timestamp = customTimestamp.value ? new Date(customTimestamp.value) : undefined
    store.addFeeding(props.babyId, amount.value, feedingType.value, notes.value, timestamp)
  } else {
    store.addDiaperChange(props.babyId, diaperType.value, notes.value)
  }
  resetForm()
  showForm.value = false
}

function resetForm() {
  amount.value = 0
  feedingType.value = 'breast'
  diaperType.value = 'wet'
  notes.value = ''
  customTimestamp.value = ''
}

// Set default timestamp to current time when form opens
function openForm() {
  showForm.value = true
  if (props.type === 'feeding') {
    // Set to current time in local timezone
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    customTimestamp.value = `${year}-${month}-${day}T${hours}:${minutes}`
  }
}
</script>

<template>
  <div class="record-form">
    <button 
      v-if="!showForm" 
      class="btn" 
      :class="type === 'feeding' ? 'btn-feeding' : 'btn-diaper'"
      @click="openForm"
    >
      Record {{ type === 'feeding' ? 'Feeding' : 'Diaper Change' }}
    </button>

    <div v-else class="form-container">
      <form @submit.prevent="handleSubmit">
        <div v-if="type === 'feeding'" class="form-group">
          <label>Time Started</label>
          <input 
            type="datetime-local" 
            v-model="customTimestamp" 
            required
          >
        </div>

        <div v-if="type === 'feeding'" class="form-group">
          <label>Amount (ml)</label>
          <input 
            type="number" 
            v-model="amount" 
            required 
            min="0" 
            step="1"
          >
        </div>

        <div v-if="type === 'feeding'" class="form-group">
          <label>Type</label>
          <select v-model="feedingType">
            <option value="breast">Breast</option>
            <option value="formula">Formula</option>
            <option value="solid">Solid</option>
          </select>
        </div>

        <div v-if="type === 'diaper'" class="form-group">
          <label>Type</label>
          <select v-model="diaperType">
            <option value="wet">Wet</option>
            <option value="dirty">Dirty</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div class="form-group">
          <label>Notes</label>
          <textarea v-model="notes" rows="2"></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn" :class="type === 'feeding' ? 'btn-feeding' : 'btn-diaper'">
            Save
          </button>
          <button type="button" class="btn btn-cancel" @click="showForm = false">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.record-form {
  width: 100%;
}

.form-container {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-cancel {
  background-color: #9e9e9e;
}

.btn-cancel:hover {
  background-color: #757575;
}
</style> 