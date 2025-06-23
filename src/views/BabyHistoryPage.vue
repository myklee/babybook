<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { useRouter, useRoute } from 'vue-router'
import { format } from 'date-fns'
import EditBabyModal from '../components/EditBabyModal.vue'

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
const route = useRoute()

const selectedBaby = ref<any>(null)
const showEditBabyModal = ref(false)
const editingBaby = ref<any>(null)
const use8amWindow = ref(true) // Toggle for 8am vs 12am window

// When the component mounts, get the baby ID from the route.
onMounted(() => {
  const babyId = route.params.babyId as string;
  if (store.babies.length > 0) {
    selectedBaby.value = store.babies.find(b => b.id === babyId)
  }
})

// Watch for changes in the store's babies array, in case it loads late.
watch(() => store.babies, (newBabies) => {
  if (newBabies.length > 0 && !selectedBaby.value) {
    const babyId = route.params.babyId as string;
    selectedBaby.value = newBabies.find(b => b.id === babyId)
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
    diaper_type: d.type as 'pee' | 'poop' | 'both'
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

// Stats computed properties
const stats = computed(() => {
  if (!selectedBaby.value) return null

  const feedings = store.getBabyFeedings(selectedBaby.value.id)
  const diapers = store.getBabyDiaperChanges(selectedBaby.value.id)
  const sleeps = store.getBabySleepSessions(selectedBaby.value.id)

  // Total counts
  const totalFeedings = feedings.length
  const totalDiapers = diapers.length
  const totalSleeps = sleeps.length

  // Feeding stats
  const totalMilk = feedings.reduce((sum, f) => sum + (f.amount || 0), 0)
  const breastFeedings = feedings.filter(f => f.type === 'breast').length
  const formulaFeedings = feedings.filter(f => f.type === 'formula').length

  // Diaper stats
  const peeDiapers = diapers.filter(d => d.type === 'wet').length
  const poopDiapers = diapers.filter(d => d.type === 'dirty').length
  const bothDiapers = diapers.filter(d => d.type === 'both').length

  // Sleep stats
  const totalSleepMinutes = sleeps.reduce((sum, s) => {
    if (s.end_time && s.start_time) {
      return sum + ((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)
    }
    return sum
  }, 0)

  // Recent activity (last 24 hours)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const recentFeedings = feedings.filter(f => new Date(f.timestamp) > yesterday).length
  const recentDiapers = diapers.filter(d => new Date(d.timestamp) > yesterday).length
  const recentSleeps = sleeps.filter(s => new Date(s.start_time) > yesterday).length

  // Last 24 hours since 8am milk amount (same logic as homepage)
  const last24HoursMilk = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let eightAm

    // If it's already past 8 AM today, the window started at 8 AM today.
    if (now.getHours() >= 8) {
        eightAm = new Date(today)
        eightAm.setHours(8, 0, 0, 0)
    } else {
        // If it's before 8 AM today, the window started at 8 AM *yesterday*.
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        eightAm = new Date(yesterday)
        eightAm.setHours(8, 0, 0, 0)
    }

    return feedings.filter(feeding => {
        const feedingTimestamp = new Date(feeding.timestamp)
        return (
            (feeding.type === 'breast' || feeding.type === 'formula') &&
            feeding.amount != null &&
            feedingTimestamp >= eightAm
        )
    }).reduce((sum, feeding) => sum + (feeding.amount || 0), 0)
  })()

  return {
    totalFeedings,
    totalDiapers,
    totalSleeps,
    totalMilk,
    breastFeedings,
    formulaFeedings,
    peeDiapers,
    poopDiapers,
    bothDiapers,
    totalSleepMinutes,
    recentFeedings,
    recentDiapers,
    recentSleeps,
    last24HoursMilk
  }
})

// Daily feeding summary
const dailyFeedings = computed(() => {
  if (!selectedBaby.value) return []

  const feedings = store.getBabyFeedings(selectedBaby.value.id)
  
  // Group feedings by day using configurable window
  const dailyMap = new Map<string, { date: string; total: number; count: number; breast: number; formula: number }>()
  
  feedings.forEach(feeding => {
    const feedingTime = new Date(feeding.timestamp)
    
    // Calculate which day this feeding belongs to
    let dayStart = new Date(feedingTime)
    dayStart.setHours(0, 0, 0, 0)
    
    if (use8amWindow.value) {
      // 8 AM to 8 AM window logic
      if (feedingTime.getHours() < 8) {
        dayStart.setDate(dayStart.getDate() - 1)
      }
      dayStart.setHours(8, 0, 0, 0)
    } else {
      // 12 AM to 12 AM window logic (standard calendar day)
      // No adjustment needed, dayStart is already at midnight
    }
    
    const dateKey = dayStart.toDateString()
    
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        total: 0,
        count: 0,
        breast: 0,
        formula: 0
      })
    }
    
    const dayData = dailyMap.get(dateKey)!
    dayData.total += feeding.amount || 0
    dayData.count += 1
    
    if (feeding.type === 'breast') {
      dayData.breast += 1
    } else if (feeding.type === 'formula') {
      dayData.formula += 1
    }
  })
  
  // Convert to array and sort by date (newest first)
  return Array.from(dailyMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7) // Show last 7 days
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

function formatDate(dateString: string) {
  const date = new Date(dateString)
  if (use8amWindow.value) {
    return format(date, 'MMM d') + ' (8am-8am)'
  } else {
    return format(date, 'MMM d') + ' (12am-12am)'
  }
}

function goHome() {
  router.push('/')
}

function openEditBabyModal() {
  editingBaby.value = selectedBaby.value
  showEditBabyModal.value = true
}

function onModalSaved() {
  // Refresh data after editing
  showEditBabyModal.value = false
  editingBaby.value = null
}
</script>

<template>
  <div class="history-page">
    <div v-if="selectedBaby" class="container">
      <header class="page-header">
        <button @click="goHome" class="back-btn">Home</button>
        <h2>{{ selectedBaby.name }}</h2>
        <button @click="openEditBabyModal" class="edit-baby-btn">
          <img src="../assets/icons/lucide_pencil.svg" alt="Edit" />
        </button>
      </header>
      
      <!-- Stats Section -->
      <div v-if="stats" class="stats-section">
        <h3>Overview</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ stats.totalFeedings }}</div>
            <div class="stat-label">Total Feedings</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ stats.totalDiapers }}</div>
            <div class="stat-label">Total Diapers</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ stats.totalSleeps }}</div>
            <div class="stat-label">Sleep Sessions</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ Math.round(stats.totalMilk) }}ml</div>
            <div class="stat-label">Total Milk</div>
          </div>
        </div>
        
        <div class="stats-details">
          <div class="detail-section">
            <h4>Feedings</h4>
            <div class="detail-grid">
              <span>Breast: {{ stats.breastFeedings }}</span>
              <span>Formula: {{ stats.formulaFeedings }}</span>
              <span>Last 24h: {{ stats.recentFeedings }}</span>
              <span>Last 24h (since 8am): {{ Math.round(stats.last24HoursMilk) }}ml</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Diapers</h4>
            <div class="detail-grid">
              <span>Wet: {{ stats.peeDiapers }}</span>
              <span>Dirty: {{ stats.poopDiapers }}</span>
              <span>Both: {{ stats.bothDiapers }}</span>
              <span>Last 24h: {{ stats.recentDiapers }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Sleep</h4>
            <div class="detail-grid">
              <span>Total: {{ Math.round(stats.totalSleepMinutes / 60) }}h {{ Math.round(stats.totalSleepMinutes % 60) }}m</span>
              <span>Last 24h: {{ stats.recentSleeps }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Daily Feeding Summary -->
      <div v-if="dailyFeedings.length > 0" class="daily-feedings-section">
        <div class="daily-feedings-header">
          <h3>Daily Feeding Summary ({{ use8amWindow ? '8 AM to 8 AM' : '12 AM to 12 AM' }} Windows)</h3>
          <div class="time-window-toggle">
            <span class="toggle-text-left">12 AM</span>
            <div class="toggle-container">
              <input 
                type="checkbox" 
                v-model="use8amWindow" 
                class="toggle-input"
                id="time-window-toggle"
              />
              <label for="time-window-toggle" class="toggle-slider"></label>
            </div>
            <span class="toggle-text-right">8 AM</span>
          </div>
        </div>
        <div class="daily-feedings-grid">
          <div v-for="day in dailyFeedings" :key="day.date" class="daily-feeding-card">
            <div class="daily-date">{{ formatDate(day.date) }}</div>
            <div class="daily-total">{{ Math.round(day.total) }}ml</div>
            <div class="daily-breakdown">
              <span v-if="day.breast > 0" class="feeding-type breast">{{ day.breast }} breast</span>
              <span v-if="day.formula > 0" class="feeding-type formula">{{ day.formula }} formula</span>
            </div>
            <div class="daily-count">{{ day.count }} feedings</div>
          </div>
        </div>
      </div>
      
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

    <EditBabyModal 
      v-if="showEditBabyModal && editingBaby"
      :baby="editingBaby"
      @close="showEditBabyModal = false"
      @saved="onModalSaved"
    />
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
.edit-baby-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #666;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.edit-baby-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #888;
}
.edit-baby-btn img {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
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

/* Stats Section Styles */
.stats-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #e0e0ff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #a0a0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stats-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #c0c0ff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.25rem;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-grid span {
  font-size: 0.9rem;
  color: #d0d0ff;
}

/* Daily Feeding Summary Styles */
.daily-feedings-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.daily-feedings-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #e0e0ff;
}

.daily-feedings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.daily-feeding-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.daily-date {
  font-size: 0.9rem;
  color: #a0a0e0;
  margin-bottom: 0.25rem;
}

.daily-total {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 0.25rem;
}

.daily-breakdown {
  font-size: 0.9rem;
  color: #a0a0e0;
  margin-bottom: 0.25rem;
}

.feeding-type {
  font-weight: bold;
  text-transform: capitalize;
}

.daily-count {
  font-size: 0.9rem;
  color: #a0a0e0;
}

.daily-feedings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.time-window-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-text-left, .toggle-text-right {
  font-size: 0.7rem;
  font-weight: bold;
  color: #a0a0e0;
}

.toggle-container {
  position: relative;
  width: 50px;
  height: 24px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.1);
}

.toggle-input {
  display: none;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider {
  transform: translateX(26px);
}
</style> 