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
import NursingTimerModal from '../components/NursingTimerModal.vue'
import PumpingTimerModal from '../components/PumpingTimerModal.vue'
import PumpingEditModal from '../components/PumpingEditModal.vue'
import SolidFoodModal from '../components/SolidFoodModal.vue'
import SolidFoodEditModal from '../components/SolidFoodEditModal.vue'
import settingsIcon from '../assets/icons/settings-2.svg'
import IconButton from '../components/IconButton.vue'
import pencilIcon from '../assets/icons/lucide_pencil.svg'
import arrowBigLeftIcon from '../assets/icons/arrow-big-left.svg'
import Timeline from '../components/Timeline.vue'

import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import poopIcon from '../assets/icons/hugeicons_poop.svg'
import dropletsIcon from '../assets/icons/droplets.svg'
import spoonIcon from '../assets/icons/spoon.svg'
import sleepIcon from '../assets/icons/droplets.svg' // Placeholder

// Define a unified type for all history events
type HistoryEvent = {
  id: string;
  event_type: 'feeding' | 'diaper' | 'sleep' | 'solid' | 'pumping';
  event_time: string;
  notes: string | null;
  // Feeding specific
  feeding_type?: 'breast' | 'formula' | 'solid' | 'nursing';
  amount?: number | null;
  // Diaper specific
  diaper_type?: 'pee' | 'poop' | 'both';
  // Sleep specific
  start_time?: string;
  end_time?: string | null;
  topup_amount?: number;
  // Solid food specific
  food_name?: string;
  food_category?: string;
  times_tried?: number;
  reaction?: string | null;
  first_tried_date?: string;
  last_tried_date?: string;
  // Pumping specific
  total_duration?: number;
  total_amount?: number;
  left_duration?: number;
  right_duration?: number;
  left_amount?: number | null;
  right_amount?: number | null;
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

// Solid food edit modal state
const showSolidFoodEditModal = ref(false)
const editingSolidFood = ref<any>(null)

// Pumping edit modal state
const showPumpingEditModal = ref(false)
const editingPumpingSession = ref<any>(null)

const showSettingsModal = ref(false)

// Modal state for feeding and diaper actions
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const showNursingModal = ref(false)
const showPumpingModal = ref(false)
const showSolidFoodModal = ref(false)
const feedingType = ref<'breast' | 'formula'>('breast')
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

  const solidFoods: HistoryEvent[] = store.getBabySolidFoods(selectedBaby.value.id).map(sf => ({
    id: sf.id,
    event_type: 'solid',
    event_time: sf.last_tried_date,
    notes: sf.notes,
    food_name: sf.food_name,
    food_category: sf.food_category,
    times_tried: sf.times_tried,
    reaction: sf.reaction,
    first_tried_date: sf.first_tried_date,
    last_tried_date: sf.last_tried_date,
  }))

  const pumpingSessions: HistoryEvent[] = store.getAllPumpingSessions().map(ps => ({
    id: ps.id,
    event_type: 'pumping' as const,
    event_time: ps.start_time,
    notes: ps.notes,
    start_time: ps.start_time,
    end_time: ps.end_time,
    total_duration: ps.total_duration,
    total_amount: ps.total_amount,
    left_duration: ps.left_duration,
    right_duration: ps.right_duration,
    left_amount: ps.left_amount,
    right_amount: ps.right_amount,
  }))

  const allEvents = [...feedings, ...diapers, ...sleeps, ...solidFoods, ...pumpingSessions]

  return allEvents.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
})


// Cumulative stats computed property (last 7 days before today, respecting time window)
const cumulativeStats = computed(() => {
  if (!selectedBaby.value) return null

  const feedings = store.getBabyFeedings(selectedBaby.value.id)
  const diapers = store.getBabyDiaperChanges(selectedBaby.value.id)

  // Get today's date boundaries
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Get 7 days ago
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  // Apply time window logic to the date range
  let windowStart = new Date(sevenDaysAgo)
  let windowEnd = new Date(today)
  
  if (use8amWindow.value) {
    // 8am to 8am window
    windowStart.setHours(8, 0, 0, 0)
    windowEnd.setHours(8, 0, 0, 0)
  } else {
    // 12am to 12am window
    windowStart.setHours(0, 0, 0, 0)
    windowEnd.setHours(0, 0, 0, 0)
  }
  
  // Filter to only include data from the last 7 days before today, respecting time window
  const last7DaysFeedings = feedings.filter(f => {
    const feedingDate = new Date(f.timestamp)
    return feedingDate >= windowStart && feedingDate < windowEnd
  })
  
  const last7DaysDiapers = diapers.filter(d => {
    const diaperDate = new Date(d.timestamp)
    return diaperDate >= windowStart && diaperDate < windowEnd
  })

  if (last7DaysFeedings.length === 0) {
    return {
      avgAmountPerFeed: 0,
      avgAmountPerDay: 0,
      avgFeedsPerDay: 0,
      avgPoopsPerDay: 0,
      totalDays: 0
    }
  }

  // Calculate totals for the 7-day period
  const totalAmount = last7DaysFeedings.reduce((sum, f) => sum + (f.amount || 0) + ((f as any).topup_amount || 0), 0)
  const totalFeeds = last7DaysFeedings.length
  const totalPoops = last7DaysDiapers.filter(d => d.type === 'poop' || d.type === 'both').length

  // Calculate averages over 7 days
  const avgAmountPerFeed = totalFeeds > 0 ? totalAmount / totalFeeds : 0
  const avgAmountPerDay = totalAmount / 7 // Always divide by 7 days
  const avgFeedsPerDay = totalFeeds / 7 // Always divide by 7 days
  const avgPoopsPerDay = totalPoops / 7 // Always divide by 7 days

  return {
    avgAmountPerFeed: Math.round(avgAmountPerFeed),
    avgAmountPerDay: Math.round(avgAmountPerDay),
    avgFeedsPerDay: Math.round(avgFeedsPerDay * 10) / 10, // Round to 1 decimal
    avgPoopsPerDay: Math.round(avgPoopsPerDay * 10) / 10, // Round to 1 decimal
    totalDays: 7
  }
})

// Daily feeding summary
const dailyFeedings = computed(() => {
  if (!selectedBaby.value) return []

  const feedings = store.getBabyFeedings(selectedBaby.value.id)

  // Group feedings by day using configurable window
  const dailyMap = new Map<string, { date: string; windowStart: string; windowEnd: string; total: number; count: number; breast: number; formula: number }>()

  feedings.forEach(feeding => {
    const feedingTime = new Date(feeding.timestamp)

    // Calculate which day this feeding belongs to
    let dayStart = new Date(feedingTime)
    dayStart.setHours(0, 0, 0, 0)
    if (use8amWindow.value) {
      if (feedingTime.getHours() < 8) {
        dayStart.setDate(dayStart.getDate() - 1)
      }
      dayStart.setHours(8, 0, 0, 0)
    }
    const windowStart = new Date(dayStart)
    const windowEnd = new Date(dayStart)
    windowEnd.setDate(windowEnd.getDate() + 1)
    const dateKey = windowStart.toISOString()
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: windowStart.toDateString(),
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
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
    .sort((a, b) => new Date(b.windowStart).getTime() - new Date(a.windowStart).getTime())
    .slice(0, 7) // Show last 7 days
})

function getIcon(item: HistoryEvent) {
  switch (item.event_type) {
    case 'feeding':
      if (item.feeding_type === 'breast' || item.feeding_type === 'nursing') {
        return breastIcon
      }
      return formulaIcon
    case 'diaper':
      return item.diaper_type === 'pee' ? dropletsIcon : poopIcon
    case 'sleep':
      return sleepIcon
    case 'solid':
      return spoonIcon
    case 'pumping':
      return dropletsIcon
    default:
      return ''
  }
}

function formatTimestamp(dateString: string) {
  return format(new Date(dateString), 'MMM d, h:mm a')
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return format(date, 'MMMM d')
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

function openEditModal(record: any, type: 'feeding' | 'diaper' | 'sleep' | 'solid' | 'pumping') {
  if (type === 'solid') {
    openSolidFoodEditModal(record)
    return
  }

  if (type === 'pumping') {
    openPumpingEditModal(record)
    return
  }

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

function openSolidFoodEditModal(solidFood: any) {
  // Convert the history event back to solid food format
  const solidFoodRecord = {
    id: solidFood.id,
    food_name: solidFood.food_name,
    food_category: solidFood.food_category,
    reaction: solidFood.reaction,
    notes: solidFood.notes,
    times_tried: solidFood.times_tried,
    first_tried_date: solidFood.first_tried_date,
    last_tried_date: solidFood.last_tried_date
  }
  
  editingSolidFood.value = solidFoodRecord
  showSolidFoodEditModal.value = true
}

function closeSolidFoodEditModal() {
  showSolidFoodEditModal.value = false
  editingSolidFood.value = null
}

function openPumpingEditModal(pumpingSession: any) {
  // Convert the history event back to pumping session format
  const pumpingSessionRecord = {
    id: pumpingSession.id,
    baby_id: pumpingSession.baby_id || null, // Use the actual baby_id from the session
    user_id: store.currentUser?.id,
    start_time: pumpingSession.start_time,
    end_time: pumpingSession.end_time,
    left_duration: pumpingSession.left_duration || 0,
    right_duration: pumpingSession.right_duration || 0,
    total_duration: pumpingSession.total_duration || 0,
    left_amount: pumpingSession.left_amount,
    right_amount: pumpingSession.right_amount,
    total_amount: pumpingSession.total_amount || 0,
    notes: pumpingSession.notes,
    created_at: pumpingSession.created_at,
    updated_at: pumpingSession.updated_at
  }
  
  editingPumpingSession.value = pumpingSessionRecord
  showPumpingEditModal.value = true
}

function closePumpingEditModal() {
  showPumpingEditModal.value = false
  editingPumpingSession.value = null
}

function handleTimelinePumpingEdit(pumpingEvent: any) {
  // Convert the timeline pumping event to a full pumping session format
  const pumpingSessionRecord = {
    id: pumpingEvent.id,
    baby_id: pumpingEvent.baby_id || null, // Use the baby_id from the event, which may be null
    user_id: store.currentUser?.id,
    start_time: pumpingEvent.timestamp,
    end_time: new Date(new Date(pumpingEvent.timestamp).getTime() + (pumpingEvent.total_duration * 1000)).toISOString(),
    left_duration: pumpingEvent.left_duration || 0,
    right_duration: pumpingEvent.right_duration || 0,
    total_duration: pumpingEvent.total_duration || 0,
    left_amount: pumpingEvent.left_amount,
    right_amount: pumpingEvent.right_amount,
    total_amount: pumpingEvent.total_amount || 0,
    notes: pumpingEvent.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  editingPumpingSession.value = pumpingSessionRecord
  showPumpingEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingRecord.value = null
  // Refresh data after editing to ensure UI is up to date
  store.initializeStore()
}

function openFeedingModal(type: 'breast' | 'formula') {
  feedingType.value = type
  showFeedingModal.value = true
}

function openSolidFoodModal() {
  showSolidFoodModal.value = true
}

function openNursingModal() {
  showNursingModal.value = true
}

function openPumpingModal() {
  showPumpingModal.value = true
}

function handlePumpingSave(session: any) {
  console.log('Pumping session saved:', session)
  showPumpingModal.value = false
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

function getFeedingsForTimelineDate(date: Date) {
  if (!selectedBaby.value) return [];
  const feedings = store.getBabyFeedings(selectedBaby.value.id);

  // Use the same logic as dailyFeedings to calculate the window
  let dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  if (use8amWindow.value) {
    // 8 AM to 8 AM window logic - same as dailyFeedings
    dayStart.setHours(8, 0, 0, 0);
  } else {
    // 12 AM to 12 AM window logic - same as dailyFeedings
    // No adjustment needed, dayStart is already at midnight
  }

  const end = new Date(dayStart);
  end.setDate(dayStart.getDate() + 1);

  return feedings.filter(f => {
    const t = new Date(f.timestamp);
    return t >= dayStart && t < end;
  }).map(f => ({ id: f.id, timestamp: f.timestamp, type: f.type, amount: f.amount, topup_amount: (f as any).topup_amount }));
}

function getDiapersForTimelineDate(date: Date) {
  if (!selectedBaby.value) return [];
  const diapers = store.getBabyDiaperChanges(selectedBaby.value.id);

  // Use the same logic as dailyFeedings to calculate the window
  let dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  if (use8amWindow.value) {
    // 8 AM to 8 AM window logic - same as dailyFeedings
    dayStart.setHours(8, 0, 0, 0);
  } else {
    // 12 AM to 12 AM window logic - same as dailyFeedings
    // No adjustment needed, dayStart is already at midnight
  }

  const end = new Date(dayStart);
  end.setDate(dayStart.getDate() + 1);

  return diapers.filter(d => {
    const t = new Date(d.timestamp);
    return t >= dayStart && t < end;
  }).map(d => ({ id: d.id, timestamp: d.timestamp, type: d.type }));
}

function getSolidFoodsForTimelineDate(date: Date) {
  if (!selectedBaby.value) return [];
  const solidFoods = store.getBabySolidFoods(selectedBaby.value.id);

  // Use the same logic as dailyFeedings to calculate the window
  let dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  if (use8amWindow.value) {
    // 8 AM to 8 AM window logic - same as dailyFeedings
    dayStart.setHours(8, 0, 0, 0);
  } else {
    // 12 AM to 12 AM window logic - same as dailyFeedings
    // No adjustment needed, dayStart is already at midnight
  }

  const end = new Date(dayStart);
  end.setDate(dayStart.getDate() + 1);

  return solidFoods.filter(sf => {
    const t = new Date(sf.last_tried_date);
    return t >= dayStart && t < end;
  }).map(sf => ({ id: sf.id, timestamp: sf.last_tried_date, food_name: sf.food_name, reaction: sf.reaction }));
}

function getPumpingSessionsForTimelineDate(date: Date) {
  // Get all pumping sessions since they're account-level
  const pumpingSessions = store.getAllPumpingSessions();

  // Use the same logic as dailyFeedings to calculate the window
  let dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  if (use8amWindow.value) {
    // 8 AM to 8 AM window logic - same as dailyFeedings
    dayStart.setHours(8, 0, 0, 0);
  } else {
    // 12 AM to 12 AM window logic - same as dailyFeedings
    // No adjustment needed, dayStart is already at midnight
  }

  const end = new Date(dayStart);
  end.setDate(dayStart.getDate() + 1);

  return pumpingSessions.filter(ps => {
    const t = new Date(ps.start_time);
    return t >= dayStart && t < end;
  }).map(ps => ({ 
    id: ps.id, 
    timestamp: ps.start_time,
    total_duration: ps.total_duration,
    total_amount: ps.total_amount,
    left_duration: ps.left_duration,
    right_duration: ps.right_duration,
    left_amount: ps.left_amount,
    right_amount: ps.right_amount,
    notes: ps.notes
  }));
}

// Helper functions to get windowStart and windowEnd for a given day string
function getTimelineWindowStart(windowStart: string) {
  return windowStart
}

function getTimelineWindowEnd(windowEnd: string) {
  return windowEnd
}

// Helper function to get event breakdown for a specific day
function getDayBreakdown(day: any) {
  const feedings = getFeedingsForTimelineDate(new Date(day.windowStart))
  const diapers = getDiapersForTimelineDate(new Date(day.windowStart))
  const solidFoods = getSolidFoodsForTimelineDate(new Date(day.windowStart))
  const pumpingSessions = getPumpingSessionsForTimelineDate(new Date(day.windowStart))
  
  const breastCount = feedings.filter(f => f.type === 'breast' || f.type === 'nursing').length
  const formulaCount = feedings.filter(f => f.type === 'formula').length
  const solidCount = solidFoods.length
  const pumpingCount = pumpingSessions.length
  const poopCount = diapers.filter(d => d.type === 'poop' || d.type === 'both').length
  const peeCount = diapers.filter(d => d.type === 'pee' || d.type === 'both').length
  
  const breakdown = []
  if (breastCount > 0) breakdown.push(`${breastCount} breast`)
  if (formulaCount > 0) breakdown.push(`${formulaCount} formula`)
  if (solidCount > 0) breakdown.push(`${solidCount} solid`)
  if (pumpingCount > 0) breakdown.push(`${pumpingCount} pumping`)
  if (poopCount > 0) breakdown.push(`${poopCount} poop`)
  if (peeCount > 0) breakdown.push(`${peeCount} pee`)
  
  return breakdown.join(', ')
}

</script>

<template>
  <div class="history-page">
    <div v-if="selectedBaby" class="container">
      <header class="page-header">
        <IconButton :icon="arrowBigLeftIcon" alt="Go Home" title="Go Home" @click="goHome" />
        <div class="baby-info">
          <img
            :src="selectedBaby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${selectedBaby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`"
            :alt="selectedBaby.name" class="baby-photo" />
          <div class="baby-details">
            <div class="baby-name-section">
              <h2>{{ selectedBaby.name }}</h2>
              <IconButton :icon="pencilIcon" alt="Edit Baby" title="Edit Baby" @click="openEditBabyModal" />
            </div>
            <div v-if="selectedBaby.birthdate" class="baby-birthdate">
              {{ formatBirthdate(selectedBaby.birthdate) }}
            </div>
          </div>
        </div>

        <!-- Baby Selector -->
        <div v-if="store.babies.length > 1 && selectedBaby" class="baby-selector">
          <div class="baby-selector-buttons">
            <button v-for="baby in store.babies.filter(b => selectedBaby && b.id !== selectedBaby.id)" :key="baby.id"
              class="baby-switch-btn" @click="switchBaby(baby)" :title="`Switch to ${baby.name}`">
              <img
                :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`"
                :alt="baby.name" class="baby-switch-photo" />
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
            <button class="action-btn nursing" @click="openNursingModal()" title="Record Nursing">
              <img :src="breastIcon" alt="Nursing" class="icon" />
              <span>Nursing</span>
            </button>
            <button 
              class="action-btn pump" 
              @click="openPumpingModal()" 
              aria-label="Start pumping timer to track breast milk pumping session"
            >
              <img :src="dropletsIcon" alt="" aria-hidden="true" class="icon" />
              <span>Pump</span>
            </button>
            <button class="action-btn formula" @click="openFeedingModal('formula')" title="Record Formula Feeding">
              <img :src="formulaIcon" alt="Formula" class="icon" />
              <span>Formula</span>
            </button>
            <button class="action-btn solid" @click="openSolidFoodModal()" title="Record Solid Food">
              <img :src="spoonIcon" alt="Solid Food" class="icon" />
              <span>Solid</span>
            </button>
            <button class="action-btn poop" @click="openDiaperModal('poop')" title="Record Poop Diaper">
              <img :src="poopIcon" alt="Poop" class="icon" />
              <span>Poop</span>
            </button>
            <button class="action-btn pee" @click="openDiaperModal('pee')" title="Record Pee Diaper">
              <img :src="dropletsIcon" alt="Pee" class="icon" />
              <span>Pee</span>
            </button>
            <button :class="['action-btn', store.isBabySleeping(selectedBaby?.id) ? 'wake' : 'sleep']" @click="handleSleepClick()" title="Record Sleep Session">
              <span v-if="store.isBabySleeping(selectedBaby?.id)">Wake</span>
              <span v-else>Sleep</span>
            </button>
          </div>

          <div class="time-window-toggle">
            <span class="toggle-text-left">12 AM</span>
            <div class="toggle-container">
              <input type="checkbox" v-model="use8amWindow" class="toggle-input" id="time-window-toggle" />
              <label for="time-window-toggle" class="toggle-slider"></label>
            </div>
            <span class="toggle-text-right">8 AM</span>
          </div>
          <div class="header-buttons">
            <IconButton :icon="settingsIcon" alt="Settings" title="Settings" @click="showSettingsModal = true" />
          </div>
        </div>
        <div v-if="store.isBabySleeping(selectedBaby?.id)" class="sleeping-banner">
          <span>😴 {{ selectedBaby.name }} is currently sleeping</span>
        </div>
      </header>

      <!-- Day View Timeline -->
      <!-- <Timeline v-if="selectedBaby" title="Today" :events="todaysFeedings" :diaperEvents="todaysDiapers"
        :hourLabelInterval="2" :use8amWindow="use8amWindow" :showCurrentTimeIndicator="true"
        :totalLabel="`${Math.round(stats?.last24HoursMilk || 0)}ml total`" /> -->

      <!-- Cumulative Stats Section -->
      <div v-if="cumulativeStats" class="cumulative-stats-section">
        <h3>Cumulative Stats ({{ cumulativeStats.totalDays }} days)</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ cumulativeStats.avgAmountPerFeed }}ml</div>
            <div class="stat-label">Avg per feed</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ cumulativeStats.avgAmountPerDay }}ml</div>
            <div class="stat-label">Avg per day</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ cumulativeStats.avgFeedsPerDay }}</div>
            <div class="stat-label">Avg feeds/day</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ cumulativeStats.avgPoopsPerDay }}</div>
            <div class="stat-label">Avg poops/day</div>
          </div>
        </div>
      </div>
      <!-- Time Window Toggle -->
      <div v-if="dailyFeedings.length > 0" class="daily-feedings-section">

        <Timeline v-for="day in dailyFeedings" :key="day.windowStart" 
          :title="formatDate(day.date)"
          :breakdown="getDayBreakdown(day)"
          :events="getFeedingsForTimelineDate(new Date(day.windowStart))"
          :diaperEvents="getDiapersForTimelineDate(new Date(day.windowStart))"
          :solidFoodEvents="getSolidFoodsForTimelineDate(new Date(day.windowStart))"
          :pumpingEvents="getPumpingSessionsForTimelineDate(new Date(day.windowStart))"
          :hourLabelInterval="2"
          :use8amWindow="use8amWindow" :showCurrentTimeIndicator="false"
          :totalLabel="`${Math.round(day.total)}ml total`" :windowStart="getTimelineWindowStart(day.windowStart)"
          :windowEnd="getTimelineWindowEnd(day.windowEnd)"
          @edit-pumping="handleTimelinePumpingEdit" />

      </div>

      <ul class="history-timeline">
        <li v-if="combinedHistory.length === 0" class="empty-state">
          No activities recorded yet for {{ selectedBaby.name }}.
        </li>
        <li v-for="item in combinedHistory" :key="`${item.event_type}-${item.id}`" class="timeline-item"
          @click="openEditModal(item, item.event_type)">
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
                {{ item.feeding_type === 'breast' ? 'Breast' : item.feeding_type === 'nursing' ? 'Nursing' : item.feeding_type === 'formula' ? 'Formula' : 'Solid' }}: 
                <span v-if="item.feeding_type === 'nursing' && item.start_time && item.end_time" class="font-bold">
                  {{ ((new Date(item.end_time).getTime() - new Date(item.start_time).getTime()) / 60000).toFixed(0) }} min
                </span>
                <span v-else-if="item.feeding_type === 'nursing' && item.start_time" class="font-bold">
                  Ongoing
                </span>
                <span v-else class="font-bold">{{ item.amount }}ml</span>
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
                Slept for <span class="font-bold">{{ ((new Date(item.end_time).getTime() - new
                  Date(item.start_time!).getTime()) / 60000).toFixed(0) }} minutes</span>
              </span>
              <!-- Solid Food Info -->
              <span v-if="item.event_type === 'solid'">
                <span class="font-bold">{{ item.food_name }}</span>
                <span v-if="item.times_tried && item.times_tried > 1" class="times-tried">
                  ({{ item.times_tried }}x)
                </span>
                <div class="solid-food-details">
                  <span v-if="item.reaction" class="food-reaction" :class="item.reaction">{{ item.reaction }}</span>
                </div>
              </span>
              <!-- Pumping Info -->
              <span v-if="item.event_type === 'pumping'">
                Pumping: 
                <span class="font-bold">{{ Math.floor((item.total_duration || 0) / 60) }} min</span>
                <span v-if="item.total_amount && item.total_amount > 0" class="pumping-amount">
                  - <span class="font-bold">{{ item.total_amount }}ml</span>
                </span>
                <div v-if="(item.left_amount && item.left_amount > 0) || (item.right_amount && item.right_amount > 0)" class="pumping-breakdown">
                  <span v-if="item.left_amount && item.left_amount > 0" class="breast-amount">
                    L: {{ item.left_amount }}ml
                  </span>
                  <span v-if="item.right_amount && item.right_amount > 0" class="breast-amount">
                    R: {{ item.right_amount }}ml
                  </span>
                </div>
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

    <EditBabyModal v-if="showEditBabyModal && editingBaby" :baby="editingBaby" @close="showEditBabyModal = false"
      @saved="onModalSaved" @deleted="onBabyDeleted" />

    <!-- Edit Record Modal -->
    <EditRecord v-if="showEditModal && editingRecord" :record="editingRecord" :type="editingType"
      :babyName="selectedBaby?.name" @close="closeEditModal" @saved="closeEditModal" />

    <BabySettingsModal v-if="showSettingsModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      @close="showSettingsModal = false" @saved="showSettingsModal = false" />

    <FeedingModal v-if="showFeedingModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      :feedingType="feedingType" @close="showFeedingModal = false" @saved="showFeedingModal = false" />

    <DiaperModal v-if="showDiaperModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      :diaperType="diaperType" @close="showDiaperModal = false" @saved="showDiaperModal = false" />

    <NursingTimerModal v-if="showNursingModal && selectedBaby" :isOpen="showNursingModal" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      @close="showNursingModal = false" @save="showNursingModal = false" />

    <PumpingTimerModal :is-open="showPumpingModal" :baby-id="selectedBaby?.id || null"
      @close="showPumpingModal = false" @save="handlePumpingSave" />

    <SolidFoodModal v-if="showSolidFoodModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      @close="showSolidFoodModal = false" @saved="showSolidFoodModal = false" />

    <!-- Solid Food Edit Modal -->
    <SolidFoodEditModal 
      v-if="showSolidFoodEditModal && editingSolidFood && selectedBaby"
      :solid-food="editingSolidFood"
      :baby-name="selectedBaby.name"
      @close="closeSolidFoodEditModal"
      @saved="closeSolidFoodEditModal"
      @deleted="closeSolidFoodEditModal"
    />

    <!-- Pumping Edit Modal -->
    <PumpingEditModal 
      :is-open="showPumpingEditModal"
      :session="editingPumpingSession"
      @close="closePumpingEditModal"
      @save="closePumpingEditModal"
      @delete="closePumpingEditModal"
    />
  </div>
</template>

<style scoped>
.history-page {
  background-color: #1a1a2e;
  min-height: 100vh;
  color: white;
}

.pumping-amount {
  color: #8b5cf6;
  margin-left: 0.5rem;
}

.pumping-breakdown {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.breast-amount {
  color: var(--color-periwinkle);
  background: rgba(139, 92, 246, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
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
  color: var(--color-periwinkle);
  margin-top: 0.25rem;
  text-align: center;
}

.header-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
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
  width: 70px;
  /* To balance the back button */
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
  color: var(--color-periwinkle);
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
  color: var(--color-periwinkle);
  margin-top: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 8px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
  color: var(--color-periwinkle);
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

/* Cumulative Stats Section Styles */
.cumulative-stats-section {
  margin-bottom: 2rem;
}

.cumulative-stats-section h3 {
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
  color: var(--color-periwinkle);
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

  margin-bottom: 2rem;
}

.daily-feedings-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #e0e0ff;
}

.daily-header {
  display: flex;
  gap: 1rem;
  align-items: baseline;
  justify-content: baseline;
}

.daily-date {
  font-size: 1.5rem;
  color: var(--color-periwinkle);
}

.daily-total {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
}

.daily-breakdown {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-periwinkle);
}

.feeding-type {
  font-weight: bold;
  text-transform: capitalize;
}

.daily-count {
  font-size: 0.9rem;
  color: var(--color-periwinkle);
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

.toggle-text-left,
.toggle-text-right {
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--color-periwinkle);
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

.toggle-input:checked+.toggle-slider {
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
  color: var(--color-periwinkle);
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
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  color: var(--color-periwinkle);
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
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  color: var(--color-periwinkle);
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
  background-color: #f5f5dc;
  /* beige */
}

.action-btn.nursing {
  background-color: #dda0dd;
  /* plum */
}

.action-btn.pump {
  background-color: #9370db;
  /* medium purple */
}

.action-btn.formula {
  background-color: #7fffd4;
  /* aquamarine */
}

.action-btn.solid {
  background-color: #ffa500;
  /* orange */
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
  background-color: #ffd700;
  /* gold */
}

.action-btn.wake {
  background-color: #05409e;
  color: white;
}

.action-btn.sleep {
  background-color: #090524;
  color: white;
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

.solid-food-details {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.25rem;
}



.food-reaction {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 600;
}

.food-reaction.liked {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.food-reaction.disliked {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.food-reaction.neutral {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}

.food-reaction.allergic_reaction {
  background: rgba(239, 68, 68, 0.3);
  color: #dc2626;
  font-weight: 700;
}

.times-tried {
  font-size: 0.9rem;
  color: var(--color-periwinkle);
  margin-left: 0.25rem;
}
</style>