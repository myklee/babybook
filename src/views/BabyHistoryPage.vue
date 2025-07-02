<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { useRouter, useRoute } from 'vue-router'
import { format } from 'date-fns'
import EditBabyModal from '../components/EditBabyModal.vue'
import EditRecord from '../components/EditRecord.vue'
import BabySettingsModal from '../components/BabySettingsModal.vue'
import FeedingModal from '../components/FeedingModal.vue'
import DiaperModal from '../components/DiaperModal.vue'
import settingsIcon from '../assets/icons/settings-2.svg'
import IconButton from '../components/IconButton.vue'
import pencilIcon from '../assets/icons/lucide_pencil.svg'
import arrowBigLeftIcon from '../assets/icons/arrow-big-left.svg'

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
  topup_amount?: number;
}

const store = useBabyStore()
const router = useRouter()
const route = useRoute()

const selectedBaby = ref<any>(null)
const showEditBabyModal = ref(false)
const editingBaby = ref<any>(null)
const use8amWindow = ref(true) // Toggle for 8am vs 12am window

// Edit modal state
const showEditModal = ref(false)
const editingRecord = ref<any>(null)
const editingType = ref<'feeding' | 'diaper' | 'sleep'>('feeding')

const showSettingsModal = ref(false)

// Modal state for feeding and diaper actions
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'pee' | 'poop' | 'both'>('pee')

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
    topup_amount: (f as any).topup_amount,
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
  const totalMilk = feedings.reduce((sum, f) => sum + (f.amount || 0) + ((f as any).topup_amount || 0), 0)
  const breastFeedings = feedings.filter(f => f.type === 'breast').length
  const formulaFeedings = feedings.filter(f => f.type === 'formula').length

  // Diaper stats
  const peeDiapers = diapers.filter(d => d.type === 'pee').length
  const poopDiapers = diapers.filter(d => d.type === 'poop').length
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

  // Last 24 hours milk amount (respects toggle setting)
  const last24HoursMilk = (() => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let windowStart

    if (use8amWindow.value) {
      // Since the most recent 8 AM
      if (now.getHours() >= 8) {
        // It's past 8am today, so use 8am today
        windowStart = new Date(today)
        windowStart.setHours(8, 0, 0, 0)
      } else {
        // It's before 8am today, so use 8am yesterday
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        windowStart = new Date(yesterday)
        windowStart.setHours(8, 0, 0, 0)
      }
    } else {
      // Since the most recent 12 AM (midnight)
      if (now.getHours() >= 0) {
        // It's past midnight today, so use midnight today
        windowStart = new Date(today)
        windowStart.setHours(0, 0, 0, 0)
      } else {
        // This shouldn't happen since hours are 0-23, but just in case
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        windowStart = yesterday
      }
    }

    return feedings.filter(feeding => {
        const feedingTimestamp = new Date(feeding.timestamp)
        return (
            (feeding.type === 'breast' || feeding.type === 'formula') &&
            feeding.amount != null &&
            feedingTimestamp >= windowStart
        )
    }).reduce((sum, feeding) => sum + (feeding.amount || 0) + ((feeding as any).topup_amount || 0), 0)
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
    dayData.total += (feeding.amount || 0) + ((feeding as any).topup_amount || 0)
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

function formatBirthdate(birthdate: string) {
  return format(new Date(birthdate), 'MMM d, yyyy')
}

function goHome() {
  router.push('/')
}

function switchBaby(baby: any) {
  selectedBaby.value = baby
  // Update the URL to reflect the new baby
  router.push(`/baby/${baby.id}`)
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

function openEditModal(record: any, type: 'feeding' | 'diaper' | 'sleep') {
  // Create a copy of the record to avoid modifying the original
  const recordCopy = { ...record }
  
  // Map the record structure to match what EditRecord expects
  if (type === 'feeding') {
    // EditRecord expects: id, amount, type, notes, timestamp
    recordCopy.timestamp = record.event_time
    recordCopy.type = record.feeding_type
  } else if (type === 'diaper') {
    // EditRecord expects: id, type, notes, timestamp
    recordCopy.timestamp = record.event_time
    // Map diaper types from new terminology to old terminology
    if (record.diaper_type === 'pee') {
      recordCopy.type = 'wet'
    } else if (record.diaper_type === 'poop') {
      recordCopy.type = 'dirty'
    } else {
      recordCopy.type = record.diaper_type // 'both' stays the same
    }
  } else if (type === 'sleep') {
    // EditRecord expects: id, start_time, end_time, notes
    // These should already be correct from the mapping
  }
  
  editingRecord.value = recordCopy
  editingType.value = type
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingRecord.value = null
  // Refresh data after editing to ensure UI is up to date
  store.initializeStore()
}

function getTimelineWindow() {
  const now = new Date()
  let start = new Date(now)
  let end = new Date(now)
  if (use8amWindow.value) {
    // 8am today to 8am tomorrow
    if (now.getHours() >= 8) {
      start.setHours(8, 0, 0, 0)
      end = new Date(start)
      end.setDate(start.getDate() + 1)
    } else {
      // before 8am, window is 8am yesterday to 8am today
      start.setDate(start.getDate() - 1)
      start.setHours(8, 0, 0, 0)
      end = new Date(start)
      end.setDate(start.getDate() + 1)
    }
  } else {
    // 12am today to 12am tomorrow
    start.setHours(0, 0, 0, 0)
    end = new Date(start)
    end.setDate(start.getDate() + 1)
  }
  return { start, end }
}

function getTimelineHours() {
  // Always 24 hours, but starting at 8 or 0
  return Array.from({ length: 24 }, (_, i) => {
    const { start } = getTimelineWindow()
    const hour = (start.getHours() + i) % 24
    return hour
  })
}

function getFeedingsForTimeline() {
  if (!selectedBaby.value) return []
  const { start, end } = getTimelineWindow()
  return store.getBabyFeedings(selectedBaby.value.id).filter(f => {
    const t = new Date(f.timestamp)
    return t >= start && t < end
  })
}

function getDiaperChangesForTimeline() {
  if (!selectedBaby.value) return []
  const { start, end } = getTimelineWindow()
  return store.getBabyDiaperChanges(selectedBaby.value.id).filter(d => {
    const t = new Date(d.timestamp)
    return t >= start && t < end
  })
}

function getFeedingPosition(feeding: any) {
  const { start, end } = getTimelineWindow()
  const feedingTime = new Date(feeding.timestamp)
  const totalMs = end.getTime() - start.getTime()
  const elapsedMs = feedingTime.getTime() - start.getTime()
  const positionPercent = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100))
  return positionPercent
}

function getDiaperPosition(diaper: any) {
  const { start, end } = getTimelineWindow()
  const diaperTime = new Date(diaper.timestamp)
  const totalMs = end.getTime() - start.getTime()
  const elapsedMs = diaperTime.getTime() - start.getTime()
  const positionPercent = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100))
  return positionPercent
}

function getFeedingMarkerClass(feeding: any) {
  if (feeding.type === 'formula') {
    return 'feeding-marker-formula'
  } else if (feeding.type === 'breast') {
    return 'feeding-marker-breast'
  } else {
    return ''
  }
}

function getDiaperMarkerClass(diaper: any) {
  if (diaper.type === 'pee') {
    return 'diaper-marker-pee'
  } else if (diaper.type === 'poop') {
    return 'diaper-marker-poop'
  } else if (diaper.type === 'both') {
    return 'diaper-marker-both'
  } else {
    return ''
  }
}

function formatTime(timestamp: string) {
  return format(new Date(timestamp), 'h:mm a')
}

function getCurrentTimePosition() {
  const now = new Date()
  const { start, end } = getTimelineWindow()
  const totalMs = end.getTime() - start.getTime()
  const elapsedMs = now.getTime() - start.getTime()
  const positionPercent = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100))
  return positionPercent
}

function openFeedingModal(type: 'breast' | 'formula' | 'solid') {
  feedingType.value = type
  showFeedingModal.value = true
}

function openDiaperModal(type: 'pee' | 'poop' | 'both') {
  diaperType.value = type
  showDiaperModal.value = true
}

function onBabyDeleted() {
  // Handle the event when a baby is deleted
  goHome()
}

function handleSleepClick() {
  if (!selectedBaby.value) return
  if (store.isBabySleeping(selectedBaby.value.id)) {
    store.endSleepSession(selectedBaby.value.id)
  } else {
    store.startSleepSession(selectedBaby.value.id)
  }
}
</script>

<template>
  <div class="history-page">
    <div v-if="selectedBaby" class="container">
      <header class="page-header">
        <IconButton
          :icon="arrowBigLeftIcon"
          alt="Go Home"
          title="Go Home"
          @click="goHome"
        />
        <div class="baby-info">
          <img 
            :src="selectedBaby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${selectedBaby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" 
            :alt="selectedBaby.name" 
            class="baby-photo" 
          />
          <div class="baby-details">
            <div class="baby-name-section">
              <h2>{{ selectedBaby.name }}</h2>
              <IconButton
                :icon="pencilIcon"
                alt="Edit Baby"
                title="Edit Baby"
                @click="openEditBabyModal"
              />
            </div>
            <div v-if="selectedBaby.birthdate" class="baby-birthdate">
              {{ formatBirthdate(selectedBaby.birthdate) }}
            </div>
          </div>
        </div>
        
        <!-- Baby Selector -->
        <div v-if="store.babies.length > 1 && selectedBaby" class="baby-selector">
          <div class="baby-selector-buttons">
            <button
              v-for="baby in store.babies.filter(b => selectedBaby && b.id !== selectedBaby.id)"
              :key="baby.id"
              class="baby-switch-btn"
              @click="switchBaby(baby)"
              :title="`Switch to ${baby.name}`"
            >
              <img 
                :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" 
                :alt="baby.name" 
                class="baby-switch-photo" 
              />
            </button>
          </div>
        </div>
        
        <div class="header-controls">
          <!-- Action Buttons -->
          <div class="action-buttons">
            <button class="action-btn breast" @click="openFeedingModal('breast')" title="Record Breast Feeding">
              <img :src="breastIcon" alt="Breast" class="icon" />
              <span>Breast</span>
            </button>
            <button class="action-btn formula" @click="openFeedingModal('formula')" title="Record Formula Feeding">
              <img :src="formulaIcon" alt="Formula" class="icon" />
              <span>Formula</span>
            </button>
            <button class="action-btn poop" @click="openDiaperModal('poop')" title="Record Poop Diaper">
              <img :src="poopIcon" alt="Poop" class="icon" />
              <span>Poop</span>
            </button>
            <button class="action-btn pee" @click="openDiaperModal('pee')" title="Record Pee Diaper">
              <img :src="dropletsIcon" alt="Pee" class="icon" />
              <span>Pee</span>
            </button>
            <button class="action-btn sleep" @click="handleSleepClick()" title="Record Sleep Session">
              <span v-if="store.isBabySleeping(selectedBaby?.id)">⏹️ Wake</span>
              <span v-else>😴 Sleep</span>
            </button>
          </div>
          
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
          <div class="header-buttons">
            <IconButton
              :icon="settingsIcon"
              alt="Settings"
              title="Settings"
              @click="showSettingsModal = true"
            />
          </div>
        </div>
        <div v-if="store.isBabySleeping(selectedBaby?.id)" class="sleeping-banner">
          <span>😴 {{ selectedBaby.name }} is currently sleeping</span>
        </div>
      </header>
      
      <!-- Day View Timeline -->
      <div v-if="stats" class="day-view-timeline">
        <div class="timeline-header">
          <span class="timeline-title">Today's Feedings</span>
          <span class="timeline-total">{{ Math.round(stats.last24HoursMilk || 0) }}ml total</span>
        </div>
        <div class="timeline-container">
          <div class="hour-marks">
            <div v-for="(hour, i) in getTimelineHours()" :key="hour" class="hour-mark" :class="{ 'current-hour': hour === new Date().getHours() }">
              <div class="hour-line" v-if="i !== 0"></div>
              <span class="hour-label" v-if="hour % 2 === 0">
                {{
                  (i === 0 || hour === 0 || hour === 12)
                    ? (hour === 0 ? '12AM' : hour === 12 ? '12PM' : (hour > 12 ? (hour - 12) : hour) + (hour >= 12 ? 'PM' : 'AM'))
                    : (hour > 12 ? (hour - 12) : hour)
                }}
              </span>
            </div>
          </div>
          <div class="timeline-track">
            <div 
              v-for="feeding in getFeedingsForTimeline()" 
              :key="feeding.id"
              class="feeding-marker"
              :class="getFeedingMarkerClass(feeding)"
              :style="{ left: `calc(${getFeedingPosition(feeding)}% - 11px)` }"
              :title="`${feeding.type} feeding at ${formatTime(feeding.timestamp)}`"
            >
              <img 
                :src="feeding.type === 'formula' ? formulaIcon : breastIcon" 
                alt="feeding"
                class="feeding-icon"
              />
            </div>
            <div 
              v-for="diaper in getDiaperChangesForTimeline()" 
              :key="diaper.id"
              class="diaper-marker"
              :class="getDiaperMarkerClass(diaper)"
              :style="{ left: `calc(${getDiaperPosition(diaper)}% - 11px)` }"
              :title="`${diaper.type} diaper at ${formatTime(diaper.timestamp)}`"
            >
              <img 
                :src="diaper.type === 'pee' ? dropletsIcon : poopIcon" 
                alt="diaper"
                class="diaper-icon"
              />
            </div>
          </div>
          <div 
            class="current-time-indicator"
            :style="{ left: `${getCurrentTimePosition()}%` }"
          ></div>
        </div>
      </div>
      
      <!-- Time Window Toggle -->
      <div v-if="dailyFeedings.length > 0" class="daily-feedings-section">
        <div class="daily-feedings-header">
          <h3>Daily Feeding Summary ({{ use8amWindow ? '8 AM to 8 AM' : '12 AM to 12 AM' }} Windows)</h3>
        </div>
        <div class="daily-feedings-grid">
          <div v-for="day in dailyFeedings" :key="day.date" class="daily-feeding-card">
            <div class="daily-date">{{ formatDate(day.date) }}</div>
            <div class="daily-total">{{ Math.round(day.total) }}ml</div>
            <div class="daily-breakdown">
              <span v-if="day.breast > 0" class="feeding-type breast">{{ day.breast }} breast</span> &nbsp;,
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
        <li v-for="item in combinedHistory" :key="`${item.event_type}-${item.id}`" class="timeline-item" @click="openEditModal(item, item.event_type)">
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
                <span v-if="item.topup_amount && item.topup_amount > 0" class="topup-display">
                  + <span class="font-bold">{{ item.topup_amount }}ml formula</span>
                </span>
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
      @deleted="onBabyDeleted"
    />

    <!-- Edit Record Modal -->
    <EditRecord
      v-if="showEditModal && editingRecord"
      :record="editingRecord"
      :type="editingType"
      :babyName="selectedBaby?.name"
      @close="closeEditModal"
      @saved="closeEditModal"
    />

    <BabySettingsModal
      v-if="showSettingsModal && selectedBaby"
      :babyId="selectedBaby.id"
      :babyName="selectedBaby.name"
      @close="showSettingsModal = false"
      @saved="showSettingsModal = false"
    />

    <FeedingModal
      v-if="showFeedingModal && selectedBaby"
      :babyId="selectedBaby.id"
      :babyName="selectedBaby.name"
      :feedingType="feedingType"
      @close="showFeedingModal = false"
      @saved="showFeedingModal = false"
    />

    <DiaperModal
      v-if="showDiaperModal && selectedBaby"
      :babyId="selectedBaby.id"
      :babyName="selectedBaby.name"
      :diaperType="diaperType"
      @close="showDiaperModal = false"
      @saved="showDiaperModal = false"
    />
  </div>
</template>

<style scoped>
.history-page {
  background-color: #1a1a2e;
  min-height: 100vh;
  color: white;
}
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}
.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  width: 100vw;
  row-gap: 1rem;
  margin-left: calc(-50vw + 50%);
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.baby-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  justify-content: center;
}
.baby-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.baby-name-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  h2 {
    white-space: nowrap;
  }
}
.baby-birthdate {
  font-size: 0.9rem;
  color: #a0a0e0;
  margin-top: 0.25rem;
  text-align: center;
}
.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.baby-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.2);
}
.page-header h2 {
  font-size: 1.75rem;
  font-weight: bold;
  margin: 0;
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
  background: none;
  border: none;
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
  background: rgba(255, 255, 255, 0.1);
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
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.timeline-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin: 0 -1rem;
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
  width: 13px;
  height: 13px;
  opacity: 1;
  filter: brightness(0) saturate(100%);
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
  white-space: nowrap;
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

/* Day View Timeline Styles */
.day-view-timeline {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.timeline-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #e0e0ff;
}

.timeline-total {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
}

.timeline-container {
  position: relative;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem 0;
}

.hour-marks {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: stretch;
}

.hour-mark {
  position: relative;
  flex: 1 0 0%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.hour-line {
  position: absolute;
  left: 0;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.2);
}

.current-hour .hour-line {
  background-color: rgba(255, 255, 255, 0.3);
}

.hour-label {
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 0.7rem;
  color: #a0a0e0;
  white-space: nowrap;
  text-align: left;
  transform: translateX(0);
}

.timeline-track {
  position: relative;
  height: 20px;
}

.feeding-marker {
  position: absolute;
  top: 25%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: pointer;
  background: rgba(60, 60, 80, 0.85);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.2);
}

.feeding-marker-breast {
  background: rgba(245, 245, 220, 0.8);
}

.feeding-marker-formula {
  background: rgba(127, 255, 212, 0.8);
}

.feeding-icon {
  width: 13px;
  height: 13px;
  opacity: 1;
  filter: brightness(0) saturate(100%);
}

.feeding-marker:hover .feeding-icon {
  transform: scale(1.2);
}

.topup-display {
  font-size: 0.8rem;
  color: #a0a0e0;
}

.baby-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.settings-icon-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
  color: #333;
  display: flex;
  align-items: center;
}
.settings-icon-btn:hover {
  opacity: 1;
}
.settings-svg {
  width: 1.5rem;
  height: 1.5rem;
  display: block;
  filter: brightness(0) invert(1);
}

.current-time-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background-color: #ffd700;
  z-index: 15;
}

.feeding-marker:hover .feeding-icon {
  transform: scale(1.2);
}

.diaper-marker {
  position: absolute;
  top: 25%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: pointer;
  background: rgba(80, 60, 60, 0.85);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.2);
}

.diaper-marker-pee {
  background: rgba(255, 215, 0, 0.8);
}

.diaper-marker-poop {
  background: rgba(139, 69, 19, 0.8);
}

.diaper-marker-both {
  background: rgba(139, 69, 19, 0.8);
}

.diaper-icon {
  width: 13px;
  height: 13px;
  opacity: 1;
  filter: brightness(0) saturate(100%);
}

.diaper-marker:hover .diaper-icon {
  transform: scale(1.2);
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Baby Selector Styles */
.baby-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 1rem;
}

.baby-selector-label {
  font-size: 0.9rem;
  font-weight: bold;
  color: #a0a0e0;
  white-space: nowrap;
}

.baby-selector-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
}

.baby-switch-btn {
  background: none;
  border: 2px solid transparent;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.baby-switch-btn:hover {
  opacity: 1;
  transform: scale(1.05);
}

.baby-switch-btn.active {
  border-color: #ffd700;
  opacity: 1;
}

.baby-switch-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

/* Action Buttons Styles */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: black;
  transition: transform 0.2s ease;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 4px;
}

.action-btn:hover {
  transform: scale(1.05);
}

.action-btn .icon {
  width: 20px;
  height: 20px;
  stroke-width: 1;
  flex-shrink: 0;
}

.action-btn.breast {
  background-color: #f5f5dc; /* beige */
}

.action-btn.formula {
  background-color: #7fffd4; /* aquamarine */
}

.action-btn.poop {
  background-color: saddlebrown;
  color: white;
}

.action-btn.poop .icon {
  stroke-width: 0;
  fill: white;
}

.action-btn.pee {
  background-color: #ffd700; /* gold */
}

.sleeping-banner {
  background: #23234a;
  color: #ffd700;
  font-weight: bold;
  text-align: center;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
</style> 