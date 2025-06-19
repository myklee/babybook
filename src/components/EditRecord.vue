<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const props = defineProps<{
  record: any
  type: 'feeding' | 'diaper'
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useBabyStore()

// Form data
const amount = ref(0)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')
const notes = ref('')
const customTimestamp = ref('')
const isSaving = ref(false)

onMounted(() => {
  if (props.type === 'feeding') {
    const feeding = props.record
    amount.value = feeding.amount
    feedingType.value = feeding.type
    notes.value = feeding.notes || ''
    
    // Format stored ISO date string for datetime-local input
    const date = new Date(feeding.timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    customTimestamp.value = `${year}-${month}-${day}T${hours}:${minutes}`
  } else {
    const diaperChange = props.record
    diaperType.value = diaperChange.type
    notes.value = diaperChange.notes || ''
    
    // Format stored ISO date string for datetime-local input
    const date = new Date(diaperChange.timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    customTimestamp.value = `${year}-${month}-${day}T${hours}:${minutes}`
  }
})

async function handleSubmit() {
  isSaving.value = true
  try {
    const timestamp = customTimestamp.value ? new Date(customTimestamp.value) : new Date()
    
    if (props.type === 'feeding') {
      await store.updateFeeding(props.record.id, {
        amount: amount.value,
        type: feedingType.value,
        notes: notes.value,
        timestamp: timestamp.toISOString()
      })
    } else {
      await store.updateDiaperChange(props.record.id, {
        type: diaperType.value,
        notes: notes.value,
        timestamp: timestamp.toISOString()
      })
    }
    
    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error updating record:', error)
    alert('Failed to update record. Please try again.')
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (confirm('Are you sure you want to delete this record?')) {
    isSaving.value = true
    try {
      if (props.type === 'feeding') {
        await store.deleteFeeding(props.record.id)
      } else {
        await store.deleteDiaperChange(props.record.id)
      }
      emit('close')
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Failed to delete record. Please try again.')
    } finally {
      isSaving.value = false
    }
  }
}
</script>

<template>
  <div class="edit-record-overlay" @click="emit('close')">
    <div class="edit-record-modal" @click.stop>
      <h3>Edit {{ type === 'feeding' ? 'Feeding' : 'Diaper Change' }}</h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Time</label>
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
          <button type="submit" class="btn btn-save" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
          <button type="button" class="btn btn-delete" @click="handleDelete" :disabled="isSaving">
            Delete
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
.edit-record-overlay {
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

.edit-record-modal {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.edit-record-modal h3 {
  margin: 0 0 1rem 0;
  color: #333;
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
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
  min-width: 80px;
}

.btn-save {
  background-color: #4caf50;
}

.btn-save:hover {
  background-color: #388e3c;
}

.btn-delete {
  background-color: #f44336;
}

.btn-delete:hover {
  background-color: #d32f2f;
}

.btn-cancel {
  background-color: #9e9e9e;
}

.btn-cancel:hover {
  background-color: #757575;
}
</style> 