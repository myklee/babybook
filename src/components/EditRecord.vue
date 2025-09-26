<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from "vue";
import { useBabyStore } from "../stores/babyStore";
import { format } from "date-fns";
import DatePicker from "./DatePicker.vue";
import TimePicker from "./TimePicker.vue";
import ResponsiveModal from "./ResponsiveModal.vue";
import {
  getDisplayValue,
  getStorageValue,
  getInputStep,
  getUnitLabel,
} from "../lib/measurements";
import type { UserFoodItem } from "../types/solidFood";

const props = defineProps<{
  record: any;
  type: "feeding" | "diaper" | "sleep";
  babyName?: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const store = useBabyStore();

// Form data
const amount = ref(0);
const feedingType = ref<"breast" | "formula" | "solid" | "nursing">("breast");
const diaperType = ref<"pee" | "poop" | "both">("pee");
const notes = ref("");
const customDate = ref("");
const time = ref<{ hour: string; minute: string; ampm: "AM" | "PM" }>({
  hour: "",
  minute: "",
  ampm: "AM",
});
const customEndDate = ref("");
const endTime = ref<{ hour: string; minute: string; ampm: "AM" | "PM" }>({
  hour: "",
  minute: "",
  ampm: "AM",
});
const topupAmount = ref(0);
const isSaving = ref(false);
const amountInput = ref<HTMLInputElement | null>(null);
const topupAmountInput = ref<HTMLInputElement | null>(null);

// Solid food specific state
const selectedFoodIds = ref<string[]>([]);
const availableFoods = ref<UserFoodItem[]>([]);
const reaction = ref<'liked' | 'disliked' | 'neutral' | 'allergic_reaction' | ''>('');
const newFoodName = ref('');
const showAddFood = ref(false);

// UI state
const showMoreOptions = ref(false);

// Computed properties for unit handling
const unitLabel = computed(() => getUnitLabel(store.measurementUnit));
const inputStep = computed(() => getInputStep(store.measurementUnit));

// Computed title for the modal
const modalTitle = computed(() => {
  let title = "Edit ";
  if (props.type === "feeding") title += "Feeding";
  else if (props.type === "diaper") title += "Diaper Change";
  else if (props.type === "sleep") title += "Sleep Session";

  if (props.babyName) title += ` for ${props.babyName}`;
  return title;
});

onMounted(() => {
  const setDateTime = (timestamp: string, isEnd = false) => {
    const date = new Date(timestamp);
    const dateString = format(date, "yyyy-MM-dd");
    const hour = date.getHours();
    const minute = date.getMinutes();

    if (isEnd) {
      customEndDate.value = dateString;
      endTime.value.ampm = hour >= 12 ? "PM" : "AM";
      let hour12 = hour % 12;
      if (hour12 === 0) hour12 = 12;
      endTime.value.hour = String(hour12);
      endTime.value.minute = String(minute).padStart(2, "0");
    } else {
      customDate.value = dateString;
      time.value.ampm = hour >= 12 ? "PM" : "AM";
      let hour12 = hour % 12;
      if (hour12 === 0) hour12 = 12;
      time.value.hour = String(hour12);
      time.value.minute = String(minute).padStart(2, "0");
    }
  };

  if (props.type === "feeding" || props.type === "diaper") {
    if (props.type === "feeding") {
      const feeding = props.record;
      feedingType.value = feeding.type;
      notes.value = feeding.notes || "";
      
      if (feeding.type === "solid") {
        // Handle solid food event
        availableFoods.value = store.getUserFoodItems();
        if (feeding.foods && feeding.foods.length > 0) {
          selectedFoodIds.value = feeding.foods.map((f: UserFoodItem) => f.id);
        }
        // Extract reaction from notes or use a separate field if available
        reaction.value = (feeding.reaction as 'liked' | 'disliked' | 'neutral' | 'allergic_reaction') || '';
      } else {
        // Handle regular feeding
        amount.value = getDisplayValue(feeding.amount, store.measurementUnit);
        topupAmount.value = getDisplayValue(
          feeding.topup_amount || 0,
          store.measurementUnit
        );
      }
    } else {
      // Diaper
      const diaperChange = props.record;
      diaperType.value = diaperChange.type;
      notes.value = diaperChange.notes || "";
    }
    setDateTime(props.record.timestamp);
  } else if (props.type === "sleep") {
    const sleep = props.record;
    notes.value = sleep.notes || "";
    setDateTime(sleep.start_time);
    if (sleep.end_time) {
      setDateTime(sleep.end_time, true);
    }
  }

  // Focus on amount input for feeding records
  if (props.type === "feeding") {
    nextTick(() => {
      amountInput.value?.focus();
    });
  }
});

// Function to select all text when focusing amount fields
function selectAmountText() {
  if (amountInput.value) {
    amountInput.value.select();
  }
}

function selectTopupAmountText() {
  if (topupAmountInput.value) {
    topupAmountInput.value.select();
  }
}

// Solid food functions
function toggleFoodSelection(foodId: string) {
  const index = selectedFoodIds.value.indexOf(foodId);
  if (index > -1) {
    selectedFoodIds.value.splice(index, 1);
  } else {
    selectedFoodIds.value.push(foodId);
  }
}

function isFoodSelected(foodId: string) {
  return selectedFoodIds.value.includes(foodId);
}

async function addNewFood() {
  if (!newFoodName.value.trim()) return;
  
  try {
    const newFood = await store.addUserFoodItem(newFoodName.value.trim());
    availableFoods.value.push(newFood);
    selectedFoodIds.value.push(newFood.id);
    newFoodName.value = '';
    showAddFood.value = false;
  } catch (error) {
    console.error('Error adding new food:', error);
    alert('Failed to add new food. Please try again.');
  }
}

function getSelectedDateTime(
  dateStr: string,
  timeObj: { hour: string; minute: string; ampm: "AM" | "PM" }
) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  let hour = Number(timeObj.hour);
  if (timeObj.ampm === "PM" && hour < 12) hour += 12;
  if (timeObj.ampm === "AM" && hour === 12) hour = 0;
  return new Date(year, month - 1, day, hour, Number(timeObj.minute), 0, 0);
}

async function handleSubmit() {
  isSaving.value = true;
  try {
    const startTimestamp = getSelectedDateTime(customDate.value, time.value);
    if (!startTimestamp) throw new Error("Invalid start time");

    if (props.type === "feeding") {
      if (feedingType.value === "solid") {
        // Handle solid food event update
        if (selectedFoodIds.value.length === 0) {
          throw new Error("Please select at least one food item");
        }
        
        await store.updateSolidFoodEvent(props.record.id, selectedFoodIds.value, {
          timestamp: startTimestamp,
          notes: notes.value,
          reaction: reaction.value || null,
        });
      } else {
        // Handle regular feeding update
        await store.updateFeeding(props.record.id, {
          amount: getStorageValue(amount.value, store.measurementUnit),
          type: feedingType.value,
          notes: notes.value,
          timestamp: startTimestamp.toISOString(),
          topup_amount: getStorageValue(topupAmount.value, store.measurementUnit),
        } as any);
      }
    } else if (props.type === "diaper") {
      await store.updateDiaperChange(props.record.id, {
        type: diaperType.value,
        notes: notes.value,
        timestamp: startTimestamp.toISOString(),
      });
    } else if (props.type === "sleep") {
      const endTimestamp = getSelectedDateTime(
        customEndDate.value,
        endTime.value
      );
      await store.updateSleepSession(props.record.id, {
        start_time: startTimestamp.toISOString(),
        end_time: endTimestamp ? endTimestamp.toISOString() : null,
        notes: notes.value,
      });
    }

    emit("saved");
    emit("close");
  } catch (error) {
    console.error("Error updating record:", error);
    alert("Failed to update record. Please try again.");
  } finally {
    isSaving.value = false;
  }
}

async function handleDelete() {
  if (confirm("Are you sure you want to delete this record?")) {
    isSaving.value = true;
    try {
      if (props.type === "feeding") {
        if (props.record.type === "solid") {
          await store.deleteSolidFoodEvent(props.record.id);
        } else {
          await store.deleteFeeding(props.record.id);
        }
      } else if (props.type === "diaper") {
        await store.deleteDiaperChange(props.record.id);
      } else if (props.type === "sleep") {
        await store.deleteSleepSession(props.record.id);
      }
      emit("close");
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record. Please try again.");
    } finally {
      isSaving.value = false;
    }
  }
}
</script>

<template>
  <ResponsiveModal
    :is-open="true"
    :title="modalTitle"
    :close-on-backdrop="true"
    max-width="500px"
    @close="emit('close')"
  >
    <!-- Form Content -->
    <form @submit.prevent="handleSubmit">
      <div v-if="type === 'feeding' || type === 'diaper'" class="form-group">
        <label for="edit-date">Date</label>
        <DatePicker v-model="customDate" id="edit-date" />
      </div>
      <div v-if="type === 'feeding' || type === 'diaper'" class="form-group">
        <label for="edit-time">Time</label>
        <TimePicker v-model="time" />
      </div>
      <div v-if="type === 'sleep'" class="form-group">
        <label for="sleep-start-date">Start Date</label>
        <DatePicker v-model="customDate" id="sleep-start-date" />
      </div>
      <div v-if="type === 'sleep'" class="form-group">
        <label for="sleep-start-time">Start Time</label>
        <TimePicker v-model="time" />
      </div>
      <div v-if="type === 'sleep'" class="form-group">
        <label for="sleep-end-date">End Date</label>
        <DatePicker
          v-model="customEndDate"
          id="sleep-end-date"
          :required="false"
        />
        <small class="form-help">Leave empty if sleep session is ongoing</small>
      </div>
      <div v-if="type === 'sleep'" class="form-group">
        <label for="sleep-end-time">End Time (Optional)</label>
        <TimePicker v-model="endTime" />
      </div>
      <div v-if="type === 'feeding' && feedingType !== 'solid'" class="form-group">
        <label>Amount ({{ unitLabel }})</label>
        <input
          type="number"
          v-model="amount"
          required
          min="0"
          :step="inputStep"
          ref="amountInput"
          inputmode="decimal"
          pattern="[0-9]*"
          @focus="selectAmountText"
          @click="selectAmountText"
          placeholder="Enter amount"
          autocomplete="off"
        />
      </div>
      
      <!-- Solid Food Selection -->
      <div v-if="type === 'feeding' && feedingType === 'solid'" class="form-group">
        <label>Foods</label>
        <div class="food-selection">
          <div class="selected-foods" v-if="selectedFoodIds.length > 0">
            <div v-for="foodId in selectedFoodIds" :key="foodId" class="selected-food">
              <span>{{ availableFoods.find(f => f.id === foodId)?.name || 'Unknown' }}</span>
              <button type="button" @click="toggleFoodSelection(foodId)" class="remove-food">×</button>
            </div>
          </div>
          <div class="available-foods">
            <div class="food-search">
              <input 
                type="text" 
                v-model="newFoodName" 
                placeholder="Search or add new food..."
                @keydown.enter.prevent="addNewFood"
              />
              <button type="button" @click="addNewFood" v-if="newFoodName.trim()" class="add-food-btn">Add</button>
            </div>
            <div class="food-list">
              <button 
                v-for="food in availableFoods.filter(f => !isFoodSelected(f.id))" 
                :key="food.id"
                type="button"
                @click="toggleFoodSelection(food.id)"
                class="food-option"
              >
                {{ food.name }} ({{ food.times_consumed }}x)
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Solid Food Reaction -->
      <div v-if="type === 'feeding' && feedingType === 'solid'" class="form-group">
        <label>Reaction</label>
        <select v-model="reaction">
          <option value="">No reaction recorded</option>
          <option value="liked">Liked</option>
          <option value="disliked">Disliked</option>
          <option value="neutral">Neutral</option>
          <option value="allergic_reaction">Allergic Reaction</option>
        </select>
      </div>
      <div
        v-if="type === 'feeding' && feedingType === 'breast'"
        class="form-group"
      >
        <label>Formula Top-up ({{ unitLabel }})</label>
        <input
          type="number"
          v-model="topupAmount"
          min="0"
          :step="inputStep"
          placeholder="0"
          ref="topupAmountInput"
          inputmode="decimal"
          pattern="[0-9]*"
          @focus="selectTopupAmountText"
          @click="selectTopupAmountText"
          autocomplete="off"
        />
        <small class="form-help"
          >Add formula amount given after breastfeeding</small
        >
      </div>

      <div v-if="type === 'diaper'" class="form-group">
        <label>Type</label>
        <select v-model="diaperType">
          <option value="pee">Pee</option>
          <option value="poop">Poop</option>
          <option value="both">Both</option>
        </select>
      </div>

      <!-- More Options Toggle -->
      <div class="more-options-toggle">
        <button
          type="button"
          @click="showMoreOptions = !showMoreOptions"
          class="toggle-btn"
        >
          <span>{{ showMoreOptions ? "Hide" : "More" }} Options</span>
          <span class="arrow" :class="{ rotated: showMoreOptions }">▼</span>
        </button>
      </div>

      <!-- More Options -->
      <div v-if="showMoreOptions" class="more-options">
        <div v-if="type === 'feeding'" class="form-group">
          <label>Type</label>
          <select v-model="feedingType">
            <option value="breast">Breast</option>
            <option value="nursing">Nursing</option>
            <option value="formula">Formula</option>
            <option value="solid">Solid</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea v-model="notes" rows="2"></textarea>
        </div>
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <div class="btn-group">
        <button
          type="button"
          class="btn btn-delete"
          @click="handleDelete"
          :disabled="isSaving"
        >
          Delete
        </button>
        <button
          type="button"
          class="btn btn-cancel"
          @click="emit('close')"
          :disabled="isSaving"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-save"
          :class="{ 'btn-loading': isSaving }"
          @click="handleSubmit"
          :disabled="isSaving"
        >
          {{ isSaving ? "Saving..." : "Save Changes" }}
        </button>
      </div>
    </template>
  </ResponsiveModal>
</template>

<style>
/* Import shared modal button styles - must be outside scoped for proper import */
@import '../styles/modal-buttons.css';
</style>

<style scoped>

.more-options-toggle {
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
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-lavendar);
  background-color: var(--color-midnight);
  text-decoration: underline;
}

.arrow {
  transition: transform 0.2s;
}

.arrow.rotated {
  transform: rotate(180deg);
}

.more-options {
  padding-top: 1rem;
  margin-top: 1rem;
}

/* Solid Food Selection Styles */
.food-selection {
  border: 1px solid var(--color-surface-border);
  border-radius: 8px;
  padding: 1rem;
  background-color: #0d1b1e;
}

[data-theme="light"] .food-selection {
  background-color: #f8fafc;
}

.selected-foods {
  margin-bottom: 1rem;
}

.selected-food {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-lavendar);
  color: var(--color-midnight);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin: 0.25rem;
  font-size: 0.875rem;
}

.remove-food {
  background: none;
  border: none;
  color: var(--color-midnight);
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.remove-food:hover {
  background: rgba(0, 0, 0, 0.1);
}

.food-search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.food-search input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 4px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.add-food-btn {
  padding: 0.5rem 1rem;
  background: var(--color-lavendar);
  color: var(--color-midnight);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.add-food-btn:hover {
  background: var(--color-periwinkle);
}

.food-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.food-option {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-surface-border);
  color: var(--color-text-primary);
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.food-option:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-lavendar);
}

/* Mobile responsiveness handled by shared button styles */
</style>
