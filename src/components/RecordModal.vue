<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const props = defineProps<{
  babyId: string
  type: 'feeding' | 'diaper'
  isOpen: boolean
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

// Computed property for current datetime in the correct format
const currentDateTime = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
})

// Initialize form when modal opens
function initializeForm() {
  customTimestamp.value = currentDateTime.value
  amount.value = 0
  feedingType.value = 'breast'
  diaperType.value = 'wet'
  notes.value = ''
}

function handleSubmit() {
  const timestamp = customTimestamp.value ? new Date(customTimestamp.value) : new Date()
  
  if (props.type === 'feeding') {
    store.addFeeding(props.babyId, amount.value, feedingType.value, notes.value, timestamp)
  } else {
    store.addDiaperChange(props.babyId, diaperType.value, notes.value)
  }
  
  emit('saved')
  emit('close')
}

function handleClose() {
  emit('close')
}

// Watch for modal opening to initialize form
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Use nextTick to ensure the modal is rendered before setting the value
    import('vue').then(({ nextTick }) => {
      nextTick(() => {
        initializeForm()
      })
    })
  }
})

// Also initialize on mount if modal is already open
onMounted(() => {
  if (props.isOpen) {
    initializeForm()
  }
})
</script>

<template>
  <div v-if="isOpen" class="record-modal-overlay" @click="handleClose">
    <div class="record-modal" @click.stop>
      <h3>Record {{ type === 'feeding' ? 'Feeding' : 'Diaper Change' }}</h3>
      
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
          <textarea v-model="notes" rows="3" placeholder="Optional notes..."></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-save">
            Save Record
          </button>
          <button type="button" class="btn btn-cancel" @click="handleClose">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.record-modal-overlay {
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

.record-modal {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.record-modal h3 {
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

@media (max-width: 480px) {
  .record-modal {
    margin: 1rem;
    width: calc(100% - 2rem);
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style> 