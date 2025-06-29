<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import TimePicker from './TimePicker.vue'
import DatePicker from './DatePicker.vue'

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
const time = ref<{ hour: string; minute: string; ampm: 'AM' | 'PM' }>({ hour: '', minute: '', ampm: 'AM' })
const isSaving = ref(false)
const timeInput = ref<HTMLInputElement | null>(null)
const amountInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  const now = new Date()
  // Set default date
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

  nextTick()
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
    let timestamp
    if (customDate.value && getSelectedDateTime()) {
      // Create timestamp in local timezone
      timestamp = getSelectedDateTime()
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
          <label for="feeding-date">Date</label>
          <DatePicker v-model="customDate" id="feeding-date" />
        </div>
        <div class="form-group">
          <label for="feeding-time">Time</label>
          <TimePicker v-model="time" />
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
/* Component-specific styles only - global styles are handled in style.css */
</style> 