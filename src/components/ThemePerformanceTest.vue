<template>
  <div class="performance-test">
    <div class="performance-test__header">
      <h3>Theme Performance Test</h3>
      <p>Test theme switching performance on this device</p>
    </div>

    <div class="performance-test__controls">
      <button 
        class="btn btn-primary" 
        @click="runTests" 
        :disabled="isRunning"
      >
        {{ isRunning ? 'Running Tests...' : 'Run Performance Tests' }}
      </button>
      
      <button 
        class="btn btn-secondary" 
        @click="clearResults"
        :disabled="isRunning || !hasResults"
      >
        Clear Results
      </button>
    </div>

    <div v-if="isRunning" class="performance-test__progress">
      <div class="progress-bar">
        <div 
          class="progress-bar__fill" 
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <p>{{ currentTest }}</p>
    </div>

    <div v-if="results" class="performance-test__results">
      <h4>Test Results</h4>
      
      <div class="device-info">
        <h5>Device Information</h5>
        <ul>
          <li>Screen: {{ results.deviceInfo.screenWidth }}x{{ results.deviceInfo.screenHeight }}</li>
          <li>Device Pixel Ratio: {{ results.deviceInfo.devicePixelRatio }}</li>
          <li>CPU Cores: {{ results.deviceInfo.hardwareConcurrency }}</li>
          <li v-if="results.deviceInfo.connection">
            Connection: {{ results.deviceInfo.connection.effectiveType }} 
            ({{ results.deviceInfo.connection.downlink }} Mbps)
          </li>
        </ul>
      </div>

      <div class="theme-results">
        <div 
          v-for="(measurements, theme) in results.results" 
          :key="theme"
          class="theme-result"
        >
          <h5>{{ theme.charAt(0).toUpperCase() + theme.slice(1) }} Theme</h5>
          <div class="metrics">
            <div class="metric">
              <span class="metric__label">Average Total Time:</span>
              <span class="metric__value" :class="getPerformanceClass(getAverage(measurements, 'totalTime'))">
                {{ getAverage(measurements, 'totalTime').toFixed(2) }}ms
              </span>
            </div>
            <div class="metric">
              <span class="metric__label">CSS Update Time:</span>
              <span class="metric__value">
                {{ getAverage(measurements, 'cssVariableUpdateTime').toFixed(2) }}ms
              </span>
            </div>
            <div class="metric">
              <span class="metric__label">Repaint Time:</span>
              <span class="metric__value">
                {{ getAverage(measurements, 'repaintTime').toFixed(2) }}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="performance-test__actions">
        <button 
          class="btn btn-secondary" 
          @click="downloadReport"
        >
          Download Report
        </button>
        
        <button 
          class="btn btn-secondary" 
          @click="copyToClipboard"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { 
  runThemePerformanceTests, 
  generatePerformanceReport,

  type PerformanceMetrics,
  type DeviceInfo
} from '../utils/themePerformance'

const { setTheme } = useTheme()

const isRunning = ref(false)
const progress = ref(0)
const currentTest = ref('')
const hasResults = ref(false)
const results = ref<{
  deviceInfo: DeviceInfo
  results: Record<string, PerformanceMetrics[]>
} | null>(null)

const runTests = async () => {
  isRunning.value = true
  progress.value = 0
  currentTest.value = 'Initializing tests...'
  
  try {
    // Simulate progress updates
    const themes = ['light', 'dark', 'auto']
    const totalSteps = themes.length * 5 // 5 iterations per theme
    let currentStep = 0
    
    const originalSetTheme = setTheme
    const wrappedSetTheme = (theme: string) => {
      currentStep++
      progress.value = (currentStep / totalSteps) * 100
      currentTest.value = `Testing ${theme} theme (${currentStep}/${totalSteps})`
      originalSetTheme(theme as any)
    }
    
    const testResults = await runThemePerformanceTests(wrappedSetTheme)
    
    results.value = testResults
    hasResults.value = true
    currentTest.value = 'Tests completed!'
    
  } catch (error) {
    console.error('Performance test failed:', error)
    currentTest.value = 'Tests failed!'
  } finally {
    isRunning.value = false
    progress.value = 100
  }
}

const clearResults = () => {
  results.value = null
  hasResults.value = false
  progress.value = 0
  currentTest.value = ''
}

const getAverage = (measurements: PerformanceMetrics[], key: keyof PerformanceMetrics): number => {
  const sum = measurements.reduce((acc, curr) => acc + (curr[key] as number || 0), 0)
  return sum / measurements.length
}

const getPerformanceClass = (totalTime: number): string => {
  if (totalTime <= 50) return 'performance-excellent'
  if (totalTime <= 100) return 'performance-good'
  if (totalTime <= 200) return 'performance-fair'
  return 'performance-poor'
}

const downloadReport = () => {
  if (!results.value) return
  
  const report = generatePerformanceReport(results.value.deviceInfo, results.value.results)
  const blob = new Blob([report], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `theme-performance-report-${new Date().toISOString().split('T')[0]}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

const copyToClipboard = async () => {
  if (!results.value) return
  
  const report = generatePerformanceReport(results.value.deviceInfo, results.value.results)
  
  try {
    await navigator.clipboard.writeText(report)
    alert('Report copied to clipboard!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    alert('Failed to copy to clipboard')
  }
}
</script>

<style scoped>
.performance-test {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin: 1rem 0;
}

.performance-test__header h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary);
}

.performance-test__header p {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.performance-test__controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.performance-test__progress {
  margin-bottom: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-surface);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar__fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
}

.performance-test__results {
  border-top: 1px solid var(--color-surface-border);
  padding-top: 1.5rem;
}

.performance-test__results h4 {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
}

.device-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-radius: 0.5rem;
}

.device-info h5 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-accent);
}

.device-info ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--color-text-secondary);
}

.device-info li {
  margin-bottom: 0.25rem;
}

.theme-results {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.theme-result {
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-radius: 0.5rem;
}

.theme-result h5 {
  margin: 0 0 0.75rem 0;
  color: var(--color-text-accent);
}

.metrics {
  display: grid;
  gap: 0.5rem;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric__label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.metric__value {
  font-weight: 600;
  font-family: monospace;
}

.performance-excellent {
  color: var(--color-success);
}

.performance-good {
  color: var(--color-info);
}

.performance-fair {
  color: var(--color-warning);
}

.performance-poor {
  color: var(--color-error);
}

.performance-test__actions {
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-surface-border);
}

@media (max-width: 768px) {
  .performance-test__controls,
  .performance-test__actions {
    flex-direction: column;
  }
  
  .theme-results {
    grid-template-columns: 1fr;
  }
}
</style>