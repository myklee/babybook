<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '../stores/babyStore'
import EditRecord from '../components/EditRecord.vue'

const router = useRouter()
const store = useBabyStore()

// State
const selectedBaby = ref<any>(null)
const showEditModal = ref(false)
const editingRecord = ref<any>(null)
const filterType = ref<'all' | 'feeding' | 'diaper' | 'sleep'>('all')
const filterDateRange = ref<'all' | 'today' | 'week' | 'month'>('all')
const sortOrder = ref<'newest' | 'oldest'>('newest')

// Computed properties
const allActivities = computed(() => {
  if (!selectedBaby.value) return []
  
  let activities: any[] = []
  
  // Get feedings
  const feedings = store.getBabyFeedings(selectedBaby.value.id).map(f => ({
    ...f,
    activityType: 'feeding',
    displayType: f.type,
    displayAmount: `${f.amount}ml`,
    icon: f.type === 'breast' ? '🍼' : f.type === 'formula' ? '🥛' : '🥄'
  }))
  
  // Get diaper changes
  const diapers = store.getBabyDiaperChanges(selectedBaby.value.id).map((d: any) => ({
    ...d,
    activityType: 'diaper',
    displayType: d.type,
    displayAmount: '',
    icon: d.type === 'wet' ? '💧' : d.type === 'dirty' ? '💩' : '💧💩'
  }))
  
  // Get sleep sessions
  const sleeps = store.getBabySleepSessions(selectedBaby.value.id).map((s: any) => {
    const duration = s.end_time ? 
      Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60)) : 
      0
    return {
      ...s,
      activityType: 'sleep',
      displayType: 'sleep',
      displayAmount: `${duration}min`,
      duration,
      icon: '😴'
    }
  })
  
  activities = [...feedings, ...diapers, ...sleeps]
  
  // Filter by type
  if (filterType.value !== 'all') {
    activities = activities.filter(a => a.activityType === filterType.value)
  }
  
  // Filter by date range
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  
  if (filterDateRange.value === 'today') {
    activities = activities.filter(a => new Date(a.timestamp || a.start_time) >= today)
  } else if (filterDateRange.value === 'week') {
    activities = activities.filter(a => new Date(a.timestamp || a.start_time) >= weekAgo)
  } else if (filterDateRange.value === 'month') {
    activities = activities.filter(a => new Date(a.timestamp || a.start_time) >= monthAgo)
  }
  
  // Sort by timestamp
  activities.sort((a, b) => {
    const dateA = new Date(a.timestamp || a.start_time).getTime()
    const dateB = new Date(b.timestamp || b.start_time).getTime()
    return sortOrder.value === 'newest' ? dateB - dateA : dateA - dateB
  })
  
  return activities
})

const totalFeedings = computed(() => {
  return allActivities.value.filter(a => a.activityType === 'feeding').length
})

const totalDiapers = computed(() => {
  return allActivities.value.filter(a => a.activityType === 'diaper').length
})

const totalSleepSessions = computed(() => {
  return allActivities.value.filter(a => a.activityType === 'sleep').length
})

const totalFeedingAmount = computed(() => {
  return allActivities.value
    .filter(a => a.activityType === 'feeding')
    .reduce((total, feeding) => total + feeding.amount, 0)
})

const totalSleepTime = computed(() => {
  return allActivities.value
    .filter(a => a.activityType === 'sleep')
    .reduce((total, sleep) => total + sleep.duration, 0)
})

const feedingBreakdown = computed(() => {
  const feedings = allActivities.value.filter(a => a.activityType === 'feeding')
  const breakdown = { breast: 0, formula: 0, solid: 0 }
  feedings.forEach((feeding: any) => {
    breakdown[feeding.type as keyof typeof breakdown] += feeding.amount
  })
  return breakdown
})

const diaperBreakdown = computed(() => {
  const diapers = allActivities.value.filter(a => a.activityType === 'diaper')
  const breakdown = { wet: 0, dirty: 0, both: 0 }
  diapers.forEach((diaper: any) => {
    breakdown[diaper.type as keyof typeof breakdown]++
  })
  return breakdown
})

// Initialize
onMounted(() => {
  if (store.babies.length > 0 && !selectedBaby.value) {
    selectedBaby.value = store.babies[0]
  }
})

// Functions
function selectBaby(baby: any) {
  selectedBaby.value = baby
}

function openEditModal(record: any) {
  editingRecord.value = record
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingRecord.value = null
}

function goBack() {
  router.push('/')
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  let dateStr = ''
  if (activityDate.getTime() === today.getTime()) {
    dateStr = 'Today'
  } else if (activityDate.getTime() === yesterday.getTime()) {
    dateStr = 'Yesterday'
  } else {
    dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: activityDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  
  return `${dateStr} at ${timeStr}`
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}
</script>

<template>
  <div class="baby-history-page">
    <div class="header">
      <h1>Baby History</h1>
      <button @click="goBack" class="btn btn-secondary">← Back to Home</button>
    </div>

    <!-- Baby Selection -->
    <div class="baby-selection">
      <h3>Select Baby</h3>
      <div class="baby-list">
        <button
          v-for="baby in store.babies"
          :key="baby.id"
          @click="selectBaby(baby)"
          :class="['baby-btn', { active: selectedBaby?.id === baby.id }]"
        >
          {{ baby.name }}
        </button>
      </div>
    </div>

    <div v-if="selectedBaby" class="content">
      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Activity Type:</label>
          <select v-model="filterType">
            <option value="all">All Activities</option>
            <option value="feeding">Feedings</option>
            <option value="diaper">Diaper Changes</option>
            <option value="sleep">Sleep</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Date Range:</label>
          <select v-model="filterDateRange">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Sort:</label>
          <select v-model="sortOrder">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="summary-stats">
        <div class="stat-card">
          <h4>Total Activities</h4>
          <div class="stat-value">{{ allActivities.length }}</div>
        </div>
        <div class="stat-card">
          <h4>Feedings</h4>
          <div class="stat-value">{{ totalFeedings }}</div>
          <div class="stat-subtitle">{{ totalFeedingAmount }}ml total</div>
        </div>
        <div class="stat-card">
          <h4>Diaper Changes</h4>
          <div class="stat-value">{{ totalDiapers }}</div>
        </div>
        <div class="stat-card">
          <h4>Sleep Sessions</h4>
          <div class="stat-value">{{ totalSleepSessions }}</div>
          <div class="stat-subtitle">{{ formatDuration(totalSleepTime) }} total</div>
        </div>
      </div>

      <!-- Breakdowns -->
      <div class="breakdowns">
        <!-- Feeding Breakdown -->
        <div v-if="totalFeedings > 0" class="breakdown-section">
          <h3>Feeding Breakdown</h3>
          <div class="breakdown-cards">
            <div class="breakdown-card breast">
              <h4>🍼 Breast</h4>
              <div class="breakdown-value">{{ feedingBreakdown.breast }}ml</div>
            </div>
            <div class="breakdown-card formula">
              <h4>🥛 Formula</h4>
              <div class="breakdown-value">{{ feedingBreakdown.formula }}ml</div>
            </div>
            <div class="breakdown-card solid">
              <h4>🥄 Solid</h4>
              <div class="breakdown-value">{{ feedingBreakdown.solid }}ml</div>
            </div>
          </div>
        </div>

        <!-- Diaper Breakdown -->
        <div v-if="totalDiapers > 0" class="breakdown-section">
          <h3>Diaper Breakdown</h3>
          <div class="breakdown-cards">
            <div class="breakdown-card wet">
              <h4>💧 Wet</h4>
              <div class="breakdown-value">{{ diaperBreakdown.wet }}</div>
            </div>
            <div class="breakdown-card dirty">
              <h4>💩 Dirty</h4>
              <div class="breakdown-value">{{ diaperBreakdown.dirty }}</div>
            </div>
            <div class="breakdown-card both">
              <h4>💧💩 Both</h4>
              <div class="breakdown-value">{{ diaperBreakdown.both }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Activity History -->
      <div class="activity-history">
        <h3>Activity History</h3>
        <div v-if="allActivities.length === 0" class="empty-state">
          <p>No activities found for the selected filters.</p>
        </div>
        <div v-else class="activity-list">
          <div v-for="activity in allActivities" :key="`${activity.activityType}-${activity.id}`" class="activity-item">
            <div class="activity-content">
              <div class="activity-header">
                <div class="activity-time">{{ formatDateTime(activity.timestamp || activity.start_time) }}</div>
                <div class="activity-type" :class="activity.activityType">
                  <span class="activity-icon">{{ activity.icon }}</span>
                  {{ activity.displayType }}
                </div>
              </div>
              <div class="activity-details">
                <span v-if="activity.displayAmount" class="activity-amount">{{ activity.displayAmount }}</span>
                <span v-if="activity.notes" class="activity-notes">{{ activity.notes }}</span>
              </div>
            </div>
            <button 
              class="edit-btn" 
              @click="openEditModal(activity)"
              title="Edit activity"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <EditRecord
      v-if="showEditModal && editingRecord"
      :record="editingRecord"
      :type="editingRecord.activityType"
      @close="closeEditModal"
      @saved="closeEditModal"
    />
  </div>
</template>

<style scoped>
.baby-history-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 1rem;
}

.header {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header h1 {
  margin: 0;
  color: #333;
}

.baby-selection {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.baby-list {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.baby-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;
}

.baby-btn.active {
  background-color: #9c27b0;
  color: white;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filters {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.filter-group select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.25rem;
}

.stat-subtitle {
  font-size: 0.875rem;
  color: #666;
}

.breakdowns {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.breakdown-section {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.breakdown-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.breakdown-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.breakdown-card {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  color: white;
}

.breakdown-card.breast {
  background-color: #ff9800;
}

.breakdown-card.formula {
  background-color: #2196f3;
}

.breakdown-card.solid {
  background-color: #4caf50;
}

.breakdown-card.wet {
  background-color: #00bcd4;
}

.breakdown-card.dirty {
  background-color: #795548;
}

.breakdown-card.both {
  background-color: #9c27b0;
}

.breakdown-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.breakdown-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.activity-history {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.activity-list {
  margin-top: 1rem;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.activity-item:hover {
  background-color: #f9f9f9;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-content {
  flex: 1;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.activity-time {
  font-weight: 500;
  color: #333;
}

.activity-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.activity-type.feeding {
  background-color: #fff3e0;
  color: #e65100;
}

.activity-type.diaper {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.activity-type.sleep {
  background-color: #e3f2fd;
  color: #1565c0;
}

.activity-icon {
  font-size: 1rem;
}

.activity-details {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.activity-amount {
  font-weight: 500;
  color: #333;
}

.activity-notes {
  color: #666;
  font-size: 0.875rem;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background-color: #f5f5f5;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn-secondary {
  background-color: #2196f3;
}

.btn-secondary:hover {
  background-color: #1976d2;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .breakdown-cards {
    grid-template-columns: 1fr;
  }
  
  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style> 