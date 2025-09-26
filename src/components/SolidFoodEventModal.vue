<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import ResponsiveModal from './ResponsiveModal.vue'
import FormInput from './FormInput.vue'
import FormLabel from './FormLabel.vue'
import type { UserFoodItem } from '../types/solidFood'

interface Props {
  babyId: string
  babyName: string
}

interface Emits {
  (e: 'close'): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useBabyStore()

// Form data
const selectedFoodIds = ref<string[]>([])
const searchQuery = ref('')
const customDate = ref('')
const time = ref<{ hour: string; minute: string; ampm: 'AM' | 'PM' }>({
  hour: '',
  minute: '',
  ampm: 'AM'
})
const notes = ref('')
const reaction = ref<'liked' | 'disliked' | 'neutral' | 'allergic_reaction' | ''>('')
const isSaving = ref(false)
const showAdvanced = ref(false)
const saveSuccess = ref(false)

// Food management
const isAddingNewFood = ref(false)
const newFoodName = ref('')

// Get user's food items
const userFoodItems = computed(() => store.userFoodItems || [])

// Filter food items based on search query
const filteredFoodItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return userFoodItems.value.slice(0, 20) // Show first 20 items when no search
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return userFoodItems.value
    .filter(food => food.name.toLowerCase().includes(query))
    .sort((a, b) => {
      // Sort by relevance: exact matches first, then by consumption count
      const aExact = a.name.toLowerCase() === query
      const bExact = b.name.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return b.times_consumed - a.times_consumed
    })
    .slice(0, 10) // Limit to 10 results for performance
})

// Get selected food items
const selectedFoods = computed(() => {
  return userFoodItems.value.filter(food => selectedFoodIds.value.includes(food.id))
})

// Check if we can add a new food with the current search query
const canAddNewFood = computed(() => {
  const query = searchQuery.value.trim()
  if (!query || query.length < 2) return false
  
  // Check if food already exists
  const exists = userFoodItems.value.some(food => 
    food.name.toLowerCase() === query.toLowerCase()
  )
  return !exists
})

// Validation
const validationErrors = computed(() => {
  const errors: string[] = []
  
  if (selectedFoodIds.value.length === 0) {
    errors.push('At least one food must be selected')
  }
  
  if (!customDate.value) {
    errors.push('Date is required')
  }
  
  if (!time.value.hour || !time.value.minute) {
    errors.push('Time is required')
  }
  
  return errors
})

const canSave = computed(() => {
  return validationErrors.value.length === 0 && !isSaving.value
})

const showValidationErrors = ref(false)

// Dynamic modal title
const modalTitle = computed(() => `Record Solid Food for ${props.babyName}`)

// Lifecycle
onMounted(() => {
  // Set default date and time
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  customDate.value = `${year}-${month}-${day}`
  
  // Set default time
  let hour = now.getHours()
  time.value.ampm = hour >= 12 ? 'PM' : 'AM'
  let hour12 = hour % 12
  if (hour12 === 0) hour12 = 12
  time.value.hour = String(hour12)
  time.value.minute = String(now.getMinutes()).padStart(2, '0')
})

// Food selection functions (removed unused toggleFoodSelection)

function removeFoodSelection(foodId: string) {
  const index = selectedFoodIds.value.indexOf(foodId)
  if (index > -1) {
    selectedFoodIds.value.splice(index, 1)
  }
}

function clearAllSelections() {
  selectedFoodIds.value = []
}

// Search and suggestions functions
function handleSearchInput() {
  // Search input handler - filtering is handled by computed property
}

function selectFoodFromSuggestion(food: UserFoodItem) {
  if (!selectedFoodIds.value.includes(food.id)) {
    selectedFoodIds.value.push(food.id)
  }
  searchQuery.value = ''
}

// New food creation
async function startAddingNewFood() {
  newFoodName.value = searchQuery.value.trim()
  isAddingNewFood.value = true
  
  await nextTick()
  // Focus would be handled by the input if we had one in the template
}

async function confirmAddNewFood() {
  if (!newFoodName.value.trim()) return
  
  try {
    const newFood = await store.addUserFoodItem(newFoodName.value.trim())
    selectedFoodIds.value.push(newFood.id)
    
    // Reset state
    newFoodName.value = ''
    isAddingNewFood.value = false
    searchQuery.value = ''
  } catch (error) {
    console.error('Error adding new food:', error)
    alert('Failed to add new food. Please try again.')
  }
}

function cancelAddNewFood() {
  newFoodName.value = ''
  isAddingNewFood.value = false
  searchQuery.value = ''
}

// Form submission
function getSelectedDateTime() {
  if (!customDate.value) return new Date()
  const [year, month, day] = customDate.value.split("-").map(Number)
  let hour = Number(time.value.hour)
  if (time.value.ampm === "PM" && hour < 12) hour += 12
  if (time.value.ampm === "AM" && hour === 12) hour = 0
  return new Date(
    year,
    month - 1,
    day,
    hour,
    Number(time.value.minute),
    0,
    0,
  )
}

async function handleSave() {
  // Show validation errors if form is invalid
  if (validationErrors.value.length > 0) {
    showValidationErrors.value = true
    return
  }

  if (!canSave.value) return

  isSaving.value = true
  
  try {
    const selectedDateTime = getSelectedDateTime()
    await store.createSolidFoodEvent(
      props.babyId,
      selectedFoodIds.value,
      selectedDateTime,
      notes.value || undefined,
      reaction.value || undefined
    )

    // Show success feedback briefly before closing
    saveSuccess.value = true
    setTimeout(() => {
      emit('saved')
      emit('close')
    }, 500)
  } catch (error) {
    console.error('Error creating solid food event:', error)
    alert('Failed to record solid food event. Please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <ResponsiveModal
    :is-open="true"
    :title="modalTitle"
    :close-on-backdrop="true"
    max-width="600px"
    @close="emit('close')"
  >
    <!-- Form Content -->
    <form @submit.prevent="handleSave">
      <!-- Date and Time -->
      <div class="form-group">
        <FormLabel html-for="food-date" required>Date</FormLabel>
        <DatePicker v-model="customDate" id="food-date" />
      </div>
      
      <div class="form-group">
        <FormLabel html-for="food-time" required>Time</FormLabel>
        <TimePicker v-model="time" />
      </div>

      <!-- Validation Errors -->
      <div v-if="showValidationErrors && validationErrors.length > 0" class="validation-errors">
        <div class="validation-error-header">Please fix the following errors:</div>
        <ul class="validation-error-list">
          <li v-for="error in validationErrors" :key="error" class="validation-error-item">
            {{ error }}
          </li>
        </ul>
      </div>

      <!-- Food Selection -->
      <div class="form-group">
        <FormLabel html-for="food-search" required>Select Foods</FormLabel>
        
        <!-- Search Input -->
        <FormInput
          v-model="searchQuery"
          id="food-search"
          type="text"
          placeholder="Search foods or type to add new..."
          @input="handleSearchInput"
        />
        
        <!-- Food Suggestions List (Always Visible) -->
        <div class="suggestions-container">
          <div class="suggestions-header">
            <span>{{ filteredFoodItems.length > 0 ? 'Select from your foods:' : 'No matching foods found' }}</span>
          </div>
          
          <!-- Existing Food Items -->
          <div v-if="filteredFoodItems.length > 0" class="suggestions-list">
            <div
              v-for="food in filteredFoodItems"
              :key="food.id"
              @click="selectFoodFromSuggestion(food)"
              class="suggestion-item"
              :class="{ 'already-selected': selectedFoodIds.includes(food.id) }"
            >
              <div class="food-info">
                <div class="food-name">{{ food.name }}</div>
                <div class="food-meta">
                  <span class="consumption-count">{{ food.times_consumed }}x tried</span>
                  <span v-if="food.last_tried_date" class="last-tried">
                    Last: {{ new Date(food.last_tried_date).toLocaleDateString() }}
                  </span>
                </div>
              </div>
              <div v-if="selectedFoodIds.includes(food.id)" class="selected-indicator">✓</div>
            </div>
          </div>
          
          <!-- Add New Food Option -->
          <div v-if="canAddNewFood" class="add-new-food-section">
            <div class="add-new-divider">or</div>
            <button
              type="button"
              @click="startAddingNewFood"
              class="add-new-food-btn"
            >
              <span class="add-icon">+</span>
              Add "{{ searchQuery.trim() }}" as new food
            </button>
          </div>
        </div>
      </div>

      <!-- Selected Foods Display -->
      <div v-if="selectedFoods.length > 0" class="selected-foods-section">
        <div class="selected-foods-header">
          <h4>Selected Foods ({{ selectedFoods.length }})</h4>
          <button type="button" @click="clearAllSelections" class="clear-all-btn">
            Clear All
          </button>
        </div>
        <div class="selected-foods-list">
          <div
            v-for="food in selectedFoods"
            :key="food.id"
            class="selected-food-item"
          >
            <span class="food-name">{{ food.name }}</span>
            <button
              type="button"
              @click="removeFoodSelection(food.id)"
              class="remove-food-btn"
              :aria-label="`Remove ${food.name}`"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- New Food Creation Modal -->
      <div v-if="isAddingNewFood" class="new-food-overlay">
        <div class="new-food-modal">
          <h3>Add New Food</h3>
          <FormInput
            v-model="newFoodName"
            type="text"
            placeholder="Enter food name..."
            @keydown.enter="confirmAddNewFood"
            @keydown.escape="cancelAddNewFood"
          />
          <div class="new-food-actions">
            <button type="button" @click="cancelAddNewFood" class="btn btn-cancel">
              Cancel
            </button>
            <button type="button" @click="confirmAddNewFood" class="btn btn-save">
              Add Food
            </button>
          </div>
        </div>
      </div>

      <!-- Reaction Selection -->
      <div class="form-group">
        <FormLabel html-for="reaction">Baby's Reaction (optional)</FormLabel>
        <select v-model="reaction" id="reaction" class="form-select">
          <option value="">No reaction noted</option>
          <option value="liked">Liked 😊</option>
          <option value="disliked">Disliked 😕</option>
          <option value="neutral">Neutral 😐</option>
          <option value="allergic_reaction">Allergic Reaction ⚠️</option>
        </select>
      </div>

      <!-- Advanced Options Toggle -->
      <div class="advanced-toggle">
        <button
          type="button"
          @click="showAdvanced = !showAdvanced"
          class="toggle-btn"
        >
          <span>{{ showAdvanced ? "Hide" : "More" }} Options</span>
          <span class="arrow" :class="{ rotated: showAdvanced }">▼</span>
        </button>
      </div>

      <!-- Advanced Options -->
      <div v-if="showAdvanced" class="advanced-options">
        <div class="form-group">
          <FormLabel html-for="notes">Notes (optional)</FormLabel>
          <textarea
            v-model="notes"
            id="notes"
            rows="3"
            placeholder="How did it go? Any observations..."
            maxlength="500"
            class="form-textarea"
          ></textarea>
          <div class="notes-counter">{{ notes.length }}/500</div>
        </div>
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <div class="btn-group-end">
        <button type="button" class="btn btn-cancel" @click="emit('close')" :disabled="isSaving">
          Cancel
        </button>
        <button 
          type="submit" 
          class="btn btn-save" 
          :class="{ 'btn-loading': isSaving, 'btn-success': saveSuccess }" 
          :disabled="!canSave" 
          @click="handleSave"
        >
          {{ saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </template>
  </ResponsiveModal>
</template>

<style scoped>
/* Validation Errors */
.validation-errors {
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.validation-error-header {
  font-weight: 600;
  color: var(--color-error);
  margin-bottom: 0.5rem;
}

.validation-error-list {
  margin: 0;
  padding-left: 1.25rem;
}

.validation-error-item {
  color: var(--color-error);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.validation-error-item:last-child {
  margin-bottom: 0;
}

/* Food Search Container */
.food-search-container {
  position: relative;
}

/* Suggestions Container */
.suggestions-container {
  background-color: #1a1a2e;
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  margin-top: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

[data-theme="light"] .suggestions-container {
  background-color: #ffffff;
}

.suggestions-header {
  padding: 0.75rem 1rem;
  background-color: #0d1b1e;
  border-bottom: 1px solid var(--color-surface-border);
  border-radius: 12px 12px 0 0;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

[data-theme="light"] .suggestions-header {
  background-color: #f8fafc;
}



/* Suggestions List */
.suggestions-list {
  padding: 0.5rem 0;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid var(--color-surface-border);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #23243a;
}

[data-theme="light"] .suggestion-item:hover {
  background-color: #f1f5f9;
}

.suggestion-item.already-selected {
  background: var(--color-success-bg);
  border-color: var(--color-success);
}

.food-info {
  flex: 1;
  min-width: 0;
}

.food-name {
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.food-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.consumption-count {
  color: var(--color-primary);
  font-weight: 500;
}

.selected-indicator {
  color: var(--color-success);
  font-weight: bold;
  font-size: 1.125rem;
}

/* Add New Food Section */
.add-new-food-section {
  border-top: 1px solid var(--color-surface-border);
  padding: 0.5rem;
}

.add-new-divider {
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-new-food-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.add-new-food-btn:hover {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.add-icon {
  font-size: 1.125rem;
  font-weight: bold;
}

/* Selected Foods Section */
.selected-foods-section {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--color-success-bg);
  border: 1px solid var(--color-success);
  border-radius: 12px;
}

.selected-foods-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.selected-foods-header h4 {
  margin: 0;
  color: var(--color-success);
  font-size: 1rem;
}

.clear-all-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  color: var(--color-text-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background-color: #23243a;
  color: var(--color-text-primary);
}

[data-theme="light"] .clear-all-btn:hover {
  background-color: #f1f5f9;
}

.selected-foods-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.selected-food-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 20px;
  font-size: 0.875rem;
}

.selected-food-item .food-name {
  color: var(--color-text-primary);
  font-weight: 500;
}

.remove-food-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 1.125rem;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
}

.remove-food-btn:hover {
  color: var(--color-error);
}

/* New Food Modal Overlay */
.new-food-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1020;
}

.new-food-modal {
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-2xl);
}

.new-food-modal h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
}

.new-food-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.new-food-actions .btn {
  flex: 1;
}

/* Form Elements */
.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.notes-counter {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  text-align: right;
  margin-top: 0.25rem;
}

/* Advanced Options */
.advanced-toggle {
  margin: 1rem 0;
  text-align: center;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  border-radius: 6px;
}

.arrow {
  transition: transform 0.2s;
}

.arrow.rotated {
  transform: rotate(180deg);
}

.advanced-options {
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-surface-border);
}

/* Button Success State */
.btn-success {
  background-color: var(--color-success) !important;
  border-color: var(--color-success) !important;
  color: var(--color-text-on-success) !important;
}

/* Import shared modal button styles */
@import '../styles/modal-buttons.css';

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .suggestions-container {
    max-height: 250px;
  }
  
  .selected-foods-list {
    gap: 0.375rem;
  }
  
  .selected-food-item {
    font-size: 0.8125rem;
    padding: 0.375rem 0.625rem;
  }
  
  .new-food-modal {
    width: 95%;
    padding: 1rem;
  }
  
  .new-food-actions {
    flex-direction: column;
  }
}
</style>