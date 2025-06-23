<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { format } from 'date-fns'
import EditRecord from './EditRecord.vue'

import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import poopIcon from '../assets/icons/hugeicons_poop.svg'
import dropletsIcon from '../assets/icons/droplets.svg'

const props = defineProps<{
  babyId: string
}>()

const store = useBabyStore()

const feedingsTotalSince8AM = computed(() => {
  return store.getTodaysFeedingsTotal(props.babyId);
});

const feedings = computed(() => {
  return store.getBabyFeedings(props.babyId)
})

const diaperChanges = computed(() => {
  return store.getBabyDiaperChanges(props.babyId)
})

const sleepSessions = computed(() => {
  return store.getBabySleepSessions(props.babyId)
})

function getIcon(item: any, category: 'feeding' | 'diaper' | 'sleep') {
  if (category === 'feeding') {
    if (item.type === 'breast') return breastIcon;
    if (item.type === 'formula') return formulaIcon;
    return formulaIcon; // Default for 'solid' or others
  }
  if (category === 'diaper') {
    if (item.type === 'pee') return dropletsIcon
    return poopIcon // for 'poop' and 'both'
  }
  return null // No icon for sleep yet
}

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
      <div class="section-header">
        <h3>Recent Feedings</h3>
        <span v-if="feedingsTotalSince8AM > 0" class="header-stat">
          {{ feedingsTotalSince8AM }}ml since 8am
        </span>
      </div>
      <div v-if="feedings.length === 0" class="empty-state">
        No feedings recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="feeding in feedings.slice(0, 5)" :key="feeding.id" class="history-item" @click="openEditModal(feeding, 'feeding')">
          <div class="time">{{ formatTime(feeding.timestamp) }}</div>
          <div class="details">
            <img :src="getIcon(feeding, 'feeding') || ''" class="item-icon" alt="Feeding" />
            <span v-if="feeding.amount" class="amount">{{ feeding.amount }}ml</span>
            <span v-if="(feeding as any).topup_amount && (feeding as any).topup_amount > 0" class="topup-amount">+{{ (feeding as any).topup_amount }}</span>
          </div>
          <div v-if="feeding.notes" class="notes">{{ feeding.notes }}</div>
        </li>
      </ul>
    </div>

    <div class="history-section">
      <h3>Recent Diaper Changes</h3>
      <div v-if="diaperChanges.length === 0" class="empty-state">
        No diaper changes recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="change in diaperChanges.slice(0, 5)" :key="change.id" class="history-item" @click="openEditModal(change, 'diaper')">
          <div class="time">{{ formatTime(change.timestamp) }}</div>
           <div class="details">
            <img :src="getIcon(change, 'diaper') || ''" class="item-icon" alt="Diaper" />
            <span class="type">{{ change.type }}</span>
          </div>
          <div v-if="change.notes" class="notes">{{ change.notes }}</div>
        </li>
      </ul>
    </div>

    <div class="history-section">
      <h3>Recent Sleep Sessions</h3>
      <div v-if="sleepSessions.length === 0" class="empty-state">
        No sleep sessions recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="sleep in sleepSessions.slice(0, 5)" :key="sleep.id" class="history-item" @click="openEditModal(sleep, 'sleep')">
           <div class="time">{{ formatDate(sleep.start_time) }}<span v-if="sleep.end_time"> - {{ formatDate(sleep.end_time) }}</span></div>
            <div class="details">
              <!-- No icon for sleep for now -->
              <span class="type">Sleep</span>
              <span v-if="sleep.end_time" class="amount">{{ ((new Date(sleep.end_time).getTime() - new Date(sleep.start_time).getTime()) / 60000).toFixed(0) }} min</span>
            </div>
            <div v-if="sleep.notes" class="notes">{{ sleep.notes }}</div>
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
  width: 100%;
}

.history-section {
  margin-bottom: 1.5rem;
  width: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.history-section h3 {
  margin: 0 0 0.5rem 0;
  color: #a0a0e0;
  font-size: 0.9rem;
  text-transform: uppercase;
  padding-left: 0.5rem;
}

.header-stat {
  font-size: 0.8rem;
  color: #a0a0e0;
  font-weight: 400;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  width: 100%;
  padding: 0.5rem;
}

.history-item {
  background-color: #2c2c54;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 150px;
  flex-shrink: 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.history-item:hover {
  background-color: #40407a;
}

.time {
  font-size: 0.9rem;
  color: #c0c0ff;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-icon {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1) opacity(0.8);
}

.amount, .type {
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  text-transform: capitalize;
}

.notes {
  font-size: 0.8rem;
  color: #c0c0ff;
  margin-top: 0.25rem;
  word-break: break-word;
}

.empty-state {
  color: #c0c0ff;
  font-style: italic;
  padding: 0.5rem;
  text-align: center;
  width: 100%;
}

.topup-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.topup-icon {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1) opacity(0.8);
}

.topup-amount {
  font-size: 0.8rem;
  color: #c0c0ff;
  font-weight: 400;
}
</style> 