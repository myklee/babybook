<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const props = defineProps<{
  feedingType?: 'breast' | 'formula' | 'solid'
  babyId: string
  babyName: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useBabyStore()

// Form data
const amount = ref(0)
const feedingTypeRef = ref<'breast' | 'formula' | 'solid'>('breast')
const notes = ref('')
const customDate = ref('')
const customTime = ref('')
const isSaving = ref(false)
const timeInput = ref<HTMLInputElement | null>(null)
const amountInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  console.log('FeedingModal mounted with babyName:', props.babyName)
  
  // Pre-fill the type if provided
  if (props.feedingType) {
    feedingTypeRef.value = props.feedingType
  }

  // Load default amounts from baby settings
  const settings = store.getBabySettings(props.babyId)
  if (settings) {
    if (feedingTypeRef.value === 'breast' && settings.default_breast_amount > 0) {
      amount.value = settings.default_breast_amount
    } else if (feedingTypeRef.value === 'formula' && settings.default_formula_amount > 0) {
      amount.value = settings.default_formula_amount
    }
  }

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

// Watch for feeding type changes to update default amount
watch(feedingTypeRef, (newType) => {
  const settings = store.getBabySettings(props.babyId)
  if (settings) {
    if (newType === 'breast' && settings.default_breast_amount > 0) {
      amount.value = settings.default_breast_amount
    } else if (newType === 'formula' && settings.default_formula_amount > 0) {
      amount.value = settings.default_formula_amount
    } else {
      amount.value = 0
    }
  }
})

// Function to select all text when focusing amount field
function selectAmountText() {
  if (amountInput.value) {
    amountInput.value.select()
  }
}

async function handleSubmit() {
  isSaving.value = true
  try {
    let timestamp
    if (customDate.value && customTime.value) {
      // Create timestamp in local timezone
      const [year, month, day] = customDate.value.split('-').map(Number)
      const [hours, minutes] = customTime.value.split(':').map(Number)
      
      // Create date in local timezone (month is 0-indexed in JavaScript)
      timestamp = new Date(year, month - 1, day, hours, minutes, 0, 0)
    } else {
      timestamp = new Date()
    }
    
    await store.addFeeding(
      props.babyId,
      amount.value,
      feedingTypeRef.value,
      notes.value,
      timestamp
    )

    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error adding feeding:', error)
    alert('Failed to add feeding. Please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <h3 class="modal-title">Record Feeding for {{ babyName }}</h3>
      
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
          <label>Amount (ml)</label>
          <input 
            ref="amountInput"
            type="number" 
            v-model="amount" 
            required 
            min="0" 
            step="5"
            inputmode="decimal"
            pattern="[0-9]*"
            @focus="selectAmountText"
            @click="selectAmountText"
            placeholder="Enter amount"
            autocomplete="off"
          >
          <div v-if="feedingTypeRef === 'formula'" class="preset-buttons">
            <button 
              type="button" 
              class="preset-btn" 
              @click="amount = 100"
              :class="{ active: amount === 100 }"
            >
              100ml
            </button>
            <button 
              type="button" 
              class="preset-btn" 
              @click="amount = 130"
              :class="{ active: amount === 130 }"
            >
              130ml
            </button>
            <button 
              type="button" 
              class="preset-btn" 
              @click="amount = 160"
              :class="{ active: amount === 160 }"
            >
              160ml
            </button>
          </div>
          <div v-if="feedingTypeRef === 'breast'" class="preset-buttons">
            <button 
              type="button" 
              class="preset-btn" 
              @click="amount = 100"
              :class="{ active: amount === 100 }"
            >
              100ml
            </button>
            <button 
              type="button" 
              class="preset-btn" 
              @click="amount = 120"
              :class="{ active: amount === 120 }"
            >
              120ml
            </button>
            <button 
              type="button" 
              class="preset-btn" 
              @click="amount = 140"
              :class="{ active: amount === 140 }"
            >
              140ml
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Type</label>
          <select v-model="feedingTypeRef">
            <option value="breast">Breast</option>
            <option value="formula">Formula</option>
            <option value="solid">Solid</option>
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

.datetime-group {
  display: flex;
  gap: 0.5rem;
}

.datetime-group input {
  flex: 1;
}



/* Mobile-specific improvements for numeric inputs */
.form-group input[type="number"] {
  -webkit-appearance: none;
  -moz-appearance: textfield;
  font-size: 16px; /* Prevents zoom on iOS */
}

.form-group input[type="number"]::-webkit-outer-spin-button,
.form-group input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Improve touch targets on mobile */
@media (max-width: 768px) {
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 1rem;
    font-size: 16px; /* Prevents zoom on iOS */
    min-height: 44px; /* Better touch target */
  }
  
  .preset-btn {
    padding: 0.75rem 1rem;
    min-height: 44px;
    font-size: 1rem;
  }
  
  .btn {
    padding: 1rem 1.5rem;
    min-height: 44px;
    font-size: 1rem;
  }
}

</style> 