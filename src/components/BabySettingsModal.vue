<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
  // Lock body scroll when modal opens
  document.body.style.overflow = 'hidden'
  
  // Load current settings
  const settings = store.getBabySettings(props.babyId)
  if (settings) {
    feedingIntervalHours.value = settings.feeding_interval_hours
    defaultBreastAmount.value = settings.default_breast_amount
    defaultFormulaAmount.value = settings.default_formula_amount
  }
})

onUnmounted(() => {
  // Restore body scroll when modal is destroyed
  document.body.style.overflow = ''
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
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <h3 class="modal-title">Feeding Settings for {{ babyName }}</h3>
      
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

</style> 