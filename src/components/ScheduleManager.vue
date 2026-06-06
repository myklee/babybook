<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBabyStore } from '../stores/babyStore';
import { useNotifications } from '../composables/useNotifications';
import ScheduleForm from './ScheduleForm.vue';
import type { FeedingSchedule } from '../types/feedingScheduleAutomation';
import {
  getScheduleFeedingTypeDisplayName,
  formatLastUsed,
  sortSchedules,
  calculateUsageStats,
  type ScheduleSortBy,
} from '../types/feedingScheduleAutomation';

interface Props {
  babyId: string;
  babyName: string;
}

const props = defineProps<Props>();

const store = useBabyStore();
const { showSuccess } = useNotifications();

// Component state
const showScheduleForm = ref(false);
const editingSchedule = ref<FeedingSchedule | undefined>(undefined);
const scheduleToDelete = ref<FeedingSchedule | undefined>(undefined);
const showDeleteConfirmation = ref(false);
const isDeleting = ref(false);
const sortBy = ref<ScheduleSortBy>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

// Computed properties
const schedules = computed(() => {
  const babySchedules = store.getBabyFeedingSchedules(props.babyId);
  return sortSchedules(babySchedules, sortBy.value, sortOrder.value);
});

const activeSchedulesCount = computed(() => {
  return schedules.value.filter(s => s.is_active).length;
});

const hasSchedules = computed(() => schedules.value.length > 0);

// Calculate statistics for each schedule
const scheduleStats = computed(() => {
  const stats = new Map();
  schedules.value.forEach(schedule => {
    stats.set(schedule.id, calculateUsageStats(schedule));
  });
  return stats;
});

// Check if schedule was used in last 7 days (Requirement 4.5)
const wasUsedRecently = computed(() => {
  return (schedule: FeedingSchedule): boolean => {
    if (!schedule.last_used_at) return false;
    
    const lastUsed = new Date(schedule.last_used_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return lastUsed > sevenDaysAgo;
  };
});

// Format average time between uses for display
function formatAvgTimeBetweenUses(minutes: number): string {
  if (minutes === 0) return 'N/A';
  
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
}

// Actions
function openCreateSchedule() {
  editingSchedule.value = undefined;
  showScheduleForm.value = true;
}

function openEditSchedule(schedule: FeedingSchedule) {
  editingSchedule.value = schedule;
  showScheduleForm.value = true;
}

function closeScheduleForm() {
  showScheduleForm.value = false;
  editingSchedule.value = undefined;
}

function handleScheduleSaved() {
  closeScheduleForm();
}

async function toggleScheduleActive(schedule: FeedingSchedule) {
  try {
    await store.updateFeedingSchedule(schedule.id, {
      is_active: !schedule.is_active,
    });
    
    showSuccess(
      'Schedule Updated',
      `"${schedule.name}" is now ${!schedule.is_active ? 'active' : 'inactive'}.`,
      { duration: 3000 }
    );
  } catch (error: any) {
    console.error('Error toggling schedule:', error);
    // Error notification is already shown by handleError in store
  }
}

function confirmDelete(schedule: FeedingSchedule) {
  scheduleToDelete.value = schedule;
  showDeleteConfirmation.value = true;
}

function cancelDelete() {
  scheduleToDelete.value = undefined;
  showDeleteConfirmation.value = false;
}

async function handleDelete() {
  if (!scheduleToDelete.value) return;

  isDeleting.value = true;
  const scheduleName = scheduleToDelete.value.name;
  
  try {
    await store.deleteFeedingSchedule(scheduleToDelete.value.id);
    
    showSuccess(
      'Schedule Deleted',
      `"${scheduleName}" has been deleted successfully.`,
      { duration: 3000 }
    );
    
    cancelDelete();
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    // Error notification is already shown by handleError in store
  } finally {
    isDeleting.value = false;
  }
}

function changeSortBy(newSortBy: ScheduleSortBy) {
  if (sortBy.value === newSortBy) {
    // Toggle order if clicking the same sort
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = newSortBy;
    sortOrder.value = 'asc';
  }
}

function getSortIcon(field: ScheduleSortBy): string {
  if (sortBy.value !== field) return '↕';
  return sortOrder.value === 'asc' ? '↑' : '↓';
}
</script>

<template>
  <div class="schedule-manager">
    <!-- Header -->
    <div class="manager-header">
      <div class="header-info">
        <h3>Feeding Schedules for {{ babyName }}</h3>
        <p class="schedule-count">
          {{ schedules.length }} schedule{{ schedules.length !== 1 ? 's' : '' }}
          <span v-if="activeSchedulesCount > 0" class="active-count">
            ({{ activeSchedulesCount }} active)
          </span>
        </p>
      </div>
      <button
        type="button"
        class="btn btn-primary"
        @click="openCreateSchedule"
      >
        + Create Schedule
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!hasSchedules" class="empty-state">
      <div class="empty-icon">📅</div>
      <h4>No Schedules Yet</h4>
      <p>Create your first feeding schedule to get started with automated feeding tracking.</p>
      <button
        type="button"
        class="btn btn-primary"
        @click="openCreateSchedule"
      >
        Create Your First Schedule
      </button>
    </div>

    <!-- Schedule List -->
    <div v-else class="schedule-list">
      <!-- Sort Controls -->
      <div class="sort-controls">
        <span class="sort-label">Sort by:</span>
        <button
          type="button"
          class="sort-button"
          :class="{ active: sortBy === 'name' }"
          @click="changeSortBy('name')"
        >
          Name {{ getSortIcon('name') }}
        </button>
        <button
          type="button"
          class="sort-button"
          :class="{ active: sortBy === 'last_used_at' }"
          @click="changeSortBy('last_used_at')"
        >
          Last Used {{ getSortIcon('last_used_at') }}
        </button>
        <button
          type="button"
          class="sort-button"
          :class="{ active: sortBy === 'usage_count' }"
          @click="changeSortBy('usage_count')"
        >
          Usage {{ getSortIcon('usage_count') }}
        </button>
      </div>

      <!-- Schedule Items -->
      <div
        v-for="schedule in schedules"
        :key="schedule.id"
        class="schedule-item"
        :class="{ inactive: !schedule.is_active }"
      >
        <div class="schedule-main">
          <div class="schedule-info">
            <div class="schedule-header">
              <h4 class="schedule-name">{{ schedule.name }}</h4>
              <span
                class="schedule-status"
                :class="{ active: schedule.is_active, inactive: !schedule.is_active }"
              >
                {{ schedule.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="schedule-details">
              <span class="schedule-type">
                {{ getScheduleFeedingTypeDisplayName(schedule.feeding_type) }}
              </span>
              <span v-if="schedule.feeding_type === 'formula' && schedule.default_amount" class="schedule-amount">
                • {{ schedule.default_amount }}ml
              </span>
            </div>
          </div>

          <div class="schedule-stats">
            <div class="stat-item">
              <span class="stat-label">Used:</span>
              <span class="stat-value">{{ schedule.usage_count }} time{{ schedule.usage_count !== 1 ? 's' : '' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Last used:</span>
              <span class="stat-value">{{ formatLastUsed(schedule.last_used_at) }}</span>
            </div>
            <div v-if="schedule.usage_count > 1" class="stat-item">
              <span class="stat-label">Avg interval:</span>
              <span class="stat-value">{{ formatAvgTimeBetweenUses(scheduleStats.get(schedule.id)?.avg_time_between_uses || 0) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Success rate:</span>
              <span class="stat-value stat-success">{{ scheduleStats.get(schedule.id)?.success_rate || 100 }}%</span>
            </div>
          </div>
        </div>

        <div class="schedule-actions">
          <button
            type="button"
            class="btn-icon"
            :class="{ 'btn-toggle-active': schedule.is_active }"
            :title="schedule.is_active ? 'Disable schedule' : 'Enable schedule'"
            @click="toggleScheduleActive(schedule)"
          >
            {{ schedule.is_active ? '⏸' : '▶' }}
          </button>
          <button
            type="button"
            class="btn-icon"
            title="Edit schedule"
            @click="openEditSchedule(schedule)"
          >
            ✏️
          </button>
          <button
            type="button"
            class="btn-icon btn-delete"
            title="Delete schedule"
            @click="confirmDelete(schedule)"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Schedule Form Modal -->
    <ScheduleForm
      v-if="showScheduleForm"
      :baby-id="babyId"
      :baby-name="babyName"
      :schedule="editingSchedule"
      @close="closeScheduleForm"
      @saved="handleScheduleSaved"
    />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirmation" class="modal-overlay" @click="cancelDelete">
      <div class="confirmation-modal" @click.stop>
        <h3>Delete Schedule?</h3>
        <p v-if="scheduleToDelete">
          Are you sure you want to delete "<strong>{{ scheduleToDelete.name }}</strong>"?
        </p>
        
        <!-- Warning for recently used schedules (Requirement 4.5) -->
        <div v-if="scheduleToDelete && wasUsedRecently(scheduleToDelete)" class="recent-use-warning">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">
            This schedule was used in the last 7 days. Deleting it will not affect existing feeding entries.
          </span>
        </div>
        
        <p class="warning-text">This action cannot be undone.</p>
        
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-cancel"
            @click="cancelDelete"
            :disabled="isDeleting"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-delete"
            @click="handleDelete"
            :disabled="isDeleting"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-manager {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

/* Header */
.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-info h3 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-text-primary);
}

.schedule-count {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
}

.active-count {
  color: var(--color-primary);
  font-weight: 500;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  background: var(--color-surface);
  border-radius: 12px;
  border: 2px dashed var(--color-surface-border);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
  max-width: 400px;
}

/* Sort Controls */
.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 8px;
  flex-wrap: wrap;
}

.sort-label {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.sort-button {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  background: transparent;
  border: 1px solid var(--color-surface-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-button:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.sort-button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

/* Schedule List */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Schedule Item */
.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.schedule-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.schedule-item.inactive {
  opacity: 0.6;
}

.schedule-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schedule-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.schedule-name {
  margin: 0;
  font-size: 1.125rem;
  color: var(--color-text-primary);
  font-weight: 600;
}

.schedule-status {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.schedule-status.active {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.schedule-status.inactive {
  background: rgba(156, 163, 175, 0.1);
  color: rgb(156, 163, 175);
}

.schedule-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.schedule-type {
  font-weight: 500;
}

.schedule-amount {
  color: var(--color-text-tertiary);
}

.schedule-stats {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 0.875rem;
  color: var(--color-text-primary);
  font-weight: 500;
}

.stat-success {
  color: var(--color-success, rgb(34, 197, 94));
}

/* Schedule Actions */
.schedule-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-icon {
  padding: 0.5rem;
  font-size: 1.25rem;
  background: transparent;
  border: 1px solid var(--color-surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
}

.btn-icon:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.btn-icon.btn-toggle-active {
  color: var(--color-primary);
}

.btn-icon.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgb(239, 68, 68);
  color: rgb(239, 68, 68);
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-cancel {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-surface-border);
}

.btn-cancel:hover {
  background: var(--color-surface-hover);
}

.btn-delete {
  background: rgb(239, 68, 68);
  color: white;
}

.btn-delete:hover {
  background: rgb(220, 38, 38);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Delete Confirmation Modal */
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

.confirmation-modal {
  background: var(--color-background);
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.confirmation-modal h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.confirmation-modal p {
  margin: 0 0 0.75rem 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.recent-use-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem;
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.recent-use-warning .warning-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.recent-use-warning .warning-text {
  color: var(--color-warning, #f59e0b);
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: 500;
}

.warning-text {
  color: rgb(239, 68, 68);
  font-weight: 500;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .schedule-manager {
    padding: 0.5rem;
  }

  .manager-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-info h3 {
    font-size: 1.25rem;
  }

  .schedule-item {
    flex-direction: column;
    align-items: stretch;
  }

  .schedule-actions {
    justify-content: flex-end;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-surface-border);
  }

  .schedule-stats {
    gap: 1rem;
  }

  .sort-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .sort-button {
    width: 100%;
  }

  .confirmation-modal {
    padding: 1.5rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions .btn {
    width: 100%;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .schedule-item {
    border-width: 2px;
  }

  .btn-icon {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .schedule-item,
  .btn,
  .btn-icon,
  .sort-button {
    transition: none;
  }
}
</style>
