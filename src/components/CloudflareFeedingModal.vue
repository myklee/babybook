<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useCloudflareStore } from '../stores/cloudflareStore'

const props = defineProps<{
  babyId: string
  babyName: string
  feedingType?: 'breast' | 'formula' | 'solid'
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useCloudflareStore()

// Form data
const feedingTypeRef = ref<'breast' | 'formula' | 'solid'>('breast')
const amount = ref<number | null>(null)
const notes = ref('')
const timestamp = ref('')
const isSaving = ref(false)

// UI state
const showAdvanced = ref(false)

// Computed
const modalTitle = computed(() => `Record Feeding for ${props.babyName}`)

// Preset amounts for different feeding types
const presetAmounts = computed(() => {
  if (feedingTypeRef.value === 'formula') {
    return [60, 90, 120, 150, 180]
  } else if (feedingTypeRef.value === 'breast') {
    return [30, 60, 90, 120]
  }
  return []
})

// Initialize form
onMounted(() => {
  // Set default timestamp to now
  const now = new Date()
  timestamp.value = now.toISOString().slice(0, 16)
  
  // Set feeding type from props
  if (props.feedingType) {
    feedingTypeRef.value = props.feedingType
  }
  
  // Set default amount based on type
  setDefaultAmount()
})

// Watch for feedingType prop changes (when modal is opened with different types)
watch(() => props.feedingType, (newType) => {
  if (newType) {
    feedingTypeRef.value = newType
    setDefaultAmount()
  }
})

// Watch for modal opening to reset form
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Reset form when modal opens
    const now = new Date()
    timestamp.value = now.toISOString().slice(0, 16)
    notes.value = ''
    showAdvanced.value = false
    
    // Set feeding type from props
    if (props.feedingType) {
      feedingTypeRef.value = props.feedingType
    }
    
    setDefaultAmount()
  }
})

// Function to set default amount based on feeding type
function setDefaultAmount() {
  if (feedingTypeRef.value === 'formula') {
    amount.value = 120 // Default 120ml for formula
  } else if (feedingTypeRef.value === 'breast') {
    amount.value = 60 // Default 60ml for breast
  } else {
    amount.value = null // No amount for solid food
  }
}

// Watch for feeding type changes to update default amount
watch(feedingTypeRef, () => {
  setDefaultAmount()
})

// Handle form submission
async function handleSubmit() {
  if (!props.babyId) return
  
  isSaving.value = true
  try {
    await store.addFeeding({
      baby_id: props.babyId,
      type: feedingTypeRef.value,
      amount: amount.value,
      timestamp: timestamp.value
    })
    
    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error adding feeding:', error)
    store.error = 'Failed to add feeding. Please try again.'
  } finally {
    isSaving.value = false
  }
}

// Handle preset amount selection
function selectPresetAmount(presetAmount: number) {
  amount.value = presetAmount
}

// Handle modal close
function handleClose() {
  if (!isSaving.value) {
    emit('close')
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleClose">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ modalTitle }}</h2>
        <button @click="handleClose" class="close-btn" :disabled="isSaving">
          ×
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="modal-body">
        <!-- Date and Time -->
        <div class="form-group">
          <label>Date & Time</label>
          <input
            v-model="timestamp"
            type="datetime-local"
            required
            :disabled="isSaving"
          />
        </div>

        <!-- Feeding Type -->
        <div class="form-group">
          <label>Type</label>
          <div class="type-selector">
            <button
              v-for="type in ['breast', 'formula', 'solid']"
              :key="type"
              type="button"
              @click="feedingTypeRef = type"
              :class="['type-btn', { active: feedingTypeRef === type }]"
              :disabled="isSaving"
            >
              {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            </button>
          </div>
        </div>

        <!-- Amount (for formula and breast) -->
        <div v-if="feedingTypeRef !== 'solid'" class="form-group">
          <label>Amount (ml)</label>
          <div class="amount-input-group">
            <input
              v-model.number="amount"
              type="number"
              min="0"
              step="5"
              placeholder="Enter amount"
              :disabled="isSaving"
            />
            <div v-if="presetAmounts.length > 0" class="preset-buttons">
              <button
                v-for="preset in presetAmounts"
                :key="preset"
                type="button"
                @click="selectPresetAmount(preset)"
                :class="['preset-btn', { active: amount === preset }]"
                :disabled="isSaving"
              >
                {{ preset }}ml
              </button>
            </div>
          </div>
        </div>

        <!-- Advanced Options Toggle -->
        <div class="advanced-toggle">
          <button
            type="button"
            @click="showAdvanced = !showAdvanced"
            class="toggle-btn"
            :disabled="isSaving"
          >
            <span>{{ showAdvanced ? 'Hide' : 'More' }} Options</span>
            <span class="arrow" :class="{ rotated: showAdvanced }">▼</span>
          </button>
        </div>

        <!-- Advanced Options -->
        <div v-if="showAdvanced" class="advanced-options">
          <div class="form-group">
            <label>Notes</label>
            <textarea
              v-model="notes"
              rows="3"
              placeholder="Optional notes..."
              :disabled="isSaving"
            ></textarea>
          </div>
        </div>
      </form>

      <div class="modal-footer">
        <button
          type="button"
          @click="handleClose"
          class="btn btn-secondary"
          :disabled="isSaving"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="handleSubmit"
          class="btn btn-primary"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Saving...' : 'Save Feeding' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--color-surface);
  border-radius: 1rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-surface-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--color-text-accent);
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 0.5rem;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-text-primary);
}

.type-selector {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 0.5rem;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.type-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-text-accent);
}

.type-btn.active {
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border-color: var(--color-text-primary);
}

.amount-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 0.375rem;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.preset-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-text-accent);
}

.preset-btn.active {
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border-color: var(--color-text-primary);
}

.advanced-toggle {
  text-align: center;
  margin: 0.5rem 0;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-accent);
  transition: all 0.2s;
  border-radius: 0.375rem;
}

.toggle-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}

.arrow {
  transition: transform 0.2s;
  font-size: 0.75rem;
}

.arrow.rotated {
  transform: rotate(180deg);
}

.advanced-options {
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-surface-border);
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-surface-border);
}

.btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-surface-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .modal {
    margin: 0.5rem;
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }
  
  .preset-buttons {
    justify-content: center;
  }
  
  .type-selector {
    flex-direction: column;
  }
}
</style>