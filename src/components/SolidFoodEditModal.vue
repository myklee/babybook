<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import ResponsiveModal from './ResponsiveModal.vue'
import { categoryNames, searchSuggestedFoods } from "../lib/suggestedFoods"
import type { SuggestedFood, FoodCategory } from "../lib/suggestedFoods"

interface SolidFoodEvent {
  id: string
  food_name: string
  food_category: FoodCategory
  reaction?: string | null
  notes?: string | null
  times_tried: number
  first_tried_date: string
  last_tried_date: string
}

interface Props {
  solidFood: SolidFoodEvent
  babyName: string
}

interface Emits {
  (e: 'close'): void
  (e: 'saved'): void
  (e: 'deleted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useBabyStore()

// Form data
const selectedFood = ref<SuggestedFood | null>(null)
const customFoodName = ref(props.solidFood.food_name)

const reaction = ref<'liked' | 'disliked' | 'neutral' | 'allergic_reaction' | ''>((props.solidFood.reaction as 'liked' | 'disliked' | 'neutral' | 'allergic_reaction') || '')
const notes = ref(props.solidFood.notes || '')
const timesTried = ref(props.solidFood.times_tried)
const customDate = ref('')
const time = ref<{ hour: string; minute: string; ampm: 'AM' | 'PM' }>({
  hour: '',
  minute: '',
  ampm: 'AM'
})
const isSaving = ref(false)
const isDeleting = ref(false)
const showAdvanced = ref(false)

// Search functionality
const searchQuery = ref(props.solidFood.food_name)
const showSuggestions = ref(false)
const filteredSuggestions = ref<Record<FoodCategory, SuggestedFood[]>>({
  western_traditional: [],
  chinese: [],
  japanese: [],
  indian: [],
  korean: []
})

// Computed properties
const visibleCategories = computed(() => {
  return Object.keys(filteredSuggestions.value).filter(
    (category) => filteredSuggestions.value[category as FoodCategory].length > 0
  ) as FoodCategory[]
})

const canSave = computed(() => {
  return (selectedFood.value || customFoodName.value.trim() || searchQuery.value.trim()) && !isSaving.value && !isDeleting.value
})

const finalFoodName = computed(() => {
  if (selectedFood.value) return selectedFood.value.name
  if (customFoodName.value.trim()) return customFoodName.value.trim()
  return searchQuery.value.trim()
})

// Dynamic modal title
const modalTitle = computed(() => `Edit Solid Food for ${props.babyName}`)



// Lifecycle
onMounted(() => {
  // ResponsiveModal handles body scroll locking
  
  // Set date and time from last_tried_date
  const lastTriedDate = new Date(props.solidFood.last_tried_date)
  const year = lastTriedDate.getFullYear()
  const month = String(lastTriedDate.getMonth() + 1).padStart(2, '0')
  const day = String(lastTriedDate.getDate()).padStart(2, '0')
  customDate.value = `${year}-${month}-${day}`
  
  // Set time
  let hour = lastTriedDate.getHours()
  time.value.ampm = hour >= 12 ? 'PM' : 'AM'
  let hour12 = hour % 12
  if (hour12 === 0) hour12 = 12
  time.value.hour = String(hour12)
  time.value.minute = String(lastTriedDate.getMinutes()).padStart(2, '0')
})

onUnmounted(() => {
  // ResponsiveModal handles body scroll restoration
})

// Functions
function filterSuggestions() {
  if (!searchQuery.value || searchQuery.value.length < 2) {
    showSuggestions.value = false
    return
  }

  const results = searchSuggestedFoods(searchQuery.value)

  // Group results by category
  const grouped: Record<FoodCategory, SuggestedFood[]> = {
    western_traditional: [],
    chinese: [],
    japanese: [],
    indian: [],
    korean: []
  }

  results.forEach((food) => {
    grouped[food.category].push(food)
  })

  filteredSuggestions.value = grouped
  showSuggestions.value = results.length > 0
}

function selectFood(food: SuggestedFood) {
  selectedFood.value = food
  searchQuery.value = food.name
  customFoodName.value = food.name
  showSuggestions.value = false
}

function clearSelection() {
  selectedFood.value = null
  searchQuery.value = customFoodName.value
  showSuggestions.value = false
}

function getSelectedDateTime() {
  if (!customDate.value) return new Date()
  const [year, month, day] = customDate.value.split('-').map(Number)
  let hour = Number(time.value.hour)
  if (time.value.ampm === 'PM' && hour < 12) hour += 12
  if (time.value.ampm === 'AM' && hour === 12) hour = 0
  return new Date(year, month - 1, day, hour, Number(time.value.minute), 0, 0)
}

async function handleSave() {
  if (!canSave.value) return

  isSaving.value = true
  
  try {
    const timestamp = getSelectedDateTime()
    
    await store.updateSolidFood(props.solidFood.id, {
      notes: notes.value || null,
      reaction: reaction.value || null,
      times_tried: timesTried.value,
      last_tried_date: timestamp.toISOString()
    })

    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error updating solid food:', error)
    alert('Failed to update solid food. Please try again.')
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!confirm(`Are you sure you want to delete "${props.solidFood.food_name}"? This action cannot be undone.`)) {
    return
  }

  isDeleting.value = true
  
  try {
    await store.deleteSolidFood(props.solidFood.id)
    emit('deleted')
    emit('close')
  } catch (error) {
    console.error('Error deleting solid food:', error)
    alert('Failed to delete solid food. Please try again.')
  } finally {
    isDeleting.value = false
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
          <label for="food-date">Last Tried Date</label>
          <DatePicker v-model="customDate" id="food-date" />
        </div>
        
        <div class="form-group">
          <label for="food-time">Time</label>
          <TimePicker v-model="time" />
        </div>

        <!-- Food Search and Selection -->
        <div class="form-group">
          <label>Food Name</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search foods or enter custom food name..."
            class="search-input"
            @input="filterSuggestions"
            @focus="filterSuggestions"
          />
          
          <!-- Food Suggestions -->
          <div v-if="showSuggestions && visibleCategories.length > 0" class="suggestions-container">
            <div class="suggestions-header">
              <span>Suggested foods:</span>
              <button type="button" @click="showSuggestions = false" class="close-suggestions">×</button>
            </div>
            
            <div
              v-for="category in visibleCategories"
              :key="category"
              class="suggestion-category"
            >
              <h4>{{ categoryNames[category] }}</h4>
              <div class="suggestions-grid">
                <div
                  v-for="food in filteredSuggestions[category]"
                  :key="food.name"
                  @click="selectFood(food)"
                  class="suggestion-item"
                >
                  <div class="food-name">{{ food.name }}</div>
                  <div class="food-meta">
                    <span class="food-age">{{ food.commonAge }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Food Display -->
        <div v-if="selectedFood || finalFoodName" class="selected-food-section">
          <div class="selected-food-header">
            <h4>Editing: {{ finalFoodName }}</h4>
            <button v-if="selectedFood" type="button" @click="clearSelection" class="clear-selection">
              Clear
            </button>
          </div>
        </div>

        <!-- Times Tried -->
        <div class="form-group">
          <label>Times Tried</label>
          <input
            v-model.number="timesTried"
            type="number"
            min="1"
            class="times-tried-input"
          />
        </div>



        <!-- Reaction -->
        <div class="form-group">
          <label>Baby's Reaction (optional)</label>
          <select v-model="reaction">
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
            <label>Notes (optional)</label>
            <textarea
              v-model="notes"
              rows="3"
              placeholder="How did it go? Any observations..."
              maxlength="500"
            ></textarea>
            <div class="notes-counter">{{ notes.length }}/500</div>
          </div>
        </div>

      </form>

      <!-- Footer Actions -->
      <template #footer>
        <div class="form-actions">
          <button type="button" class="btn btn-delete" @click="handleDelete" :disabled="isSaving || isDeleting">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
          <div class="action-buttons">
            <button type="button" class="btn btn-cancel" @click="emit('close')" :disabled="isSaving || isDeleting">
              Cancel
            </button>
            <button type="submit" class="btn btn-save" :disabled="!canSave" @click="handleSave">
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </template>
  </ResponsiveModal>
</template>

<style scoped>
/* Form Group Styles */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--color-text-tertiary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--form-input-border);
  border-radius: 0.5rem;
  background: var(--form-input-bg);
  color: var(--form-input-text);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  background: var(--form-input-bg-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.form-group input::placeholder,
.form-group select::placeholder,
.form-group textarea::placeholder {
  color: var(--form-input-placeholder);
}

/* Form Actions */
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-save {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.btn-save:hover:not(:disabled) {
  background: var(--btn-primary-bg-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--btn-primary-shadow-hover);
}

.btn-cancel {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 1px solid var(--btn-secondary-border);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--btn-secondary-bg-hover);
  color: var(--btn-secondary-text-hover);
}

.btn-delete {
  background: var(--btn-danger-bg);
  color: var(--btn-danger-text);
}

.btn-delete:hover:not(:disabled) {
  background: var(--btn-danger-bg-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--btn-danger-shadow);
}

/* Search Input */
.search-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--form-input-border);
  border-radius: 15px;
  background-color: var(--form-input-bg);
  color: var(--color-text-accent);
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  background-color: var(--form-input-bg-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.search-input::placeholder {
  color: var(--form-input-placeholder);
}

/* Suggestions */
.suggestions-container {
  position: relative;
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  background: var(--color-surface);
  margin-top: 0.5rem;
  box-shadow: var(--shadow-lg);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-surface-hover);
  border-bottom: 1px solid var(--color-surface-border);
  border-radius: 12px 12px 0 0;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--color-periwinkle);
}

.close-suggestions {
  background: none;
  border: none;
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0;
  color: var(--color-text-tertiary);
  transition: color 0.2s;
}

.close-suggestions:hover {
  color: var(--color-periwinkle);
}

.suggestion-category {
  margin-bottom: 1rem;
  padding: 0 1rem;
}

.suggestion-category:last-child {
  margin-bottom: 0;
  padding-bottom: 1rem;
}

.suggestion-category h4 {
  margin: 1rem 0 0.5rem 0;
  color: var(--color-text-quaternary);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.suggestion-item {
  padding: 0.75rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-surface);
}

.suggestion-item:hover {
  border-color: var(--color-primary);
  background: var(--color-focus-ring);
  transform: translateY(-1px);
}

.food-name {
  font-weight: 500;
  color: var(--color-periwinkle);
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.food-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-quaternary);
}

/* Selected Food */
.selected-food-section {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  border-radius: 12px;
}

.selected-food-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-food-header h4 {
  margin: 0;
  color: var(--color-success);
  font-size: 1rem;
}

.clear-selection {
  background: var(--btn-secondary-bg);
  border: 1px solid var(--btn-secondary-border);
  color: var(--btn-secondary-text);
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.clear-selection:hover {
  background: var(--btn-secondary-bg-hover);
  color: var(--btn-secondary-text-hover);
}

/* Notes Counter */
.notes-counter {
  font-size: 0.75rem;
  color: var(--color-text-disabled);
  text-align: right;
  margin-top: 0.25rem;
}

/* Additional styles for edit modal */
.times-tried-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--form-input-border);
  border-radius: 15px;
  background-color: var(--form-input-bg);
  color: var(--color-text-accent);
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
}

.times-tried-input:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  background-color: var(--form-input-bg-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

/* Times Tried Input */
.times-tried-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.times-tried-input:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  background: var(--form-input-bg-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
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
  color: var(--color-text-quaternary);
  text-decoration: none;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-periwinkle);
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

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
    gap: 1rem;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
  }

  .btn {
    width: 100%;
    padding: 1rem;
  }
}
</style>