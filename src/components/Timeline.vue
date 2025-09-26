<template>
  <div class="timeline">
    <div class="timeline-header">
      <div class="timeline-title-section">
        <span class="timeline-title">{{ title }}</span>
        <span v-if="breakdown" class="timeline-breakdown">{{ breakdown }}</span>
      </div>
      <span v-if="totalLabel" class="timeline-total">{{ totalLabel }}</span>
    </div>
    <div class="timeline-container">
      <div class="hour-marks">
        <div v-for="i in 24" :key="i" class="hour-mark">
          <div class="hour-line"></div>
          <span class="hour-label" v-if="getHourForIndex(i - 1) % hourLabelInterval === 0">
            {{ formatHourLabel(getHourForIndex(i - 1)) }}
          </span>
        </div>
      </div>
      <div
        v-if="showCurrentTimeIndicator"
        class="current-time-indicator"
        :style="{ left: `${getCurrentTimePosition()}%` }"
      ></div>
      <div class="timeline-track">
        <div
          v-for="event in events"
          :key="event.id"
          class="feeding-marker"
          :class="`feeding-marker-${event.type}`"
          :style="{ left: `calc(${getEventPosition(event)}% - 8px)` }"
          :title="formatFeedingTooltip(event)"
          @click="showFeedingDetails(event)"
        ></div>
        <div
          v-for="diaper in diaperEvents"
          :key="diaper.id"
          class="diaper-marker"
          :class="`diaper-marker-${diaper.type}`"
          :style="{ left: `calc(${getEventPosition(diaper)}% - 8px)` }"
          :title="`${diaper.type.charAt(0).toUpperCase() + diaper.type.slice(1)} diaper at ${formatEventTooltip(diaper)}`"
          @click="showDiaperDetails(diaper)"
        ></div>
        <div
          v-for="solidFood in solidFoodEvents"
          :key="solidFood.id"
          class="solid-food-marker"
          :class="{ 'multiple-foods': (solidFood.foods && solidFood.foods.length > 1) }"
          :style="{ left: `calc(${getEventPosition(solidFood)}% - 8px)` }"
          :title="formatSolidFoodTooltip(solidFood)"
          @click="showSolidFoodDetails(solidFood)"
        ></div>
        <div
          v-for="pumping in pumpingEvents"
          :key="pumping.id"
          class="pumping-marker"
          :style="{ left: `calc(${getEventPosition(pumping)}% - 8px)` }"
          :title="formatPumpingTooltip(pumping)"
          @click="showPumpingDetails(pumping)"
          @keydown.enter="showPumpingDetails(pumping)"
          @keydown.space.prevent="showPumpingDetails(pumping)"
          role="button"
          tabindex="0"
          :aria-label="`Pumping session at ${formatPumpingTooltip(pumping)}. Click to edit.`"
        ></div>
      </div>
    </div>
    
    <!-- Snackbar Overlay -->
    <div v-if="snackbar.show" class="snackbar-overlay" @click="hideSnackbar"></div>
    <!-- Snackbar -->
    <div v-if="snackbar.show" class="snackbar" :class="snackbar.type">
      <div class="snackbar-content" @click.stop>
        <div class="snackbar-icon">
          <img v-if="snackbar.icon" :src="snackbar.icon" :alt="snackbar.type" />
        </div>
        <div class="snackbar-details">
          <div class="snackbar-title">{{ snackbar.title }}</div>
          <div class="snackbar-time">{{ snackbar.time }}</div>
          <div v-if="snackbar.details" class="snackbar-extra">{{ snackbar.details }}</div>
        </div>
        <div class="snackbar-actions">
          <button class="snackbar-edit" @click="editEvent" title="Edit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="snackbar-close" @click="hideSnackbar">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import poopIcon from '../assets/icons/hugeicons_poop.svg'
import dropletsIcon from '../assets/icons/droplets.svg'
import spoonIcon from '../assets/icons/spoon.svg'

interface Event {
  id: string | number
  timestamp: string // ISO string in UTC
  type?: 'breast' | 'formula' | 'solid' | 'nursing'
  amount?: number | null
  topup_amount?: number
}

interface DiaperEvent {
  id: string | number
  timestamp: string
  type: 'pee' | 'poop' | 'both'
}

interface SolidFoodEvent {
  id: string | number
  timestamp: string
  food_name?: string // Legacy field for backward compatibility
  foods?: Array<{ name: string }> // New field for multiple foods
  reaction?: string | null
}

interface PumpingEvent {
  id: string | number
  timestamp: string
  total_duration: number
  total_amount: number
  left_duration: number
  right_duration: number
  left_amount: number | null
  right_amount: number | null
  notes: string | null
}

interface Props {
  title: string
  events: Event[]
  diaperEvents?: DiaperEvent[]
  solidFoodEvents?: SolidFoodEvent[]
  pumpingEvents?: PumpingEvent[]
  hourLabelInterval?: number
  use8amWindow?: boolean
  showCurrentTimeIndicator?: boolean
  totalLabel?: string
  windowStart?: string
  windowEnd?: string
  breakdown?: string
}

interface Emits {
  (e: 'edit-pumping', pumpingSession: PumpingEvent): void
  (e: 'edit-feeding', feedingEvent: Event): void
  (e: 'edit-diaper', diaperEvent: DiaperEvent): void
  (e: 'edit-solid-food', solidFoodEvent: SolidFoodEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  hourLabelInterval: 2,
  use8amWindow: false,
  showCurrentTimeIndicator: false,
  totalLabel: '',
  diaperEvents: () => [],
  solidFoodEvents: () => [],
  pumpingEvents: () => [],
  breakdown: ''
})

const emit = defineEmits<Emits>()

function getTimelineWindow() {
  if (props.windowStart && props.windowEnd) {
    return { start: new Date(props.windowStart), end: new Date(props.windowEnd) }
  }
  const now = new Date()
  let start = new Date(now)
  let end
  if (props.use8amWindow) {
    // 8am local to 8am local next day
    if (now.getHours() >= 8) {
      start.setHours(8, 0, 0, 0)
    } else {
      start.setDate(start.getDate() - 1)
      start.setHours(8, 0, 0, 0)
    }
    end = new Date(start)
    end.setDate(start.getDate() + 1)
  } else {
    start.setHours(0, 0, 0, 0)
    end = new Date(start)
    end.setDate(start.getDate() + 1)
  }
  return { start, end }
}

const { start, end } = getTimelineWindow()
const totalMs = end.getTime() - start.getTime()

function getEventPosition(event: { timestamp: string }) {
  const eventTime = new Date(event.timestamp)
  const elapsedMs = eventTime.getTime() - start.getTime()
  const positionPercent = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100))
  return positionPercent
}

function formatHourLabel(hour: number) {
  if (hour === 0 || hour === 24) return '12am'
  if (hour === 12) return '12pm'
  return (hour > 12 ? (hour - 12) : hour)
}

function formatEventTooltip(event: { timestamp: string }) {
  const date = new Date(event.timestamp)
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short'
  })
}

function formatFeedingTooltip(event: Event) {
  const date = new Date(event.timestamp)
  const timeString = date.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
  
  let amountString = ''
  if (event.amount && event.amount > 0) {
    amountString = `${event.amount}ml`
    if (event.topup_amount && event.topup_amount > 0) {
      amountString += ` + ${event.topup_amount}ml top-up`
    }
  } else if (event.topup_amount && event.topup_amount > 0) {
    amountString = `${event.topup_amount}ml top-up`
  } else {
    amountString = 'No amount'
  }
  
  const typeString = event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Unknown'
  
  return `${typeString} feeding: ${amountString} at ${timeString}`
}

function formatPumpingTooltip(pumping: PumpingEvent) {
  const date = new Date(pumping.timestamp)
  const timeString = date.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const durationMinutes = Math.round(pumping.total_duration / 60)
  const amountString = pumping.total_amount > 0 ? `${pumping.total_amount}ml` : 'No amount'
  
  return `Pumping: ${durationMinutes}min, ${amountString} at ${timeString}`
}

function formatSolidFoodTooltip(solidFood: SolidFoodEvent) {
  const date = new Date(solidFood.timestamp)
  const timeString = date.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Handle both legacy single food and new multiple foods format
  let foodDisplay = ''
  if (solidFood.foods && solidFood.foods.length > 0) {
    if (solidFood.foods.length === 1) {
      foodDisplay = solidFood.foods[0].name
    } else {
      foodDisplay = `${solidFood.foods.length} foods: ${solidFood.foods.map(f => f.name).join(', ')}`
    }
  } else if (solidFood.food_name) {
    // Legacy format
    foodDisplay = solidFood.food_name
  } else {
    foodDisplay = 'Unknown foods'
  }
  
  return `Solid Food: ${foodDisplay} at ${timeString}`
}

function getHourForIndex(i: number) {
  const { start } = getTimelineWindow();
  return (start.getHours() + i) % 24;
}

function getCurrentTimePosition() {
  const now = new Date();
  const { start, end } = getTimelineWindow();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const positionPercent = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
  return positionPercent;
}

function getFeedingIcon(event: Event) {
  if (event.type === 'formula') return formulaIcon
  if (event.type === 'breast' || event.type === 'nursing') return breastIcon
  return ''
}

function getDiaperIcon(event: DiaperEvent) {
  if (event.type === 'pee') return dropletsIcon
  return poopIcon
}

// Snackbar state
const snackbar = reactive({
  show: false,
  type: '',
  title: '',
  time: '',
  details: '',
  icon: '',
  eventData: null as Event | DiaperEvent | SolidFoodEvent | PumpingEvent | null
})

function showFeedingDetails(event: Event) {
  const eventTime = new Date(event.timestamp)
  const timeString = eventTime.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Build amount details
  let amountDetails = ''
  if (event.amount && event.amount > 0) {
    amountDetails = `${event.amount}ml`
    if (event.topup_amount && event.topup_amount > 0) {
      amountDetails += ` + ${event.topup_amount}ml formula top-up`
    }
  } else if (event.topup_amount && event.topup_amount > 0) {
    amountDetails = `${event.topup_amount}ml formula top-up`
  } else {
    amountDetails = 'No amount recorded'
  }
  
  snackbar.show = true
  snackbar.type = 'feeding'
  snackbar.title = `${(event.type || 'Unknown').charAt(0).toUpperCase() + (event.type || 'Unknown').slice(1)} Feeding`
  snackbar.time = timeString
  snackbar.details = amountDetails
  snackbar.icon = getFeedingIcon(event)
  snackbar.eventData = event
}

function showDiaperDetails(diaper: DiaperEvent) {
  const eventTime = new Date(diaper.timestamp)
  const timeString = eventTime.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  snackbar.show = true
  snackbar.type = 'diaper'
  snackbar.title = `${diaper.type.charAt(0).toUpperCase() + diaper.type.slice(1)} Diaper`
  snackbar.time = timeString
  snackbar.details = diaper.type === 'both' ? 'Pee and poop' : diaper.type === 'pee' ? 'Wet diaper' : 'Dirty diaper'
  snackbar.icon = getDiaperIcon(diaper)
  snackbar.eventData = diaper
}

function showSolidFoodDetails(solidFood: SolidFoodEvent) {
  const eventTime = new Date(solidFood.timestamp)
  const timeString = eventTime.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Handle both legacy single food and new multiple foods format
  let foodDisplay = ''
  if (solidFood.foods && solidFood.foods.length > 0) {
    if (solidFood.foods.length === 1) {
      foodDisplay = solidFood.foods[0].name
    } else if (solidFood.foods.length <= 3) {
      foodDisplay = solidFood.foods.map(f => f.name).join(', ')
    } else {
      foodDisplay = `${solidFood.foods.slice(0, 2).map(f => f.name).join(', ')} +${solidFood.foods.length - 2} more`
    }
  } else if (solidFood.food_name) {
    // Legacy format
    foodDisplay = solidFood.food_name
  } else {
    foodDisplay = 'Unknown foods'
  }
  
  snackbar.show = true
  snackbar.type = 'solid'
  snackbar.title = `Solid Food: ${foodDisplay}`
  snackbar.time = timeString
  snackbar.details = solidFood.reaction ? `Reaction: ${solidFood.reaction}` : 'No reaction recorded'
  snackbar.icon = spoonIcon
  snackbar.eventData = solidFood
}

function showPumpingDetails(pumping: PumpingEvent) {
  // Emit edit event for pumping session
  emit('edit-pumping', pumping)
}

function editEvent() {
  if (!snackbar.eventData) return
  
  switch (snackbar.type) {
    case 'feeding':
      emit('edit-feeding', snackbar.eventData as Event)
      break
    case 'diaper':
      emit('edit-diaper', snackbar.eventData as DiaperEvent)
      break
    case 'solid':
      emit('edit-solid-food', snackbar.eventData as SolidFoodEvent)
      break
    case 'pumping':
      emit('edit-pumping', snackbar.eventData as PumpingEvent)
      break
  }
  
  hideSnackbar()
}

function hideSnackbar() {
  snackbar.show = false
  snackbar.eventData = null
}
</script>

<style scoped>
.timeline {
  margin-bottom: 2rem;
}
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.timeline-title-section {
  display: flex;
  align-items: baseline;
}
.timeline-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-text-secondary);
}
.timeline-breakdown {
  font-size: 0.8rem;
  color: var(--color-text-accent);
  margin-left: 0.5rem;
}
.timeline-total {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-warning);
}
.timeline-container {
  position: relative;
  height: 60px;
  background: var(--color-surface);
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
  &:first-child {
    .hour-line {    
      display: none;
    }
  }
}
.hour-line {
  position: absolute;
  left: 0;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: var(--color-bg-secondary);
}
.hour-label {
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 0.7rem;
  color: var(--color-text-accent);
  white-space: nowrap;
  text-align: left;
  transform: translateX(-50%);
}
.timeline-track {
  position: relative;
  height: 100%;
}
.feeding-marker,
.diaper-marker,
.solid-food-marker,
.pumping-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: pointer;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  border: 1px solid var(--color-surface-border);
  transition: transform 0.2s ease;
}
.feeding-marker-breast {
  background: var(--color-feeding-breast);
}
.feeding-marker-nursing {
  background: var(--color-feeding-breast);
  border: 2px solid var(--color-feeding-nursing);
}
.feeding-marker-formula {
  background: var(--color-feeding-formula);
}
.diaper-marker-pee {
  background: var(--color-diaper-pee);
}
.diaper-marker-poop {
  background: var(--color-diaper-poop);
}
.diaper-marker-both {
  background: linear-gradient(90deg, var(--color-diaper-pee) 50%, var(--color-diaper-poop) 50%);
}
.solid-food-marker {
  background: var(--color-feeding-solid);
}

.solid-food-marker.multiple-foods {
  background: linear-gradient(45deg, var(--color-feeding-solid) 50%, var(--color-feeding-formula) 50%);
  border: 2px solid var(--color-feeding-solid);
}
.pumping-marker {
  background: var(--color-feeding-pump);
  border: 2px solid var(--color-feeding-nursing);
}
.current-time-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background-color: var(--color-warning);
  z-index: 15;
}

/* Snackbar Styles */
.snackbar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--color-surface, rgba(0,0,0,0.01));
  z-index: 999;
}

.snackbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  padding: 1rem;
  z-index: 1000;
  min-width: 300px;
  max-width: 400px;
  backdrop-filter: blur(10px);
  animation: slideUp 0.3s ease-out;
}

.snackbar-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.snackbar-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.snackbar-icon img {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}

.snackbar-details {
  flex: 1;
}

.snackbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.snackbar-title {
  font-weight: bold;
  color: var(--color-text-primary);
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.snackbar-time {
  color: var(--color-text-accent);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.snackbar-extra {
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
}

.snackbar-edit,
.snackbar-close {
  background: none;
  border: none;
  color: var(--color-text-accent);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.snackbar-edit {
  font-size: 1rem;
}

.snackbar-close {
  font-size: 1.5rem;
}

.snackbar-edit:hover,
.snackbar-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.snackbar.feeding {
  border-left: 4px solid var(--color-feeding-formula);
}

.snackbar.diaper {
  border-left: 4px solid var(--color-diaper-pee);
}

.snackbar.solid {
  border-left: 4px solid var(--color-feeding-solid);
}

.snackbar.pumping {
  border-left: 4px solid var(--color-feeding-pump);
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
</style> 