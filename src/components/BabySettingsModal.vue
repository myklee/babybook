<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const props = defineProps<{
  babyId: string
  babyName: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useBabyStore()

// Form data
const feedingIntervalHours = ref(3)
const defaultBreastAmount = ref(0)
const defaultFormulaAmount = ref(0)
const isSaving = ref(false)

// Refs for input fields
const breastAmountInput = ref<HTMLInputElement | null>(null)
const formulaAmountInput = ref<HTMLInputElement | null>(null)

// Functions to select all text when focusing amount fields
function selectBreastAmountText() {
  if (breastAmountInput.value) {
    breastAmountInput.value.select()
  }
}

function selectFormulaAmountText() {
  if (formulaAmountInput.value) {
    formulaAmountInput.value.select()
  }
}

onMounted(() => {
  // Load current settings
  const settings = store.getBabySettings(props.babyId)
  if (settings) {
    feedingIntervalHours.value = settings.feeding_interval_hours
    defaultBreastAmount.value = settings.default_breast_amount
    defaultFormulaAmount.value = settings.default_formula_amount
  }
})

async function handleSubmit() {
  isSaving.value = true
  try {
    await store.updateBabySettings(props.babyId, {
      feeding_interval_hours: feedingIntervalHours.value,
      default_breast_amount: defaultBreastAmount.value,
      default_formula_amount: defaultFormulaAmount.value
    })

    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error updating baby settings:', error)
    alert('Failed to update baby settings. Please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="settings-modal-overlay" @click="emit('close')">
    <div class="settings-modal" @click.stop>
      <h3>Feeding Settings for {{ babyName }}</h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Feeding Interval (hours)</label>
          <input 
            type="number" 
            v-model="feedingIntervalHours" 
            min="1" 
            max="24" 
            required
          >
          <small>How often to feed (e.g., 3 = every 3 hours)</small>
        </div>

        <div class="form-group">
          <label>Default Breast Amount (ml)</label>
          <input 
            type="number" 
            v-model="defaultBreastAmount" 
            min="0" 
            step="5"
            ref="breastAmountInput"
            inputmode="numeric"
            pattern="[0-9]*"
            @focus="selectBreastAmountText"
          >
          <small>Default amount for breast feedings (0 = no default)</small>
        </div>

        <div class="form-group">
          <label>Default Formula Amount (ml)</label>
          <input 
            type="number" 
            v-model="defaultFormulaAmount" 
            min="0" 
            step="5"
            ref="formulaAmountInput"
            inputmode="numeric"
            pattern="[0-9]*"
            @focus="selectFormulaAmountText"
          >
          <small>Default amount for formula feedings (0 = no default)</small>
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
.settings-modal-overlay {
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

.settings-modal {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.settings-modal h3 {
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

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.875rem;
}

.form-group input:focus {
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
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-save {
  background-color: #9c27b0;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background-color: #7b1fa2;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #333;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #e0e0e0;
}
</style> 