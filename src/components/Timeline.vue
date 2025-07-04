<template>
  <div class="timeline">
    <div class="timeline-header">
      <span class="timeline-title">{{ title }}</span>
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
          :style="{ left: `calc(${getEventPosition(event)}% - 11px)` }"
          :title="formatEventTooltip(event)"
          @click="showFeedingDetails(event)"
        ></div>
        <div
          v-for="diaper in diaperEvents"
          :key="diaper.id"
          class="diaper-marker"
          :class="`diaper-marker-${diaper.type}`"
          :style="{ left: `calc(${getEventPosition(diaper)}% - 11px)` }"
          :title="`${diaper.type.charAt(0).toUpperCase() + diaper.type.slice(1)} diaper at ${formatEventTooltip(diaper)}`"
          @click="showDiaperDetails(diaper)"
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
        <button class="snackbar-close" @click="hideSnackbar">×</button>
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

interface Event {
  id: string | number
  timestamp: string // ISO string in UTC
  type?: 'breast' | 'formula' | 'solid'
  amount?: number
  topup_amount?: number
}

interface DiaperEvent {
  id: string | number
  timestamp: string
  type: 'pee' | 'poop' | 'both'
}

interface Props {
  title: string
  events: Event[]
  diaperEvents?: DiaperEvent[]
  hourLabelInterval?: number
  use8amWindow?: boolean
  showCurrentTimeIndicator?: boolean
  totalLabel?: string
  windowStart?: string
  windowEnd?: string
}

const props = withDefaults(defineProps<Props>(), {
  hourLabelInterval: 2,
  use8amWindow: false,
  showCurrentTimeIndicator: false,
  totalLabel: '',
  diaperEvents: () => []
})

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
  if (event.type === 'breast') return breastIcon
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
  icon: ''
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
}

function hideSnackbar() {
  snackbar.show = false
}
</script>

<style>
:root {
  --breast-color: #f5f5dc;
  --formula-color: #7fffd4;
  --pee-color: #ffd700;
  --poop-color: saddlebrown;
}
</style>

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
  height: 60px;
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
  background-color: rgba(255, 255, 255, 0.2);
}
.hour-label {
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 0.7rem;
  color: var(--color-periwinkle);
  white-space: nowrap;
  text-align: left;
  transform: translateX(-50%);
}
.timeline-track {
  position: relative;
  height: 100%;
}
.feeding-marker,
.diaper-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: pointer;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  border: 1px solid rgba(255,255,255,0.2);
  transition: transform 0.2s ease;
}
.feeding-marker-breast {
  background: var(--breast-color);
}
.feeding-marker-formula {
  background: var(--formula-color);
}
.diaper-marker-pee {
  background: var(--pee-color);
}
.diaper-marker-poop {
  background: var(--poop-color);
}
.diaper-marker-both {
  background: linear-gradient(90deg, var(--pee-color) 50%, var(--poop-color) 50%);
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

/* Snackbar Styles */
.snackbar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.01);
  z-index: 999;
}

.snackbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
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

.snackbar-title {
  font-weight: bold;
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.snackbar-time {
  color: var(--color-periwinkle);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.snackbar-extra {
  color: #c0c0c0;
  font-size: 0.8rem;
}

.snackbar-close {
  background: none;
  border: none;
  color: var(--color-periwinkle);
  font-size: 1.5rem;
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

.snackbar-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.snackbar.feeding {
  border-left: 4px solid var(--formula-color);
}

.snackbar.diaper {
  border-left: 4px solid var(--pee-color);
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