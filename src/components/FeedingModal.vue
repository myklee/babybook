<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";
import { useBabyStore } from "../stores/babyStore";
import TimePicker from "./TimePicker.vue";
import DatePicker from "./DatePicker.vue";

const props = defineProps<{
    feedingType?: "breast" | "formula" | "solid";
    babyId: string;
    babyName: string;
}>();

const emit = defineEmits<{
    close: [];
    saved: [];
}>();

const store = useBabyStore();

// Form data
const amount = ref(0);
const feedingTypeRef = ref<"breast" | "formula" | "solid">("breast");
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

// Solid food specific data
const selectedFood = ref("");
const selectedFoodCategory = ref<
    "western_traditional" | "chinese" | "japanese" | "indian" | "korean"
>("western_traditional");
const showFoodSearch = ref(false);

// Food suggestions by category
const foodSuggestions = {
    western_traditional: [
        "Rice cereal",
        "Oatmeal",
        "Pureed apple",
        "Pureed pear",
        "Avocado",
        "Sweet potato",
        "Banana",
        "Carrots",
    ],
    chinese: [
        "Rice porridge (congee)",
        "Millet porridge",
        "Steamed egg custard",
        "Bone broth",
        "Soft rice",
    ],
    japanese: [
        "Rice porridge (okayu)",
        "Mashed tofu",
        "Fish paste",
        "Seaweed broth",
        "Soft vegetables",
    ],
    indian: [
        "Rice water",
        "Dal with rice",
        "Ragi porridge",
        "Khichdi",
        "Mashed banana",
    ],
    korean: [
        "Rice porridge (juk)",
        "Miyeok-guk (seaweed soup)",
        "Soft tofu",
        "Pumpkin porridge",
    ],
};

onMounted(() => {
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
            amount.value = settings.default_breast_amount;
        } else if (
            feedingTypeRef.value === "formula" &&
            settings.default_formula_amount > 0
        ) {
            amount.value = settings.default_formula_amount;
        }
    }

    nextTick();
    timeInput.value?.focus();
});

// Watch for feeding type changes to update default amount
watch(feedingTypeRef, (newType) => {
    const settings = store.getBabySettings(props.babyId);
    if (settings) {
        if (newType === "breast" && settings.default_breast_amount > 0) {
            amount.value = settings.default_breast_amount;
        } else if (
            newType === "formula" &&
            settings.default_formula_amount > 0
        ) {
            amount.value = settings.default_formula_amount;
        } else {
            amount.value = 0;
        }
    }
});

// Function to select all text when focusing amount field
function selectAmountText() {
    if (amountInput.value) {
        amountInput.value.select();
    }
}

// Handle food selection
function selectFood(food: string) {
    selectedFood.value = food;
    showFoodSearch.value = false;
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

async function handleSubmit() {
    isSaving.value = true;
    try {
        let timestamp;
        if (customDate.value && getSelectedDateTime()) {
            // Create timestamp in local timezone
            timestamp = getSelectedDateTime();
        } else {
            timestamp = new Date();
        }

        if (feedingTypeRef.value === "solid") {
            // For solid foods, add to solid foods table
            if (!selectedFood.value.trim()) {
                alert("Please select or enter a food name.");
                return;
            }

            await store.addSolidFood(
                props.babyId,
                selectedFood.value.trim(),
                selectedFoodCategory.value,
                notes.value || undefined,
            );
        } else {
            // For breast/formula, add to feedings table
            await store.addFeeding(
                props.babyId,
                amount.value,
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

                <div v-if="feedingTypeRef !== 'solid'" class="form-group">
                    <label>Amount (ml)</label>
                    <div class="amount-form">
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
                        />
                        <div
                            v-if="feedingTypeRef === 'formula'"
                            class="preset-buttons"
                        >
                            <button
                                type="button"
                                class="preset-btn"
                                @click="amount = 100"
                                :class="{ active: amount === 160 }"
                            >
                                160ml
                            </button>
                            <button
                                type="button"
                                class="preset-btn"
                                @click="amount = 200"
                                :class="{ active: amount === 200 }"
                            >
                                200ml
                            </button>
                        </div>
                        <div
                            v-if="feedingTypeRef === 'breast'"
                            class="preset-buttons"
                        >
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
                </div>

                <div v-if="feedingTypeRef === 'solid'" class="form-group">
                    <label>Food Category</label>
                    <select v-model="selectedFoodCategory">
                        <option value="western_traditional">
                            Western Traditional
                        </option>
                        <option value="chinese">Chinese</option>
                        <option value="japanese">Japanese</option>
                        <option value="indian">Indian</option>
                        <option value="korean">Korean</option>
                    </select>
                </div>

                <div v-if="feedingTypeRef === 'solid'" class="form-group">
                    <label>Food Name</label>
                    <input
                        v-model="selectedFood"
                        type="text"
                        placeholder="Enter food name or select from suggestions"
                        @focus="showFoodSearch = true"
                        required
                    />
                    <div v-if="showFoodSearch" class="food-suggestions">
                        <div class="suggestions-header">
                            <span
                                >Common
                                {{ selectedFoodCategory.replace("_", " ") }}
                                foods:</span
                            >
                            <button
                                type="button"
                                @click="showFoodSearch = false"
                                class="close-suggestions"
                            >
                                ×
                            </button>
                        </div>
                        <div class="suggestions-grid">
                            <button
                                v-for="food in foodSuggestions[
                                    selectedFoodCategory
                                ]"
                                :key="food"
                                type="button"
                                @click="selectFood(food)"
                                class="suggestion-item"
                            >
                                {{ food }}
                            </button>
                        </div>
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
                <section id="additional-options">
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea v-model="notes" rows="2"></textarea>
                    </div>
                </section>
                <div class="form-actions">
                    <button
                        type="submit"
                        class="btn btn-save"
                        :disabled="isSaving"
                    >
                        {{ isSaving ? "Saving..." : "Save" }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-cancel"
                        @click="emit('close')"
                        :disabled="isSaving"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.food-suggestions {
    position: relative;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    margin-top: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

.suggestions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #ddd;
    border-radius: 8px 8px 0 0;
    font-weight: 500;
}

.close-suggestions {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    color: #666;
}

.close-suggestions:hover {
    color: #333;
}

.suggestions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    padding: 12px;
    max-height: 200px;
    overflow-y: auto;
}

.suggestion-item {
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    text-align: center;
}

.suggestion-item:hover {
    background: #e9ecef;
    border-color: #007bff;
}
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
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #f8f9fa;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
}

.preset-btn:hover {
    background: #e9ecef;
    border-color: #007bff;
}

.preset-btn.active {
    background: #007bff;
    border-color: #007bff;
    color: white;
}
</style>
