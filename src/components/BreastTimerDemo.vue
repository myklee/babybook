<script setup lang="ts">
import { ref } from 'vue'
import BreastTimer from './BreastTimer.vue'
import type { BreastTimerState } from '../types/nursing'

const leftDuration = ref(0)
const rightDuration = ref(0)
const leftState = ref<BreastTimerState | null>(null)
const rightState = ref<BreastTimerState | null>(null)

function handleLeftDurationChange(duration: number) {
  leftDuration.value = duration
}

function handleRightDurationChange(duration: number) {
  rightDuration.value = duration
}

function handleLeftStateChange(state: BreastTimerState) {
  leftState.value = state
}

function handleRightStateChange(state: BreastTimerState) {
  rightState.value = state
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="breast-timer-demo">
    <h2>BreastTimer Component Demo</h2>
    
    <!-- Timer Components -->
    <div class="timers-container">
      <BreastTimer
        breast="left"
        @duration-change="handleLeftDurationChange"
        @state-change="handleLeftStateChange"
      />
      
      <BreastTimer
        breast="right"
        @duration-change="handleRightDurationChange"
        @state-change="handleRightStateChange"
      />
    </div>
    
    <!-- Debug Information -->
    <div class="debug-info">
      <h3>Debug Information</h3>
      
      <div class="debug-section">
        <h4>Durations</h4>
        <p>Left: {{ formatDuration(leftDuration) }} ({{ leftDuration }}s)</p>
        <p>Right: {{ formatDuration(rightDuration) }} ({{ rightDuration }}s)</p>
        <p>Total: {{ formatDuration(leftDuration + rightDuration) }}</p>
      </div>
      
      <div class="debug-section">
        <h4>Left Timer State</h4>
        <pre v-if="leftState">{{ JSON.stringify(leftState, null, 2) }}</pre>
        <p v-else>No state yet</p>
      </div>
      
      <div class="debug-section">
        <h4>Right Timer State</h4>
        <pre v-if="rightState">{{ JSON.stringify(rightState, null, 2) }}</pre>
        <p v-else>No state yet</p>
      </div>
    </div>
    
    <!-- Size Variations -->
    <div class="size-demo">
      <h3>Size Variations</h3>
      
      <div class="size-row">
        <h4>Small</h4>
        <div class="size-timers">
          <BreastTimer breast="left" size="small" />
          <BreastTimer breast="right" size="small" />
        </div>
      </div>
      
      <div class="size-row">
        <h4>Medium (Default)</h4>
        <div class="size-timers">
          <BreastTimer breast="left" size="medium" />
          <BreastTimer breast="right" size="medium" />
        </div>
      </div>
      
      <div class="size-row">
        <h4>Large</h4>
        <div class="size-timers">
          <BreastTimer breast="left" size="large" />
          <BreastTimer breast="right" size="large" />
        </div>
      </div>
    </div>
    
    <!-- Disabled State -->
    <div class="disabled-demo">
      <h3>Disabled State</h3>
      <div class="disabled-timers">
        <BreastTimer breast="left" disabled />
        <BreastTimer breast="right" disabled />
      </div>
    </div>
  </div>
</template>

<style scoped>
.breast-timer-demo {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.breast-timer-demo h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #7c3aed;
}

.timers-container {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 3rem;
}

.debug-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 3rem;
}

.debug-info h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #374151;
}

.debug-section {
  margin-bottom: 1.5rem;
}

.debug-section h4 {
  margin-bottom: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.debug-section p {
  margin: 0.25rem 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.875rem;
}

.debug-section pre {
  background: #1f2937;
  color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  overflow-x: auto;
  margin: 0;
}

.size-demo {
  margin-bottom: 3rem;
}

.size-demo h3 {
  margin-bottom: 1.5rem;
  color: #374151;
}

.size-row {
  margin-bottom: 2rem;
}

.size-row h4 {
  margin-bottom: 1rem;
  color: #6b7280;
}

.size-timers {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.disabled-demo h3 {
  margin-bottom: 1.5rem;
  color: #374151;
}

.disabled-timers {
  display: flex;
  gap: 2rem;
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .timers-container,
  .size-timers,
  .disabled-timers {
    flex-direction: column;
    align-items: center;
  }
  
  .debug-section pre {
    font-size: 0.6875rem;
  }
}
</style>