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
        ></div>
        <div
          v-for="diaper in diaperEvents"
          :key="diaper.id"
          class="diaper-marker"
          :class="`diaper-marker-${diaper.type}`"
          :style="{ left: `calc(${getEventPosition(diaper)}% - 11px)` }"
          :title="`${diaper.type.charAt(0).toUpperCase() + diaper.type.slice(1)} diaper at ${formatEventTooltip(diaper)}`"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import poopIcon from '../assets/icons/hugeicons_poop.svg'
import dropletsIcon from '../assets/icons/droplets.svg'

interface Event {
  id: string | number
  timestamp: string // ISO string in UTC
  type?: 'breast' | 'formula' | 'solid'
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
}

const props = withDefaults(defineProps<Props>(), {
  hourLabelInterval: 2,
  use8amWindow: false,
  showCurrentTimeIndicator: false,
  totalLabel: '',
  diaperEvents: () => []
})

function getTimelineWindow() {
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
  if (hour === 0 || hour === 24) return '12AM'
  if (hour === 12) return '12PM'
  return (hour > 12 ? (hour - 12) : hour) + (hour >= 12 ? 'PM' : 'AM')
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

function getFeedingMarkerClass(event: Event) {
  if (event.type === 'formula') return 'feeding-marker-formula'
  if (event.type === 'breast') return 'feeding-marker-breast'
  return ''
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

function getDiaperMarkerClass(event: DiaperEvent) {
  if (event.type === 'pee') return 'diaper-marker-pee'
  if (event.type === 'poop') return 'diaper-marker-poop'
  if (event.type === 'both') return 'diaper-marker-both'
  return ''
}

function getDiaperMarkerStyle(event: DiaperEvent) {
  if (event.type === 'pee') return { background: 'var(--pee-color)' }
  if (event.type === 'poop') return { background: 'var(--poop-color)' }
  if (event.type === 'both') return { background: 'linear-gradient(90deg, var(--pee-color) 50%, var(--poop-color) 50%)' }
  return {}
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
  color: #a0a0e0;
  white-space: nowrap;
  text-align: left;
  transform: translateX(0);
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
</style> 