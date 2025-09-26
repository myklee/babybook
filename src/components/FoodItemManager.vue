<template>
  <div class="food-item-manager">
    <!-- Header with search and add button -->
    <div class="manager-header">
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search foods..."
          class="search-input"
          @input="handleSearch"
        />
      </div>
      <button
        @click="openAddFoodModal"
        class="add-food-btn"
        :disabled="isLoading"
      >
        Add Food
      </button>
    </div>

    <!-- Filters and sorting -->
    <div class="filters-container">
      <div class="filter-group">
        <label for="sort-by">Sort by:</label>
        <select
          id="sort-by"
          v-model="sortBy"
          @change="handleSortChange"
          class="sort-select"
        >
          <option value="name">Name</option>
          <option value="times_consumed">Times Consumed</option>
          <option value="first_tried_date">First Tried</option>
          <option value="last_tried_date">Last Tried</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="sort-order">Order:</label>
        <select
          id="sort-order"
          v-model="sortOrder"
          @change="handleSortChange"
          class="sort-select"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="consumption-filter">Min. Consumption:</label>
        <input
          id="consumption-filter"
          v-model.number="minConsumption"
          type="number"
          min="0"
          class="consumption-input"
          @input="handleFilterChange"
        />
      </div>
    </div>

    <!-- Food list -->
    <div class="food-list-container">
      <div v-if="isLoading" class="loading-state">
        Loading foods...
      </div>
      
      <div v-else-if="filteredFoods.length === 0" class="empty-state">
        <div v-if="searchQuery">
          No foods found matching "{{ searchQuery }}"
        </div>
        <div v-else>
          No foods added yet. Click "Add Food" to get started.
        </div>
      </div>

      <div v-else class="food-list">
        <div
          v-for="food in filteredFoods"
          :key="food.id"
          class="food-item"
          :class="{ 'editing': editingFoodId === food.id }"
        >
          <!-- Food name (editable) -->
          <div class="food-name-section">
            <input
              v-if="editingFoodId === food.id"
              v-model="editingFoodName"
              type="text"
              class="food-name-input"
              @keyup.enter="saveEdit(food.id)"
              @keyup.escape="cancelEdit"
              @blur="saveEdit(food.id)"
              ref="editInput"
            />
            <h3 v-else class="food-name" @click="startEdit(food)">
              {{ food.name }}
            </h3>
          </div>

          <!-- Food statistics -->
          <div class="food-stats">
            <div class="stat-item">
              <span class="stat-label">Times consumed:</span>
              <span class="stat-value consumption-count">{{ food.times_consumed }}</span>
            </div>
            
            <div v-if="food.first_tried_date" class="stat-item">
              <span class="stat-label">First tried:</span>
              <span class="stat-value">{{ formatDate(food.first_tried_date) }}</span>
            </div>
            
            <div v-if="food.last_tried_date" class="stat-item">
              <span class="stat-label">Last tried:</span>
              <span class="stat-value">{{ formatDate(food.last_tried_date) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="food-actions">
            <button
              v-if="editingFoodId !== food.id"
              @click="startEdit(food)"
              class="edit-btn"
              :disabled="isLoading"
            >
              Edit
            </button>
            
            <button
              v-if="editingFoodId === food.id"
              @click="saveEdit(food.id)"
              class="save-btn"
              :disabled="isLoading || !editingFoodName.trim()"
            >
              Save
            </button>
            
            <button
              v-if="editingFoodId === food.id"
              @click="cancelEdit"
              class="cancel-btn"
              :disabled="isLoading"
            >
              Cancel
            </button>
            
            <button
              v-if="editingFoodId !== food.id"
              @click="confirmDelete(food)"
              class="delete-btn"
              :disabled="isLoading"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Food Modal -->
    <div v-if="showAddFoodModal" class="modal-overlay" @click="closeAddFoodModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add New Food</h2>
          <button @click="closeAddFoodModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="new-food-name">Food Name:</label>
            <input
              id="new-food-name"
              v-model="newFoodName"
              type="text"
              class="food-name-input"
              placeholder="Enter food name..."
              @keyup.enter="addFood"
              ref="newFoodInput"
            />
            <div v-if="addFoodError" class="error-message">
              {{ addFoodError }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button
            @click="addFood"
            class="add-btn"
            :disabled="isLoading || !newFoodName.trim()"
          >
            {{ isLoading ? 'Adding...' : 'Add Food' }}
          </button>
          <button @click="closeAddFoodModal" class="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Delete Food Item</h2>
          <button @click="closeDeleteModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <p>Are you sure you want to delete "{{ foodToDelete?.name }}"?</p>
          
          <div v-if="deleteUsageInfo" class="usage-warning">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <p><strong>This food has been used {{ deleteUsageInfo.usageCount }} times.</strong></p>
              <p>Deleting it will affect existing feeding records.</p>
            </div>
          </div>
          
          <div v-if="deleteError" class="error-message">
            {{ deleteError }}
          </div>
        </div>
        
        <div class="modal-footer">
          <button
            @click="deleteFood"
            class="delete-btn"
            :disabled="isLoading"
          >
            {{ isLoading ? 'Deleting...' : 'Delete' }}
          </button>
          <button @click="closeDeleteModal" class="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useBabyStore } from '../stores/babyStore';
import type { UserFoodItem } from '../types/solidFood';
import { validateFoodItem } from '../types/solidFood';

const babyStore = useBabyStore();

// Reactive state
const searchQuery = ref('');
const sortBy = ref<'name' | 'times_consumed' | 'first_tried_date' | 'last_tried_date'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const minConsumption = ref<number>(0);
const isLoading = ref(false);

// Edit state
const editingFoodId = ref<string | null>(null);
const editingFoodName = ref('');

// Add food modal state
const showAddFoodModal = ref(false);
const newFoodName = ref('');
const addFoodError = ref('');

// Delete modal state
const showDeleteModal = ref(false);
const foodToDelete = ref<UserFoodItem | null>(null);
const deleteUsageInfo = ref<{ usageCount: number } | null>(null);
const deleteError = ref('');

// Template refs
const editInput = ref<HTMLInputElement[]>([]);
const newFoodInput = ref<HTMLInputElement | null>(null);

// Computed properties
const filteredFoods = computed(() => {
  let foods = babyStore.getUserFoodItems({
    filter: searchQuery.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value
  });

  // Apply consumption filter
  if (minConsumption.value > 0) {
    foods = foods.filter(food => food.times_consumed >= minConsumption.value);
  }

  return foods;
});

// Methods
function handleSearch() {
  // Search is handled by the computed property
}

function handleSortChange() {
  // Sorting is handled by the computed property
}

function handleFilterChange() {
  // Filtering is handled by the computed property
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

async function startEdit(food: UserFoodItem) {
  editingFoodId.value = food.id;
  editingFoodName.value = food.name;
  
  await nextTick();
  const input = editInput.value?.[0];
  if (input) {
    input.focus();
    input.select();
  }
}

function cancelEdit() {
  editingFoodId.value = null;
  editingFoodName.value = '';
}

async function saveEdit(foodId: string) {
  if (!editingFoodName.value.trim()) {
    return;
  }

  const validation = validateFoodItem(editingFoodName.value);
  if (!validation.is_valid) {
    // Show validation errors
    console.error('Validation errors:', validation.errors);
    return;
  }

  try {
    isLoading.value = true;
    await babyStore.updateUserFoodItem(foodId, {
      name: editingFoodName.value.trim()
    });
    
    editingFoodId.value = null;
    editingFoodName.value = '';
  } catch (error) {
    console.error('Error updating food item:', error);
    // Handle error (could show notification)
  } finally {
    isLoading.value = false;
  }
}

async function openAddFoodModal() {
  showAddFoodModal.value = true;
  newFoodName.value = '';
  addFoodError.value = '';
  
  await nextTick();
  newFoodInput.value?.focus();
}

function closeAddFoodModal() {
  showAddFoodModal.value = false;
  newFoodName.value = '';
  addFoodError.value = '';
}

async function addFood() {
  if (!newFoodName.value.trim()) {
    addFoodError.value = 'Food name is required';
    return;
  }

  const validation = validateFoodItem(newFoodName.value);
  if (!validation.is_valid) {
    addFoodError.value = validation.errors[0]?.message || 'Invalid food name';
    return;
  }

  try {
    isLoading.value = true;
    addFoodError.value = '';
    
    await babyStore.addUserFoodItem(newFoodName.value.trim());
    closeAddFoodModal();
  } catch (error: any) {
    console.error('Error adding food item:', error);
    if (error.message?.includes('duplicate')) {
      addFoodError.value = 'This food already exists in your list';
    } else {
      addFoodError.value = 'Failed to add food. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
}

async function confirmDelete(food: UserFoodItem) {
  foodToDelete.value = food;
  deleteError.value = '';
  
  try {
    isLoading.value = true;
    // Check usage before showing modal
    const result = await babyStore.deleteUserFoodItem(food.id);
    deleteUsageInfo.value = { usageCount: result.usageCount };
    showDeleteModal.value = true;
  } catch (error: any) {
    console.error('Error checking food usage:', error);
    deleteError.value = 'Failed to check food usage. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  foodToDelete.value = null;
  deleteUsageInfo.value = null;
  deleteError.value = '';
}

async function deleteFood() {
  if (!foodToDelete.value) return;

  try {
    isLoading.value = true;
    deleteError.value = '';
    
    await babyStore.deleteUserFoodItem(foodToDelete.value.id);
    closeDeleteModal();
  } catch (error: any) {
    console.error('Error deleting food item:', error);
    deleteError.value = 'Failed to delete food. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  // Data should already be loaded by the store
});
</script>

<style scoped>
.food-item-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.manager-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.search-container {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--form-input-border);
  border-radius: 0.5rem;
  font-size: 1rem;
  background: var(--form-input-bg);
  color: var(--form-input-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  box-shadow: 0 0 0 2px var(--color-focus-ring);
}

.add-food-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-food-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.add-food-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filters-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--form-label-text);
}

.sort-select,
.consumption-input {
  padding: 0.5rem;
  border: 1px solid var(--form-input-border);
  border-radius: 0.375rem;
  background: var(--form-input-bg);
  color: var(--form-input-text);
  font-size: 0.875rem;
}

.consumption-input {
  width: 80px;
}

.food-list-container {
  min-height: 200px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.food-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.food-item {
  border: 1px solid var(--color-surface-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  background: var(--color-bg-secondary);
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}

.food-item:hover {
  border-color: var(--color-surface-border-hover);
  background: var(--color-bg-primary);
}

.food-item.editing {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-focus-ring);
}

.food-name-section {
  margin-bottom: 1rem;
}

.food-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: color var(--transition-normal);
}

.food-name:hover {
  color: var(--color-primary);
}

.food-name-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--form-input-border-focus);
  border-radius: 0.375rem;
  font-size: 1.25rem;
  font-weight: 600;
  background: var(--form-input-bg-focus);
  color: var(--form-input-text);
}

.food-name-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-focus-ring);
}

.food-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.consumption-count {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-weight: 600;
}

.food-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.edit-btn,
.save-btn,
.cancel-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.edit-btn {
  border-color: var(--btn-secondary-border);
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
}

.edit-btn:hover:not(:disabled) {
  border-color: var(--btn-secondary-border-hover);
  background: var(--btn-secondary-bg-hover);
  color: var(--btn-secondary-text-hover);
}

.save-btn {
  border-color: var(--color-success);
  background: var(--color-success);
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: var(--color-success-dark);
}

.cancel-btn {
  border-color: var(--btn-secondary-border);
  background: var(--btn-secondary-bg);
  color: var(--color-text-secondary);
}

.cancel-btn:hover:not(:disabled) {
  border-color: var(--btn-secondary-border-hover);
  background: var(--btn-secondary-bg-hover);
}

.delete-btn {
  border-color: var(--color-error);
  background: var(--btn-secondary-bg);
  color: var(--color-error);
}

.delete-btn:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
}

.edit-btn:disabled,
.save-btn:disabled,
.cancel-btn:disabled,
.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal styles */
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

.modal-content {
  background: var(--color-bg-primary);
  border-radius: 0.75rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-2xl);
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
  color: var(--color-text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--form-label-text);
}

.usage-warning {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.warning-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.warning-content p {
  margin: 0 0 0.5rem 0;
  color: var(--color-warning-dark);
}

.warning-content p:last-child {
  margin-bottom: 0;
}

.error-message {
  color: var(--color-error);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-surface-border);
  justify-content: flex-end;
}

.add-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive design */
@media (max-width: 768px) {
  .manager-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filters-container {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .filter-group {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  .food-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .food-actions {
    justify-content: flex-start;
  }
  
  .modal-content {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
}
</style>