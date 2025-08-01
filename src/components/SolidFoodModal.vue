<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import { categoryNames, searchSuggestedFoods } from "../lib/suggestedFoods"
import type { SuggestedFood, FoodCategory } from "../lib/suggestedFoods"

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
const selectedFood = ref<SuggestedFood | null>(null)
const customFoodName = ref('')
const selectedFoodCategory = ref<FoodCategory>('western_traditional')
const reaction = ref<'liked' | 'disliked' | 'neutral' | 'allergic_reaction' | ''>('')
const notes = ref('')
const customDate = ref('')
const time = ref<{ hour: string; minute: string; ampm: 'AM' | 'PM' }>({
  hour: '',
  minute: '',
  ampm: 'AM'
})
const isSaving = ref(false)
const showAdvanced = ref(false)

// Search functionality
const searchQuery = ref('')
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
  return (selectedFood.value || customFoodName.value.trim() || searchQuery.value.trim()) && !isSaving.value
})

const finalFoodName = computed(() => {
  if (selectedFood.value) return selectedFood.value.name
  if (customFoodName.value.trim()) return customFoodName.value.trim()
  return searchQuery.value.trim()
})

const finalCategory = computed(() => {
  return selectedFood.value?.category || selectedFoodCategory.value
})

// Lifecycle
onMounted(() => {
  // Lock body scroll
  document.body.style.overflow = 'hidden'
  
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

onUnmounted(() => {
  // Restore body scroll
  document.body.style.overflow = ''
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
  customFoodName.value = ''
  showSuggestions.value = false
}

function clearSelection() {
  selectedFood.value = null
  searchQuery.value = ''
  customFoodName.value = ''
  showSuggestions.value = false
}

function hasFoodBeenTried(foodName: string): boolean {
  return store.hasFoodBeenTried(props.babyId, foodName)
}

function getFoodTryCount(foodName: string): number {
  return store.getFoodTryCount(props.babyId, foodName)
}



async function handleSave() {
  if (!canSave.value) return

  isSaving.value = true
  
  try {
    await store.addSolidFood(
      props.babyId,
      finalFoodName.value,
      finalCategory.value,
      notes.value || undefined,
      reaction.value || undefined
    )

    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error adding solid food:', error)
    alert('Failed to add solid food. Please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <h3 class="modal-title">Record Solid Food for {{ babyName }}</h3>
      
      <form @submit.prevent="handleSave">
        <!-- Date and Time -->
        <div class="form-group">
          <label for="food-date">Date</label>
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
                  :class="{ 'already-tried': hasFoodBeenTried(food.name) }"
                >
                  <div class="food-name">{{ food.name }}</div>
                  <div class="food-meta">
                    <span class="food-age">{{ food.commonAge }}</span>
                    <span v-if="hasFoodBeenTried(food.name)" class="try-count">
                      ({{ getFoodTryCount(food.name) }}x)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Food Display -->
        <div v-if="selectedFood || finalFoodName" class="selected-food-section">
          <div class="selected-food-header">
            <h4>Adding: {{ finalFoodName }}</h4>
            <button v-if="selectedFood" type="button" @click="clearSelection" class="clear-selection">
              Clear
            </button>
          </div>
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

        <!-- Actions -->
        <div class="form-actions">
          <button type="submit" class="btn btn-save" :disabled="!canSave">
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
/* Search Input */
.search-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--color-periwinkle);
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: #9c27b0;
  background-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* Suggestions */
.suggestions-container {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  margin-top: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  color: rgba(255, 255, 255, 0.7);
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
  color: rgba(255, 255, 255, 0.6);
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.02);
}

.suggestion-item:hover {
  border-color: #9c27b0;
  background: rgba(156, 39, 176, 0.1);
  transform: translateY(-1px);
}

.suggestion-item.already-tried {
  background: rgba(0, 123, 255, 0.1);
  border-color: rgba(0, 123, 255, 0.3);
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
  color: rgba(255, 255, 255, 0.6);
}

.try-count {
  color: #007bff;
  font-weight: 500;
}

/* Selected Food */
.selected-food-section {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 12px;
}

.selected-food-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-food-header h4 {
  margin: 0;
  color: #4caf50;
  font-size: 1rem;
}

.clear-selection {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.clear-selection:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Notes Counter */
.notes-counter {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
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
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-periwinkle);
  background-color: rgba(255, 255, 255, 0.05);
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
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .suggestions-grid {
    grid-template-columns: 1fr;
  }
  
  .suggestion-item {
    padding: 0.5rem;
  }
  
  .selected-food-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
</style>