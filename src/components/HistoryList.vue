<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { format } from 'date-fns'
import EditRecord from './EditRecord.vue'

const props = defineProps<{
  babyId: string
}>()

const store = useBabyStore()

const feedings = computed(() => {
  return store.getBabyFeedings(props.babyId)
})

const diaperChanges = computed(() => {
  return store.getBabyDiaperChanges(props.babyId)
})

const sleepSessions = computed(() => {
  return store.getBabySleepSessions(props.babyId)
})

// Edit modal state
const showEditModal = ref(false)
const editingRecord = ref<any>(null)
const editingType = ref<'feeding' | 'diaper' | 'sleep'>('feeding')

function formatTime(dateString: string) {
  return format(new Date(dateString), 'h:mm a')
}

function formatDate(dateString: string) {
  return format(new Date(dateString), 'MMM d, h:mm a')
}

function openEditModal(record: any, type: 'feeding' | 'diaper' | 'sleep') {
  editingRecord.value = record
  editingType.value = type
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingRecord.value = null
}
</script>

<template>
  <div class="history">
    <div class="history-section">
      <h3>Recent Feedings</h3>
      <div v-if="feedings.length === 0" class="empty-state">
        No feedings recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="feeding in feedings.slice(0, 5)" :key="feeding.id" class="history-item">
          <div class="history-content">
            <div class="time">{{ formatTime(feeding.timestamp) }}</div>
            <div class="details">
              <span class="type">{{ feeding.type }}</span>
              <span v-if="feeding.amount" class="amount">{{ feeding.amount }}ml</span>
            </div>
            <div v-if="feeding.notes" class="notes">{{ feeding.notes }}</div>
          </div>
          <button 
            class="edit-btn" 
            @click="openEditModal(feeding, 'feeding')"
            title="Edit feeding"
          >
            ✏️
          </button>
        </li>
      </ul>
    </div>

    <div class="history-section">
      <h3>Recent Diaper Changes</h3>
      <div v-if="diaperChanges.length === 0" class="empty-state">
        No diaper changes recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="change in diaperChanges.slice(0, 5)" :key="change.id" class="history-item">
          <div class="history-content">
            <div class="time">{{ formatTime(change.timestamp) }}</div>
            <div class="details">
              <span class="type">{{ change.type }}</span>
            </div>
            <div v-if="change.notes" class="notes">{{ change.notes }}</div>
          </div>
          <button 
            class="edit-btn" 
            @click="openEditModal(change, 'diaper')"
            title="Edit diaper change"
          >
            ✏️
          </button>
        </li>
      </ul>
    </div>

    <div class="history-section">
      <h3>Recent Sleep Sessions</h3>
      <div v-if="sleepSessions.length === 0" class="empty-state">
        No sleep sessions recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="sleep in sleepSessions.slice(0, 5)" :key="sleep.id" class="history-item">
          <div class="history-content">
            <div class="time">{{ formatDate(sleep.start_time) }}<span v-if="sleep.end_time"> - {{ formatDate(sleep.end_time) }}</span></div>
            <div class="details">
              <span class="type">Sleep</span>
              <span v-if="sleep.end_time" class="amount">{{ ((new Date(sleep.end_time).getTime() - new Date(sleep.start_time).getTime()) / 60000).toFixed(0) }} min</span>
            </div>
            <div v-if="sleep.notes" class="notes">{{ sleep.notes }}</div>
          </div>
          <button 
            class="edit-btn" 
            @click="openEditModal(sleep, 'sleep')"
            title="Edit sleep session"
          >
            ✏️
          </button>
        </li>
      </ul>
    </div>

    <!-- Edit Modal -->
    <EditRecord
      v-if="showEditModal && editingRecord"
      :record="editingRecord"
      :type="editingType"
      @close="closeEditModal"
      @saved="closeEditModal"
    />
  </div>
</template>

<style scoped>
.history {
  margin-top: 1rem;
}

.history-section {
  margin-bottom: 1.5rem;
}

.history-section h3 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-item {
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.history-item:last-child {
  border-bottom: none;
}

.history-content {
  flex: 1;
}

.time {
  font-size: 0.9rem;
  color: #666;
}

.details {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.type {
  text-transform: capitalize;
  color: #333;
}

.amount {
  color: #666;
}

.notes {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  opacity: 0.7;
}

.edit-btn:hover {
  background-color: #f0f0f0;
  opacity: 1;
}

.empty-state {
  color: #999;
  font-style: italic;
  padding: 0.5rem;
}
</style> 