<template>
  <div 
    v-if="activeSession" 
    class="persistent-nursing-indicator"
    @click="handleTap"
    role="button"
    tabindex="0"
    @keydown.enter="handleTap"
    @keydown.space.prevent="handleTap"
    :aria-label="`Active nursing session for ${babyName}. ${elapsedTime} elapsed on ${currentBreastDisplay}. Tap to view details.`"
  >
    <div class="indicator-content">
      <div class="indicator-header">
        <div class="status-dot" :class="{ 'pulsing': isActive }"></div>
        <span class="status-text">Nursing in Progress</span>
      </div>
      
      <div class="session-info">
        <div class="baby-info">
          <span class="baby-name">{{ babyName }}</span>
        </div>
        
        <div class="timing-info">
          <span class="current-breast">{{ currentBreastDisplay }}</span>
          <span class="elapsed-time">{{ elapsedTime }}</span>
        </div>
      </div>
      
      <div class="tap-hint">
        <span class="hint-text">Tap to view details</span>
      </div>
    </div>
    
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressWidth }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ActiveNursingSession } from '../types/nursing'

interface Props {
  babyId: string
  babyName: string
  activeSession: ActiveNursingSession | null
}

interface Emits {
  (e: 'tap'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state for real-time updates
const currentTime = ref(new Date())
let updateInterval: ReturnType<typeof setInterval> | null = null

// Computed properties
const isActive = computed(() => props.activeSession?.is_active ?? false)

const elapsedTime = computed(() => {
  if (!props.activeSession) return '0:00'
  
  const startTime = new Date(props.activeSession.start_time)
  const elapsed = currentTime.value.getTime() - startTime.getTime()
  const totalSeconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const currentBreastDisplay = computed(() => {
  if (!props.activeSession) return ''
  
  const breast = props.activeSession.breast_used
  switch (breast) {
    case 'left':
      return 'Left Breast'
    case 'right':
      return 'Right Breast'
    case 'both':
      return 'Both Breasts'
    default:
      return 'Nursing'
  }
})

const progressWidth = computed(() => {
  if (!props.activeSession) return '0%'
  
  // Calculate progress based on elapsed time
  // For visual feedback, we'll show progress that cycles every 60 seconds
  const startTime = new Date(props.activeSession.start_time)
  const elapsed = currentTime.value.getTime() - startTime.getTime()
  const totalSeconds = Math.floor(elapsed / 1000)
  const cycleProgress = (totalSeconds % 60) / 60 * 100
  
  return `${cycleProgress}%`
})

// Methods
function handleTap() {
  emit('tap')
}

// Lifecycle
onMounted(() => {
  // Update current time every second for real-time display
  updateInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
})
</script>

<style scoped>
.persistent-nursing-indicator {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: linear-gradient(135deg, #dda0dd 0%, #ba68c8 100%);
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 280px;
  max-width: 90vw;
  border: 2px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.persistent-nursing-indicator:hover {
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.3);
}

.persistent-nursing-indicator:focus {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

.indicator-content {
  color: white;
  text-align: center;
}

.indicator-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: #4ade80;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.pulsing {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

.status-text {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-info {
  margin-bottom: 0.75rem;
}

.baby-info {
  margin-bottom: 0.5rem;
}

.baby-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
}

.timing-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.current-breast {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.elapsed-time {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.tap-hint {
  margin-top: 0.5rem;
}

.hint-text {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 0 0 1rem 1rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 1s ease;
  border-radius: 0 0 1rem 1rem;
}

/* Responsive design */
@media (max-width: 480px) {
  .persistent-nursing-indicator {
    top: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    transform: none;
    min-width: auto;
    max-width: none;
    padding: 0.875rem 1rem;
  }
  
  .persistent-nursing-indicator:hover {
    transform: translateY(-2px);
  }
  
  .timing-info {
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
  }
  
  .elapsed-time {
    font-size: 1.125rem;
  }
  
  .baby-name {
    font-size: 1rem;
  }
}

@media (max-width: 320px) {
  .persistent-nursing-indicator {
    padding: 0.75rem;
  }
  
  .status-text {
    font-size: 0.75rem;
  }
  
  .current-breast {
    font-size: 0.75rem;
  }
  
  .elapsed-time {
    font-size: 1rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .persistent-nursing-indicator {
    background: #000000;
    border: 3px solid #ffffff;
  }
  
  .status-dot {
    background-color: #ffffff;
  }
  
  .progress-fill {
    background: #ffffff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .persistent-nursing-indicator {
    transition: none;
  }
  
  .status-dot.pulsing {
    animation: none;
  }
  
  .progress-fill {
    transition: none;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .persistent-nursing-indicator {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  }
  
  .persistent-nursing-indicator:hover {
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.7);
  }
}
</style>