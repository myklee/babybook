<template>
    <div class="solid-food-history">
        <div class="history-header">
            <h3>Solid Food History</h3>
            <div class="filter-controls">
                <select v-model="filterCategory" class="filter-select">
                    <option value="">All Categories</option>
                    <option value="western_traditional">
                        Western Traditional
                    </option>
                    <option value="chinese">Chinese</option>
                    <option value="japanese">Japanese</option>
                    <option value="indian">Indian</option>
                    <option value="korean">Korean</option>
                </select>
                <select v-model="filterReaction" class="filter-select">
                    <option value="">All Reactions</option>
                    <option value="liked">Liked 😊</option>
                    <option value="disliked">Disliked 😕</option>
                    <option value="neutral">Neutral 😐</option>
                    <option value="allergic_reaction">
                        Allergic Reaction ⚠️
                    </option>
                </select>
            </div>
        </div>

        <div class="stats-summary">
            <div class="stat-item">
                <span class="stat-number">{{ totalFoodsTried }}</span>
                <span class="stat-label">Foods Tried</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">{{ totalTries }}</span>
                <span class="stat-label">Total Tries</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">{{ likedFoods.length }}</span>
                <span class="stat-label">Liked Foods</span>
            </div>
        </div>

        <div v-if="filteredFoods.length === 0" class="no-foods">
            <p>No solid foods recorded yet.</p>
        </div>

        <div v-else class="foods-grid">
            <div
                v-for="food in filteredFoods"
                :key="food.id"
                class="food-card"
                :class="{ 'has-reaction': food.reaction }"
            >
                <div class="food-header">
                    <h4 class="food-name">{{ food.food_name }}</h4>
                    <div class="food-meta">
                        <span class="food-category">{{
                            categoryNames[food.food_category]
                        }}</span>
                        <span class="try-count">{{ food.times_tried }}x</span>
                    </div>
                </div>

                <div class="food-details">
                    <div class="dates">
                        <div class="date-item">
                            <span class="date-label">First tried:</span>
                            <span class="date-value">{{
                                formatDate(food.first_tried_date)
                            }}</span>
                        </div>
                        <div class="date-item">
                            <span class="date-label">Last tried:</span>
                            <span class="date-value">{{
                                formatDate(food.last_tried_date)
                            }}</span>
                        </div>
                    </div>

                    <div v-if="food.reaction" class="reaction">
                        <span class="reaction-label">Reaction:</span>
                        <span class="reaction-value" :class="food.reaction">
                            {{ getReactionDisplay(food.reaction) }}
                        </span>
                    </div>

                    <div v-if="food.notes" class="notes">
                        <span class="notes-label">Notes:</span>
                        <p class="notes-text">{{ food.notes }}</p>
                    </div>
                </div>

                <div class="food-actions">
                    <button
                        @click="editFood(food)"
                        class="action-button edit-button"
                        title="Edit food"
                    >
                        ✏️
                    </button>
                    <button
                        @click="tryAgain(food)"
                        class="action-button try-button"
                        title="Try again"
                    >
                        🍴
                    </button>
                    <button
                        @click="deleteFood(food)"
                        class="action-button delete-button"
                        title="Delete food"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit Food Modal -->
        <div v-if="editingFood" class="modal-overlay" @click="closeEditModal">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>Edit {{ editingFood.food_name }}</h3>
                    <button class="close-button" @click="closeEditModal">
                        ×
                    </button>
                </div>

                <div class="modal-body">
                    <div class="form-group">
                        <label>Reaction</label>
                        <select
                            v-model="editForm.reaction"
                            class="reaction-select"
                        >
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
                        <label>Notes</label>
                        <textarea
                            v-model="editForm.notes"
                            class="notes-textarea"
                            rows="3"
                            placeholder="Add notes about this food..."
                        ></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button @click="closeEditModal" class="cancel-button">
                        Cancel
                    </button>
                    <button
                        @click="saveEdit"
                        :disabled="isLoading"
                        class="save-button"
                    >
                        {{ isLoading ? "Saving..." : "Save" }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useBabyStore } from "../stores/babyStore";
import { categoryNames } from "../lib/suggestedFoods";
import { format, isToday, isYesterday } from "date-fns";
import type { Database } from "../lib/supabase";

type SolidFood = Database["public"]["Tables"]["solid_foods"]["Row"];

interface Props {
    babyId: string;
}

const props = defineProps<Props>();

const babyStore = useBabyStore();

const filterCategory = ref("");
const filterReaction = ref("");
const editingFood = ref<SolidFood | null>(null);
const editForm = ref({
    reaction: "",
    notes: "",
});
const isLoading = ref(false);

const solidFoods = computed(() => babyStore.getBabySolidFoods(props.babyId));

const filteredFoods = computed(() => {
    let foods = solidFoods.value;

    if (filterCategory.value) {
        foods = foods.filter(
            (food) => food.food_category === filterCategory.value,
        );
    }

    if (filterReaction.value) {
        foods = foods.filter((food) => food.reaction === filterReaction.value);
    }

    return foods;
});

const totalFoodsTried = computed(() => solidFoods.value.length);
const totalTries = computed(() =>
    solidFoods.value.reduce((sum, food) => sum + food.times_tried, 0),
);
const likedFoods = computed(() =>
    solidFoods.value.filter((food) => food.reaction === "liked"),
);

function formatDate(dateString: string): string {
    const date = new Date(dateString);

    if (isToday(date)) {
        return "Today";
    } else if (isYesterday(date)) {
        return "Yesterday";
    } else {
        return format(date, "MMM d, yyyy");
    }
}

function getReactionDisplay(reaction: string): string {
    switch (reaction) {
        case "liked":
            return "Liked 😊";
        case "disliked":
            return "Disliked 😕";
        case "neutral":
            return "Neutral 😐";
        case "allergic_reaction":
            return "Allergic Reaction ⚠️";
        default:
            return reaction;
    }
}

function editFood(food: SolidFood) {
    editingFood.value = food;
    editForm.value.reaction = food.reaction || "";
    editForm.value.notes = food.notes || "";
}

function closeEditModal() {
    editingFood.value = null;
    editForm.value.reaction = "";
    editForm.value.notes = "";
}

async function saveEdit() {
    if (!editingFood.value) return;

    isLoading.value = true;

    try {
        await babyStore.updateSolidFood(editingFood.value.id, {
            reaction:
                (editForm.value.reaction as SolidFood["reaction"]) || null,
            notes: editForm.value.notes || null,
        });

        closeEditModal();
    } catch (error) {
        console.error("Error updating solid food:", error);
        alert("Failed to update solid food. Please try again.");
    } finally {
        isLoading.value = false;
    }
}

async function tryAgain(food: SolidFood) {
    try {
        await babyStore.updateSolidFood(food.id, {
            times_tried: food.times_tried + 1,
            last_tried_date: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error updating try count:", error);
        alert("Failed to update try count. Please try again.");
    }
}

async function deleteFood(food: SolidFood) {
    if (!confirm(`Are you sure you want to delete "${food.food_name}"?`)) {
        return;
    }

    try {
        await babyStore.deleteSolidFood(food.id);
    } catch (error) {
        console.error("Error deleting solid food:", error);
        alert("Failed to delete solid food. Please try again.");
    }
}
</script>

<style scoped>
.solid-food-history {
    padding: 20px;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.history-header h3 {
    margin: 0;
    color: #333;
}

.filter-controls {
    display: flex;
    gap: 10px;
}

.filter-select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    font-size: 14px;
}

.stats-summary {
    display: flex;
    gap: 20px;
    margin-bottom: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-number {
    font-size: 24px;
    font-weight: bold;
    color: #4caf50;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 12px;
    color: #666;
    text-align: center;
}

.no-foods {
    text-align: center;
    padding: 40px;
    color: #666;
}

.foods-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.food-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s;
    position: relative;
}

.food-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.food-card.has-reaction {
    border-left: 4px solid #4caf50;
}

.food-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.food-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    flex: 1;
}

.food-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
}

.food-category {
    font-size: 12px;
    color: #666;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
}

.try-count {
    font-size: 14px;
    font-weight: 600;
    color: #4caf50;
}

.food-details {
    margin-bottom: 12px;
}

.dates {
    margin-bottom: 8px;
}

.date-item {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
}

.date-label {
    color: #666;
}

.date-value {
    font-weight: 500;
    color: #333;
}

.reaction {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.reaction-label {
    font-size: 12px;
    color: #666;
}

.reaction-value {
    font-size: 14px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
}

.reaction-value.liked {
    background: #e8f5e8;
    color: #2e7d32;
}

.reaction-value.disliked {
    background: #ffeaa7;
    color: #d35400;
}

.reaction-value.neutral {
    background: #f5f5f5;
    color: #666;
}

.reaction-value.allergic_reaction {
    background: #ffebee;
    color: #c62828;
}

.notes {
    margin-top: 8px;
}

.notes-label {
    font-size: 12px;
    color: #666;
    display: block;
    margin-bottom: 4px;
}

.notes-text {
    font-size: 14px;
    color: #333;
    line-height: 1.4;
    margin: 0;
}

.food-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.action-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 16px;
    transition: background 0.2s;
}

.action-button:hover {
    background: #f0f0f0;
}

.delete-button:hover {
    background: #ffebee;
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
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 12px;
    max-width: 500px;
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

.save-button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: #4caf50;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.save-button:hover:not(:disabled) {
    background: #45a049;
}

.save-button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .solid-food-history {
        padding: 10px;
    }

    .history-header {
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
    }

    .filter-controls {
        flex-direction: column;
    }

    .stats-summary {
        flex-direction: column;
        gap: 10px;
    }

    .stat-item {
        flex-direction: row;
        justify-content: space-between;
    }

    .foods-grid {
        grid-template-columns: 1fr;
    }

    .food-header {
        flex-direction: column;
        gap: 8px;
    }

    .food-meta {
        flex-direction: row;
        align-items: center;
        gap: 10px;
    }

    .modal-content {
        margin: 10px;
        max-height: 90vh;
    }
}
</style>
