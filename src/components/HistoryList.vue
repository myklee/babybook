<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { format } from 'date-fns'
import EditRecord from './EditRecord.vue'
import NursingEditModal from './NursingEditModal.vue'
import type { CompletedNursingSession, BreastType } from '../types/nursing'

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

const babyName = computed(() => {
  const baby = store.babies.find(b => b.id === props.babyId)
  return baby?.name || ''
})

function getIcon(item: any, category: 'feeding' | 'diaper' | 'sleep') {
  if (category === 'feeding') {
    if (item.type === 'breast' || item.type === 'nursing') return breastIcon;
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

// Nursing edit modal state
const showNursingEditModal = ref(false)
const editingNursingSession = ref<CompletedNursingSession | null>(null)

// Computed property to ensure proper typing
const nursingSessionForEdit = computed(() => editingNursingSession.value as CompletedNursingSession | null)


function formatSleepDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (dateOnly.getTime() === today.getTime()) {
    return `Today, ${format(date, 'h:mm a')}`
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday, ${format(date, 'h:mm a')}`
  } else {
    return format(date, 'MMM d, h:mm a')
  }
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return format(date, 'h:mm a')
  } else {
    return format(date, 'MMM d, h:mm a')
  }
}

function openEditModal(record: any, type: 'feeding' | 'diaper' | 'sleep') {
  // Check if this is a nursing session and use the dedicated modal
  if (type === 'feeding' && record.type === 'nursing') {
    openNursingEditModal(record)
    return
  }
  
  editingRecord.value = record
  editingType.value = type
  showEditModal.value = true
}

function openNursingEditModal(nursingSession: any) {
  // Convert the feeding record to a CompletedNursingSession
  const durationMinutes = nursingSession.end_time && nursingSession.start_time 
    ? Math.floor((new Date(nursingSession.end_time).getTime() - new Date(nursingSession.start_time).getTime()) / (1000 * 60))
    : 0
    
  // Create a properly typed CompletedNursingSession
  const completedSession: CompletedNursingSession = {
    id: nursingSession.id,
    baby_id: nursingSession.baby_id,
    timestamp: nursingSession.timestamp,
    type: 'nursing',
    notes: nursingSession.notes || '',
    created_at: nursingSession.created_at,
    user_id: nursingSession.user_id,
    // Ensure required fields have default values
    start_time: nursingSession.start_time || nursingSession.timestamp,
    end_time: nursingSession.end_time || nursingSession.timestamp,
    left_duration: nursingSession.left_duration || 0,
    right_duration: nursingSession.right_duration || 0,
    total_duration: nursingSession.total_duration || durationMinutes * 60, // Convert to seconds
    breast_used: (nursingSession.breast_used || 'left') as BreastType,
    amount: null, // Always null for nursing sessions
    is_active: false,
    duration_minutes: durationMinutes,
    duration_display: durationMinutes > 0 ? `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}` : '0 minutes'
  }
  
  editingNursingSession.value = completedSession
  showNursingEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingRecord.value = null
}

function closeNursingEditModal() {
  showNursingEditModal.value = false
  editingNursingSession.value = null
}

async function handleNursingSessionSave(updatedSession: CompletedNursingSession) {
  try {
    // Update the nursing session using the store's updateNursingSession method
    await store.updateNursingSession(updatedSession.id, {
      start_time: updatedSession.start_time,
      end_time: updatedSession.end_time,
      left_duration: updatedSession.left_duration,
      right_duration: updatedSession.right_duration,
      total_duration: updatedSession.total_duration,
      breast_used: updatedSession.breast_used,
      notes: updatedSession.notes,
      timestamp: updatedSession.start_time // Keep timestamp for compatibility
    })
    
    closeNursingEditModal()
  } catch (error) {
    console.error('Error updating nursing session:', error)
    // Error handling is managed by the NursingEditModal component
  }
}

async function handleNursingSessionDelete(sessionId: string) {
  try {
    // Delete the nursing session using the store's deleteNursingSession method
    await store.deleteNursingSession(sessionId)
    
    closeNursingEditModal()
  } catch (error) {
    console.error('Error deleting nursing session:', error)
    // Error handling is managed by the NursingEditModal component
    throw error
  }
}

function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return d1.toDateString() === d2.toDateString()
}

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (dateOnly.getTime() === today.getTime()) {
    return 'Today'
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else {
    return format(date, 'MMM d')
  }
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
        <li v-for="feeding in feedings.slice(0, 8)" :key="feeding.id" class="history-item"
          @click="openEditModal(feeding, 'feeding')">
          <div class="time">
            <span v-if="feeding.type === 'nursing' && (feeding as any).start_time && (feeding as any).end_time && isSameDay((feeding as any).start_time, (feeding as any).end_time)">
              {{ getRelativeDate((feeding as any).start_time) }}, {{ format(new Date((feeding as any).start_time), 'h:mm a') }} - {{ format(new Date((feeding as any).end_time), 'h:mm a') }}
            </span>
            <span v-else-if="feeding.type === 'nursing' && (feeding as any).start_time">
              {{ formatDateTime((feeding as any).start_time) }}
              <span v-if="(feeding as any).end_time"> - {{ formatDateTime((feeding as any).end_time) }}</span>
              <span v-else class="sleeping-indicator"> - Nursing</span>
            </span>
            <span v-else>{{ formatDateTime(feeding.timestamp) }}</span>
          </div>
          <div class="details">
            <img :src="getIcon(feeding, 'feeding') || ''" class="item-icon" alt="Feeding" />
            <span v-if="feeding.type === 'nursing' && ((feeding as any).left_duration || (feeding as any).right_duration)" class="nursing-durations">
              <span v-if="(feeding as any).left_duration && (feeding as any).right_duration" class="dual-breast">
                L: {{ Math.floor((feeding as any).left_duration / 60) }}m {{ (feeding as any).left_duration % 60 }}s
                R: {{ Math.floor((feeding as any).right_duration / 60) }}m {{ (feeding as any).right_duration % 60 }}s
              </span>
              <span v-else-if="(feeding as any).left_duration" class="single-breast">
                <span class="breast-indicator">L</span> {{ Math.floor((feeding as any).left_duration / 60) }}m {{ (feeding as any).left_duration % 60 }}s
              </span>
              <span v-else-if="(feeding as any).right_duration" class="single-breast">
                <span class="breast-indicator">R</span> {{ Math.floor((feeding as any).right_duration / 60) }}m {{ (feeding as any).right_duration % 60 }}s
              </span>
            </span>
            <span v-else-if="feeding.type === 'nursing' && (feeding as any).start_time && (feeding as any).end_time" class="amount">{{ ((new Date((feeding as any).end_time).getTime() - new Date((feeding as any).start_time).getTime()) / 60000).toFixed(0) }} min</span>
            <span v-else-if="feeding.type === 'nursing' && (feeding as any).start_time" class="sleeping-duration">Ongoing</span>
            <span v-else-if="feeding.amount" class="amount">{{ feeding.amount }}ml</span>
            <span v-if="(feeding as any).topup_amount && (feeding as any).topup_amount > 0" class="topup-amount">+{{
              (feeding as any).topup_amount }}</span>
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
        <li v-for="change in diaperChanges.slice(0, 8)" :key="change.id" class="history-item"
          @click="openEditModal(change, 'diaper')">
          <div class="time">{{ formatDateTime(change.timestamp) }}</div>
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
        <li v-for="sleep in sleepSessions.slice(0, 8)" :key="sleep.id" class="history-item"
          @click="openEditModal(sleep, 'sleep')">
          <div class="time">
            <span v-if="sleep.end_time && isSameDay(sleep.start_time, sleep.end_time)">
              {{ getRelativeDate(sleep.start_time) }}, {{ format(new Date(sleep.start_time), 'h:mm a') }} - {{ format(new Date(sleep.end_time), 'h:mm a') }}
            </span>
            <span v-else>
              {{ formatSleepDate(sleep.start_time) }}
              <span v-if="sleep.end_time"> - {{ formatSleepDate(sleep.end_time) }}</span>
              <span v-else class="sleeping-indicator"> - Sleeping</span>
            </span>
          </div>
          <div class="details">
            <!-- No icon for sleep for now -->
            <span class="type">{{ sleep.end_time ? 'Slept' : 'Sleeping' }}</span>
            <span v-if="sleep.end_time" class="amount">{{ ((new Date(sleep.end_time).getTime() - new
              Date(sleep.start_time).getTime()) / 60000).toFixed(0) }} min</span>
            <span v-if="sleep.end_time" class="amount hours">{{ (((new Date(sleep.end_time).getTime() - new
              Date(sleep.start_time).getTime()) / 60000) / 60).toFixed(2) }} hrs</span>
            <span v-else class="sleeping-duration">Ongoing</span>
          </div>
          <div v-if="sleep.notes" class="notes">{{ sleep.notes }}</div>
        </li>
      </ul>
    </div>

    <!-- Edit Modal -->
    <EditRecord v-if="showEditModal && editingRecord" :record="editingRecord" :type="editingType" :babyName="babyName"
      @close="closeEditModal" @saved="closeEditModal" />

    <!-- Nursing Edit Modal -->
    <NursingEditModal 
      :is-open="showNursingEditModal"
      :session="nursingSessionForEdit"
      :baby-name="babyName"
      @close="closeNursingEditModal"
      @cancel="closeNursingEditModal"
      @save="handleNursingSessionSave"
      @delete="handleNursingSessionDelete"
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
  color: var(--color-periwinkle);
  font-size: 0.9rem;
  text-transform: uppercase;
  padding-left: 0.5rem;
}

.header-stat {
  font-size: 0.8rem;
  color: var(--color-periwinkle);
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
  color: var(--color-periwinkle);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.details {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.item-icon {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1) opacity(0.8);
}

.amount,
.type {
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  &.hours {
    font-size: 0.8rem;
    color: var(--color-lavendar);

  }
}

.notes {
  font-size: 0.8rem;
  color: var(--color-periwinkle);
  margin-top: 0.25rem;
  word-break: break-word;
}

.empty-state {
  color: var(--color-periwinkle);
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
  color: var(--color-periwinkle);
  font-weight: 400;
}

.sleeping-indicator {
  font-style: italic;
  color: var(--color-lavendar);
}

.sleeping-duration {
  font-style: italic;
  color: var(--color-lavendar);
}

.nursing-durations {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
}

.dual-breast {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.9rem;
}

.single-breast {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 1rem;
}

.breast-indicator {
  background: #dda0dd;
  color: #581c87;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 1rem;
  text-align: center;
}
</style>