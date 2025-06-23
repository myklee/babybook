<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { format } from 'date-fns'

const props = defineProps<{
  record: any
  type: 'feeding' | 'diaper' | 'sleep'
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
const customDate = ref('')
const customTime = ref('')
const customEndDate = ref('')
const customEndTime = ref('')
const topupAmount = ref(0)
const isSaving = ref(false)

onMounted(() => {
  const setDateTime = (timestamp: string, isEnd = false) => {
    const date = new Date(timestamp)
    const dateString = format(date, 'yyyy-MM-dd')
    const timeString = format(date, 'HH:mm')
    if (isEnd) {
      customEndDate.value = dateString
      customEndTime.value = timeString
    } else {
      customDate.value = dateString
      customTime.value = timeString
    }
  }

  if (props.type === 'feeding' || props.type === 'diaper') {
    if (props.type === 'feeding') {
      const feeding = props.record
      amount.value = feeding.amount
      feedingType.value = feeding.type
      notes.value = feeding.notes || ''
      topupAmount.value = feeding.topup_amount || 0
    } else { // Diaper
      const diaperChange = props.record
      diaperType.value = diaperChange.type
      notes.value = diaperChange.notes || ''
    }
    setDateTime(props.record.timestamp)
  } else if (props.type === 'sleep') {
    const sleep = props.record
    notes.value = sleep.notes || ''
    setDateTime(sleep.start_time)
    if (sleep.end_time) {
      setDateTime(sleep.end_time, true)
    }
  }
})

async function handleSubmit() {
  isSaving.value = true
  try {
    const getTimestamp = (dateStr: string, timeStr: string) => {
      if (!dateStr || !timeStr) return null
      return new Date(`${dateStr}T${timeStr}`)
    }

    const startTimestamp = getTimestamp(customDate.value, customTime.value)
    if (!startTimestamp) throw new Error('Invalid start time')

    if (props.type === 'feeding') {
      await store.updateFeeding(props.record.id, {
        amount: amount.value,
        type: feedingType.value,
        notes: notes.value,
        timestamp: startTimestamp.toISOString(),
        topup_amount: topupAmount.value
      })
    } else if (props.type === 'diaper') {
      await store.updateDiaperChange(props.record.id, {
        type: diaperType.value,
        notes: notes.value,
        timestamp: startTimestamp.toISOString()
      })
    } else if (props.type === 'sleep') {
      const endTimestamp = getTimestamp(customEndDate.value, customEndTime.value)
      await store.updateSleepSession(props.record.id, {
        start_time: startTimestamp.toISOString(),
        end_time: endTimestamp ? endTimestamp.toISOString() : null,
        notes: notes.value
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
      } else if (props.type === 'diaper') {
        await store.deleteDiaperChange(props.record.id)
      } else if (props.type === 'sleep') {
        await store.deleteSleepSession(props.record.id)
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
      <h3>Edit
        <span v-if="type === 'feeding'">Feeding</span>
        <span v-else-if="type === 'diaper'">Diaper Change</span>
        <span v-else-if="type === 'sleep'">Sleep Session</span>
      </h3>
      
      <form @submit.prevent="handleSubmit">
        <div v-if="type === 'feeding' || type === 'diaper'" class="form-group">
          <label>Time</label>
          <div class="datetime-group">
            <input type="date" v-model="customDate" required>
            <input type="time" v-model="customTime" required>
          </div>
        </div>
        <div v-if="type === 'sleep'" class="form-group">
          <label>Start Time</label>
          <div class="datetime-group">
            <input type="date" v-model="customDate" required>
            <input type="time" v-model="customTime" required>
          </div>
        </div>
        <div v-if="type === 'sleep'" class="form-group">
          <label>End Time</label>
          <div class="datetime-group">
            <input type="date" v-model="customEndDate">
            <input type="time" v-model="customEndTime">
          </div>
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
        <div v-if="type === 'feeding' && feedingType === 'breast'" class="form-group">
          <label>Formula Top-up (ml)</label>
          <input 
            type="number" 
            v-model="topupAmount" 
            min="0" 
            step="1"
            placeholder="0"
          >
          <small class="form-help">Add formula amount given after breastfeeding</small>
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

.form-help {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
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

.datetime-group {
  display: flex;
  gap: 0.5rem;
}

.datetime-group input {
  flex: 1;
}
</style> 