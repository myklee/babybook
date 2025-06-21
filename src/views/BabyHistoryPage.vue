<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'

import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import poopIcon from '../assets/icons/hugeicons_poop.svg'
import dropletsIcon from '../assets/icons/droplets.svg'
import sleepIcon from '../assets/icons/droplets.svg' // Placeholder

// Define a unified type for all history events
type HistoryEvent = {
  id: string;
  event_type: 'feeding' | 'diaper' | 'sleep';
  event_time: string;
  notes: string | null;
  // Feeding specific
  feeding_type?: 'breast' | 'formula' | 'solid';
  amount?: number;
  // Diaper specific
  diaper_type?: 'pee' | 'poop' | 'both';
  // Sleep specific
  start_time?: string;
  end_time?: string | null;
}

const store = useBabyStore()
const router = useRouter()

const selectedBaby = ref<any>(null)

// When the component mounts, if there's a selected baby in the store, use it.
onMounted(() => {
  if (store.babies.length > 0) {
    // A bit of a hack: assume the last selected baby on home is the one we want.
    // A better approach would be to pass babyId in the route.
    selectedBaby.value = store.babies.find(b => b.id === store.babies[store.babies.length - 1].id) || store.babies[0]
  }
})

watch(() => store.babies, (newBabies) => {
  if (newBabies.length > 0 && !selectedBaby.value) {
    selectedBaby.value = newBabies[0];
  }
});

const combinedHistory = computed((): HistoryEvent[] => {
  if (!selectedBaby.value) return []

  const feedings: HistoryEvent[] = store.getBabyFeedings(selectedBaby.value.id).map(f => ({
    id: f.id,
    event_type: 'feeding',
    event_time: f.timestamp,
    notes: f.notes,
    feeding_type: f.type,
    amount: f.amount,
  }))
  
  const diapers: HistoryEvent[] = store.getBabyDiaperChanges(selectedBaby.value.id).map(d => ({
    id: d.id,
    event_type: 'diaper',
    event_time: d.timestamp,
    notes: d.notes,
    diaper_type: d.type
  }))

  const sleeps: HistoryEvent[] = store.getBabySleepSessions(selectedBaby.value.id).map(s => ({
    id: s.id,
    event_type: 'sleep',
    event_time: s.start_time,
    notes: s.notes,
    start_time: s.start_time,
    end_time: s.end_time,
  }))

  const allEvents = [...feedings, ...diapers, ...sleeps]

  return allEvents.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
})

function getIcon(item: HistoryEvent) {
  switch (item.event_type) {
    case 'feeding':
      return item.feeding_type === 'breast' ? breastIcon : formulaIcon
    case 'diaper':
      return item.diaper_type === 'pee' ? dropletsIcon : poopIcon
    case 'sleep':
      return sleepIcon
    default:
      return ''
  }
}

function formatTimestamp(dateString: string) {
  return format(new Date(dateString), 'MMM d, h:mm a')
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="history-page">
    <div v-if="selectedBaby" class="container">
      <header class="page-header">
        <button @click="goHome" class="back-btn">&larr; Back</button>
        <h2>{{ selectedBaby.name }}'s History</h2>
        <div class="placeholder"></div>
      </header>
      
      <ul class="history-timeline">
        <li v-if="combinedHistory.length === 0" class="empty-state">
          No activities recorded yet for {{ selectedBaby.name }}.
        </li>
        <li v-for="item in combinedHistory" :key="`${item.event_type}-${item.id}`" class="timeline-item">
          <div class="item-icon-container">
            <img :src="getIcon(item)" class="item-icon" />
          </div>
          <div class="item-details">
            <div class="item-header">
              <span class="item-type">{{ item.event_type }}</span>
              <span class="item-time">{{ formatTimestamp(item.event_time) }}</span>
            </div>
            <div class="item-info">
              <!-- Feeding Info -->
              <span v-if="item.event_type === 'feeding'">
                {{ item.feeding_type === 'breast' ? 'Breast' : 'Formula' }}: <span class="font-bold">{{ item.amount }}ml</span>
              </span>
              <!-- Diaper Info -->
              <span v-if="item.event_type === 'diaper'">
                Diaper: <span class="font-bold">{{ item.diaper_type }}</span>
              </span>
              <!-- Sleep Info -->
              <span v-if="item.event_type === 'sleep' && item.end_time">
                Slept for <span class="font-bold">{{ ((new Date(item.end_time).getTime() - new Date(item.start_time!).getTime()) / 60000).toFixed(0) }} minutes</span>
              </span>
            </div>
            <div v-if="item.notes" class="item-notes">
              {{ item.notes }}
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else class="loading-state">
      <p>Loading baby's history...</p>
      <button @click="goHome">Go Back Home</button>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  background-color: #1a1a2e;
  min-height: 100vh;
  padding: 1rem;
  color: white;
}
.container {
  max-width: 800px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.page-header h2 {
  font-size: 1.75rem;
  font-weight: bold;
}
.back-btn {
  background: none;
  border: 1px solid #666;
  color: #ccc;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}
.placeholder {
  width: 70px; /* To balance the back button */
}
.history-timeline {
  list-style: none;
  padding: 0;
}
.timeline-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #3a3a5e;
}
.item-icon-container {
  background-color: #2c2c54;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.item-icon {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1) opacity(0.8);
}
.item-details {
  flex-grow: 1;
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}
.item-type {
  font-weight: bold;
  text-transform: capitalize;
  font-size: 1.1rem;
}
.item-time {
  font-size: 0.8rem;
  color: #a0a0e0;
}
.item-info {
  font-size: 1rem;
  color: #c0c0ff;
}
.font-bold {
  font-weight: bold;
}
.item-notes {
  font-size: 0.9rem;
  color: #a0a0e0;
  margin-top: 0.5rem;
  background: rgba(0,0,0,0.2);
  padding: 0.5rem;
  border-radius: 8px;
}
.loading-state, .empty-state {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
  color: #a0a0e0;
}
</style> 