<template>
    <div class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
            <div class="modal-header">
                <h3>Add Solid Food</h3>
                <button class="close-button" @click="closeModal">×</button>
            </div>

            <div class="modal-body">
                <div class="form-group">
                    <label>Search Foods</label>
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search or type food name..."
                        class="search-input"
                        @input="filterSuggestions"
                    />
                </div>

                <div
                    v-if="showSuggestions && visibleCategories.length > 0"
                    class="suggestions-container"
                >
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
                                :class="{
                                    'already-tried': hasFoodBeenTried(
                                        food.name,
                                    ),
                                }"
                            >
                                <div class="food-name">{{ food.name }}</div>
                                <div class="food-meta">
                                    <span class="food-age">{{
                                        food.commonAge
                                    }}</span>
                                    <span
                                        v-if="hasFoodBeenTried(food.name)"
                                        class="try-count"
                                    >
                                        ({{ getFoodTryCount(food.name) }}x)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="selectedFood" class="selected-food-section">
                    <h4>Adding: {{ selectedFood.name }}</h4>
                    <div class="food-details">
                        <div class="form-group">
                            <label>Category</label>
                            <select
                                v-model="selectedFood.category"
                                class="category-select"
                            >
                                <option value="western_traditional">
                                    Western Traditional
                                </option>
                                <option value="chinese">Chinese</option>
                                <option value="japanese">Japanese</option>
                                <option value="indian">Indian</option>
                                <option value="korean">Korean</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Reaction (optional)</label>
                            <select v-model="reaction" class="reaction-select">
                                <option value="">No reaction noted</option>
                                <option value="liked">Liked 😊</option>
                                <option value="disliked">Disliked 😕</option>
                                <option value="neutral">Neutral 😐</option>
                                <option value="allergic_reaction">
                                    Allergic Reaction ⚠️
                                </option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Notes (optional)</label>
                            <textarea
                                v-model="notes"
                                placeholder="How did it go? Any observations..."
                                class="notes-textarea"
                                rows="3"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div
                    v-if="!selectedFood && searchQuery && !showSuggestions"
                    class="custom-food-section"
                >
                    <h4>Add Custom Food: "{{ searchQuery }}"</h4>
                    <div class="form-group">
                        <label>Category</label>
                        <select
                            v-model="customCategory"
                            class="category-select"
                        >
                            <option value="western_traditional">
                                Western Traditional
                            </option>
                            <option value="chinese">Chinese</option>
                            <option value="japanese">Japanese</option>
                            <option value="indian">Indian</option>
                            <option value="korean">Korean</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button @click="closeModal" class="cancel-button">
                    Cancel
                </button>
                <button
                    @click="addFood"
                    :disabled="!canAddFood || isLoading"
                    class="add-button"
                >
                    {{ isLoading ? "Adding..." : "Add Food" }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useBabyStore } from "../stores/babyStore";
import { categoryNames, searchSuggestedFoods } from "../lib/suggestedFoods";
import type { SuggestedFood, FoodCategory } from "../lib/suggestedFoods";

interface Props {
    babyId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
    close: [];
    added: [food: any];
}>();

const babyStore = useBabyStore();

const searchQuery = ref("");
const selectedFood = ref<SuggestedFood | null>(null);
const notes = ref("");
const reaction = ref<
    "liked" | "disliked" | "neutral" | "allergic_reaction" | ""
>("");
const customCategory = ref<FoodCategory>("western_traditional");
const isLoading = ref(false);
const showSuggestions = ref(false);
const filteredSuggestions = ref<Record<FoodCategory, SuggestedFood[]>>({
    western_traditional: [],
    chinese: [],
    japanese: [],
    indian: [],
    korean: [],
});

const visibleCategories = computed(() => {
    return Object.keys(filteredSuggestions.value).filter(
        (category) =>
            filteredSuggestions.value[category as FoodCategory].length > 0,
    ) as FoodCategory[];
});

const canAddFood = computed(() => {
    return (
        selectedFood.value ||
        (searchQuery.value.trim().length > 0 && !showSuggestions.value)
    );
});

function filterSuggestions() {
    if (!searchQuery.value || searchQuery.value.length < 2) {
        showSuggestions.value = false;
        return;
    }

    const results = searchSuggestedFoods(searchQuery.value);

    // Group results by category
    const grouped: Record<FoodCategory, SuggestedFood[]> = {
        western_traditional: [],
        chinese: [],
        japanese: [],
        indian: [],
        korean: [],
    };

    results.forEach((food) => {
        grouped[food.category].push(food);
    });

    filteredSuggestions.value = grouped;
    showSuggestions.value = results.length > 0;
}

function selectFood(food: SuggestedFood) {
    selectedFood.value = food;
    searchQuery.value = food.name;
    showSuggestions.value = false;
}

function hasFoodBeenTried(foodName: string): boolean {
    return babyStore.hasFoodBeenTried(props.babyId, foodName);
}

function getFoodTryCount(foodName: string): number {
    return babyStore.getFoodTryCount(props.babyId, foodName);
}

async function addFood() {
    if (!canAddFood.value) return;

    isLoading.value = true;

    try {
        const foodName = selectedFood.value?.name || searchQuery.value.trim();
        const category = selectedFood.value?.category || customCategory.value;

        const result = await babyStore.addSolidFood(
            props.babyId,
            foodName,
            category,
            notes.value || undefined,
            reaction.value || undefined,
        );

        emit("added", result);
        closeModal();
    } catch (error) {
        console.error("Error adding solid food:", error);
        alert("Failed to add solid food. Please try again.");
    } finally {
        isLoading.value = false;
    }
}

function closeModal() {
    emit("close");
}

onMounted(() => {
    // Focus the search input when modal opens
    const searchInput = document.querySelector(
        ".search-input",
    ) as HTMLInputElement;
    if (searchInput) {
        searchInput.focus();
    }
});
</script>

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
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
}

.modal-header h3 {
    margin: 0;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-button:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
}

.search-input {
    width: 100%;
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s;
}

.search-input:focus {
    outline: none;
    border-color: #4caf50;
}

.suggestions-container {
    margin-top: 20px;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 10px;
}

.suggestion-category {
    margin-bottom: 20px;
}

.suggestion-category h4 {
    margin: 0 0 10px 0;
    color: #666;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.suggestions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 8px;
}

.suggestion-item {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
}

.suggestion-item:hover {
    border-color: #4caf50;
    background: #f8fff8;
}

.suggestion-item.already-tried {
    background: #f0f8ff;
    border-color: #2196f3;
}

.food-name {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
}

.food-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
}

.try-count {
    color: #2196f3;
    font-weight: 500;
}

.selected-food-section,
.custom-food-section {
    margin-top: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.selected-food-section h4,
.custom-food-section h4 {
    margin: 0 0 15px 0;
    color: #333;
}

.category-select,
.reaction-select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
}

.notes-textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    min-height: 60px;
}

.notes-textarea:focus {
    outline: none;
    border-color: #4caf50;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #eee;
}

.cancel-button {
    padding: 10px 20px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
}

.cancel-button:hover {
    background: #f5f5f5;
}

.add-button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: #4caf50;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.add-button:hover:not(:disabled) {
    background: #45a049;
}

.add-button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .modal-content {
        margin: 10px;
        max-height: 90vh;
    }

    .suggestions-grid {
        grid-template-columns: 1fr;
    }

    .modal-footer {
        flex-direction: column;
    }

    .cancel-button,
    .add-button {
        width: 100%;
    }
}
</style>
