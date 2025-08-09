<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from "vue";
import { useBabyStore } from "../stores/babyStore";
import TimePicker from "./TimePicker.vue";
import DatePicker from "./DatePicker.vue";
import BreastSelector from "./BreastSelector.vue";
import ResponsiveModal from "./ResponsiveModal.vue";
import type { BreastType } from "../types/nursing";
import { 
  getDisplayValue, 
  getStorageValue, 
  getInputStep, 
  getUnitLabel, 
  getFeedingPresets,
  getDefaultAmount
} from "../lib/measurements";

const props = defineProps<{
    feedingType?: "breast" | "formula" | "nursing";
    babyId: string;
    babyName: string;
}>();

const emit = defineEmits<{
    close: [];
    saved: [];
}>();

const store = useBabyStore();

// Form data
const displayAmount = ref(0); // Display value (in current unit)
const feedingTypeRef = ref<"breast" | "formula" | "nursing">("breast");

// Computed properties for unit handling
const unitLabel = computed(() => getUnitLabel(store.measurementUnit));
const inputStep = computed(() => getInputStep(store.measurementUnit));
const presetButtons = computed(() => {
    // Only show presets for breast and formula types
    if (feedingTypeRef.value === 'nursing') return [];
    return getFeedingPresets(store.measurementUnit, feedingTypeRef.value);
});
const notes = ref("");
const customDate = ref("");
const time = ref<{ hour: string; minute: string; ampm: "AM" | "PM" }>({
    hour: "",
    minute: "",
    ampm: "AM",
});
const isSaving = ref(false);
const timeInput = ref<HTMLInputElement | null>(null);
const amountInput = ref<HTMLInputElement | null>(null);

// Nursing session data
const nursingStartTime = ref<{ hour: string; minute: string; ampm: "AM" | "PM" }>({
    hour: "",
    minute: "",
    ampm: "AM",
});
const nursingEndTime = ref<{ hour: string; minute: string; ampm: "AM" | "PM" }>({
    hour: "",
    minute: "",
    ampm: "AM",
});
const nursingDuration = ref(20); // Default 20 minutes
const breastUsed = ref<BreastType>("left");

// UI state
const showAdvanced = ref(false);

// Dynamic modal title
const modalTitle = computed(() => `Record Feeding for ${props.babyName}`);


onMounted(() => {
    // ResponsiveModal handles body scroll locking

    const now = new Date();
    // Set default date
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    customDate.value = `${year}-${month}-${day}`;
    // Set default hour, minute, and ampm
    let hour = now.getHours();
    time.value.ampm = hour >= 12 ? "PM" : "AM";
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    time.value.hour = String(hour12);
    time.value.minute = String(now.getMinutes()).padStart(2, "0");

    // Initialize nursing times
    nursingStartTime.value = { ...time.value };
    const endTime = new Date(now.getTime() + nursingDuration.value * 60000);
    let endHour = endTime.getHours();
    nursingEndTime.value.ampm = endHour >= 12 ? "PM" : "AM";
    let endHour12 = endHour % 12;
    if (endHour12 === 0) endHour12 = 12;
    nursingEndTime.value.hour = String(endHour12);
    nursingEndTime.value.minute = String(endTime.getMinutes()).padStart(2, "0");

    console.log("FeedingModal mounted with babyName:", props.babyName);

    // Pre-fill the type if provided
    if (props.feedingType) {
        feedingTypeRef.value = props.feedingType;
    }

    // Load default amounts from baby settings
    const settings = store.getBabySettings(props.babyId);
    if (settings) {
        if (
            feedingTypeRef.value === "breast" &&
            settings.default_breast_amount > 0
        ) {
            displayAmount.value = getDisplayValue(settings.default_breast_amount, store.measurementUnit);
        } else if (feedingTypeRef.value === "formula") {
            // Use custom setting if available, otherwise use unit-appropriate default
            const mlAmount = settings.default_formula_amount > 0
                ? settings.default_formula_amount
                : getStorageValue(getDefaultAmount(store.measurementUnit, 'formula'), store.measurementUnit);
            displayAmount.value = getDisplayValue(mlAmount, store.measurementUnit);
        }
    } else if (feedingTypeRef.value === "formula") {
        // No settings found, use unit-appropriate default
        displayAmount.value = getDefaultAmount(store.measurementUnit, 'formula');
    }

    nextTick(() => {
        amountInput.value?.focus();
    });
});

onUnmounted(() => {
    // ResponsiveModal handles body scroll restoration
});

// Watch for feeding type changes to update default amount
watch(feedingTypeRef, (newType) => {
    const settings = store.getBabySettings(props.babyId);
    if (settings) {
        if (newType === "breast" && settings.default_breast_amount > 0) {
            displayAmount.value = getDisplayValue(settings.default_breast_amount, store.measurementUnit);
        } else if (newType === "formula") {
            // Use custom setting if available, otherwise use unit-appropriate default
            const mlAmount = settings.default_formula_amount > 0
                ? settings.default_formula_amount
                : getStorageValue(getDefaultAmount(store.measurementUnit, 'formula'), store.measurementUnit);
            displayAmount.value = getDisplayValue(mlAmount, store.measurementUnit);
        } else {
            displayAmount.value = 0;
        }
    } else if (newType === "formula") {
        // No settings found, use unit-appropriate default
        displayAmount.value = getDefaultAmount(store.measurementUnit, 'formula');
    } else {
        displayAmount.value = 0;
    }
});

// Function to select all text when focusing amount field
function selectAmountText() {
    if (amountInput.value) {
        amountInput.value.select();
    }
}


function getSelectedDateTime() {
    if (!customDate.value) return new Date();
    const [year, month, day] = customDate.value.split("-").map(Number);
    let hour = Number(time.value.hour);
    if (time.value.ampm === "PM" && hour < 12) hour += 12;
    if (time.value.ampm === "AM" && hour === 12) hour = 0;
    return new Date(
        year,
        month - 1,
        day,
        hour,
        Number(time.value.minute),
        0,
        0,
    );
}

function getNursingStartDateTime() {
    if (!customDate.value) return new Date();
    const [year, month, day] = customDate.value.split("-").map(Number);
    let hour = Number(nursingStartTime.value.hour);
    if (nursingStartTime.value.ampm === "PM" && hour < 12) hour += 12;
    if (nursingStartTime.value.ampm === "AM" && hour === 12) hour = 0;
    return new Date(
        year,
        month - 1,
        day,
        hour,
        Number(nursingStartTime.value.minute),
        0,
        0,
    );
}

function getNursingEndDateTime() {
    if (!customDate.value) return new Date();
    const [year, month, day] = customDate.value.split("-").map(Number);
    let hour = Number(nursingEndTime.value.hour);
    if (nursingEndTime.value.ampm === "PM" && hour < 12) hour += 12;
    if (nursingEndTime.value.ampm === "AM" && hour === 12) hour = 0;
    return new Date(
        year,
        month - 1,
        day,
        hour,
        Number(nursingEndTime.value.minute),
        0,
        0,
    );
}



async function handleSubmit() {
    isSaving.value = true;
    try {
        if (feedingTypeRef.value === "nursing") {
            // Log a completed nursing session
            const startTime = getNursingStartDateTime();
            const endTime = getNursingEndDateTime();
            
            // Validate that end time is after start time
            if (endTime <= startTime) {
                alert("End time must be after start time.");
                return;
            }
            
            await store.addNursingSession(
                props.babyId,
                startTime,
                endTime,
                notes.value || undefined,
            );
        } else {
            // For breast/formula, add to feedings table
            let timestamp;
            if (customDate.value && getSelectedDateTime()) {
                // Create timestamp in local timezone
                timestamp = getSelectedDateTime();
            } else {
                timestamp = new Date();
            }

            const storageAmount = getStorageValue(displayAmount.value, store.measurementUnit);
            await store.addFeeding(
                props.babyId,
                storageAmount,
                feedingTypeRef.value,
                notes.value,
                timestamp,
            );
        }

        emit("saved");
        emit("close");
    } catch (error) {
        console.error("Error adding feeding:", error);
        alert("Failed to add feeding. Please try again.");
    } finally {
        isSaving.value = false;
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
                <div class="form-group">
                    <label for="feeding-date">Date</label>
                    <DatePicker v-model="customDate" id="feeding-date" />
                </div>
                
                <!-- Nursing-specific options -->
                <div v-if="feedingTypeRef === 'nursing'" class="nursing-options">
                    <!-- Nursing Mode Selection -->
                    <!-- Breast Selection -->
                    <div class="form-group">
                        <label>Breast Used</label>
                        <BreastSelector v-model="breastUsed" />
                    </div>

                    <!-- Nursing session times -->
                    <div class="form-group">
                        <label>Start Time</label>
                        <TimePicker v-model="nursingStartTime" />
                    </div>
                    <div class="form-group">
                        <label>End Time</label>
                        <TimePicker v-model="nursingEndTime" />
                    </div>
                </div>
                
                <!-- For other feeding types, show single time -->
                <div v-else class="form-group">
                    <label for="feeding-time">Time</label>
                    <TimePicker v-model="time" />
                </div>

                <div v-if="feedingTypeRef !== 'nursing'" class="form-group">
                    <label>Amount ({{ unitLabel }})</label>
                    <div class="amount-form">
                        <input
                            ref="amountInput"
                            type="number"
                            v-model="displayAmount"
                            required
                            min="0"
                            :step="inputStep"
                            inputmode="decimal"
                            pattern="[0-9]*"
                            @focus="selectAmountText"
                            @click="selectAmountText"
                            placeholder="Enter amount"
                            autocomplete="off"
                        />
                        <div class="preset-buttons">
                            <button
                                v-for="preset in presetButtons"
                                :key="preset.label"
                                type="button"
                                class="preset-btn"
                                @click="displayAmount = preset.display"
                                :class="{ active: displayAmount === preset.display }"
                            >
                                {{ preset.label }}
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
                    >
                        <span
                            >{{ showAdvanced ? "Hide" : "More" }} Options</span
                        >
                        <span class="arrow" :class="{ rotated: showAdvanced }"
                            >▼</span
                        >
                    </button>
                </div>

                <!-- Advanced Options -->
                <div v-if="showAdvanced" class="advanced-options">
                    <div class="form-group">
                        <label>Type</label>
                        <select v-model="feedingTypeRef">
                            <option value="breast">Breast</option>
                            <option value="nursing">Nursing</option>
                            <option value="formula">Formula</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Notes</label>
                        <textarea
                            v-model="notes"
                            rows="2"
                            placeholder="Optional notes..."
                        ></textarea>
                    </div>
                </div>
        </form>

        <!-- Footer Actions -->
        <template #footer>
            <div class="btn-group-end">
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
                    {{ isSaving ? "Saving..." : "Save" }}
                </button>
            </div>
        </template>
    </ResponsiveModal>
</template>

<style scoped>
.amount-form {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
.preset-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: nowrap;
}

.preset-btn {
    padding: 8px 16px;
    border: 1px solid var(--color-lavendar);
    border-radius: 6px;
    background: var(--color-lavendar);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
}

.preset-btn:hover {
    background: #e9ecef;
    border-color: #fff;
}

.preset-btn.active {
    background: var(--color-prince);
    border-color: var(--color-lavendar);
    color: white;
}

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
    color: #666;
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

.advanced-options {
    padding-top: 1rem;
    margin-top: 1rem;
}



/* Import shared modal button styles */
@import '../styles/modal-buttons.css';

/* Nursing-specific styles */
.nursing-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
    border: 1px solid #dda0dd;
    border-radius: 0.75rem;
    margin: 1rem 0;
}

.nursing-mode-selector {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
}

.mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 8rem;
    flex: 1;
}

.mode-btn:hover {
    border-color: #dda0dd;
    background: #faf5ff;
    transform: translateY(-1px);
}

.mode-btn.active {
    border-color: #dda0dd;
    background: #dda0dd;
    color: white;
}

.mode-icon {
    font-size: 1.5rem;
}

.mode-btn span:last-child {
    font-size: 0.875rem;
    font-weight: 500;
}

.help-text {
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
    margin-top: 0.5rem;
    text-align: center;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {


    .btn {
        width: 100%;
        padding: 1rem;
    }
}

/* Responsive adjustments for nursing options */
@media (max-width: 480px) {
    .nursing-mode-selector {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .mode-btn {
        min-width: auto;
        padding: 0.75rem;
    }
    
    .mode-icon {
        font-size: 1.25rem;
    }
    
    .nursing-options {
        padding: 0.75rem;
        margin: 0.75rem 0;
    }
}

/* High contrast mode for nursing options */
@media (prefers-contrast: high) {
    .mode-btn {
        border-width: 3px;
    }
    
    .mode-btn.active {
        background: #000;
        border-color: #000;
        color: white;
    }
}

/* Reduced motion for nursing options */
@media (prefers-reduced-motion: reduce) {
    .mode-btn {
        transition: none;
    }
    
    .mode-btn:hover {
        transform: none;
    }
}
</style>