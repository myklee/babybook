<template>
  <div class="time-picker">
    <input
      type="number"
      :value="displayHour"
      min="1"
      max="12"
      inputmode="numeric"
      pattern="[0-9]*"
      class="time-input"
      placeholder="HH"
      @input="onHourInput"
      @focus="e => { const t = e.target as HTMLInputElement; if (t) t.select(); }"
    />
    <span>:</span>
    <input
      type="number"
      :value="modelValue.minute"
      min="0"
      max="59"
      inputmode="numeric"
      pattern="[0-9]*"
      class="time-input"
      placeholder="MM"
      @input="onMinuteInput"
      @focus="e => { const t = e.target as HTMLInputElement; if (t) t.select(); }"
    />
    <div class="ampm-group">
      <button type="button" :class="{ active: modelValue.ampm === 'AM' }" @click="setAMPM('AM')">AM</button>
      <button type="button" :class="{ active: modelValue.ampm === 'PM' }" @click="setAMPM('PM')">PM</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  modelValue: { hour: string, minute: string, ampm: 'AM' | 'PM' }
}>()
const emit = defineEmits(['update:modelValue'])

const displayHour = computed(() => {
  // Convert 24h to 12h for display
  let h = Number(props.modelValue.hour)
  if (isNaN(h) || h === 0) return '12'
  if (h > 12) return String(h - 12)
  return String(h)
})

function onHourInput(e: Event) {
  let hour = (e.target as HTMLInputElement).value
  // Clamp to 1-12 for display, but store as 24h
  let h = Math.max(1, Math.min(12, Number(hour)))
  let ampm = props.modelValue.ampm || 'AM'
  let hour24 = ampm === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h)
  emit('update:modelValue', { hour: String(hour24), minute: props.modelValue.minute, ampm })
}
function onMinuteInput(e: Event) {
  const minute = (e.target as HTMLInputElement).value
  emit('update:modelValue', { hour: props.modelValue.hour, minute, ampm: props.modelValue.ampm })
}
function setAMPM(ampm: 'AM' | 'PM') {
  let h = Number(props.modelValue.hour)
  if (isNaN(h)) h = 0
  if (ampm === 'AM' && h >= 12) h = h - 12
  if (ampm === 'PM' && h < 12) h = h + 12
  emit('update:modelValue', { hour: String(h), minute: props.modelValue.minute, ampm })
}
</script>

<style scoped>
.time-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-input {
  height: 4.5rem;
  text-align: center;
  font-size: 2.5rem !important;
  padding: 0.25em 0.5em;
  border-radius: 15px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.05);
  color: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.time-input:focus {
  outline: none;
  border-color: #9c27b0;
  background-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.ampm-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: 0.5rem;
}

.ampm-group button {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-periwinkle);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.5em 0.75em;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.ampm-group button:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.ampm-group button.active {
  background: linear-gradient(135deg, #9c27b0, #7b1fa2);
  color: #fff;
  font-weight: bold;
  border-color: #9c27b0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .time-input {
    font-size: 2rem !important;
    padding: 0.5em;
    min-height: 44px;
  }
  
  .ampm-group button {
    padding: 0.75em 1em;
    min-height: 44px;
  }
}
</style> 